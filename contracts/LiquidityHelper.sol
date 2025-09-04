// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPancakeRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    
    function factory() external pure returns (address);
}

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IBSDTToken {
    function authorizedExchanges(address) external view returns (bool);
}

/**
 * @title LiquidityHelper
 * @dev 辅助合约，用于绕过BSDT的DEX限制添加流动性
 * 此合约将被授权为交易所，可以处理BSDT
 */
contract LiquidityHelper is Ownable, ReentrancyGuard {
    IPancakeRouter public immutable pancakeRouter;
    address public immutable hcfToken;
    address public immutable bsdtToken;
    address public collectionAddress;
    
    event LiquidityAdded(
        uint256 hcfAmount,
        uint256 bsdtAmount,
        uint256 liquidity,
        address lpToken
    );
    
    constructor(
        address _router,
        address _hcfToken,
        address _bsdtToken,
        address _collectionAddress
    ) {
        pancakeRouter = IPancakeRouter(_router);
        hcfToken = _hcfToken;
        bsdtToken = _bsdtToken;
        collectionAddress = _collectionAddress;
    }
    
    /**
     * @dev 添加流动性
     * 调用者需要先将HCF和BSDT转到本合约
     */
    function addLiquidity(
        uint256 hcfAmount,
        uint256 bsdtAmount,
        uint256 minHcfAmount,
        uint256 minBsdtAmount
    ) external onlyOwner nonReentrant returns (uint256, uint256, uint256) {
        // 检查余额
        require(IERC20(hcfToken).balanceOf(address(this)) >= hcfAmount, "Insufficient HCF");
        require(IERC20(bsdtToken).balanceOf(address(this)) >= bsdtAmount, "Insufficient BSDT");
        
        // 授权Router
        IERC20(hcfToken).approve(address(pancakeRouter), hcfAmount);
        IERC20(bsdtToken).approve(address(pancakeRouter), bsdtAmount);
        
        // 添加流动性
        (uint256 amountA, uint256 amountB, uint256 liquidity) = pancakeRouter.addLiquidity(
            hcfToken,
            bsdtToken,
            hcfAmount,
            bsdtAmount,
            minHcfAmount,
            minBsdtAmount,
            collectionAddress, // LP Token发送到归集地址
            block.timestamp + 300 // 5分钟deadline
        );
        
        // 获取LP Token地址
        address factory = pancakeRouter.factory();
        address lpToken = IPancakeFactory(factory).getPair(hcfToken, bsdtToken);
        
        emit LiquidityAdded(amountA, amountB, liquidity, lpToken);
        
        return (amountA, amountB, liquidity);
    }
    
    /**
     * @dev 紧急提取
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
        }
    }
    
    /**
     * @dev 更新归集地址
     */
    function setCollectionAddress(address _collection) external onlyOwner {
        collectionAddress = _collection;
    }
}