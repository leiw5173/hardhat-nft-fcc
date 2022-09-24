const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Basic NFT", function () {
      let basicNFT;
      let deployer;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        basicNFT = await ethers.getContract("BasicNft", deployer);
      });
      describe("constructor", function () {
        it("sets the constructor right", async function () {
          const name = await basicNFT.name();
          const symbol = await basicNFT.symbol();
          const tokenCounter = await basicNFT.getTokenCounter();
          assert.equal(name, "Dogie");
          assert.equal(symbol, "DOG");
          assert.equal(tokenCounter, 0);
        });
      });
      describe("mintNft", function () {
        beforeEach(async function () {
          await basicNFT.mintNft();
        });
        it("Add token counter", async function () {
          const tokenCounter = await basicNFT.getTokenCounter();
          assert.equal(tokenCounter, 1);
        });
        it("minter has the nft", async function () {
          const balanceOfDeployer = await basicNFT.balanceOf(deployer);
          assert.equal(balanceOfDeployer, 1);
        });
        it("nft's owner is deployer", async function () {
          const tokenId = await basicNFT.getTokenCounter();
          const owner = await basicNFT.ownerOf(tokenId - 1);
          assert.equal(owner, deployer);
        });
      });
      describe("token url", function () {
        it("get the right token url", async function () {
          await basicNFT.mintNft();
          const tokenUrl = await basicNFT.tokenURI(0);
          assert.equal(
            tokenUrl,
            "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json"
          );
        });
      });
    });
