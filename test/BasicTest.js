const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);


describe("TOPPIN", function () {
    async function deployRentFixture() {
        const [owner, lender, renter, other] = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("ERC6551Registry");
        const registry = await Registry.connect(owner).deploy();
        await registry.deployed();

        const Rent = await ethers.getContractFactory("RentContract");
        const rent = await Rent.connect(owner).deploy();
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
            const data2 = "0x23b872dd000000000000000000000000ac26e3d2afa1570439007403a8227dab2090ca400000000000000000000000004b20993bc481177ec7e8f571cecae8a9e22c02db0000000000000000000000000000000000000000000000000000000000000000"

            await item.connect(owner).safeMint(owner.address, 0);
            console.log(await item.ownerOf(0))
            await item.connect(owner).transferFrom(owner.address, TBA.address, 0)
            console.log(await item.ownerOf(0))
            await TBA.connect(lender).execute(item.address, 0, data2, 0)
            console.log(await item.ownerOf(0))

            // await chai.expect(
            //     registry.connect(owner).createAccount(integrationAccount.address, 31337, nft.address, 0, 0, [])
            // ).not.to.be.reverted;
            // chai.expect(await nft.ownerOf(0)).to.equal(lender.address);
            // chai.expect(await TBA.owner()).to.equal(lender.address);
            // await item.connect(lender.address).setApprovalForAll(TBA.address, true);

            // await chai.expect(
            //     item.connect(lender).transferFrom(TBA.address, renter.address, 0)
            // ).not.to.be.reverted;
            // chai.expect(await item.ownerOf(0)).to.equal(renter.address);
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



    })
})