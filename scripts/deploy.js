const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const RideSharing = await hre.ethers.getContractFactory('RideSharing');
    const contract = await RideSharing.deploy();
    await contract.deployed();

    console.log(`CryptoToken deployed to: ${contract.address}`);
    console.log(`Deploying contract with: ${deployer.address} `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
