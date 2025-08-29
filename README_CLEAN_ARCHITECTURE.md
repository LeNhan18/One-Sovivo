# One-Sovico Platform - Clean Architecture

## 📁 Cấu trúc dự án sau khi refactor

```
z:\One-Sovico\
├── app.py                 # File gốc (backup)
├── app_clean.py          # ✅ Main application file (clean version)
├── config.py             # Configuration settings
├── requirements.txt      # Dependencies
├── 
├── models/               # 🗃️ Database Models
│   ├── __init__.py
│   ├── user.py          # User authentication model
│   ├── customer.py      # Customer profile model  
│   ├── transactions.py  # Financial transaction models
│   ├── achievements.py  # Achievement & NFT models
│   ├── missions.py      # Mission progression models
│   └── marketplace.py   # Marketplace & P2P models
│
├── services/            # 🚀 Business Logic Services
│   ├── __init__.py
│   ├── auth_service.py     # Authentication logic
│   ├── ai_service.py       # AI/ML prediction service
│   ├── customer_service.py # Customer data operations
│   ├── mission_service.py  # Mission management (TODO)
│   ├── marketplace_service.py # Marketplace logic (TODO)
│   └── service_integration.py # External service APIs (TODO)
│
├── routes/              # 🌐 API Route Handlers (TODO)
│   ├── __init__.py
│   ├── auth_routes.py      # Authentication endpoints
│   ├── customer_routes.py  # Customer data endpoints
│   ├── ai_routes.py        # AI prediction endpoints
│   ├── token_routes.py     # Token & NFT endpoints
│   ├── mission_routes.py   # Mission progression endpoints
│   └── service_routes.py   # Service integration endpoints
│
└── client/              # 💻 React Frontend
    ├── src/
    │   ├── components/
    │   │   ├── AIFinancialAssistant.tsx  # ✅ AI Chat với service automation
    │   │   ├── ServiceModal.tsx          # ✅ Self-service forms
    │   │   └── AIAgent.tsx               # ✅ AI automation component
    │   └── modules/
    │       └── SuperApp.tsx              # ✅ Main app với hybrid UX
    └── ...
```

## 🔧 Cách chạy phiên bản Clean

### 1. Chạy Backend Clean
```bash
cd z:\One-Sovico
python app_clean.py
```

### 2. Chạy Frontend
```bash
cd client
npm run dev
```

## ✨ Improvements trong Clean Architecture

### 📦 Models (Database Layer)
- **Tách riêng từng loại model**: User, Customer, Transactions, Achievements, Missions, Marketplace
- **Database injection pattern**: Inject `db` và `bcrypt` instances vào models
- **Clear separation of concerns**: Mỗi model file chỉ chứa 1 domain

### 🚀 Services (Business Logic Layer)  
- **AuthService**: Xử lý authentication, authorization, JWT tokens
- **AIService**: AI/ML model training, prediction, persona analysis
- **CustomerService**: Customer data operations, 360° profile, search
- **Reusable & testable**: Services có thể test độc lập

### 🌐 Routes (API Layer - TODO)
- **Blueprint pattern**: Mỗi domain có blueprint riêng
- **Dependency injection**: Services được inject vào routes
- **Clean API design**: RESTful endpoints với proper HTTP status codes

### 🎯 Key Benefits

1. **Maintainability**: Code dễ đọc, dễ sửa, dễ mở rộng
2. **Testability**: Có thể test từng layer độc lập  
3. **Scalability**: Thêm features mới không ảnh hưởng code cũ
4. **Team collaboration**: Dev có thể work parallel trên các modules khác nhau
5. **Performance**: Import optimization, lazy loading

## 🔄 Migration Plan

### ✅ Phase 1: Models & Services (COMPLETED)
- [x] Extract database models to separate files
- [x] Create business logic services
- [x] Implement dependency injection pattern
- [x] Create clean main application file

### 🚧 Phase 2: Routes & API (IN PROGRESS)  
- [ ] Extract API routes to blueprint files
- [ ] Implement proper error handling
- [ ] Add API documentation with Swagger
- [ ] Add input validation & sanitization

### 📋 Phase 3: Testing & Documentation
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] Performance optimization
- [ ] Complete API documentation

## 🎯 Frontend Integration

### ✅ Hybrid UX Model Implemented
- **ServiceModal**: Self-service forms (buffet style)
- **AIAgent**: AI-powered automation (waiter style)  
- **Intent Recognition**: Natural language → automatic service execution
- **Real Database Integration**: All service actions save to actual database

### 🤖 AI Financial Assistant Enhanced
- **Service Automation**: "Đặt vé máy bay cho tôi" → Auto execute APIs
- **Progress Tracking**: Real-time action status with UI feedback
- **Token Rewards**: Automatic SVT token awards for completed services
- **Hybrid Chat**: Both advisory chat + service execution in one interface

## 🚀 Next Steps

1. **Complete Routes extraction** từ app_clean.py
2. **Add comprehensive error handling** cho tất cả services
3. **Implement caching layer** cho AI predictions
4. **Add API rate limiting** để protect endpoints
5. **Create monitoring dashboard** cho system health
6. **Add comprehensive logging** để debug production issues

## 📞 Support

Nếu có vấn đề với clean architecture, có thể:
1. Chạy `app.py` để quay về phiên bản gốc
2. Check logs trong terminal để debug
3. So sánh code giữa `app.py` và `app_clean.py`
