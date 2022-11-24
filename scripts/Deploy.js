const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [owner, lender, renter, other] = await ethers.getSigners();

  const Rent = await ethers.getContractFactory("Rentropy721");
  let rent = await upgrades.deployProxy(Rent, [owner.address], {
    initializer: "initialize",
  });
  await rent.deployed();

  await rent.setFeecollector(owner.address);

  console.log("rent Address : ", rent.address);

  const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
  let ecosystem = await upgrades.deployProxy(Ecosystem, {
    initializer: "initialize",
  });
  await ecosystem.deployed();
  console.log("EcosystemAddress : ", ecosystem.address);
  await ecosystem.setFeeCollector(owner.address);
  await ecosystem.setRentContract(rent.address);
  await rent.setEcosystem(ecosystem.address);

  await rent.setEcoRward(3, 5, 1);
}

main();
