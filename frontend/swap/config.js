// 合约配置
const CONFIG = {
    // BSC主网配置
    chainId: 56,
    chainName: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    
    // 合约地址（使用最新部署的）
    contracts: {
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        BSDT: '0x3932968a904Bf6773E8a13F1D2358331B9a1a530',  // ProtectedBSDT
        HCF: '0xE0A4a6a7f35b803596008D2F7e69D6Cc1Bc6f192',    // 新HCF 10亿
        Gateway: '0x6b5462814DC6ffB2a66D5E45Ab5b5d11Dcc1a033', // BSDTGateway
        Router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',   // PancakeRouter
        Factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'  // PancakeFactory
    },
    
    // ABI片段
    abis: {
        ERC20: [
            'function balanceOf(address) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'event Transfer(address indexed from, address indexed to, uint256 value)',
            'event Approval(address indexed owner, address indexed spender, uint256 value)'
        ],
        
        Gateway: [
            'function exchangeUSDTtoBSDT(uint256 usdtAmount) returns (bool)',
            'function EXCHANGE_RATE() view returns (uint256)',
            'event USDTExchanged(address indexed user, uint256 usdtAmount, uint256 bsdtAmount)'
        ],
        
        Router: [
            'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
            'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
            'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)'
        ],
        
        Factory: [
            'function getPair(address tokenA, address tokenB) view returns (address pair)'
        ]
    },
    
    // 默认设置
    settings: {
        slippage: 3, // 3% 滑点
        deadline: 20 * 60, // 20分钟
        gasLimit: 500000,
        maxApprove: '115792089237316195423570985008687907853269984665640564039457584007913129639935' // 2^256 - 1
    }
};