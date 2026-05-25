require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const privateKey = process.env.PRIVATE_KEY;
const baseRpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

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
      accounts: privateKey && privateKey !== "never_commit_your_private_key_here"
        ? [privateKey]
        : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
