// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SovicoPassport
 * @dev NFT contract for Sovico ecosystem passport/identity tokens
 * @author Sovico Group
 */
contract SovicoPassport is ERC721, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;

    // Counter for token IDs
    Counters.Counter private _tokenIdCounter;
    
    // Enhanced PassportData struct for metadata
    struct PassportData {
        string rank;           // "Standard", "Platinum", "Diamond", etc.
        string[] badges;       // Array of badges like "frequent_flyer", "early_adopter"
    }
    
    // Mapping from token ID to enhanced passport data
    mapping(uint256 => PassportData) private _passportData;
    
    // Original passport data mapping (keeping for backward compatibility)
    mapping(uint256 => OriginalPassportData) private _originalPassportData;
    
    // Mapping from address to passport token ID (one passport per address)
    mapping(address => uint256) private _addressToTokenId;
    
    // Mapping to track if address has a passport
    mapping(address => bool) private _hasPassport;

    // Struct to store original passport metadata (backward compatibility)
    struct OriginalPassportData {
        string memberTier;          // "Bronze", "Silver", "Gold", "Platinum", "Diamond"
        uint256 issueDate;          // Timestamp when passport was issued
        uint256 totalSVTEarned;     // Total SVT tokens earned
        uint256 achievementCount;   // Number of achievements unlocked
        uint256 nftCount;          // Number of NFTs owned
        bool isActive;             // Whether passport is active
        string ecosystemLevel;     // Level in Sovico ecosystem
    }

    // Events
    event PassportMinted(address indexed to, uint256 indexed tokenId, string memberTier);
    event PassportUpdated(uint256 indexed tokenId, string newTier, uint256 newSVTEarned);
    event PassportActivated(uint256 indexed tokenId);
    event PassportDeactivated(uint256 indexed tokenId);
    event PassportRankUpdated(uint256 indexed tokenId, string newRank);
    event PassportBadgeAdded(uint256 indexed tokenId, string newBadge);

    // Base URI for metadata
    string private _baseTokenURI;

    constructor(address initialOwner) 
        ERC721("Sovico Passport", "SVCP") 
        Ownable(initialOwner)
    {
        _baseTokenURI = "https://api.sovico.vn/passport/metadata/";
    }

    /**
     * @dev Safely mint a new passport NFT to the specified address
     * @param to Address to mint the passport to
     * @return tokenId The ID of the newly minted token
     */
    function safeMint(address to) public onlyOwner returns (uint256) {
        require(to != address(0), "SovicoPassport: cannot mint to zero address");
        require(!_hasPassport[to], "SovicoPassport: address already has a passport");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Initialize original passport data (backward compatibility)
        _originalPassportData[tokenId] = OriginalPassportData({
            memberTier: "Bronze",
            issueDate: block.timestamp,
            totalSVTEarned: 0,
            achievementCount: 0,
            nftCount: 0,
            isActive: true,
            ecosystemLevel: "Newcomer"
        });
        
        // Initialize enhanced passport data
        _passportData[tokenId] = PassportData({
            rank: "Standard",
            badges: new string[](0)
        });
        
        // Mark address as having a passport
        _hasPassport[to] = true;
        _addressToTokenId[to] = tokenId;
        
        _safeMint(to, tokenId);
        
        emit PassportMinted(to, tokenId, "Bronze");
        
        return tokenId;
    }

    /**
     * @dev Batch mint passports to multiple addresses
     * @param recipients Array of addresses to mint passports to
     */
    function batchMint(address[] calldata recipients) external onlyOwner {
        require(recipients.length > 0, "SovicoPassport: empty recipients array");
        require(recipients.length <= 100, "SovicoPassport: batch size too large");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (!_hasPassport[recipients[i]] && recipients[i] != address(0)) {
                safeMint(recipients[i]);
            }
        }
    }

    /**
     * @dev Update passport data for a token
     * @param tokenId Token ID to update
     * @param newTier New member tier
     * @param newSVTEarned New total SVT earned
     * @param newAchievementCount New achievement count
     * @param newNftCount New NFT count
     */
    function updatePassportData(
        uint256 tokenId, 
        string memory newTier, 
        uint256 newSVTEarned,
        uint256 newAchievementCount,
        uint256 newNftCount
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        
        OriginalPassportData storage data = _originalPassportData[tokenId];
        data.memberTier = newTier;
        data.totalSVTEarned = newSVTEarned;
        data.achievementCount = newAchievementCount;
        data.nftCount = newNftCount;
        
        // Update ecosystem level based on achievements and SVT
        if (newSVTEarned >= 100000 && newAchievementCount >= 20) {
            data.ecosystemLevel = "Master";
        } else if (newSVTEarned >= 50000 && newAchievementCount >= 10) {
            data.ecosystemLevel = "Expert";
        } else if (newSVTEarned >= 20000 && newAchievementCount >= 5) {
            data.ecosystemLevel = "Advanced";
        } else if (newSVTEarned >= 5000 && newAchievementCount >= 2) {
            data.ecosystemLevel = "Intermediate";
        }
        
        emit PassportUpdated(tokenId, newTier, newSVTEarned);
    }

    /**
     * @dev Update passport rank and add a new badge
     * @param tokenId Token ID to update
     * @param newRank New rank for the passport
     * @param newBadge New badge to add to the passport
     */
    function updatePassport(
        uint256 tokenId,
        string memory newRank,
        string memory newBadge
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        
        PassportData storage passport = _passportData[tokenId];
        
        // Update rank
        passport.rank = newRank;
        emit PassportRankUpdated(tokenId, newRank);
        
        // Add new badge to the array
        passport.badges.push(newBadge);
        emit PassportBadgeAdded(tokenId, newBadge);
    }

    /**
     * @dev Activate/deactivate a passport
     * @param tokenId Token ID to update
     * @param isActive New active status
     */
    function setPassportActive(uint256 tokenId, bool isActive) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        
        _originalPassportData[tokenId].isActive = isActive;
        
        if (isActive) {
            emit PassportActivated(tokenId);
        } else {
            emit PassportDeactivated(tokenId);
        }
    }

    /**
     * @dev Get original passport data for a token (backward compatibility)
     * @param tokenId Token ID to query
     * @return OriginalPassportData struct with all passport information
     */
    function getPassportData(uint256 tokenId) external view returns (OriginalPassportData memory) {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        return _originalPassportData[tokenId];
    }

    /**
     * @dev Get enhanced passport data for a token
     * @param tokenId Token ID to query
     * @return PassportData struct with rank and badges
     */
    function getEnhancedPassportData(uint256 tokenId) external view returns (PassportData memory) {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        return _passportData[tokenId];
    }

    /**
     * @dev Get passport rank for a token
     * @param tokenId Token ID to query
     * @return string Passport rank
     */
    function getPassportRank(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        return _passportData[tokenId].rank;
    }

    /**
     * @dev Get passport badges for a token
     * @param tokenId Token ID to query
     * @return string[] Array of badges
     */
    function getPassportBadges(uint256 tokenId) external view returns (string[] memory) {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: token does not exist");
        return _passportData[tokenId].badges;
    }

    /**
     * @dev Get token ID for an address
     * @param owner Address to query
     * @return tokenId Token ID owned by the address
     */
    function getTokenIdByAddress(address owner) external view returns (uint256) {
        require(_hasPassport[owner], "SovicoPassport: address does not have a passport");
        return _addressToTokenId[owner];
    }

    /**
     * @dev Check if an address has a passport
     * @param owner Address to check
     * @return bool True if address has a passport
     */
    function hasPassport(address owner) external view returns (bool) {
        return _hasPassport[owner];
    }

    /**
     * @dev Get current total supply of passports
     * @return uint256 Total number of minted passports
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Set token URI for a specific token
     * @param tokenId Token ID to set URI for
     * @param uri New URI for the token
     */
    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get the base URI for tokens
     * @return string Base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override _update to handle pausable functionality and soulbound restrictions
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        require(
            from == address(0) || to == address(0), 
            "SovicoPassport: passports are non-transferable (soulbound)"
        );
        
        // Update passport ownership tracking on burn
        if (to == address(0) && from != address(0)) {
            _hasPassport[from] = false;
            delete _addressToTokenId[from];
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override tokenURI to generate dynamic JSON metadata
     * @param tokenId Token ID to get URI for
     * @return string Base64 encoded data URI with JSON metadata
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "SovicoPassport: URI query for nonexistent token");
        
        // Check if there's a custom URI set via ERC721URIStorage
        string memory customURI = super.tokenURI(tokenId);
        if (bytes(customURI).length > 0) {
            return customURI;
        }
        
        // Generate dynamic metadata
        PassportData memory passport = _passportData[tokenId];
        OriginalPassportData memory originalData = _originalPassportData[tokenId];
        
        // Build attributes array
        string memory attributes = _buildAttributes(tokenId, passport, originalData);
        
        // Build complete JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name": "Sovico Passport #',
            Strings.toString(tokenId),
            '", "description": "Digital identity passport for the Sovico ecosystem. This soulbound NFT represents your membership, achievements, and status within the Sovico network.", "image": "',
            _generateImageURI(passport.rank),
            '", "external_url": "https://sovico.vn/passport/',
            Strings.toString(tokenId),
            '", "attributes": [',
            attributes,
            ']}'
        ));
        
        // Encode JSON as Base64 data URI
        string memory encodedJson = Base64.encode(bytes(json));
        return string(abi.encodePacked("data:application/json;base64,", encodedJson));
    }

    /**
     * @dev Build attributes array for JSON metadata
     * @param tokenId Token ID
     * @param passport Enhanced passport data
     * @param originalData Original passport data
     * @return string Formatted attributes JSON
     */
    function _buildAttributes(
        uint256 tokenId, 
        PassportData memory passport, 
        OriginalPassportData memory originalData
    ) internal pure returns (string memory) {
        string memory baseAttributes = string(abi.encodePacked(
            '{"trait_type": "Rank", "value": "', passport.rank, '"},',
            '{"trait_type": "Member Tier", "value": "', originalData.memberTier, '"},',
            '{"trait_type": "Ecosystem Level", "value": "', originalData.ecosystemLevel, '"},',
            '{"trait_type": "SVT Earned", "value": ', Strings.toString(originalData.totalSVTEarned), ', "display_type": "number"},',
            '{"trait_type": "Achievements", "value": ', Strings.toString(originalData.achievementCount), ', "display_type": "number"},',
            '{"trait_type": "NFTs Owned", "value": ', Strings.toString(originalData.nftCount), ', "display_type": "number"},',
            '{"trait_type": "Issue Date", "value": ', Strings.toString(originalData.issueDate), ', "display_type": "date"},',
            '{"trait_type": "Active Status", "value": "', originalData.isActive ? "Active" : "Inactive", '"}'
        ));
        
        // Add badges as individual attributes
        string memory badgeAttributes = "";
        for (uint256 i = 0; i < passport.badges.length; i++) {
            badgeAttributes = string(abi.encodePacked(
                badgeAttributes,
                ',{"trait_type": "Badge", "value": "', passport.badges[i], '"}'
            ));
        }
        
        return string(abi.encodePacked(baseAttributes, badgeAttributes));
    }

    /**
     * @dev Generate image URI based on passport rank
     * @param rank Passport rank
     * @return string Image URI
     */
    function _generateImageURI(string memory rank) internal pure returns (string memory) {
        // Convert rank to lowercase for URL consistency
        bytes memory rankBytes = bytes(rank);
        string memory lowerRank = "";
        
        for (uint256 i = 0; i < rankBytes.length; i++) {
            if (rankBytes[i] >= 0x41 && rankBytes[i] <= 0x5A) {
                // Convert uppercase to lowercase
                lowerRank = string(abi.encodePacked(lowerRank, bytes1(uint8(rankBytes[i]) + 32)));
            } else {
                lowerRank = string(abi.encodePacked(lowerRank, rankBytes[i]));
            }
        }
        
        return string(abi.encodePacked(
            "https://api.sovico.vn/passport/images/",
            lowerRank,
            ".png"
        ));
    }

    /**
     * @dev Override supportsInterface for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
