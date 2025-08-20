# 🛡️ Sovico Passport NFT Smart Contract

A sophisticated ERC721-based NFT smart contract for the Sovico ecosystem, implementing soulbound digital identity passports with advanced gamification features.

## 🌟 Features

### Core Functionality
- **ERC721 Compliant**: Standard NFT implementation with OpenZeppelin libraries
- **Soulbound Tokens**: Non-transferable NFTs that represent digital identity
- **One Passport Per Address**: Each wallet can only hold one passport
- **Owner-Only Minting**: Controlled minting by contract owner
- **Batch Minting**: Efficient deployment to multiple addresses

### Advanced Features
- **Dynamic Metadata**: Upgradeable passport data and member tiers
- **Ecosystem Levels**: Automatic level progression based on achievements
- **Achievement Tracking**: SVT earnings, NFT collections, milestone tracking
- **Pausable Contract**: Emergency pause functionality
- **Burnable Tokens**: Allow passport destruction if needed

### Security Features
- **Access Control**: Owner-only administrative functions
- **Reentrancy Protection**: Built-in OpenZeppelin security
- **Comprehensive Testing**: Full test suite coverage
- **Gas Optimization**: Efficient storage and operations

## 📋 Contract Specifications

```solidity
Name: Sovico Passport
Symbol: SVCP
Standard: ERC721
Network: BSC/Polygon (configurable)
License: MIT
```

### Passport Data Structure
```solidity
struct PassportData {
    string memberTier;          // "Bronze", "Silver", "Gold", "Platinum", "Diamond"
    uint256 issueDate;          // Timestamp when passport was issued
    uint256 totalSVTEarned;     // Total SVT tokens earned
    uint256 achievementCount;   // Number of achievements unlocked
    uint256 nftCount;          // Number of NFTs owned
    bool isActive;             // Whether passport is active
    string ecosystemLevel;     // Level in Sovico ecosystem
}
```

### Ecosystem Levels
- **Newcomer**: Default level for new passports
- **Intermediate**: 5,000+ SVT earned, 2+ achievements
- **Advanced**: 20,000+ SVT earned, 5+ achievements  
- **Expert**: 50,000+ SVT earned, 10+ achievements
- **Master**: 100,000+ SVT earned, 20+ achievements

## 🚀 Installation & Setup

### Prerequisites
```bash
node >= 16.0.0
npm >= 8.0.0
```

### Install Dependencies
```bash
cd contracts
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy to Local Network
```bash
# Start local hardhat node
npm run node

# Deploy to local network (new terminal)
npm run deploy:local
```

### Deploy to Testnet
```bash
# BSC Testnet
npm run deploy:bsc-testnet

# Polygon Mumbai
npm run deploy:polygon-mumbai
```

### Deploy to Mainnet
```bash
# BSC Mainnet
npm run deploy:bsc-mainnet

# Polygon Mainnet
npm run deploy:polygon
```

## 🔧 Usage Examples

### Basic Minting
```javascript
// Deploy contract
const SovicoPassport = await ethers.getContractFactory("SovicoPassport");
const passport = await SovicoPassport.deploy(owner.address);

// Mint passport
await passport.safeMint(userAddress);

// Check if user has passport
const hasPassport = await passport.hasPassport(userAddress);

// Get token ID for user
const tokenId = await passport.getTokenIdByAddress(userAddress);
```

### Updating Passport Data
```javascript
// Update passport to Platinum tier
await passport.updatePassportData(
    tokenId,
    "Platinum",     // New tier
    25000,          // SVT earned
    8,              // Achievement count
    4               // NFT count
);

// Get updated passport data
const passportData = await passport.getPassportData(tokenId);
console.log(passportData.ecosystemLevel); // "Expert"
```

### Batch Operations
```javascript
// Batch mint to multiple addresses
const recipients = [address1, address2, address3];
await passport.batchMint(recipients);

// Set passport active/inactive
await passport.setPassportActive(tokenId, false);
```

## 🧪 Testing

### Run Full Test Suite
```bash
npm test
```

### Test Coverage
```bash
npm run coverage
```

### Gas Report
```bash
npm run gas-report
```

### Test Results Summary
- ✅ **Deployment**: Contract initialization and ownership
- ✅ **Minting**: Safe minting, batch minting, access control
- ✅ **Soulbound**: Transfer prevention, burning allowed
- ✅ **Data Management**: Passport updates, level progression
- ✅ **Security**: Access control, pausable functionality
- ✅ **Edge Cases**: Invalid inputs, non-existent tokens

## 📊 Gas Optimization

| Function | Gas Cost | Optimization |
|----------|----------|--------------|
| `safeMint` | ~180,000 | Optimized storage |
| `batchMint(10)` | ~1,600,000 | Batch efficiency |
| `updatePassportData` | ~80,000 | Minimal storage writes |
| `burn` | ~60,000 | Standard ERC721 |

## 🔐 Security Considerations

### Access Control
- Only contract owner can mint passports
- Only contract owner can update passport data
- Only contract owner can pause/unpause contract
- Only token holder can burn their passport

### Soulbound Implementation
- Transfers between addresses are blocked
- Minting (from zero address) is allowed
- Burning (to zero address) is allowed
- Maintains passport uniqueness per address

### Emergency Controls
- Contract can be paused to stop all operations
- Individual passports can be deactivated
- Owner can update base URI for metadata

## 🌐 Integration with Sovico Ecosystem

### Frontend Integration
```javascript
// Connect to deployed contract
const contractAddress = "0x...";
const contract = new ethers.Contract(contractAddress, abi, signer);

// Check user passport status
const hasPassport = await contract.hasPassport(userAddress);
if (hasPassport) {
    const tokenId = await contract.getTokenIdByAddress(userAddress);
    const passportData = await contract.getPassportData(tokenId);
    // Display passport info in UI
}
```

### Backend Integration
```javascript
// Update passport when user earns SVT
async function updateUserSVT(userAddress, newSVTAmount) {
    if (await contract.hasPassport(userAddress)) {
        const tokenId = await contract.getTokenIdByAddress(userAddress);
        const currentData = await contract.getPassportData(tokenId);
        
        await contract.updatePassportData(
            tokenId,
            currentData.memberTier,
            newSVTAmount,
            currentData.achievementCount,
            currentData.nftCount
        );
    }
}
```

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Basic ERC721 implementation
- ✅ Soulbound functionality
- ✅ Dynamic passport data
- ✅ Comprehensive testing

### Phase 2 (Upcoming)
- 🔄 Metadata API integration
- 🔄 Achievement verification system
- 🔄 Cross-chain bridge support
- 🔄 Governance token integration

### Phase 3 (Future)
- 📋 DAO integration for passport updates
- 📋 Staking rewards for passport holders
- 📋 Multi-signature administrative controls
- 📋 Layer 2 scaling solutions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow Solidity style guide
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure gas optimization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@sovico.vn

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat for development framework
- Ethereum community for ERC721 standard
- Sovico Group for project vision and support

---

**Built with ❤️ by the Sovico Development Team**
