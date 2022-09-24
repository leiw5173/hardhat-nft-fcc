const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();
const fs = require("fs");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainId = network.config.chainId;
  let ethUsdPriceFeedAddress;

  if (developmentChains.includes(network.name)) {
    const EthUsdAggregator = await ethers.getContract("MockV3Aggregator");
    ethUsdPriceFeedAddress = EthUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  }

  const lowSvg = await fs.readFileSync("./images/dynamicNft/frown.svg", {
    encoding: "utf-8",
  });
  const highSvg = await fs.readFileSync("./images/dynamicNft/happy.svg", {
    encoding: "utf-8",
  });

  const args = [ethUsdPriceFeedAddress, lowSvg, highSvg];

  const dynamicNft = await deploy("DynamicSvgNft", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name)) {
    log("Verifying...");
    await verify(dynamicNft.address, args);
  }
};

module.exports.tags = ["all", "dynamicSvg", "main"];
