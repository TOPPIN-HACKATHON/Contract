const { ethers, upgrades } = require("hardhat");

const PROXY = "0x935b177AE396eDD723Fee35f5Ccda3F45B88a984";

async function main() {
  const [lender, renter] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("MyToken721");
  //   const nft = await NFT.connect(lender).deploy();
  //   console.log(nft.address)
  const nft = await NFT.attach("0xb28eB9B9Efa9E500cD7E5C9007560F13424C40bd");

  //       setInterval(async () => {
  //         await nft.connect(lender).safeMint()
  //   }, "5000")

  //     setInterval(async () => {
  //   if ((await nft.ownerOf(0)) == lender.address)  {
  //       await nft.connect(lender).transferFrom(lender.address, renter.address, 0);
  //       console.log("Transfer lender to renter!")

  //   } else {
  //       await nft.connect(renter).transferFrom(renter.address, lender.address, 0);
  //       console.log("Transfer renter to lender!")
  //   }
  // }, "3000")

  setInterval(async () => {
    if ((await nft.ownerOf(0)) == lender.address) {
      await nft.connect(lender).transferFrom(lender.address, renter.address, 0);
      console.log("Transfer0 lender to renter!");
    } else {
      await nft.connect(renter).transferFrom(renter.address, lender.address, 0);
      console.log("Transfer0 renter to lender!");
    }
  }, "10000");
}

main();
