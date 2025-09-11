const { ethers } = require("hardhat");

async function main() {
  console.log(" Deploying Sovico Passport NFT Contract...");

  // Get the contract factory
  const SovicoPassport = await ethers.getContractFactory("SovicoPassport");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(" Deploying contract with account:", deployer.address);
  console.log(" Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy the contract with the deployer as the initial owner
  const sovicoPassport = await SovicoPassport.deploy(deployer.address);
  
  // Wait for deployment to complete
  await sovicoPassport.waitForDeployment();
  
  const contractAddress = await sovicoPassport.getAddress();
  console.log(" SovicoPassport deployed to:", contractAddress);
  
  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const name = await sovicoPassport.name();
  const symbol = await sovicoPassport.symbol();
  const owner = await sovicoPassport.owner();
  const totalSupply = await sovicoPassport.totalSupply();
  
  console.log(" Contract Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Owner:", owner);
  console.log("   Total Supply:", totalSupply.toString());
  
  // Mint a few demo passports
  console.log("\n Minting demo passports...");
  
  const demoAddresses = [
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", // Demo address 1
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", // Demo address 2
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
  ];
  
  for (let i = 0; i < demoAddresses.length; i++) {
    try {
      const tx = await sovicoPassport.safeMint(demoAddresses[i]);
      await tx.wait();
      console.log(`    Minted passport #${i} to ${demoAddresses[i]}`);
    } catch (error) {
      console.log(`    Failed to mint to ${demoAddresses[i]}:`, error.message);
    }
  }
  
  // Update passport data for demo
  console.log("\n Updating demo passport data...");
  try {
    // Update original passport data
    const updateTx = await sovicoPassport.updatePassportData(
      0, // Token ID 0
      "Platinum", // New tier
      25000, // SVT earned
      8, // Achievement count
      4  // NFT count
    );
    await updateTx.wait();
    console.log("    Updated passport #0 to Platinum tier");
    
    // Update enhanced passport data with new rank and badges
    const updateEnhancedTx1 = await sovicoPassport.updatePassport(
      0, // Token ID 0
      "Platinum", // New rank
      "frequent_flyer" // New badge
    );
    await updateEnhancedTx1.wait();
    console.log("    Updated passport #0 rank to Platinum and added frequent_flyer badge");
    
    // Add more badges
    const updateEnhancedTx2 = await sovicoPassport.updatePassport(
      0, // Token ID 0
      "Platinum", // Keep same rank
      "early_adopter" // Another badge
    );
    await updateEnhancedTx2.wait();
    console.log("    Added early_adopter badge to passport #0");
    
    const updateEnhancedTx3 = await sovicoPassport.updatePassport(
      0, // Token ID 0
      "Diamond", // Upgrade rank
      "vip_member" // VIP badge
    );
    await updateEnhancedTx3.wait();
    console.log("    Upgraded passport #0 to Diamond rank and added vip_member badge");
    
    // Test the new getter functions
    console.log("\n Testing enhanced passport data retrieval...");
    const enhancedData = await sovicoPassport.getEnhancedPassportData(0);
    console.log("   Rank:", enhancedData.rank);
    console.log("   Badges:", enhancedData.badges);
    
    const rank = await sovicoPassport.getPassportRank(0);
    console.log("   Current Rank:", rank);
    
    const badges = await sovicoPassport.getPassportBadges(0);
    console.log("   Current Badges:", badges);
    
    // Test tokenURI generation
    console.log("\n Testing dynamic tokenURI generation...");
    const tokenURI = await sovicoPassport.tokenURI(0);
    console.log("   Token URI (first 100 chars):", tokenURI.substring(0, 100) + "...");
    
    // Decode and display the JSON metadata
    if (tokenURI.startsWith("data:application/json;base64,")) {
      const base64Data = tokenURI.substring(29); // Remove "data:application/json;base64," prefix
      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      console.log("    Decoded JSON Metadata:");
      console.log(JSON.stringify(JSON.parse(jsonString), null, 2));
    }
    
  } catch (error) {
    console.log("    Failed to update passport data:", error.message);
  }
  
  console.log("\n Deployment completed successfully!");
  console.log(" Summary:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Network:", (await deployer.provider.getNetwork()).name);
  console.log("   Block Number:", await deployer.provider.getBlockNumber());
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: (await deployer.provider.getNetwork()).name,
    blockNumber: await deployer.provider.getBlockNumber(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("    Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
