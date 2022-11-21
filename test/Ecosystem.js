const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

describe("Rent", function () {
  async function deployRentFixture() {
    const [owner, lender, renter, other] = await ethers.getSigners();

    const Rent = await ethers.getContractFactory("RentERC721");
    let rent = await upgrades.deployProxy(Rent, [owner.address], {
      initializer: "initialize",
    });
    await rent.deployed();

    await rent.setFeecollector(owner.address);

    const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
    let ecosystem = await upgrades.deployProxy(Ecosystem, {
      initializer: "initialize",
    });
    await ecosystem.deployed();
    await ecosystem.setFeeCollector(owner.address);
    await ecosystem.setRentContract(rent.address);

    const NFT = await ethers.getContractFactory("MyToken721");
    const nft = await NFT.connect(lender).deploy();
    await nft.deployed();

    return { rent, nft, ecosystem, owner, lender, renter, other };
  }

  describe("Deployment", function () {
    it("Should set the right Owner", async function () {
      const { ecosystem, owner } = await loadFixture(deployRentFixture);
      chai.expect(await ecosystem.owner()).to.equal(owner.address);
    });
    it("Should set the right rent", async function () {
      const { ecosystem, rent } = await loadFixture(deployRentFixture);
      chai.expect(await ecosystem.rentContract()).to.equal(rent.address);
    });
    it("Should set the right feeCollector", async function () {
      const { ecosystem, owner } = await loadFixture(deployRentFixture);
      chai.expect(await ecosystem.feeCollector()).to.equal(owner.address);
    });
  });
});
