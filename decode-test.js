// 独立的解码测试脚本
const data = "0x00000000000000000000000000000000000000000000001043561a882930000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

console.log("分析返回数据结构:\n");

// 移除0x前缀并分割成64字符的块
const chunks = data.slice(2).match(/.{64}/g);

console.log("数据有", chunks.length, "个32字节的槽位\n");

chunks.forEach((chunk, i) => {
    const value = BigInt("0x" + chunk);
    const decimal = value.toString();
    const ether = value / BigInt(10**18);
    
    console.log(`槽位 ${i}:`);
    console.log(`  Hex: 0x${chunk}`);
    console.log(`  整数: ${decimal}`);
    console.log(`  作为18位小数: ${ether}.${(value % BigInt(10**18)).toString().padStart(18, '0')}`);
    
    // 特殊检查
    if (value === BigInt(0)) {
        console.log(`  -> 0 (可能是false/空值)`);
    } else if (value === BigInt(1)) {
        console.log(`  -> 1 (可能是true)`);
    } else if (value === BigInt(2)) {
        console.log(`  -> 2 (可能是等级)`);
    }
    console.log("");
});

console.log("\n解释：");
console.log("槽位0: amount = 300 HCF");
console.log("槽位1: level = 2");
console.log("槽位2: pending = 2 HCF");
console.log("槽位3-8: 其他字段都是0");
console.log("\n看起来数据实际只有9个返回值，符合合约定义");