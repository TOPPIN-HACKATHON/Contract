const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [owner, lender, renter] = await ethers.getSigners();

  const Rent = await ethers.getContractFactory("Rentropy721");
  const rent = await Rent.attach("0x9e485A535E10dA2E6A39dB1D9242383529cF20d9");
  const Ecosystem = await ethers.getContractFactory("EcosystemDistributor");
  const ecosystem = await Ecosystem.attach(
    "0xD8A777d5265a3f9a4bD1d82F91541880d6F6A55d"
  );
  const NFT = await ethers.getContractFactory("MyToken721");
  const nft = await NFT.attach("0xb28eb9b9efa9e500cd7e5c9007560f13424c40bd");
  const Token = await ethers.getContractFactory("MyToken20");
  const token = await Token.attach(
    "0x9466a45072E91ff5AbA7e084E5ea74531f09731a"
  );

  /* ========== List, Cancel Loop ==========*/
  // setInterval(async () => {
  //   if (
  //     (await rent.viewRentinfo(nft.address, 0)).lender_address == owner.address
  //   ) {
  //     await rent.connect(owner).cancelList(nft.address, 0);
  //     console.log("Canceled!");
  //   } else {
  //     await rent
  //       .connect(owner)
  //       .NFTlist(nft.address, 0, token.address, 100, 10, 100, 10);
  //     console.log("Listed!");
  //   }
  // }, "5000");

  /*  ============ Modify Loop ========*/

  // setInterval(async () => {
  //   await rent
  //     .connect(owner)
  //     .modifyList(
  //       nft.address,
  //       0,
  //       Math.floor(Math.random() * 5),
  //       Math.floor(Math.random() * 100)
  //     );
  //   console.log("Modified!!");
  // }, "5000");

  /* =========== List & Rent & Return Loop ===========*/

  setInterval(async () => {
    if (
      (await rent.viewRentinfo(nft.address, 0)).lender_address ==
      "0x0000000000000000000000000000000000000000"
    ) {
      await rent
        .connect(owner)
        .NFTlist(nft.address, 0, token.address, 100, 0, 0, 50000);
      console.log("Listed!");
    } else if (
      (await rent.viewRentinfo(nft.address, 0)).renter_address ==
      "0x0000000000000000000000000000000000000000"
    ) {
      await rent.connect(lender).rent(nft.address, 0, 50);
      console.log("Rented!");
    } else {
      await rent.connect(lender).returnNFT(nft.address, 0);
      console.log("Returned!");
    }
  }, "5000");
}

main();
