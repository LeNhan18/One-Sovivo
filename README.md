# One-Sovico Platform

 **Hệ thống AI phân tích khách hàng thông minh** cho hệ sinh thái tài chính Sovico

##  Tổng quan

One-Sovico Platform bao gồm 2 ứng dụng chính:

### Phân hệ Khách hàng (One-Sovico Super App)
Đây là ứng dụng "All-in-one" (Tất cả trong một) nhằm mang lại trải nghiệm liền mạch cho người dùng cuối trong hệ sinh thái Sovico:
Tích hợp đa dịch vụ lõi: Người dùng có thể quản lý tài khoản/giao dịch ngân hàng (HDBank), đặt vé máy bay (Vietjet) và đặt phòng nghỉ dưỡng/spa (Resort) mà không cần chuyển đổi giữa nhiều app khác nhau.
Trợ lý tài chính thông minh (AI Advisor): Tích hợp AI (Gemini 1.5 Flash) để giao tiếp bằng ngôn ngữ tự nhiên. Điểm ăn tiền là khả năng nhận diện ý định (intent) để tự động hóa các luồng dịch vụ (ví dụ: gõ "đặt vé đi Phú Quốc", AI sẽ tự động gọi API của Vietjet).

Ví & Hệ thống phần thưởng Web3 (SVT Wallet & Blockchain Explorer): Gamification quá trình sử dụng app bằng Blockchain. Người dùng có ví lưu trữ Token (SVT), sở hữu định danh số duy nhất (NFT Passport/Soulbound Tokens) không thể làm giả. Token này có thể dùng trên Marketplace, chơi game hoặc đóng góp cho các quỹ ESG.

### Phân hệ Quản trị / Chuyên viên (AI Insight Dashboard)
Đây là "bộ não" nội bộ (CRM thông minh) giúp nhân viên thấu hiểu và chăm sóc khách hàng tốt hơn:

Hồ sơ khách hàng 360°: Gom tụ toàn bộ mảnh ghép dữ liệu từ ngân hàng, hàng không đến du lịch để tạo ra một góc nhìn toàn diện về một cá nhân.

Dự đoán chân dung bằng Machine Learning (AI Insights): Hệ thống không bắt nhân viên tự phân tích số liệu. Mô hình Deep Learning sẽ tự động "đọc" lịch sử giao dịch để gắn nhãn chân dung khách hàng (ví dụ: Thương gia, Gia đình, Sinh viên...), từ đó gợi ý chính xác sản phẩm hoặc ưu đãi (Cross-sell/Up-sell).

Giám sát & Can thiệp Chatbot (Chat Monitor): Đây là một tính năng backend rất thực tế. Admin có thể xem lịch sử chat của AI với khách, đánh giá cảm xúc (sentiment), và đặc biệt là có quyền can thiệp (intervene) trực tiếp vào luồng chat để take-over (tiếp quản) khi khách hàng cần hỗ trợ của người thật.

## 🏗️ Kiến trúc Modular Clean



### 📁 Cấu trúc dự án

```
z:\One-Sovico\
├── app_modular_clean.py       # 🎯 Main application (Production)
├── config.py                  # ⚙️ Configuration settings
├── requirements.txt           # 📦 Dependencies
├── 
├── models/                    # 🗃️ Database Models
│   ├── __init__.py           # Model initialization với DI
│   ├── database.py           # Database connection utilities
│   ├── user.py              # User authentication model
│   ├── customer.py          # Customer profile model  
│   ├── transactions.py      # Financial transaction models
│   ├── achievements.py      # Achievement & NFT models
│   ├── missions.py          # Mission progression models
│   └── marketplace.py       # Marketplace & P2P models
│
├── services/                  # 🔧 Business Logic Services
│   ├── __init__.py           # Service initialization
│   ├── auth_service.py       # Authentication logic
│   ├── ai_service.py         # AI/ML prediction service
│   ├── customer_service.py   # Customer data operations
│   ├── admin_service.py      # Admin & achievement management
│   └── marketplace_service.py # Marketplace logic
│
├── routes/                    # 🛣️ API Route Handlers
│   ├── __init__.py           # Route registration
│   ├── auth_routes.py        # Authentication endpoints
│   ├── customer_routes.py    # Customer data endpoints
│   ├── ai_routes.py          # AI prediction endpoints
│   ├── admin_routes.py       # Admin panel endpoints
│   └── ai_chat_routes.py     # 🆕 AI Chat history endpoints
│
├── client/                    # ⚛️ React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIFinancialAssistant.tsx  # 🤖 AI Chat với automation
│   │   │   ├── ServiceModal.tsx          # 📋 Self-service forms
│   │   │   └── AIAgent.tsx               # 🎯 AI automation component
│   │   └── modules/
│   │       └── SuperApp.tsx              # 📱 Main app với hybrid UX
│   └── ...
│
├── blockchain_simple.py       # 🔗 Blockchain integration (mock)
├── blockchain_config.py       # ⚙️ Achievement configuration
└── dl_model/                  # 🧠 AI Model directory
```

##  Cài đặt và Chạy

### Bước 1: Cài đặt MySQL
```bash
# Windows: Tải MySQL từ https://dev.mysql.com/downloads/installer/
# Hoặc sử dụng XAMPP: https://www.apachefriends.org/
```

### Bước 2: Thiết lập Database
```bash
# Chạy script setup database
python setup_ai_chat_db.py

# Hoặc sử dụng PowerShell script
.\setup_ai_chat.ps1
```

### Bước 3: Thiết lập Backend
```bash
# Kích hoạt virtual environment
.venv\Scripts\Activate.ps1

# Cài đặt Python dependencies
pip install -r requirements.txt

# Chạy backend
python app_modular_clean.py
```

### Bước 4: Thiết lập Frontend
```bash
cd client
npm install
npm run dev
```

### Bước 5: Truy cập
- **Backend API**: http://127.0.0.1:5000
- **Frontend**: http://localhost:5173
- **API Documentation**: http://127.0.0.1:5000/health

## 🛠️ Công nghệ

### Backend
- **Framework**: Flask + SQLAlchemy
- **Database**: MySQL với PyMySQL
- **AI/ML**: TensorFlow, Scikit-learn, Google Gemini AI
- **Auth**: JWT + BCrypt
- **Blockchain**: Web3.py (optional)

### Frontend
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **AI Integration**: Google Gemini API

##  Demo Accounts

### Chuyên viên (Dashboard)
- **Email**: `admin@hdbank.com.vn`
- **Password**: `123456`

### Khách hàng (Super App)
- **Email**: `khachhang@gmail.com`
- **Password**: `123456`

##  API Endpoints

### 🔐 Authentication
- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký

### 👤 Customer Management
- `GET /customer/{id}` - Hồ sơ 360°
- `GET /customer/{id}/insights` - AI insights
- `GET /customers/search?q=...` - Tìm kiếm

### 🤖 AI Services
- `POST /predict` - Dự đoán persona
- `POST /ai/chat` - AI Assistant chat

### 🗨️ AI Chat History (NEW)
- `GET /api/chat/history/{customer_id}` - Lấy lịch sử chat
- `POST /api/chat/save` - Lưu cuộc trò chuyện
- `DELETE /api/chat/{chat_id}` - Xóa chat
- `GET /api/chat/{chat_id}/actions` - Lấy actions của chat
- `POST /api/chat/actions/save` - Lưu action thực hiện
- `GET /api/chat/stats/{customer_id}` - Thống kê chat

### 🏆 Admin & Achievements
- `GET /admin/achievements` - Quản lý thành tựu
- `POST /admin/assign-achievement` - Gán thành tựu
- `POST /admin/auto-assign-achievements` - Tự động gán thành tựu

### 💰 Token Management
- `GET /api/tokens/{customer_id}` - Số dư SVT
- `POST /api/tokens/add` - Thêm token
- `GET /api/tokens/{customer_id}/history` - Lịch sử giao dịch

## 🧠 AI Model & Services

### Gemini AI Integration
- **Model**: Gemini-1.5-flash với fallbacks
- **Features**: Natural language processing, Intent recognition
- **Service automation**: Tự động thực hiện đặt vé, chuyển tiền, đặt phòng

### Traditional ML Model
- **Input Features**: Tuổi, số dư HDBank, chuyến bay Vietjet, nghỉ dưỡng resort
- **Output Personas**: 
  - `doanh_nhan` - Doanh nhân
  - `gia_dinh` - Gia đình  
  - `nguoi_tre` - Người trẻ

### AI Chat Features
- **Intent Recognition**: Hiểu được yêu cầu từ ngôn ngữ tự nhiên
- **Service Integration**: Tự động kết nối với API của Vietjet, HDBank, Resort
- **Context Awareness**: Nhớ lịch sử hội thoại và preferences
- **Progress Tracking**: Theo dõi trạng thái thực hiện real-time

## 🏆 Blockchain Achievement System

### Achievement Categories

#### ✈️ Frequent Flyer
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

#### 🏨 Long Stay Guest
- **Điều kiện**: > 30 đêm nghỉ dưỡng/năm
- **Rank**: Platinum
- **SVT Reward**: 2,500 tokens

#### 🏆 VIP Ecosystem Member
- **Điều kiện**: Kết hợp cả 3 dịch vụ ở mức cao
- **Rank**: Diamond
- **SVT Reward**: 10,000 tokens

### Smart Contract Integration
- **SovicoPassport NFT**: Dynamic metadata với achievements
- **Soulbound Tokens**: Không thể chuyển nhượng
- **Auto-detection**: AI tự động phát hiện thành tựu

## 💬 AI Financial Assistant Features

### 🤖 Hybrid UX Model
- **ServiceModal**: Self-service forms (buffet style)
- **AIAgent**: AI-powered automation (waiter style)
- **Intent Recognition**: Natural language → automatic service execution
- **Real Database Integration**: All actions save to database

### 🎯 Service Automation Examples
```
User: "Đặt vé từ Sài Gòn đi Phú Quốc ngày 25/10 cho 2 người"
AI: ✅ Tự động extract: SGN→PQC, 2025-10-25, 2 passengers
    ✅ Call Vietjet API
    ✅ Return booking confirmation
```

```
User: "Chuyển 5 triệu cho anh Nam"
AI: ✅ Extract amount & recipient
    ✅ Call HDBank transfer API  
    ✅ Show transaction status
```

### 💾 Chat History & Persistence
- **Database Storage**: MySQL với 3 tables (chat_history, messages, actions)
- **Cross-device Sync**: Sync giữa các thiết bị
- **Smart Titles**: Auto-generate tiêu đề chat từ nội dung
- **Action Tracking**: Lưu tất cả actions đã thực hiện
- **Search & Analytics**: Có thể search và phân tích patterns

## 🗃️ Database Schema

### Core Tables
- `users` - User authentication
- `customers` - Customer profiles  
- `hdbank_transactions` - Banking data
- `vietjet_flights` - Flight bookings
- `resort_bookings` - Resort stays
- `achievements` - Achievement definitions
- `customer_achievements` - User achievements
- `token_transactions` - SVT token history

### AI Chat Tables (NEW)
- `ai_chat_history` - Chat sessions
- `ai_chat_messages` - Individual messages  
- `ai_service_actions` - Service actions performed

## 🔧 Service Architecture

### 🏗️ Clean Architecture Benefits

1. **Maintainability**: Code dễ đọc, dễ sửa, dễ mở rộng
2. **Testability**: Có thể test từng layer độc lập  
3. **Scalability**: Thêm features mới không ảnh hưởng code cũ
4. **Team Collaboration**: Dev có thể work parallel
5. **Performance**: Import optimization, lazy loading

### 🔄 Dependency Injection Pattern
```python
# Initialize services với dependencies
service_instances = init_services(db, bcrypt, app.config, ...)

# Inject models vào services
for service_name, service_instance in service_instances.items():
    if hasattr(service_instance, 'set_models'):
        service_instance.set_models(model_classes)
```

## 🧪 Testing & Development

### 🔍 Debug Endpoints
- `/health` - System health check
- `/debug/customers` - Sample customers
- `/debug/ai-chat` - Test AI chat functionality

### 🧪 Test AI Chat
```bash
# Test natural language processing
POST /ai/chat
{
  "message": "Đặt vé từ Sài Gòn đi Phú Quốc ngày mai cho 2 người",
  "customer_id": 1001
}
```

### 🔧 Test Service Integration
```bash
# Test flight booking
POST /api/vietjet/book_flight
{
  "customer_id": 1001,
  "origin": "SGN",
  "destination": "PQC", 
  "departure_date": "2025-10-25",
  "passengers": 2
}
```

## 🚀 Production Deployment

### 🌐 Environment Setup
```bash
# Production environment variables
export FLASK_ENV=production
export MYSQL_HOST=your_mysql_host
export GEMINI_API_KEY=your_gemini_key
export JWT_SECRET_KEY=your_secret_key
```

### 🔐 Security Considerations
- JWT token expiration
- Input validation & sanitization  
- SQL injection prevention
- Rate limiting for AI endpoints
- CORS configuration
- API key protection

## 📈 Monitoring & Analytics

### 📊 Available Metrics
- AI chat usage patterns
- Service automation success rate
- Achievement distribution
- Token transaction volume
- Customer engagement analytics

### 🔍 Logging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🆕 Latest Updates

### ✅ Version 2.0 Features
- **AI Chat History**: Full database persistence
- **Service Automation**: End-to-end AI automation  
- **Intent Recognition**: Advanced NLP với Gemini
- **Cross-device Sync**: Chat history sync
- **Smart Analytics**: AI usage insights
- **Performance Optimization**: Lazy loading, caching

### 🔜 Roadmap
- [ ] Voice integration cho AI Assistant
- [ ] Mobile app với React Native
- [ ] Advanced analytics dashboard
- [ ] Mainnet blockchain deployment
- [ ] Multi-language support
- [ ] Advanced AI personas

## 📞 Support & Troubleshooting

### 🐛 Common Issues

1. **"AI Chat 404 Error"**
   - Solution: Restart Flask để load AI chat routes
   - Check: `✅ AI Chat routes registered` trong logs

2. **"Model AI chưa sẵn sàng"**
   - Solution: Kiểm tra `dl_model/` directory
   - Fallback: Mock model sẽ được sử dụng


3. **"Database connection failed"**
   - Solution: Kiểm tra MySQL service đang chạy
   - Check: Database credentials trong `config.py`

4. **"Gemini API Error"**
   - Solution: Verify `VITE_GEMINI_API_KEY` trong `.env`
   - Fallback: AI sẽ dùng basic pattern matching

### 📧 Development Team
- **Backend**: Flask + AI Services
- **Frontend**: React + TypeScript
- **AI/ML**: TensorFlow + Gemini Integration
- **Blockchain**: Web3.py + Smart Contracts

---

## 🎉 Quick Start

```bash
# Clone và setup
git clone [repository-url]
cd One-Sovico

# Backend
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python setup_ai_chat_db.py
python app.py

# Frontend (terminal mới)
cd client
npm install  
npm run dev

# Truy cập
# Frontend: http://localhost:5173
# Backend: http://127.0.0.1:5000
```

**🚀 Hệ sinh thái One-Sovico hoàn chỉnh với AI, Database, Blockchain và Chat History!**

---

**Version**: 2.0.0  
**Last Updated**: September 13, 2025  
**Architecture**: Modular Clean Architecture  
**Author**: One-Sovico Development Team

