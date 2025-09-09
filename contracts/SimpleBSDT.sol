// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleBSDT
 * @dev 简化版BSDT - 专门为PancakeSwap设计，无任何限制
 * 1000亿总供应量，1:1锚定USDT
 */
contract SimpleBSDT is ERC20, Ownable {
    
    // 总供应量：1000亿
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18;
    
    constructor() ERC20("BSC Dollar Token", "BSDT") {
        // 直接铸造1000亿给部署者
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // 没有任何限制，可以自由转账
    // 没有多签要求
    // 没有DEX检测
    // 可以在PancakeSwap正常使用
}