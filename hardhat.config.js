require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 5000000000, // 5 gwei (降低gas价格)
      gas: 8000000, // 设置gas限制
      timeout: 120000 // 增加超时时间
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  }
};
