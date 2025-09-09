// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProtectedBSDT
 * @dev BSDT with trading restrictions - only display price on DEX
 * 1000亿总供应量，1:1锚定USDT
 * 限制DEX交易，保护价格稳定
 */
contract ProtectedBSDT is ERC20, Ownable {
    
    // 总供应量：1000亿
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18;
    
    // 交易限制
    mapping(address => bool) public isWhitelisted;  // 白名单地址可以交易
    mapping(address => bool) public isPair;         // DEX池子地址
    bool public tradingRestricted = true;           // 限制交易开关
    
    // PancakeSwap地址
    address public constant PANCAKE_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address public constant PANCAKE_FACTORY = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
    
    constructor() ERC20("BSC Dollar Token", "BSDT") {
        // 铸造1000亿给部署者
        _mint(msg.sender, MAX_SUPPLY);
        
        // 默认白名单：owner和后端地址
        isWhitelisted[msg.sender] = true;
    }
    
    /**
     * @dev 重写transfer - 添加交易限制
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // 如果交易受限
        if (tradingRestricted) {
            // 场景1：从池子买（其他人不能买）
            if (isPair[from] && !isWhitelisted[to]) {
                revert("BSDT: Cannot buy from DEX, use Gateway");
            }
            
            // 场景2：卖到池子（其他人不能卖）
            if (isPair[to] && !isWhitelisted[from]) {
                revert("BSDT: Cannot sell to DEX");
            }
            
            // 场景3：添加流动性（只有owner可以）
            if (to == PANCAKE_ROUTER && !isWhitelisted[from]) {
                revert("BSDT: Only owner can add liquidity");
            }
        }
        
        super._transfer(from, to, amount);
    }
    
    /**
     * @dev 标记DEX池子地址
     */
    function setPairAddress(address pair, bool status) external onlyOwner {
        isPair[pair] = status;
    }
    
    /**
     * @dev 添加白名单（后端地址、Gateway等）
     */
    function setWhitelist(address account, bool status) external onlyOwner {
        isWhitelisted[account] = status;
    }
    
    /**
     * @dev 批量设置白名单
     */
    function setWhitelistBatch(address[] calldata accounts, bool status) external onlyOwner {
        for (uint i = 0; i < accounts.length; i++) {
            isWhitelisted[accounts[i]] = status;
        }
    }
    
    /**
     * @dev 开关交易限制
     */
    function setTradingRestricted(bool _restricted) external onlyOwner {
        tradingRestricted = _restricted;
    }
    
    /**
     * @dev 检查地址是否可以交易
     */
    function canTrade(address account) external view returns (bool) {
        return !tradingRestricted || isWhitelisted[account];
    }
}