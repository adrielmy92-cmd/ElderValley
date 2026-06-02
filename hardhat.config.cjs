require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const privateKey = process.env.PRIVATE_KEY;
const baseRpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const baseScanApiKey = process.env.BASESCAN_API_KEY || "";
const deployerAccounts = /^0x[0-9a-fA-F]{64}$/.test(privateKey || "") ? [privateKey] : [];

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    base: {
      url: baseRpcUrl,
      chainId: 8453,
      accounts: deployerAccounts
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // Etherscan API V2: a single multichain key (string), not a per-network map.
  // hardhat-verify has Base mainnet (8453) built in and routes to the V2 endpoint
  // (api.etherscan.io/v2). The old per-network apiKey + customChains apiURL forced
  // the deprecated V1 endpoint, which now rejects requests.
  etherscan: {
    apiKey: baseScanApiKey
  },
  sourcify: {
    enabled: false
  }
};
