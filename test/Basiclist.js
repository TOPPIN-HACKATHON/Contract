const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

//Will be truncated
describe("Rent", function () {
  async function deployRentFixture() {
    const [owner, lender, renter, other] = await ethers.getSigners();

    const Rent = await ethers.getContractFactory("Registry");
    let rent = await upgrades.deployProxy(Rent, [owner.address], {
      initializer: "initialize",
    });
    await rent.deployed();
    await rent.setFeecollector(owner.address);

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.connect(owner).deploy();
    await registry.deployed();
    console.log("registry Address : ", registry.address);

    const IntegrationAccount = await ethers.getContractFactory("IntegrationAccount");
    const integrationAccount = await IntegrationAccount.connect(owner).deploy();
    await integrationAccount.deployed();
    console.log("account implementation Address : ", integrationAccount.address);

    const NFT = await ethers.getContractFactory("MyToken");
    const nft = await NFT.connect(owner).deploy();
    await nft.deployed();

    return { rent, nft, registry, integrationAccount, owner, lender, renter };
  }

  describe("Registry", function () {
    it("Deploy should be success", async function () {
      const { rent, nft, registry, integrationAccount, owner } = await loadFixture(deployRentFixture);
      await nft.connect(owner).safeMint(lender.address, 0);
      const eAddress = await registry.connect(owner).account(integrationAccount.address, 0, nft.address, 0, 0)
      await chai.expect(
        registry.connect(owner).createAccount(integrationAccount.address, 0, nft.address, 0, 0, 0)
      ).not.to.be.reverted;
    });

    it("Who's the", async function () {
      const { rent, nft, registry, integrationAccount, owner } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      const eAddress = await registry.connect(owner).account(integrationAccount.address, 0, nft.address, 0, 0)
      await chai.expect(
        registry.connect(owner).createAccount(integrationAccount.address, 0, nft.address, 0, 0, 0)
      ).not.to.be.reverted;
    });

    it("Cannot list if it is paused", async function () {
      const { rent, nft, lender, owner } = await loadFixture(deployRentFixture);
      await rent.setPaused(true);
      await nft.connect(lender).safeMint();
      await chai
        .expect(
          rent
            .connect(lender)
            .NFTlist(nft.address, 0, owner.address, 10, 10, 10)
        )
        .to.be.revertedWith("system paused");
    });

    it("Cannot list if it is already rented", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      //Rent
      await rent.connect(renter).rent(nft.address, 0, 300);
      // Renter rent rented-item
      await chai
        .expect(
          rent
            .connect(renter)
            .NFTlist(nft.address, 0, token.address, 10, 10, 10)
        )
        .to.be.revertedWith("already rented item!");
    });
  });

  describe("modifyList", function () {
    it("Modify collateral token", async function () {
      const { rent, nft, lender, owner, token } = await loadFixture(
        deployRentFixture
      );
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(
        rent.connect(lender).modifyList(nft.address, 0, 0, owner.address)
      ).not.to.be.reverted;
      const info = await rent.viewRentinfo(nft.address, 0);
      await chai.expect(info.collateral_token).to.equal(owner.address);
    });

    it("Modify max rent duration", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).modifyList(nft.address, 0, 1, 500))
        .not.to.be.reverted;
      const info = await rent.viewRentinfo(nft.address, 0);
      await chai.expect(info.maxrent_duration).to.equal(500);
    });

    it("Modify collateral amount", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).modifyList(nft.address, 0, 2, 400))
        .not.to.be.reverted;
      const info = await rent.viewRentinfo(nft.address, 0);
      await chai.expect(info.collateral_amount).to.equal(400);
    });

    it("Modify rent fee per block", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).modifyList(nft.address, 0, 3, 600))
        .not.to.be.reverted;
      const info = await rent.viewRentinfo(nft.address, 0);
      await chai.expect(info.rent_fee_per_block).to.equal(600);
    });

    it("Cannot modify if not owner", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai
        .expect(rent.modifyList(nft.address, 0, 2, 600))
        .to.be.revertedWith("Only lister can do");
    });

    it("Cannot modify if paused", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await rent.setPaused(true);
      await chai
        .expect(rent.connect(lender).modifyList(nft.address, 0, 2, 600))
        .to.be.revertedWith("system paused");
    });
  });

  describe("cancelList", function () {
    it("cancel List with owner", async function () {
      const { rent, nft, lender, owner, token } = await loadFixture(
        deployRentFixture
      );
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).cancelList(nft.address, 0)).not.to
        .be.reverted;
    });

    it("cancel List with operator", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).cancelList(nft.address, 0)).not.to
        .be.reverted;
    });

    it("cannot cancel list if normal user", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai
        .expect(rent.connect(renter).cancelList(nft.address, 0))
        .to.be.revertedWith("Only lister or Operator can do");
    });

    it("Cannot list if it is already rented", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      //Rent
      await rent.connect(renter).rent(nft.address, 0, 300);
      // Renter rent rented-item
      await chai
        .expect(rent.connect(lender).cancelList(nft.address, 0))
        .to.be.revertedWith("already rented item!");
    });

    it("Cannot show cancel finished", async function () {
      const { rent, nft, lender, token } = await loadFixture(deployRentFixture);
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await chai.expect(rent.connect(lender).cancelList(nft.address, 0)).not.to
        .be.reverted;
      const info = await rent.viewRentinfo(nft.address, 0);
      await chai.expect(info.collateral_amount.toString()).to.equal("0");
    });
  });

  describe("Rent", function () {
    it("can Rent", async function () {
      const { rent, nft, lender, renter, token } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.connect(lender).setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai.expect(rent.connect(renter).rent(nft.address, 0, 50)).not.to.be
        .reverted;
    });

    it("cannot rent already rented", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 50);
      await chai
        .expect(rent.connect(renter).rent(nft.address, 0, 50))
        .to.be.revertedWith("Already rented");
    });

    it("cannot rent if paused", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.setPaused(true);
      await chai
        .expect(rent.connect(renter).rent(nft.address, 0, 50))
        .to.be.revertedWith("system paused");
    });

    it("cannot rent more than max rent", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 1000000);
      await token.connect(renter).approve(rent.address, 1e6);
      await chai
        .expect(rent.connect(renter).rent(nft.address, 0, 2000))
        .to.be.revertedWith("You can't rent more than max rent duration");
    });

    it("Should send collateral + rent fee to address this", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 50);
      chai.expect(await token.balanceOf(rent.address)).to.equal("60");
    });

    it("Should receive NFT", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 50);
      chai.expect(await nft.ownerOf(0)).to.equal(renter.address);
    });
  });

  describe("returnNFT", function () {
    it("can return", async function () {
      const { rent, nft, lender, renter, token } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 50);

      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await chai.expect(rent.connect(renter).returnNFT(nft.address, 0)).not.to
        .be.reverted;
    });

    it("cannot return for not list item", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai
        .expect(rent.connect(renter).returnNFT(nft.address, 0))
        .to.be.revertedWith("Not listed && Not rented");
    });

    it("cannot return for not rent item", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai
        .expect(rent.connect(renter).returnNFT(nft.address, 0))
        .to.be.revertedWith("Not listed && Not rented");
    });

    it("cannot return if paused", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.setPaused(true);

      await chai
        .expect(rent.connect(renter).returnNFT(nft.address, 0))
        .to.be.revertedWith("system paused");
    });

    it("cannot return if Timeout", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 1);

      await rent.setPlatformfee(1000);

      await chai
        .expect(rent.connect(renter).returnNFT(nft.address, 0))
        .to.be.revertedWith("Timeout");
    });

    it("cannot return if not renter", async function () {
      const { rent, nft, lender, token, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 50);
      await nft.connect(renter).transferFrom(renter.address, owner.address, 0);

      await chai
        .expect(rent.connect(owner).returnNFT(nft.address, 0))
        .to.be.revertedWith("You are not renter");
    });

    it("Should send collateral to renter, rentfee to lender, platform fee to fee collector", async function () {
      const { rent, nft, token, lender, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 5000, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 500);
      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await rent.connect(renter).returnNFT(nft.address, 0);

      chai.expect(await token.balanceOf(lender.address)).to.equal("4875");
      chai.expect(await token.balanceOf(renter.address)).to.equal("5000");
      chai.expect(await token.balanceOf(owner.address)).to.equal("125");
      chai.expect(await token.balanceOf(rent.address)).to.equal("0");
    });

    it("Should receive NFT", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 5000, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 500);
      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await rent.connect(renter).returnNFT(nft.address, 0);

      chai.expect(await nft.ownerOf(0)).to.equal(lender.address);
    });
  });

  describe("withdrawNFT", function () {
    it("can withdraw", async function () {
      const { rent, nft, lender, renter, token } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 500);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 1);

      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await nft.setApprovalForAll(rent.address, true);
      await chai.expect(rent.connect(lender).withdrawCollateral(nft.address, 0))
        .not.to.be.reverted;
    });

    it("cannot withdraw for not list item", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai
        .expect(rent.connect(lender).withdrawCollateral(nft.address, 0))
        .to.be.revertedWith("Not listed && Not rented");
    });

    it("cannot withdraw for not rent item", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await chai
        .expect(rent.connect(lender).withdrawCollateral(nft.address, 0))
        .to.be.revertedWith("Not listed && Not rented");
    });

    it("cannot withfraw if paused", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 100);
      await rent.setPaused(true);

      await chai
        .expect(rent.connect(lender).withdrawCollateral(nft.address, 0))
        .to.be.revertedWith("system paused");
    });

    it("can withdraw return before Timeout", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 10);

      await chai
        .expect(rent.connect(lender).withdrawCollateral(nft.address, 0))
        .to.be.revertedWith("You can't withdraw collateral now");
    });

    it("cannot withdraw if not holder", async function () {
      const { rent, nft, lender, token, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 500, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);
      await rent.connect(renter).rent(nft.address, 0, 1);
      await nft.connect(renter).transferFrom(renter.address, owner.address, 0);

      await rent.setPlatformfee(1000);

      await chai
        .expect(rent.connect(owner).withdrawCollateral(nft.address, 0))
        .to.be.revertedWith("You are not holder");
    });

    it("Should send collateral, rentfee to lender, platform fee to fee collector", async function () {
      const { rent, nft, token, lender, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 5000, 5000);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 1);
      await nft.connect(renter).setApprovalForAll(rent.address, true);
      await rent.connect(lender).withdrawCollateral(nft.address, 0);

      chai.expect(await token.balanceOf(lender.address)).to.equal("9875");
      chai.expect(await token.balanceOf(renter.address)).to.equal("0");
      chai.expect(await token.balanceOf(owner.address)).to.equal("125");
      chai.expect(await token.balanceOf(rent.address)).to.equal("0");
    });
  });

  describe("Upgrade", function () {
    it("can Upgrade", async function () {
      const { rent, nft, lender, renter, token } = await loadFixture(
        deployRentFixture
      );
      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      console.log("Upgrading Rent...");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);
      console.log("Rent contract upgraded successfully");
    });

    it("Can store List info", async function () {
      const { rent, nft, lender, owner } = await loadFixture(deployRentFixture);

      await nft.connect(lender).safeMint();
      await chai.expect(
        rent.connect(lender).NFTlist(nft.address, 0, owner.address, 10, 10, 10)
      ).not.to.be.reverted;

      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);

      const info = await rent2.viewRentinfo(nft.address, 0);
      await chai.expect(info.collateral_token).to.equal(owner.address);
    });

    it("Can Rent with V1 List", async function () {
      const { rent, nft, lender, token, renter } = await loadFixture(
        deployRentFixture
      );

      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);

      await chai.expect(rent2.connect(renter).rent(nft.address, 0, 50)).not.to
        .be.reverted;
    });

    it("Should Withdraw Work", async function () {
      const { rent, nft, token, lender, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 5000, 5000);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 1);
      await nft.connect(renter).setApprovalForAll(rent.address, true);

      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);

      await rent2.connect(lender).withdrawCollateral(nft.address, 0);

      chai.expect(await token.balanceOf(lender.address)).to.equal("9875");
      chai.expect(await token.balanceOf(renter.address)).to.equal("0");
      chai.expect(await token.balanceOf(owner.address)).to.equal("125");
      chai.expect(await token.balanceOf(rent.address)).to.equal("0");
    });

    it("Should return work", async function () {
      const { rent, nft, token, lender, renter, owner } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 5000, 10);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      await rent.connect(renter).rent(nft.address, 0, 500);
      await nft.connect(renter).setApprovalForAll(rent.address, true);

      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);

      await rent2.connect(renter).returnNFT(nft.address, 0);

      chai.expect(await token.balanceOf(lender.address)).to.equal("4875");
      chai.expect(await token.balanceOf(renter.address)).to.equal("5000");
      chai.expect(await token.balanceOf(owner.address)).to.equal("125");
      chai.expect(await token.balanceOf(rent.address)).to.equal("0");

      chai.expect(await nft.ownerOf(0)).to.equal(lender.address);
    });

    it("Should rent work", async function () {
      const { rent, nft, token, lender, renter } = await loadFixture(
        deployRentFixture
      );
      // NFT mint & approve
      await nft.connect(lender).safeMint();
      await rent
        .connect(lender)
        .NFTlist(nft.address, 0, token.address, 1000, 10, 1);
      await nft.setApprovalForAll(rent.address, true);
      // Token mint & approve
      await token.connect(renter).mint(renter.address, 10000);
      await token.connect(renter).approve(rent.address, 1e6);

      const RentV2 = await ethers.getContractFactory("RentERC721V2");
      const rent2 = await upgrades.upgradeProxy(rent.address, RentV2);
      await chai.expect(await rent2.rentVersion()).to.equal(2);

      await rent2.connect(renter).rent(nft.address, 0, 50);
      chai.expect(await token.balanceOf(rent.address)).to.equal("60");
      chai.expect(await nft.ownerOf(0)).to.equal(renter.address);
    });
  });
});
