const { ethers } = require("hardhat");
const chalk = require("chalk");
const fs = require("fs");

async function main() {
    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.blue.bold("   📋 查找所有已部署合约地址"));
    console.log(chalk.blue.bold("========================================\n"));

    // 查找所有可能的部署信息文件
    const possibleFiles = [
        'deployment.json',
        'deployed-contracts.json',
        'antidump-node-deployment.json',
        'new-staking-deployment.json',
        'final-deployed-contracts.json',
        'all-deployed-contracts.json'
    ];

    console.log(chalk.cyan("1️⃣ 查找部署信息文件...\n"));
    
    for (const file of possibleFiles) {
        try {
            if (fs.existsSync(file)) {
                console.log(chalk.green(`✅ 找到: ${file}`));
                const content = JSON.parse(fs.readFileSync(file, 'utf8'));
                console.log(JSON.stringify(content, null, 2));
                console.log();
            }
        } catch (e) {
            // 忽略错误
        }
    }

    console.log(chalk.cyan("\n2️⃣ 尝试查找推荐、排名、治理合约...\n"));

    // 可能的合约名称
    const contractsToCheck = [
        { name: "HCFReferralSimple", possibleAddresses: [] },
        { name: "HCFReferral", possibleAddresses: [] },
        { name: "SimpleReferral", possibleAddresses: [] },
        { name: "HCFRanking", possibleAddresses: [] },
        { name: "StakingRankingRewards", possibleAddresses: [] },
        { name: "HCFGovernance", possibleAddresses: [] },
        { name: "HCFGovernanceEnhanced", possibleAddresses: [] }
    ];

    // 从代码中搜索可能的地址
    console.log("搜索scripts目录中的地址...");
    const scriptsDir = './scripts';
    if (fs.existsSync(scriptsDir)) {
        const files = fs.readdirSync(scriptsDir);
        for (const file of files) {
            if (file.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(`${scriptsDir}/${file}`, 'utf8');
                    // 匹配以太坊地址格式
                    const addressRegex = /0x[a-fA-F0-9]{40}/g;
                    const matches = content.match(addressRegex);
                    if (matches) {
                        for (const match of matches) {
                            // 检查是否包含关键词
                            if (content.includes('Referral') && content.includes(match)) {
                                console.log(`  在 ${file} 中找到可能的Referral地址: ${match}`);
                            }
                            if (content.includes('Ranking') && content.includes(match)) {
                                console.log(`  在 ${file} 中找到可能的Ranking地址: ${match}`);
                            }
                            if (content.includes('Governance') && content.includes(match)) {
                                console.log(`  在 ${file} 中找到可能的Governance地址: ${match}`);
                            }
                        }
                    }
                } catch (e) {
                    // 忽略错误
                }
            }
        }
    }

    console.log(chalk.cyan("\n3️⃣ 已确认的合约地址...\n"));
    
    const confirmedContracts = {
        "HCF Token": "0xc5c3f24A212838968759045d1654d3643016D585",
        "BSDT Token": "0x3932968a904Bf6773E8a13F1D2358331B9a1a530",
        "HCF/BSDT Pair": "0x53df45a3260af4B7590A53ce11E7A1f8DF5A8048",
        "HCFStakingFinal": "0x209D3D4f8Ab55CD678D736957AbC139F157753fE",
        "HCFAntiDump": "0xff9d8C2f579CB2b6e663B05f2F0d1E19DCB3EB5A",
        "HCFNode": "0x10B4284EAfdc92F448d29dB58F1CCc784E8230AD"
    };

    console.log(chalk.green("✅ 已确认部署的合约:"));
    for (const [name, address] of Object.entries(confirmedContracts)) {
        console.log(`  ${name}: ${address}`);
    }

    // 尝试连接可能的合约地址
    console.log(chalk.cyan("\n4️⃣ 检查链上合约代码...\n"));
    
    const provider = ethers.provider;
    
    // 一些可能的地址（从之前的部署历史中）
    const possibleAddresses = [
        "0x9c12EbC7b0663F0DDd039b616F7de7b8Ba6690CE", // 可能的Referral
        "0xEeC6086EcAc813dEc965f3f1c69d7e9BEEB30906", // 可能的Ranking
        "0x0cF8EcFFCBFB26316dEEe5Ca3dE088c1C8138e82"  // 可能的Governance
    ];

    for (const address of possibleAddresses) {
        try {
            const code = await provider.getCode(address);
            if (code !== "0x") {
                console.log(chalk.yellow(`  地址 ${address} 有合约代码，可能是未记录的合约`));
            }
        } catch (e) {
            // 忽略错误
        }
    }

    console.log(chalk.blue.bold("\n========================================"));
    console.log(chalk.yellow("📝 如何在服务器上查看:"));
    console.log(chalk.blue.bold("========================================\n"));
    
    console.log("在FinalShell中运行以下命令：\n");
    console.log(chalk.green("1. 查看所有部署记录文件:"));
    console.log("   ls -la *.json | grep deployment");
    console.log("   cat *deployment*.json 2>/dev/null\n");
    
    console.log(chalk.green("2. 搜索合约地址:"));
    console.log("   grep -r \"Referral\" scripts/ --include=\"*.js\"");
    console.log("   grep -r \"Ranking\" scripts/ --include=\"*.js\"");
    console.log("   grep -r \"Governance\" scripts/ --include=\"*.js\"\n");
    
    console.log(chalk.green("3. 查看部署日志:"));
    console.log("   ls -la scripts/deploy*.js");
    console.log("   grep -h \"0x[a-fA-F0-9]\\{40\\}\" scripts/deploy*.js | sort -u\n");
    
    console.log(chalk.green("4. 运行此脚本:"));
    console.log("   npx hardhat run scripts/check-deployed-addresses.js --network bsc");
}

main()
    .then(() => {
        console.log(chalk.green("\n✅ 检查完成！"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(chalk.red("错误:"), error);
        process.exit(1);
    });