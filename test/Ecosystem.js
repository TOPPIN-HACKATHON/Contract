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

    const NFT = await ethers.getContractFactory("MyToken721");
    const nft = await NFT.connect(lender).deploy();
    await nft.deployed();

    const Token = await ethers.getContractFactory("MyToken20");
    const token = await Token.connect(renter).deploy();
    await token.deployed();

    return { rent, nft, token, owner, lender, renter, other };
  }

  describe("Deployment", function () {
    it("Should set the right Operator", async function () {
      const { rent, owner } = await loadFixture(deployRentFixture);
      chai.expect(await rent.operator()).to.equal(owner.address);
    });

    it("Should set the platform fee", async function () {
      const { rent } = await loadFixture(deployRentFixture);
      chai.expect(await rent.platform_fee()).to.equal(25000);
    });

    it("Should set the kick incentive", async function () {
      const { rent } = await loadFixture(deployRentFixture);
      chai.expect(await rent.kick_incentive()).to.equal(10000);
    });

    it("Should set the execution delay", async function () {
      const { rent } = await loadFixture(deployRentFixture);
      chai.expect(await rent.execution_delay()).to.equal(60 * 60 * 24 * 2);
    });

    it("Paused?", async function () {
      const { rent } = await loadFixture(deployRentFixture);
      chai.expect(await rent.paused()).to.equal(false);
    });
  });
});
