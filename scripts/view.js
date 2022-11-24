const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [owner, lender, renter] = await ethers.getSigners();
  const Rent = await ethers.getContractFactory("Rentropy721");
  const rent = await Rent.attach("0x9e485A535E10dA2E6A39dB1D9242383529cF20d9");
  const NFT = await ethers.getContractFactory("MyToken721");
  const Token = await ethers.getContractFactory("MyToken20");
  const token = await Token.attach(
    "0x9466a45072E91ff5AbA7e084E5ea74531f09731a"
  );
  const token2 = await Token.attach(
    "0x5DaC1B573049Ea4Daae18aFaeD36Da79069B5ddD"
  );
  const nft = await NFT.attach("0xb28eB9B9Efa9E500cD7E5C9007560F13424C40bd");

  const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
  const ecosystem = await Ecosystem.attach(
    "0xD8A777d5265a3f9a4bD1d82F91541880d6F6A55d"
  );

  console.log(await ecosystem.userContribution(lender.address));
  console.log(await ecosystem.userContribution(owner.address));

  console.log("epoch");
  console.log(await ecosystem.epoch());
  console.log("epoch2");
  console.log(await ecosystem.epochTokenDistribution(2, token.address));
  console.log(await ecosystem.epochTotalContribution(2));
  console.log(await ecosystem.epochUserContribution(2, owner.address));
  console.log(await ecosystem.epochUserContribution(2, lender.address));
  console.log("epoch3");
  console.log(await ecosystem.epochTokenDistribution(3, token.address));
  console.log(await ecosystem.epochTokenDistribution(3, token2.address));
  console.log(await ecosystem.epochTotalContribution(3));
  console.log(await ecosystem.epochUserContribution(3, owner.address));
  console.log(await ecosystem.epochUserContribution(3, lender.address));
  console.log("epoch4");
  console.log(await ecosystem.epochTokenDistribution(4, token.address));
  console.log(await ecosystem.epochTokenDistribution(4, token2.address));
  console.log(await ecosystem.epochTotalContribution(4));
  console.log(await ecosystem.epochUserContribution(4, owner.address));
  console.log(await ecosystem.epochUserContribution(4, lender.address));

  console.log("Owner ClaimableRewards");
  console.log(await ecosystem.claimableRewards(owner.address));
  console.log("Lender ClaimableRewards");
  console.log(await ecosystem.claimableRewards(lender.address));
}

main();
