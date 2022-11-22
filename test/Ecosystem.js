const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

describe("Ecosystem", function () {
  async function deployRentFixture() {
    const [owner, lender, renter, other] = await ethers.getSigners();

    const Rent = await ethers.getContractFactory("Rentropy721");
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
    await rent.setEcosystem(ecosystem.address);
    await rent.setEcoRward(3, 5, 1);

    const NFT = await ethers.getContractFactory("MyToken721");
    const nft = await NFT.connect(lender).deploy();
    await nft.deployed();

    const Token = await ethers.getContractFactory("MyToken20");
    const token = await Token.connect(renter).deploy();
    await token.deployed();

    return { rent, nft, ecosystem, token, owner, lender, renter, other };
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
    it("Should set the right Ecosystem", async function () {
      const { ecosystem, rent, owner } = await loadFixture(deployRentFixture);
      chai.expect(await rent.ecosystem()).to.equal(ecosystem.address);
    });
  });

  describe("Owner has Control", function () {
    it("Owner can add reward", async function () {
      const { ecosystem, owner, token } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      chai.expect(await ecosystem.rewardTokens(0)).to.equal(token.address);
    });
    it("Owner can remove reward", async function () {
      const { ecosystem, owner, token, lender } = await loadFixture(
        deployRentFixture
      );
      await ecosystem.connect(owner).addReward(token.address);
      await ecosystem.connect(owner).addReward(lender.address);
      chai.expect(await ecosystem.rewardTokens(1)).to.equal(lender.address);
      await ecosystem.connect(owner).removeReward(1);
      result = await ecosystem.viewRewards();
      chai.expect(result.length).to.equal(1);
    });
    it("Owner can setRewardDuration", async function () {
      const { ecosystem, owner, token } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).setRewardsDuration(1000);
      chai.expect(await ecosystem.rewardsDuration()).to.equal(1000);
    });
    it("User cannot add reward", async function () {
      const { ecosystem, lender, token } = await loadFixture(deployRentFixture);
      await chai.expect(ecosystem.connect(lender).addReward(token.address)).to
        .be.reverted;
    });
  });

  describe("Fee distribute!", function () {
    it("Fee goes to Ecosystem!", async function () {
      const { ecosystem, owner, token } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      await token.connect(owner).mint(owner.address, 1000);
      await token.connect(owner).approve(ecosystem.address, 1000);
      await ecosystem.connect(owner).setRewardsDuration(0);
      await ecosystem.connect(owner).getFee();
      await chai
        .expect(await token.balanceOf(ecosystem.address))
        .to.equal(1000);
    });

    it("Epoch goes Up!", async function () {
      const { ecosystem, owner, token } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      await token.connect(owner).mint(owner.address, 1000);
      await token.connect(owner).approve(ecosystem.address, 1000);
      await ecosystem.connect(owner).setRewardsDuration(0);
      await ecosystem.connect(owner).getFee();
      await chai.expect(await ecosystem.epoch()).to.equal(1);
    });

    it("set epochTokenDistribution!", async function () {
      const { ecosystem, owner, token } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      await token.connect(owner).mint(owner.address, 1000);
      await token.connect(owner).approve(ecosystem.address, 1000);
      await ecosystem.connect(owner).setRewardsDuration(0);
      await ecosystem.connect(owner).getFee();
      await chai
        .expect(await ecosystem.epochTokenDistribution(1, token.address))
        .to.equal(1000);
    });
  });

  describe("AddContribution", function () {
    it("EcoReward setting", async function () {
      const { ecosystem, rent, owner, token } = await loadFixture(
        deployRentFixture
      );
      await rent.setEcoRward(3, 5, 1);
      await chai.expect(await rent.ecoList()).to.equal(3);
      await chai.expect(await rent.ecoRent()).to.equal(5);
      await chai.expect(await rent.ecoKick()).to.equal(1);
    });
    it("onlyRentContract can addContribution", async function () {
      const { ecosystem, rent, owner, token } = await loadFixture(
        deployRentFixture
      );
      await chai
        .expect(ecosystem.connect(owner).addContribution(owner.address, 3))
        .to.be.revertedWith("access denied");
    });

    it("Contribution goes Up when Rent!", async function () {
      const { ecosystem, token, nft, rent, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1, 100);
      await nft.connect(lender).setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai.expect(rent.connect(renter).rent(nft.address, 0, 50)).not.to.be
        .reverted;

      await chai
        .expect(await ecosystem.userContribution(lender.address))
        .to.equal(3);
      await chai
        .expect(await ecosystem.userContribution(renter.address))
        .to.equal(5);
    });

    it("Contribution goes Up when Kick!", async function () {
      const { ecosystem, token, nft, rent, lender, renter, other, owner } =
        await loadFixture(deployRentFixture);
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 1);
      await rent.connect(owner).setExecutiondelay(1);

      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await nft.setApprovalForAll(rent.address, true);
      await chai.expect(rent.connect(other).kick(nft.address, 0)).not.to.be
        .reverted;
      await chai
        .expect(await ecosystem.userContribution(lender.address))
        .to.equal(3);
      await chai
        .expect(await ecosystem.userContribution(renter.address))
        .to.equal(5);
      await chai
        .expect(await ecosystem.userContribution(other.address))
        .to.equal(1);
    });
  });

  describe("Harvest", function () {
    it("Harvest doesn't work if shutdown", async function () {
      const { ecosystem, owner, lender } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).shutdown(true);
      await chai
        .expect(ecosystem.connect(lender).harvest(0))
        .to.be.revertedWith("ShutDown");
    });
    it("Cannot Harvest more than Contribution", async function () {
      const { ecosystem, lender, token, nft, renter, owner, rent } =
        await loadFixture(deployRentFixture);
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 1);
      await rent.connect(owner).setExecutiondelay(1);

      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await nft.setApprovalForAll(rent.address, true);
      await ecosystem.connect(owner).addReward(token.address);
      await token.connect(owner).mint(owner.address, 1000);
      await token.connect(owner).approve(ecosystem.address, 1000);
      await ecosystem.connect(owner).setRewardsDuration(0);
      await ecosystem.connect(owner).getFee();
      await chai
        .expect(ecosystem.connect(lender).harvest(4))
        .to.be.revertedWith("You cannot harvest more than your contribution");
    });
    it("Harvest Work", async function () {
      const { ecosystem, token, nft, rent, lender, renter, other, owner } =
        await loadFixture(deployRentFixture);
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1, 100);
      await nft.connect(lender).setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai.expect(rent.connect(renter).rent(nft.address, 0, 50)).not.to.be
        .reverted;

      await ecosystem.connect(owner).addReward(token.address);
      await token.connect(owner).mint(owner.address, 1000);
      await token.connect(owner).approve(ecosystem.address, 1000);
      await ecosystem.connect(owner).setRewardsDuration(0);
      await ecosystem.connect(owner).getFee();
      await chai
        .expect(await token.balanceOf(ecosystem.address))
        .to.equal(1000);

      await ecosystem.connect(renter).harvest(3);
      chai.expect(await ecosystem.userContribution(renter.address)).to.equal(2);
      chai
        .expect(await ecosystem.epochUserContribution(1, renter.address))
        .to.equal(3);
      result = await ecosystem.Info(1);
      chai.expect(result.totalContribution).to.equal(3);
    });
  });

  describe("Claim", function () {
    it("Claim doesn't work if shutdown", async function () {
      const { ecosystem, owner, lender } = await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).shutdown(true);
      await chai
        .expect(ecosystem.connect(lender).claim())
        .to.be.revertedWith("ShutDown");
    });
    it("ClaimableRewards increase after fee distribute", async function () {
      const { ecosystem, lender, token, nft, renter, owner, rent } =
        await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      await rentFn(lender, token, nft, renter, rent);
      await distributeFee(ecosystem, token, owner);

      await ecosystem.connect(lender).harvest(1);
      await ecosystem.connect(renter).harvest(1);
      await distributeFee(ecosystem, token, owner);
      await ecosystem.connect(lender).harvest(2);
      await distributeFee(ecosystem, token, owner);
    });
    it("Claim Work", async function () {
      const { ecosystem, token, nft, rent, lender, renter, other, owner } =
        await loadFixture(deployRentFixture);
      await ecosystem.connect(owner).addReward(token.address);
      await rentFn(lender, token, nft, renter, rent);
      await distributeFee(ecosystem, token, owner);

      await ecosystem.connect(lender).harvest(1);
      await ecosystem.connect(renter).harvest(3);
      await distributeFee(ecosystem, token, owner);
      await ecosystem.connect(lender).harvest(2);
      await distributeFee(ecosystem, token, owner);
      await ecosystem.connect(lender).claim();

      chai.expect(await token.balanceOf(lender.address)).to.equal(1250);
    });
  });
});

async function rentFn(lender, token, nft, renter, rent) {
  // NFT mint & approve
  await nft.connect(lender).safeMint();
  await rent
    .connect(lender)
    .NFTlist(nft.address, 0, token.address, 1000, 10, 1, 10);
  await nft.connect(lender).setApprovalForAll(rent.address, true);
  // Token mint & approve
  await token.connect(renter).mint(renter.address, 10000);
  await token.connect(renter).approve(rent.address, 1e6);
  await rent.connect(renter).rent(nft.address, 0, 1);
}

async function distributeFee(ecosystem, token, owner) {
  await token.connect(owner).mint(owner.address, 1000);
  await token.connect(owner).approve(ecosystem.address, 1000);
  await ecosystem.connect(owner).setRewardsDuration(0);
  await ecosystem.connect(owner).getFee();
}
