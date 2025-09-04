/**
 * 流动性配置管理
 * 可以动态调整参数
 */

module.exports = {
    // 开发环境（当前）
    development: {
        // 使用测试地址
        collectionAddress: '0x5697Ad0e6E19f73f0fB824aEB92Fc1EB7B078Ae9',
        thresholds: {
            minHCF: 100,    // 测试用小额
            minBSDT: 10,    // 测试用小额
        },
        batchSize: {
            maxHCF: 1000,   // 每次最多1000 HCF
            maxBSDT: 100,   // 每次最多100 BSDT
        },
        checkInterval: 5 * 60 * 1000,  // 5分钟（测试）
    },
    
    // 生产环境
    production: {
        // 专用归集地址（需要设置）
        collectionAddress: null,  // 需要设置
        thresholds: {
            minHCF: 1000,   // 正式阈值
            minBSDT: 100,   
        },
        batchSize: {
            maxHCF: 10000,  // 每次最多1万HCF，避免滑点
            maxBSDT: 1000,  
        },
        checkInterval: 10 * 60 * 1000,  // 10分钟
        
        // 滑点保护
        slippage: {
            tolerance: 0.5,  // 0.5%滑点容忍度
            priceImpact: 2,  // 2%最大价格影响
        },
        
        // 安全设置
        safety: {
            requireMultisig: true,      // 需要多签确认
            maxSingleTx: 100000,         // 单笔最大10万HCF
            dailyLimit: 1000000,         // 每日最大100万HCF
            emergencyStop: false,        // 紧急停止开关
        }
    },
    
    // 获取当前配置
    getCurrent() {
        const env = process.env.NODE_ENV || 'development';
        return this[env];
    },
    
    // 验证配置
    validate(config) {
        if (!config.collectionAddress) {
            throw new Error('未设置归集地址');
        }
        if (config.thresholds.minHCF <= 0) {
            throw new Error('HCF阈值必须大于0');
        }
        return true;
    }
};