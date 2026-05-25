const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("ElderValleyHouses", function () {
  it("mints a house NFT after exact ETH payment", async function () {
    const [owner, buyer] = await ethers.getSigners();
    const Houses = await ethers.getContractFactory("ElderValleyHouses");
    const houses = await Houses.deploy(owner.address);
    await houses.waitForDeployment();

    const redLodgeId = await houses.houseTypeIdByKeyHash(
      ethers.keccak256(ethers.toUtf8Bytes("creative-house-red-lodge"))
    );
    const redLodge = await houses.houseTypes(redLodgeId);

    const tx = await houses.connect(buyer).buyHouse(redLodgeId, { value: redLodge.price });
    await tx.wait();

    assert.equal(await houses.ownerOf(1), buyer.address);
    assert.equal(await houses.balanceOf(buyer.address), 1n);
    assert.equal(await houses.tokenHouseTypeId(1), redLodgeId);
  });

  it("rejects wrong ETH amount", async function () {
    const [owner, buyer] = await ethers.getSigners();
    const Houses = await ethers.getContractFactory("ElderValleyHouses");
    const houses = await Houses.deploy(owner.address);
    await houses.waitForDeployment();

    const greenId = await houses.houseTypeIdByKeyHash(
      ethers.keccak256(ethers.toUtf8Bytes("creative-house-green-cottage"))
    );

    await assert.rejects(
      houses.connect(buyer).buyHouse(greenId, { value: ethers.parseEther("0.01") }),
      /Incorrect ETH amount/
    );
  });
});
