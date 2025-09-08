// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IHCF {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title HCFSupplyFix
 * @dev 记录和管理HCF代币的虚拟供应量（因为原合约无法修改）
 */
contract HCFSupplyFix is Ownable {
    
    IHCF public immutable hcfToken;
    
    // 虚拟的额外供应量（用于记录应该有但实际没有铸造的代币）
    uint256 public virtualAdditionalSupply;
    
    // 记录虚拟铸造
    mapping(address => uint256) public virtualBalances;
    
    // 目标总供应量
    uint256 public constant TARGET_SUPPLY = 1_000_000_000 * 10**18; // 10亿
    
    event VirtualSupplyAdded(uint256 amount, address to);
    
    constructor(address _hcfToken) {
        hcfToken = IHCF(_hcfToken);
    }
    
    /**
     * @notice 记录虚拟供应量（弥补实际供应量不足）
     */
    function addVirtualSupply(address to, uint256 amount) external onlyOwner {
        virtualAdditionalSupply += amount;
        virtualBalances[to] += amount;
        
        emit VirtualSupplyAdded(amount, to);
    }
    
    /**
     * @notice 获取调整后的总供应量
     */
    function getAdjustedTotalSupply() external view returns (uint256) {
        return hcfToken.totalSupply() + virtualAdditionalSupply;
    }
    
    /**
     * @notice 获取调整后的余额
     */
    function getAdjustedBalance(address account) external view returns (uint256) {
        return hcfToken.balanceOf(account) + virtualBalances[account];
    }
    
    /**
     * @notice 获取距离目标还差多少
     */
    function getRemainingToTarget() external view returns (uint256) {
        uint256 currentTotal = hcfToken.totalSupply() + virtualAdditionalSupply;
        if (currentTotal >= TARGET_SUPPLY) {
            return 0;
        }
        return TARGET_SUPPLY - currentTotal;
    }
}