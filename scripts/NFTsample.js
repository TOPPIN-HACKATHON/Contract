const { ethers, upgrades } = require("hardhat");

async function main() {
  const [owner, lender, renter] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("MyToken721");
    // const nft = await NFT.connect(owner).deploy();
    // console.log(nft.address);
  const nft = await NFT.attach("0x638bf14a53891f0d667753473d322fb5d3400a95");
//     for (i = 0; i < 10; i++) {
//       await nft.connect(owner).safeMint();
//       setTimeout(() => {
//         console.log(nft.balanceOf(lender.address));
//       }, 2000);
//       await nft.connect(owner).transferFrom(owner.address, lender.address, i)
//       setTimeout(() => {
//           console.log("Hello!")
//       }, 2000)
//     }

  await nft.connect(owner).safeMint();
}
main();
