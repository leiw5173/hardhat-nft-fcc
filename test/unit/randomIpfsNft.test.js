const { rejects } = require("assert");
const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { resolve } = require("path");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("RandomIpfsNft", function () {
      let randomIpfsNft, chainId, mintFee, deployer, vrfCoordinatorV2Mock;

      const dogTOkenUris = [
        "ipfs://QmPsddgwx2s4HE5V9so61eSR3NfGgJMkHgpTRBw1jnmTrH",
        "ipfs://QmYzrvrN5pSqx19qXUCvJm4uau1rcpytPJGzzBkJQDdv82",
        "ipfs://QmPU6NzQQFJKWJ6MukigvnU4D2GWTvcTtSqQu1U735UNqV",
      ];

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        chainId = network.config.chainId;
        await deployments.fixture(["main"]);
        randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer);
        mintFee = await randomIpfsNft.getMintFee();
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
      });
      describe("constructor", function () {
        it("initialize the contract correctly", async function () {
          const gaslane = await randomIpfsNft.getGasLane();
          const callbackGaslimit = await randomIpfsNft.getCallbackGasLimit();
          const dogTokenUri1 = await randomIpfsNft.getDogTokenUris(0);
          const dogTokenUri2 = await randomIpfsNft.getDogTokenUris(1);
          const dogTokenUri3 = await randomIpfsNft.getDogTokenUris(2);
          assert.equal(gaslane.toString(), networkConfig[chainId].gasLane);
          assert.equal(
            callbackGaslimit,
            networkConfig[chainId].callbackGasLimit
          );
          assert.equal(mintFee, networkConfig[chainId].mintFee);
          assert.equal(dogTokenUri1, dogTOkenUris[0]);
          assert.equal(dogTokenUri2, dogTOkenUris[1]);
          assert.equal(dogTokenUri3, dogTOkenUris[2]);
        });
      });
      describe("request NFT", function () {
        it("revert with not enough ETH sent", async function () {
          await expect(randomIpfsNft.requestNft()).to.be.reverted;
        });
        it("request ID to owner", async function () {
          const txResponse = await randomIpfsNft.requestNft({ value: mintFee });
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          const owner = await randomIpfsNft.s_requestIdToSender(
            requestId.toNumber()
          );
          assert.equal(owner, deployer);
        });
      });
      describe("Withdraw function", function () {
        it("withdraw the right amount of ETH", async function () {
          await randomIpfsNft.requestNft({ value: mintFee });
          const startingRandomNftBalance =
            await randomIpfsNft.provider.getBalance(randomIpfsNft.address);
          const startingDeployerBalance =
            await randomIpfsNft.provider.getBalance(deployer);
          const txResponse = await randomIpfsNft.withdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingRandomNftBalance =
            await randomIpfsNft.provider.getBalance(randomIpfsNft.address);
          const endingDeployerBalance = await randomIpfsNft.provider.getBalance(
            deployer
          );

          assert.equal(endingRandomNftBalance, 0);
          assert.equal(
            startingRandomNftBalance.sub(gasCost).toString(),
            endingDeployerBalance.sub(startingDeployerBalance).toString()
          );
        });
      });
      describe("fullfill random words", function () {
        let txReceipt, tokenCounter;
        beforeEach(async function () {
          const txResponse = await randomIpfsNft.requestNft({ value: mintFee });
          txReceipt = await txResponse.wait(1);
        });
        it("set up the right token URIs", async function () {
          await new Promise(async (resolve, reject) => {
            randomIpfsNft.once("NftMinted", async () => {
              try {
                const tokenUri = await randomIpfsNft.tokenURI(0);
                tokenCounter = await randomIpfsNft.getTokenCounter();
                const owner = await randomIpfsNft.ownerOf(0);
                assert.equal(owner, deployer);
                assert.equal(tokenCounter.toNumber(), 1);
                assert.equal(tokenUri.toString().includes("ipfs://"), true);
                resolve();
              } catch (e) {
                console.log(e);
                reject(e);
              }
            });
            try {
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args.requestId,
                randomIpfsNft.address
              );
            } catch (e) {
              console.log(e);
              reject(e);
            }
          });
        });
      });
      describe("get bread from modded rng", function () {
        it("should return Rug when modded rng is between 0-9", async function () {
          const breadIndex = await randomIpfsNft.getBreedFromModdedRng(7);
          assert.equal(breadIndex, 0);
        });
        it("should return SHIBA_INU when modded rng is between 10-29", async function () {
          const breadIndex = await randomIpfsNft.getBreedFromModdedRng(25);
          assert.equal(breadIndex, 1);
        });
        it("should return ST_BERNARD when modded rng is between 30-99", async function () {
          const breadIndex = await randomIpfsNft.getBreedFromModdedRng(96);
          assert.equal(breadIndex, 2);
        });
        it("should revert when moddedRng is larger than 99", async function () {
          expect(await randomIpfsNft.getBreedFromModdedRng(100)).to.be.reverted;
        });
      });
    });
