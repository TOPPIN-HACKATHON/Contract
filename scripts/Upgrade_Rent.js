const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [owner, lender, renter] = await ethers.getSigners();

  const Rent = await ethers.getContractFactory("RentERC721");
  const rent = await Rent.attach("0x0791183290153A0D953712dB28907Ee58A1F0000");
  console.log("Rent contract is : ", rent.address);
  const RentV2 = await ethers.getContractFactory("RentERC721V2");
  const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
  await chai.expect(await rent2.rentVersion()).to.equal(2);
  console.log("Rent contract upgraded successfully");
}

main();
