# One-Sovivo

AI Insight Dashboard demo gồm:

- Backend Flask cung cấp dữ liệu Customer 360°, AI insights và đề xuất.
- Frontend React (Vite + Tailwind) thể hiện giao diện 3 cột tương tác.

## Cách chạy nhanh

1) Backend (Flask)

- Yêu cầu Python 3.10+.
- Cài đặt package:

```
pip install -r requirements.txt
```

- Chạy server (mặc định http://127.0.0.1:5000):

```
python app.py
```

2) Frontend (Vite React)

- Yêu cầu Node.js 18+.
- Cài dependencies:

```
cd client
npm install
```

- Chạy dev server (http://127.0.0.1:5173):

```
npm run dev
```

Dev server đã cấu hình proxy /api -> http://127.0.0.1:5000.

## Các API chính

- GET /customer/{id}: Hồ sơ 360°
- GET /customer/{id}/insights: Persona + Evidence + Recommendations
- GET /customer/{id}/recommendations: Danh sách đề xuất
- GET /customers/suggestions: Top khách hàng đáng chú ý
- GET /customers/search?q=...: Tìm khách hàng theo tên/ID

## UI chính

- Cột 1: Tìm kiếm + Danh sách gợi ý
- Cột 2: Hồ sơ 360° + AI Insight (persona, evidence)
- Cột 3: Next Best Actions + mô phỏng push notification trên điện thoại