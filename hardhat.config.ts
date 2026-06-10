import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    somnia_testnet: {
      url: process.env.SOMNIA_TESTNET_RPC ?? "https://api.infra.testnet.somnia.network",
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    somnia_mainnet: {
      url: process.env.SOMNIA_MAINNET_RPC ?? "https://api.infra.mainnet.somnia.network",
      chainId: 5031,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      somnia_testnet: "empty",
      somnia_mainnet: "empty",
    },
    customChains: [
      {
        network: "somnia_testnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
      {
        network: "somnia_mainnet",
        chainId: 5031,
        urls: {
          apiURL: "https://explorer.somnia.network/api/",
          browserURL: "https://explorer.somnia.network",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
