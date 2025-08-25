# One-Sovico Platform

🏦 **Hệ thống AI phân tích khách hàng thông minh** cho hệ sinh thái tài chính Sovico

## 🎯 Tổng quan

One-Sovico Platform bao gồm 2 ứng dụng chính:

### 1. 🧠 AI Insight Dashboard (Dành cho Chuyên viên/BGK)
- **Mục đích**: Phòng điều khiển phân tích khách hang với AI
- **Đối tượng**: Ban Giám khảo, chuyên viên HDBank
- **Tính năng**:
  - Tìm kiếm và phân tích khách hàng 360°
  - AI dự đoán persona (doanh_nhan, gia_dinh, nguoi_tre)
  - Đề xuất sản phẩm cá nhân hóa
  - Trực quan hóa hiệu suất Model AI

### 2. 📱 One-Sovico Super App (Dành cho Khách hàng)
- **Mục đích**: Siêu ứng dụng quản lý dịch vụ tài chính
- **Đối tượng**: Khách hàng cuối
- **Tính năng**:
  - Ví Sovico Token (SVT) Blockchain
  - Tổng quan dịch vụ (HDBank, Vietjet, Resort)
  - Ưu đãi AI cá nhân hóa
  - Lịch sử giao dịch Blockchain minh bạch

## 🛠️ Công nghệ

### Backend
- **Framework**: Flask + SQLAlchemy
- **Database**: MySQL
- **AI/ML**: TensorFlow, Scikit-learn
- **Auth**: JWT + BCrypt

### Frontend
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## 🚀 Cài đặt và Chạy

### Bước 1: Cài đặt MySQL
```bash
# Windows: Tải MySQL từ https://dev.mysql.com/downloads/installer/
# Hoặc sử dụng XAMPP: https://www.apachefriends.org/
```

### Bước 2: Thiết lập Backend
```bash
# Cài đặt Python dependencies
pip install -r requirements.txt

# Thiết lập database (cấu hình MySQL trong config.py trước)
python setup_database.py

# Chạy backend
```

### Bước 3: Thiết lập Frontend
```bash
cd client
npm install
npm run dev
```

### Bước 4: Truy cập
- **Backend API**: http://127.0.0.1:5000
- **Frontend**: http://localhost:5173

## 🔐 Demo Accounts

### Chuyên viên (Dashboard)
- **Email**: `admin@hdbank.com.vn`
- **Password**: `123456`

### Khách hàng (Super App)
- **Email**: `khachhang@gmail.com`
- **Password**: `123456`

## 📊 API Endpoints

- `POST /auth/login` - Đăng nhập
- `GET /customer/{id}` - Hồ sơ 360°
- `GET /customer/{id}/insights` - AI insights
- `POST /predict` - Dự đoán persona
- `GET /customers/search?q=...` - Tìm kiếm

## 🧠 AI Model

### Features
- Tuổi, số dư HDBank, chuyến bay Vietjet, nghỉ dưỡng resort

### Output
- `doanh_nhan` - Doanh nhân
- `gia_dinh` - Gia đình
- `nguoi_tre` - Người trẻ

---

🎉 **Hệ sinh thái One-Sovico hoàn chỉnh với MySQL, AI và Blockchain!**

## UI chính

- Cột 1: Tìm kiếm + Danh sách gợi ý
- Cột 2: Hồ sơ 360° + AI Insight (persona, evidence)
- Cột 3: Next Best Actions + mô phỏng push notification trên điện thoại