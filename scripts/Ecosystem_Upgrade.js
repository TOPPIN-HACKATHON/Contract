const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [owner, lender, renter] = await ethers.getSigners();

  const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
  const ecosystem = await Ecosystem.attach(
    "0x280DFc983332030D5a914E35333a16441b7a0CD6"
  );
  console.log("Ecosystem contract is : ", ecosystem.address);
  const EcosystemV2 = await ethers.getContractFactory("EcosystemDistributor");
  const ecosystem2 = await upgrades.upgradeProxy(
    ecosystem.address,
    EcosystemV2
  );
  console.log("Rent contract upgraded successfully");
}

main();
