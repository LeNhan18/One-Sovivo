# One-Sovico Platform

Hệ thống AI phân tích khách hàng cho hệ sinh thái tài chính Sovico.

## Tổng quan

Nền tảng gồm hai giao diện chính: **AI Insight Dashboard** (nội bộ) và **One-Sovico Super App** (khách hàng). Cùng một backend Flask và frontend React (Vite).

## Chức năng trên trang web

Mục dưới đây khớp với các module trong `client/src/App.tsx`, `modules/Dashboard.tsx` và `modules/SuperApp.tsx`. Một số nút (ví dụ "Báo cáo" trên Dashboard) có thể chỉ là placeholder chưa nối API đầy đủ.

### Vỏ ứng dụng (sau khi đăng nhập)

| Thành phần | Chức năng |
|------------|-----------|
| Đăng nhập / đăng ký | Màn `AuthPanel` trước khi vào hệ thống |
| Đăng xuất | Xóa token, quay lại màn đăng nhập |
| Admin | Chuyển nhanh giữa **AI Insight Dashboard** và **One-Sovico Super App** |
| Khách hàng | Mặc định vào Super App; có thể dùng nút chuyển sang Dashboard (nếu hiển thị trong thanh điều hướng) |

### AI Insight Dashboard (vai trò admin / chuyên viên)

**Tab "Customer Analysis"**

| Khu vực | Chức năng |
|--------|-----------|
| Tìm kiếm (`SearchPanel`) | Tìm theo tên hoặc mã khách hàng, chọn khách để phân tích |
| Hồ sơ 360° (`Profile360`) | Tổng hợp HDBank, Vietjet, resort (theo API `/api/customer/...`) |
| AI Insights (`AIInsights`) | Persona, evidence, gợi ý sản phẩm / ưu đãi |
| Hành động gợi ý (`ActionsPanel`) | Gắn với insight / khách hàng đang chọn |
| Model Metrics | Overlay xem metric model (nút bật/tắt trên header) |
| Thống kê / trạng thái | Khối "Thống kê hôm nay" và "Trạng thái hệ thống" (phần số liệu có thể demo) |
| Báo cáo | Nút trên header (có thể chưa nối báo cáo thật) |

**Tab "Blockchain Achievements"**

| Chức năng |
|-----------|
| `BlockchainDashboard`: NFT Passport, thành tựu, simulation (theo triển khai) |

**Tab "Chat Monitor"**

| Chức năng |
|-----------|
| `AdminChatMonitor`: xem / giám sát hội thoại AI khách hàng (khi backend và route hoạt động) |

### One-Sovico Super App (khách hàng)

**Trang chủ** — Thẻ SVT, hạng thành viên, ô dịch vụ Vietjet / HDBank / resort, và các **lối tắt** (cùng tên trong code):

| Lối tắt (quick action) | Component / nội dung |
|------------------------|----------------------|
| Wallet SVT | `SVTWallet`: ví, số dư, giao dịch (API `/api/tokens/...`) |
| Marketplace | `SVTMarketplace`: P2P / vật phẩm SVT |
| ESG Impact | `ESGPrograms`: chương trình, tiến độ, đóng góp (VND / tùy chọn SVT theo API) |
| AI Advisor | `AIFinancialAssistant`: chat Gemini, tự động hóa dịch vụ theo intent |
| SVT Games | `GameDashboard`: game nhận SVT |
| Blockchain (mục "Lịch sử" trên card) | **Blockchain Explorer**: khám phá NFT Passport / thành tựu (không chỉ "lịch sử giao dịch" thuần) |

**Dịch vụ từ trang chủ (không qua lối tắt trên)**

| Dịch vụ | Chức năng |
|---------|-----------|
| Vietjet / Resort | `ServiceModal`: đặt vé, đặt phòng / spa (theo loại) |
| HDBank | Trang riêng: `HDBankCard` (dashboard thẻ) hoặc `HDBankTransactions` (lịch sử giao dịch), chuyển tab trong cùng màn |

**Khác:** Cập nhật avatar, tải dữ liệu khách hàng — theo các API upload và customer (xem `SuperApp.tsx`).

**Điểm thưởng (SVT):** Dùng trong ví, marketplace; có thể liên quan ESG hoặc đổi quà tùy backend và phiên bản giao diện.

### Đăng nhập và phân quyền

- **admin / chuyên viên:** mặc định Dashboard; có thể mở Super App để trải nghiệm như khách.
- **khách hàng:** mặc định Super App.

## Kiến trúc

Modular: entry Flask, models SQLAlchemy, services (business logic), routes (blueprints), client React/Vite.

### Cấu trúc thư mục (tóm tắt)

```
One-Sovico/
├── app_modular_clean.py      # Entry Flask (production)
├── config.py                 # Cấu hình MySQL, MODEL_DIR, v.v.
├── requirements.txt
├── blockchain_simple.py        # Blockchain mock / tích hợp
├── blockchain_config.py
│
├── models/                   # ORM: customers, users, transactions, flights, resorts, ...
├── services/                 # Auth, AI, customer, admin, marketplace, token, ...
├── routes/                   # Blueprint API: auth, customer, ai, admin, chat, game, ...
├── migrations/               # Script migration DB (theo thứ tự số)
├── scripts/                  # Tiện ích train sentiment, cài dependency, v.v.
├── legacy/                   # Code cũ (ví dụ ai_utils)
├── test/                     # Script / test thủ công ESG, sentiment, ...
│
├── client/                   # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # AIFinancialAssistant, SuperApp modules, ...
│   │   ├── modules/
│   │   └── ...
│   └── package.json
│
├── dl_model/                 # Artifact model (persona, sentiment), train_persona_model.py
├── static/                   # File tĩnh (avatars, items, ...)
├
├── contracts/                # Hardhat, Solidity (NFT), tách khỏi backend Python
└── (file gốc khác)           # test_*.py, restart_server.py, integrate_sentiment.py — tiện ích dev
```

**Ghi chú:** Một số file tiện ích nằm trực tiếp ở thư mục gốc; không ảnh hưởng import của app chính. Có thể gom vào `scripts/` sau nếu muốn gọn hơn (cần cập nhật đường dẫn khi chạy thủ công).

## Cài đặt và chạy

### Bước 1: MySQL

Cài MySQL (Windows) hoặc XAMPP, tạo database theo `config.py` / biến môi trường.

### Bước 2: Database

```bash
python setup_ai_chat_db.py
# hoặc
.\setup_ai_chat.ps1
```

### Bước 3: Backend

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app_modular_clean.py
```

### Bước 4: Frontend

```bash
cd client
npm install
npm run dev
```

### Bước 5: Truy cập

- Backend API: `http://127.0.0.1:5000`
- Frontend: `http://localhost:5173`
- Health: `http://127.0.0.1:5000/health`

## Công nghệ

### Backend

- Flask, SQLAlchemy, MySQL (PyMySQL)
- AI/ML: TensorFlow, Scikit-learn, Google Gemini (client)
- Auth: JWT, BCrypt
- Blockchain: Web3.py (tùy chọn)

### Frontend

- React, TypeScript, Tailwind, Vite
- Google Generative AI (Gemini) trên client

## Tài khoản demo

### Chuyên viên (Dashboard)

- Email: `admin@hdbank.com.vn`
- Password: `123456`

### Khách hàng (Super App)

- Email: `khachhang@gmail.com`
- Password: `123456`

## API (rút gọn)

### Authentication

- `POST /auth/login` — Đăng nhập
- `POST /auth/register` — Đăng ký

### Customer

- `GET /customer/{id}` — Hồ sơ 360°
- `GET /customer/{id}/insights` — AI insights
- `GET /customers/search?q=...` — Tìm kiếm

### AI

- `POST /predict` hoặc route AI tương ứng trong app — Dự đoán persona (xem `routes/ai_routes.py`)

### AI Chat History

- `GET /api/chat/history/{customer_id}`
- `POST /api/chat/save`
- `DELETE /api/chat/{chat_id}`
- (Các endpoint chi tiết trong `routes/ai_chat_routes.py`)

### Admin & Achievements

- `GET /admin/achievements`
- `POST /admin/assign-achievement`
- `POST /admin/auto-assign-achievements`

### Token

- `GET /api/tokens/{customer_id}`
- `POST /api/tokens/add`
- `GET /api/tokens/{customer_id}/history`

## AI Model & Services

### Gemini AI

- Model: Gemini 1.5 Flash (fallback theo cấu hình client)
- NLP, intent, tự động hóa dịch vụ (đặt vé, chuyển tiền, đặt phòng — theo triển khai)

### Persona ML

- Input: tuổi, số dư HDBank, giao dịch, chuyến bay, resort, v.v.
- Output: các persona đã định nghĩa trong `training_meta.json` (xem `dl_model/`)

### AI Chat

- Lưu lịch sử MySQL, theo dõi action, có thể tích hợp sentiment (backend)

## Blockchain Achievement (tóm tắt)

- NFT SovicoPassport, soulbound, metadata động
- Chi tiết triển khai: `contracts/`

## Database Schema (tóm tắt)

- `users`, `customers`, `hdbank_transactions`, `vietjet_flights`, `resort_bookings`
- `achievements`, `customer_achievements`, `token_transactions`
- `ai_chat_history`, `ai_chat_messages`, `ai_service_actions` (theo migration)

## Kiến trúc service

- Tách models / services / routes
- Dependency injection qua `init_services` và `set_models` (xem `app_modular_clean.py`)

## Testing & Development

- `GET /health` — health check
- Các route debug nếu có trong `routes/debug_routes.py`

## Production

```bash
export FLASK_ENV=production
export MYSQL_HOST=...
export GEMINI_API_KEY=...
export JWT_SECRET_KEY=...
```

Bảo mật: JWT, validate input, CORS, rate limit (theo cấu hình), không commit secret.

## Monitoring

- Log Flask, metrics theo nhu cầu triển khai

## Cập nhật gần đây (Version 2.x)

- Lịch sử chat DB, automation dịch vụ, tối ưu tải

### Roadmap (gợi ý)

- Voice, mobile, analytics nâng cao, mainnet, đa ngôn ngữ

## Xử lý sự cố

1. **AI Chat 404** — Restart Flask, kiểm tra đăng ký blueprint trong log.
2. **Model AI chưa sẵn sàng** — Kiểm tra `dl_model/` và `MODEL_DIR`; có thể fallback mock trong `ai_service`.
3. **Database connection failed** — MySQL đang chạy, kiểm tra `config.py` / env.
4. **Gemini API** — Biến `VITE_GEMINI_API_KEY` (client), không hardcode key.

## Quick Start

```bash
git clone [repository-url]
cd One-Sovico

# Backend
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python setup_ai_chat_db.py
python app_modular_clean.py

# Frontend (terminal khác)
cd client
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:5000`

---

**Version:** 2.0.0  
**Last Updated:** September 13, 2025  
**Architecture:** Modular Clean  
**Author:** One-Sovico Development Team
