# Blockchain Achievement System Integration

Hệ thống tích hợp blockchain cho việc cấp phát thành tựu NFT trong One-Sovico Platform.

## 🚀 Tính năng chính

### 1. AI-Powered Achievement Detection
- Phân tích hồ sơ 360° của khách hàng
- Tự động phát hiện các thành tựu dựa trên behavior pattern
- Cấp phát NFT badges trên blockchain

### 2. Smart Contract Integration
- SovicoPassport NFT với metadata động
- Hệ thống rank và badge tự động
- Soulbound tokens không thể chuyển nhượng

### 3. Achievement Categories

#### 🛫 Frequent Flyer
- **Điều kiện**: > 20 chuyến bay/năm
- **Rank**: Gold
- **SVT Reward**: 1,000 tokens

#### 💼 Business Elite  
- **Điều kiện**: Hạng thương gia + > 10 chuyến bay/năm
- **Rank**: Platinum
- **SVT Reward**: 2,000 tokens

#### 💎 High Roller
- **Điều kiện**: Số dư trung bình > 500 triệu VND
- **Rank**: Diamond  
- **SVT Reward**: 5,000 tokens

#### 🏖️ Resort Lover
- **Điều kiện**: Chi tiêu nghỉ dưỡng > 50 triệu VND
- **Rank**: Gold
- **SVT Reward**: 1,500 tokens

#### 🌙 Long Stay Guest
- **Điều kiện**: > 30 đêm nghỉ dưỡng/năm
- **Rank**: Platinum
- **SVT Reward**: 2,500 tokens

#### 🏆 VIP Ecosystem Member
- **Điều kiện**: Kết hợp cả 3 dịch vụ ở mức cao
- **Rank**: Diamond
- **SVT Reward**: 10,000 tokens

## 📁 Cấu trúc File

```
z:\One-Sovico\
├── app.py                    # Flask backend với achievement logic
├── blockchain_integration.py # Web3.py integration functions
├── blockchain_config.py      # Achievement configuration
├── test_achievements.py      # Demo và testing script
├── demo_blockchain.py        # Blockchain connection test
└── contracts/
    ├── SovicoPassport.sol    # Smart contract
    ├── scripts/deploy.js     # Deployment script
    └── test/                 # Test suite
```

## 🛠️ Setup và Installation

### 1. Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Install blockchain packages specifically
pip install web3==6.15.1 eth-account==0.10.0
```

### 2. Setup Blockchain Environment

```bash
# Start Ganache (local blockchain)
# Download from: https://trufflesuite.com/ganache/

# Deploy smart contract
cd contracts
npm install
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Environment Configuration

Tạo file `.env` (tuỳ chọn):
```
PRIVATE_KEY=your_private_key_here
SOVICO_PASSPORT_CONTRACT_ADDRESS=deployed_contract_address
BLOCKCHAIN_NETWORK=development
```

## 🧪 Testing

### 1. Test Environment
```bash
python demo_blockchain.py --test
```

### 2. Test Blockchain Integration
```bash
python demo_blockchain.py
```

### 3. Test Full Achievement System
```bash
# Start Flask app
python app.py

# In another terminal, run tests
python test_achievements.py
```

## 📝 API Usage

### Achievement Detection API

**Endpoint**: `POST /predict`

**Request Body**:
```json
{
  "customer_id": 1,
  "age": 35,
  "avg_balance": 100000000,
  "total_flights": 25,
  "is_business_flyer": false,
  "total_nights_stayed": 10,
  "total_resort_spending": 10000000
}
```

**Response**:
```json
{
  "predicted_persona": "doanh_nhan",
  "recommendations": [...],
  "achievements": [
    {
      "title": "Frequent Flyer",
      "description": "Bay hơn 20 chuyến trong năm",
      "badge": "frequent_flyer",
      "rank": "Gold",
      "svt_reward": 1000,
      "blockchain_tx": "0x1234..."
    }
  ],
  "profile_360": {...},
  "blockchain_enabled": true,
  "total_svt_reward": 1000
}
```

### Blockchain Test API

**Endpoint**: `POST /test-blockchain`

**Request Body**:
```json
{
  "token_id": 0,
  "rank": "Gold", 
  "badge": "test_badge"
}
```

## 🔧 Configuration

### Achievement Rules

Sửa đổi `blockchain_config.py` để thay đổi:
- Điều kiện thành tựu
- Rank assignments
- SVT rewards
- Blockchain network settings

### Adding New Achievements

1. Thêm vào `ACHIEVEMENT_CONFIG` trong `blockchain_config.py`
2. Tạo evaluation function
3. Đăng ký trong `ACHIEVEMENT_EVALUATORS`

Ví dụ:
```python
def evaluate_new_achievement(profile):
    return profile['some_metric'] > threshold

ACHIEVEMENT_EVALUATORS['new_badge'] = evaluate_new_achievement
```

## 🐛 Troubleshooting

### Common Issues

1. **"Model AI chưa sẵn sàng"**
   - Chạy `python app.py` để load model
   - Kiểm tra file model trong thư mục `dl_model/`

2. **"Blockchain integration not available"**
   - Install: `pip install web3 eth-account`
   - Start Ganache
   - Deploy contract

3. **"Contract not found"**
   - Deploy contract: `npx hardhat run scripts/deploy.js --network localhost`
   - Kiểm tra `deployed_contracts.json`

4. **"Transaction failed"**
   - Kiểm tra Ganache có đang chạy
   - Verify contract address
   - Check gas limits

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔗 Integration với Frontend

Trong SuperApp React component:

```typescript
const checkAchievements = async (customerData) => {
  const response = await fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });
  
  const result = await response.json();
  
  if (result.achievements.length > 0) {
    // Show achievement notifications
    result.achievements.forEach(achievement => {
      showNotification(`🏆 ${achievement.title}`, achievement.description);
    });
  }
};
```

## 📊 Monitoring

### Blockchain Transactions
- Check Ganache for transaction history
- Monitor gas usage
- Verify NFT metadata updates

### Achievement Analytics
- Track achievement distribution
- Monitor SVT token rewards
- Analyze customer engagement

## 🚀 Production Deployment

### Mainnet Configuration

1. Update `blockchain_config.py`:
```python
DEFAULT_NETWORK = 'mainnet'
```

2. Set environment variables:
```bash
export PRIVATE_KEY=your_mainnet_private_key
export BLOCKCHAIN_NETWORK=mainnet
```

3. Deploy to mainnet:
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### Security Considerations

- Use hardware wallet for mainnet deployments
- Implement rate limiting for API endpoints
- Add access controls for admin functions
- Monitor contract for unusual activity

## 📞 Support

Để được hỗ trợ:
1. Check logs trong Flask console
2. Verify blockchain connection
3. Test individual components
4. Review configuration files

---

**Version**: 1.0.0  
**Last Updated**: August 19, 2025  
**Author**: One-Sovico Development Team
