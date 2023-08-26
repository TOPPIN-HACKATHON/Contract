require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          evmVersion: "london",
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["test", "local"],
    },
    hardhat: {},
    // cypress: {
    //   url: "https://public-node-api.klaytnapi.com/v1/cypress",
    //   chainId: 8217,
    //   gasPrice: 750000000000,
    //   accounts: [
    //     process.env.PRIVATE_KEY1,
    //     process.env.PRIVATE_KEY2,
    //     process.env.PRIVATE_KEY3,
    //   ],
    //   live: true,
    //   saveDeployments: true,
    //   tags: ["mainnet"],
  },
  // baobab: {
  //   url: "https://kaikas.baobab.klaytn.net:8651",
  //   chainId: 1001,
  //   accounts: [
  //     process.env.PRIVATE_KEY1,
  //     process.env.PRIVATE_KEY2,
  //     process.env.PRIVATE_KEY3,
  //     process.env.PRIVATE_KEY4,
  //   ],
  //   gas: 8500000,
  //   gasPrice: 750000000000,
  //   live: true,
  //   saveDeployments: true,
  //   tags: ["test", "testnet"],
  // },
  coverage: {
    url: "http://localhost:8555",
  },
}
