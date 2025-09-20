 const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SovicoPassport", function () {
  let SovicoPassport;
  let sovicoPassport;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    SovicoPassport = await ethers.getContractFactory("SovicoPassport");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the contract
    sovicoPassport = await SovicoPassport.deploy(owner.address);
    await sovicoPassport.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await sovicoPassport.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await sovicoPassport.name()).to.equal("Sovico Passport");
      expect(await sovicoPassport.symbol()).to.equal("SVCP");
    });

    it("Should start with zero total supply", async function () {
      expect(await sovicoPassport.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint passports", async function () {
      await expect(sovicoPassport.safeMint(addr1.address))
        .to.emit(sovicoPassport, "PassportMinted")
        .withArgs(addr1.address, 0, "Bronze");

      expect(await sovicoPassport.balanceOf(addr1.address)).to.equal(1);
      expect(await sovicoPassport.ownerOf(0)).to.equal(addr1.address);
      expect(await sovicoPassport.hasPassport(addr1.address)).to.be.true;
      expect(await sovicoPassport.getTokenIdByAddress(addr1.address)).to.equal(0);
    });

    it("Should not allow non-owner to mint passports", async function () {
      await expect(
        sovicoPassport.connect(addr1).safeMint(addr2.address)
      ).to.be.revertedWithCustomError(sovicoPassport, "OwnableUnauthorizedAccount");
    });

    it("Should not allow minting to zero address", async function () {
      await expect(
        sovicoPassport.safeMint(ethers.ZeroAddress)
      ).to.be.revertedWith("SovicoPassport: cannot mint to zero address");
    });

    it("Should not allow minting multiple passports to same address", async function () {
      await sovicoPassport.safeMint(addr1.address);
      await expect(
        sovicoPassport.safeMint(addr1.address)
      ).to.be.revertedWith("SovicoPassport: address already has a passport");
    });

    it("Should correctly initialize passport data", async function () {
      await sovicoPassport.safeMint(addr1.address);
      const passportData = await sovicoPassport.getPassportData(0);
      const enhancedData = await sovicoPassport.getEnhancedPassportData(0);
      
      // Check original passport data
      expect(passportData.memberTier).to.equal("Bronze");
      expect(passportData.totalSVTEarned).to.equal(0);
      expect(passportData.achievementCount).to.equal(0);
      expect(passportData.nftCount).to.equal(0);
      expect(passportData.isActive).to.be.true;
      expect(passportData.ecosystemLevel).to.equal("Newcomer");
      
      // Check enhanced passport data
      expect(enhancedData.rank).to.equal("Standard");
      expect(enhancedData.badges.length).to.equal(0);
    });
  });

  describe("Batch Minting", function () {
    it("Should allow batch minting to multiple addresses", async function () {
      const recipients = [addr1.address, addr2.address, addrs[0].address];
      
      await sovicoPassport.batchMint(recipients);
      
      expect(await sovicoPassport.totalSupply()).to.equal(3);
      expect(await sovicoPassport.hasPassport(addr1.address)).to.be.true;
      expect(await sovicoPassport.hasPassport(addr2.address)).to.be.true;
      expect(await sovicoPassport.hasPassport(addrs[0].address)).to.be.true;
    });

    it("Should not allow empty batch minting", async function () {
      await expect(
        sovicoPassport.batchMint([])
      ).to.be.revertedWith("SovicoPassport: empty recipients array");
    });

    it("Should skip invalid addresses in batch", async function () {
      const recipients = [addr1.address, ethers.ZeroAddress, addr2.address];
      
      await sovicoPassport.batchMint(recipients);
      
      expect(await sovicoPassport.totalSupply()).to.equal(2);
      expect(await sovicoPassport.hasPassport(addr1.address)).to.be.true;
      expect(await sovicoPassport.hasPassport(addr2.address)).to.be.true;
    });
  });

  describe("Passport Data Management", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should allow owner to update passport data", async function () {
      await expect(
        sovicoPassport.updatePassportData(0, "Platinum", 50000, 10, 5)
      ).to.emit(sovicoPassport, "PassportUpdated")
        .withArgs(0, "Platinum", 50000);

      const passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.memberTier).to.equal("Platinum");
      expect(passportData.totalSVTEarned).to.equal(50000);
      expect(passportData.achievementCount).to.equal(10);
      expect(passportData.nftCount).to.equal(5);
      expect(passportData.ecosystemLevel).to.equal("Expert");
    });

    it("Should automatically update ecosystem level based on achievements", async function () {
      // Test different levels
      await sovicoPassport.updatePassportData(0, "Diamond", 100000, 20, 10);
      let passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.ecosystemLevel).to.equal("Master");

      await sovicoPassport.updatePassportData(0, "Gold", 20000, 5, 5);
      passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.ecosystemLevel).to.equal("Advanced");

      await sovicoPassport.updatePassportData(0, "Silver", 5000, 2, 2);
      passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.ecosystemLevel).to.equal("Intermediate");
    });

    it("Should allow owner to activate/deactivate passports", async function () {
      await expect(sovicoPassport.setPassportActive(0, false))
        .to.emit(sovicoPassport, "PassportDeactivated")
        .withArgs(0);

      let passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.isActive).to.be.false;

      await expect(sovicoPassport.setPassportActive(0, true))
        .to.emit(sovicoPassport, "PassportActivated")
        .withArgs(0);

      passportData = await sovicoPassport.getPassportData(0);
      expect(passportData.isActive).to.be.true;
    });

    it("Should not allow non-owner to update passport data", async function () {
      await expect(
        sovicoPassport.connect(addr1).updatePassportData(0, "Gold", 10000, 5, 3)
      ).to.be.revertedWithCustomError(sovicoPassport, "OwnableUnauthorizedAccount");
    });
  });

  describe("Soulbound Functionality", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should prevent transfers between addresses", async function () {
      await expect(
        sovicoPassport.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.revertedWith("SovicoPassport: passports are non-transferable (soulbound)");
    });

    it("Should prevent safe transfers", async function () {
      await expect(
        sovicoPassport.connect(addr1)["safeTransferFrom(address,address,uint256)"](
          addr1.address, 
          addr2.address, 
          0
        )
      ).to.be.revertedWith("SovicoPassport: passports are non-transferable (soulbound)");
    });

    it("Should allow burning", async function () {
      await sovicoPassport.connect(addr1).burn(0);
      
      expect(await sovicoPassport.balanceOf(addr1.address)).to.equal(0);
      expect(await sovicoPassport.hasPassport(addr1.address)).to.be.false;
      
      await expect(sovicoPassport.ownerOf(0)).to.be.revertedWithCustomError(
        sovicoPassport,
        "ERC721NonexistentToken"
      );
    });
  });

  describe("URI Management", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should allow owner to set base URI", async function () {
      await sovicoPassport.setBaseURI("https://new-api.sovico.vn/passport/");
      
      // The tokenURI should use the new base URI
      const tokenURI = await sovicoPassport.tokenURI(0);
      expect(tokenURI).to.include("https://new-api.sovico.vn/passport/");
    });

    it("Should allow owner to set individual token URI", async function () {
      const customURI = "https://custom.sovico.vn/passport/special/0";
      await sovicoPassport.setTokenURI(0, customURI);
      
      expect(await sovicoPassport.tokenURI(0)).to.equal(customURI);
    });
  });

  describe("Pausable Functionality", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should allow owner to pause and unpause", async function () {
      await sovicoPassport.pause();
      
      // Should not be able to mint when paused
      await expect(
        sovicoPassport.safeMint(addr2.address)
      ).to.be.revertedWithCustomError(sovicoPassport, "EnforcedPause");

      await sovicoPassport.unpause();
      
      // Should be able to mint after unpause
      await expect(sovicoPassport.safeMint(addr2.address)).to.not.be.reverted;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        sovicoPassport.connect(addr1).pause()
      ).to.be.revertedWithCustomError(sovicoPassport, "OwnableUnauthorizedAccount");
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when querying non-existent token", async function () {
      await expect(
        sovicoPassport.getPassportData(999)
      ).to.be.revertedWith("SovicoPassport: token does not exist");
    });

    it("Should revert when querying token ID for address without passport", async function () {
      await expect(
        sovicoPassport.getTokenIdByAddress(addr1.address)
      ).to.be.revertedWith("SovicoPassport: address does not have a passport");
    });

    it("Should handle large batch minting limits", async function () {
      const largeRecipients = new Array(101).fill(0).map((_, i) => addrs[i % addrs.length].address);
      
      await expect(
        sovicoPassport.batchMint(largeRecipients)
      ).to.be.revertedWith("SovicoPassport: batch size too large");
    });
  });

  describe("Enhanced Passport Data Management", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should allow owner to update passport rank and add badges", async function () {
      await expect(
        sovicoPassport.updatePassport(0, "Platinum", "frequent_flyer")
      ).to.emit(sovicoPassport, "PassportRankUpdated")
        .withArgs(0, "Platinum")
        .and.to.emit(sovicoPassport, "PassportBadgeAdded")
        .withArgs(0, "frequent_flyer");

      const enhancedData = await sovicoPassport.getEnhancedPassportData(0);
      expect(enhancedData.rank).to.equal("Platinum");
      expect(enhancedData.badges.length).to.equal(1);
      expect(enhancedData.badges[0]).to.equal("frequent_flyer");
    });

    it("Should allow adding multiple badges", async function () {
      await sovicoPassport.updatePassport(0, "Gold", "early_adopter");
      await sovicoPassport.updatePassport(0, "Gold", "loyalty_member");
      await sovicoPassport.updatePassport(0, "Platinum", "vip_access");

      const badges = await sovicoPassport.getPassportBadges(0);
      expect(badges.length).to.equal(3);
      expect(badges[0]).to.equal("early_adopter");
      expect(badges[1]).to.equal("loyalty_member");
      expect(badges[2]).to.equal("vip_access");

      const rank = await sovicoPassport.getPassportRank(0);
      expect(rank).to.equal("Platinum");
    });

    it("Should not allow non-owner to update enhanced passport data", async function () {
      await expect(
        sovicoPassport.connect(addr1).updatePassport(0, "Diamond", "hacker_badge")
      ).to.be.revertedWithCustomError(sovicoPassport, "OwnableUnauthorizedAccount");
    });

    it("Should revert when updating non-existent token", async function () {
      await expect(
        sovicoPassport.updatePassport(999, "Platinum", "ghost_badge")
      ).to.be.revertedWith("SovicoPassport: token does not exist");
    });
  });

  describe("Dynamic TokenURI Generation", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
    });

    it("Should generate valid data URI with JSON metadata", async function () {
      // Update passport with some data
      await sovicoPassport.updatePassport(0, "Platinum", "frequent_flyer");
      await sovicoPassport.updatePassport(0, "Platinum", "early_adopter");
      
      const tokenURI = await sovicoPassport.tokenURI(0);
      
      // Should be a data URI
      expect(tokenURI).to.include("data:application/json;base64,");
      
      // Decode and parse JSON
      const base64Data = tokenURI.substring(29); // Remove prefix
      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      const metadata = JSON.parse(jsonString);
      
      // Check metadata structure
      expect(metadata).to.have.property('name');
      expect(metadata).to.have.property('description');
      expect(metadata).to.have.property('image');
      expect(metadata).to.have.property('attributes');
      expect(metadata.name).to.equal("Sovico Passport #0");
      expect(metadata.attributes).to.be.an('array');
      
      // Check for rank attribute
      const rankAttribute = metadata.attributes.find(attr => attr.trait_type === "Rank");
      expect(rankAttribute).to.exist;
      expect(rankAttribute.value).to.equal("Platinum");
      
      // Check for badge attributes
      const badgeAttributes = metadata.attributes.filter(attr => attr.trait_type === "Badge");
      expect(badgeAttributes.length).to.equal(2);
    });

    it("Should use custom URI when set", async function () {
      const customURI = "https://custom.sovico.vn/passport/special/0";
      await sovicoPassport.setTokenURI(0, customURI);
      
      const tokenURI = await sovicoPassport.tokenURI(0);
      expect(tokenURI).to.equal(customURI);
    });

    it("Should include all passport attributes in metadata", async function () {
      // Set up comprehensive passport data
      await sovicoPassport.updatePassportData(0, "Diamond", 50000, 15, 8);
      await sovicoPassport.updatePassport(0, "VIP", "founder");
      await sovicoPassport.updatePassport(0, "VIP", "whale");
      
      const tokenURI = await sovicoPassport.tokenURI(0);
      const base64Data = tokenURI.substring(29);
      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      const metadata = JSON.parse(jsonString);
      
      // Check for all expected attributes
      const attributeTypes = metadata.attributes.map(attr => attr.trait_type);
      expect(attributeTypes).to.include("Rank");
      expect(attributeTypes).to.include("Member Tier");
      expect(attributeTypes).to.include("Ecosystem Level");
      expect(attributeTypes).to.include("SVT Earned");
      expect(attributeTypes).to.include("Achievements");
      expect(attributeTypes).to.include("NFTs Owned");
      expect(attributeTypes).to.include("Active Status");
      expect(attributeTypes).to.include("Badge");
      
      // Verify specific values
      const svtAttribute = metadata.attributes.find(attr => attr.trait_type === "SVT Earned");
      expect(svtAttribute.value).to.equal(50000);
      
      const achievementAttribute = metadata.attributes.find(attr => attr.trait_type === "Achievements");
      expect(achievementAttribute.value).to.equal(15);
    });

    it("Should revert tokenURI for non-existent token", async function () {
      await expect(
        sovicoPassport.tokenURI(999)
      ).to.be.revertedWith("SovicoPassport: URI query for nonexistent token");
    });
  });

  describe("Enhanced Getter Functions", function () {
    beforeEach(async function () {
      await sovicoPassport.safeMint(addr1.address);
      await sovicoPassport.updatePassport(0, "Platinum", "test_badge");
    });

    it("Should return enhanced passport data", async function () {
      const enhancedData = await sovicoPassport.getEnhancedPassportData(0);
      expect(enhancedData.rank).to.equal("Platinum");
      expect(enhancedData.badges.length).to.equal(1);
      expect(enhancedData.badges[0]).to.equal("test_badge");
    });

    it("Should return passport rank", async function () {
      const rank = await sovicoPassport.getPassportRank(0);
      expect(rank).to.equal("Platinum");
    });

    it("Should return passport badges", async function () {
      await sovicoPassport.updatePassport(0, "Platinum", "second_badge");
      
      const badges = await sovicoPassport.getPassportBadges(0);
      expect(badges.length).to.equal(2);
      expect(badges[0]).to.equal("test_badge");
      expect(badges[1]).to.equal("second_badge");
    });

    it("Should revert for non-existent tokens", async function () {
      await expect(
        sovicoPassport.getEnhancedPassportData(999)
      ).to.be.revertedWith("SovicoPassport: token does not exist");
      
      await expect(
        sovicoPassport.getPassportRank(999)
      ).to.be.revertedWith("SovicoPassport: token does not exist");
      
      await expect(
        sovicoPassport.getPassportBadges(999)
      ).to.be.revertedWith("SovicoPassport: token does not exist");
    });
  });
});
