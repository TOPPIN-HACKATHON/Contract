const { ethers, upgrades } = require("hardhat");

async function main() {
  const [owner, lender, renter, other] = await ethers.getSigners();

  const Rent = await ethers.getContractFactory("Rentropy721");
  const rent = await Rent.attach("0x9e485A535E10dA2E6A39dB1D9242383529cF20d9");
  const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
  const ecosystem = await Ecosystem.attach(
    "0xD8A777d5265a3f9a4bD1d82F91541880d6F6A55d"
  );
  const Token = await ethers.getContractFactory("MyToken20");
  const token = await Token.attach(
    "0x9466a45072E91ff5AbA7e084E5ea74531f09731a"
  );
  const token2 = await Token.attach(
    "0x5DaC1B573049Ea4Daae18aFaeD36Da79069B5ddD"
  );

  // await ecosystem.addReward(token2.address);

  // await ecosystem.setRewardsDuration(0);
  // await ecosystem.getFee();
  // await ecosystem.setRewardsDuration(86400 * 7);

  // await ecosystem.connect(owner).harvest(2);

  // await ecosystem.connect(lender).harvest(2);
}

main();
