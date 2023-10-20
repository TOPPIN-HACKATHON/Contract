const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

//Renting Feature will be updated soon
describe("TOPPIN", function () {
    async function deployRentFixture() {
        const [owner, lender, renter, other] = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("ERC6551Registry");
        const registry = await Registry.connect(owner).deploy();
        await registry.deployed();

        const Rent = await ethers.getContractFactory("Rentropy721");
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

        const Token = await ethers.getContractFactory("MyToken20");
        const token = await Token.connect(renter).deploy();
        await token.deployed();

        return { rent, nft, item, registry, token, integrationAccount, owner, lender, renter };
    }

    describe("Registry", function () {
        it("Can List", async function () {
            const { rent, nft, token, registry, integrationAccount, owner, lender, renter } = await loadFixture(deployRentFixture);
            await nft.connect(owner).safeMint(lender.address, 0);
            const eAddress = await registry.connect(owner).account(integrationAccount.address, 31337, nft.address, 0, 0)
            await chai.expect(
                registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            ).not.to.be.reverted;
            const IntegrationAccount = await ethers.getContractFactory("IntegrationERC6551Account");
            const TBA = await IntegrationAccount.attach(eAddress);


            await rent.connect(lender).list(TBA.address, nft.address, 0, token.address, 100, 100)

        });



    })
})