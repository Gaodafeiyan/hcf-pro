const { ethers } = require("hardhat");

// 返回的数据
const data = "0x00000000000000000000000000000000000000000000001043561a882930000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

console.log("解码 getUserInfo 返回数据:\n");

// 尝试按9个返回值解码
const types = [
    "uint256", // amount
    "uint256", // level
    "uint256", // pending
    "uint256", // totalClaimed
    "bool",    // isLP
    "uint256", // compoundCount
    "bool",    // isEquityLP
    "uint256", // lpHCFAmount
    "uint256"  // lpBSDTAmount
];

try {
    const decoded = ethers.utils.defaultAbiCoder.decode(types, data);
    
    console.log("成功解码！结果：");
    console.log("1. amount:", ethers.formatUnits(decoded[0], 18), "HCF");
    console.log("2. level:", decoded[1].toString());
    console.log("3. pending:", ethers.formatUnits(decoded[2], 18), "HCF");
    console.log("4. totalClaimed:", ethers.formatUnits(decoded[3], 18), "HCF");
    console.log("5. isLP:", decoded[4]);
    console.log("6. compoundCount:", decoded[5].toString());
    console.log("7. isEquityLP:", decoded[6]);
    console.log("8. lpHCFAmount:", ethers.formatUnits(decoded[7], 18), "HCF");
    console.log("9. lpBSDTAmount:", ethers.formatUnits(decoded[8], 18), "BSDT");
} catch (error) {
    console.error("解码失败:", error.message);
    
    // 尝试其他可能的结构
    console.log("\n尝试按10个值解码（可能有额外的字段）...");
    const types2 = [
        "uint256", "uint256", "uint256", "uint256", "bool",
        "uint256", "bool", "uint256", "uint256", "uint256"
    ];
    
    try {
        const decoded2 = ethers.utils.defaultAbiCoder.decode(types2, data);
        console.log("10个值解码成功！");
        for (let i = 0; i < decoded2.length; i++) {
            console.log(`${i+1}:`, decoded2[i].toString());
        }
    } catch (e2) {
        console.error("10个值解码也失败");
    }
}

// 直接查看原始数据
console.log("\n原始数据分析:");
const chunks = data.slice(2).match(/.{64}/g);
chunks.forEach((chunk, i) => {
    const value = BigInt("0x" + chunk);
    console.log(`Slot ${i}: ${chunk} = ${value.toString()} = ${ethers.utils.formatUnits(value, 18)} (as 18 decimals)`);
});