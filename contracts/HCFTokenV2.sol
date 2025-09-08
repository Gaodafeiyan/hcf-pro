// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HCFToken.sol";

/**
 * @title HCFTokenV2
 * @dev 添加铸造功能的HCF代币升级版本
 */
contract HCFTokenV2 is HCFToken {
    
    // 记录是否已经完成初始铸造
    bool public fullSupplyMinted = false;
    
    // 添加事件
    event FullSupplyMinted(uint256 amount, address to);
    
    constructor(
        address _marketingWallet,
        address _nodePool,
        address _lpPool,
        address _bridgeAddress
    ) HCFToken(_marketingWallet, _nodePool, _lpPool, _bridgeAddress) {
        // 父合约已经铸造了1900万
    }
    
    /**
     * @notice 铸造剩余的代币到10亿总量
     * @dev 只能调用一次，只能由owner调用
     */
    function mintRemainingSupply() external onlyOwner {
        require(!fullSupplyMinted, "Full supply already minted");
        
        // 计算需要铸造的数量
        uint256 currentSupply = totalSupply();
        require(currentSupply < TOTAL_SUPPLY, "Already at max supply");
        
        uint256 remainingToMint = TOTAL_SUPPLY - currentSupply;
        
        // 铸造剩余代币到owner地址
        _mint(msg.sender, remainingToMint);
        
        fullSupplyMinted = true;
        
        emit FullSupplyMinted(remainingToMint, msg.sender);
    }
    
    /**
     * @notice 获取剩余可铸造数量
     */
    function getRemainingMintableSupply() external view returns (uint256) {
        uint256 current = totalSupply();
        if (current >= TOTAL_SUPPLY) {
            return 0;
        }
        return TOTAL_SUPPLY - current;
    }
}