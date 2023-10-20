const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

// 
describe("TOPPIN", function () {
    async function deployRentFixture() {
        const [owner, lender, renter, other] = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("ERC6551Registry");
        const registry = await Registry.connect(owner).deploy();
        await registry.deployed();

        const Rent = await ethers.getContractFactory("RentContract");
        let rent = await upgrades.deployProxy(Rent, [owner.address], {
            initializer: "initialize",
        });
        await rent.deployed();

        const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
        const integrationAccount = await IntegrationAccount.connect(owner).deploy(rent.address);
        await integrationAccount.deployed();

        const NFT = await ethers.getContractFactory("MyToken");
        const nft = await NFT.connect(owner).deploy();
        await nft.deployed();

        const Item = await ethers.getContractFactory("MyToken");
        const item = await NFT.connect(owner).deploy();
        await item.deployed();

        return { rent, nft, item, registry, integrationAccount, owner, lender, renter };
    }

    describe("Registry", function () {
        it("Deploy should be success", async function () {
            const { rent, nft, registry, integrationAccount, owner, lender } = await loadFixture(deployRentFixture);
            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            await chai.expect(
                registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            ).not.to.be.reverted;
            chai.expect(await nft.ownerOf(0)).to.equal(lender.address);
        });

        it("Who's the Owner of TBA", async function () {
            const { rent, nft, registry, integrationAccount, owner, lender } = await loadFixture(deployRentFixture);
            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
            const TBA = await IntegrationAccount.attach(eAddress);

            await chai.expect(
                registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            ).not.to.be.reverted;
            chai.expect(await nft.ownerOf(0)).to.equal(lender.address);
            chai.expect(await TBA.owner()).to.equal(lender.address);
        });

        it("Transfer Item in TBA", async function () {
            const { rent, nft, item, registry, integrationAccount, owner, lender, renter } = await loadFixture(deployRentFixture);
            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
            const TBA = await IntegrationAccount.attach(eAddress);

            let ABI = ["function transferFrom(address from,address to, uint256 tokenId)"];
            let iface = new ethers.utils.Interface(ABI);
            const data = iface.encodeFunctionData("transferFrom", [TBA.address, renter.address, 0])
            await chai.expect(
                await TBA.connect(lender).execute(item.address, 0, data, 0)
            ).not.to.be.reverted;
        });

        it("Should change owner when NFT transferred", async function () {
            const { rent, nft, registry, integrationAccount, owner, lender, renter } = await loadFixture(deployRentFixture);
            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
            const TBA = await IntegrationAccount.attach(eAddress);

            await chai.expect(
                registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            ).not.to.be.reverted;
            await chai.expect(
                nft.connect(lender).transferFrom(lender.address, renter.address, 0)
            ).not.to.be.reverted;
            chai.expect(await nft.ownerOf(0)).to.equal(renter.address);
            chai.expect(await TBA.owner()).to.equal(renter.address);
        });


        it("Can List", async function () {
            const { rent, nft, registry, integrationAccount, owner, lender, renter } = await loadFixture(deployRentFixture);

            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
            const TBA = await IntegrationAccount.attach(eAddress);

            await chai.expect(
                registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            ).not.to.be.reverted;
            await chai.expect(
                nft.connect(lender).transferFrom(lender.address, renter.address, 0)
            ).not.to.be.reverted;
            chai.expect(await nft.ownerOf(0)).to.equal(renter.address);
            chai.expect(await TBA.owner()).to.equal(renter.address);
        });



    })
})