const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting SovicoPassport deployment...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  // Deploy contract
  console.log("📦 Deploying SovicoPassport contract...");
  const SovicoPassport = await hre.ethers.getContractFactory("SovicoPassport");
  const sovicoPassport = await SovicoPassport.deploy();
  
  await sovicoPassport.deployed();
  
  console.log("✅ SovicoPassport deployed to:", sovicoPassport.address);
  console.log("🔗 Transaction hash:", sovicoPassport.deployTransaction.hash);
  
  // Save deployment info to file
  const deploymentInfo = {
    SovicoPassport: {
      address: sovicoPassport.address,
      network: hre.network.name,
      deployed_at: new Date().toISOString(),
      deployer: deployer.address,
      tx_hash: sovicoPassport.deployTransaction.hash
    }
  };
  
  const deploymentPath = path.join(__dirname, "..", "deployed_contracts.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to deployed_contracts.json");
  
  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await sovicoPassport.deployTransaction.wait(2);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Test minting
  console.log("1️⃣ Testing mint function...");
  const mintTx = await sovicoPassport.safeMint(deployer.address);
  await mintTx.wait();
  console.log("✅ Minted token #0 to deployer");
  
  // Test getting passport data
  console.log("2️⃣ Testing getPassportData function...");
  const passportData = await sovicoPassport.getPassportData(0);
  console.log("📋 Initial passport data:", {
    memberTier: passportData[0],
    ecosystemLevel: passportData[1],
    svtEarned: passportData[2].toString(),
    achievements: passportData[3].toString(),
    nftsOwned: passportData[4].toString(),
    isActive: passportData[5]
  });
  
  // Test updating passport data
  console.log("3️⃣ Testing updatePassportData function...");
  const updateTx = await sovicoPassport.updatePassportData(0, "Gold", 1000, 5, 2);
  await updateTx.wait();
  console.log("✅ Updated passport data");
  
  // Test enhanced passport functions
  console.log("4️⃣ Testing enhanced passport functions...");
  const updateEnhancedTx = await sovicoPassport.updatePassport(0, "Platinum", "early_adopter");
  await updateEnhancedTx.wait();
  console.log("✅ Updated rank and added badge");
  
  // Get enhanced data
  const enhancedData = await sovicoPassport.getEnhancedPassportData(0);
  console.log("📋 Enhanced passport data:", {
    rank: enhancedData[0],
    badges: enhancedData[1]
  });
  
  // Test dynamic tokenURI
  console.log("5️⃣ Testing dynamic tokenURI generation...");
  const tokenURI = await sovicoPassport.tokenURI(0);
  console.log("🔗 Dynamic tokenURI generated (length):", tokenURI.length);
  
  if (tokenURI.startsWith("data:application/json;base64,")) {
    const base64Data = tokenURI.substring(29);
    const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
    const metadata = JSON.parse(jsonData);
    console.log("📋 Decoded metadata:", {
      name: metadata.name,
      attributeCount: metadata.attributes.length
    });
  }
  
  // Test batch minting
  console.log("6️⃣ Testing batch minting...");
  const accounts = await hre.ethers.getSigners();
  const recipients = accounts.slice(1, 4).map(acc => acc.address); // Get 3 more accounts
  
  if (recipients.length > 0) {
    const batchTx = await sovicoPassport.batchMint(recipients);
    await batchTx.wait();
    console.log(`✅ Batch minted ${recipients.length} tokens`);
    
    // Check total supply
    const totalSupply = await sovicoPassport.totalSupply();
    console.log("📊 Total supply:", totalSupply.toString());
  }
  
  console.log("\n🎉 Deployment and testing completed successfully!");
  console.log("📝 Contract Summary:");
  console.log(`   Address: ${sovicoPassport.address}`);
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Total Supply: ${await sovicoPassport.totalSupply()}`);
  
  // Integration instructions
  console.log("\n🔧 Integration Instructions:");
  console.log("1. Install Python dependencies: pip install web3 eth-account");
  console.log("2. Update blockchain_integration.py with contract address");
  console.log("3. Set PRIVATE_KEY environment variable (optional)");
  console.log("4. Run: python blockchain_integration.py");
  
  return sovicoPassport.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((address) => {
    console.log(`\n✅ Deployment successful! Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
