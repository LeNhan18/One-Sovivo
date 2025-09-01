# services/ai_service.py
import os
import pandas as pd
import numpy as np
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import joblib
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from models import get_models


class AIService:
    def __init__(self, db, model_dir):
        self.db = db
        self.model_dir = model_dir
        self.ai_model = None
        self.scaler = None
        self.encoder = None
        self.feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int',
                                'total_nights_stayed', 'total_resort_spending']

        # Get model classes after initialization
        self.models = get_models()
        self.Customer = self.models['Customer']
        self.HDBankTransaction = self.models['HDBankTransaction']
        self.VietjetFlight = self.models['VietjetFlight']
        self.ResortBooking = self.models['ResortBooking']

    def load_model(self):
        """Tải model đã được huấn luyện."""
        try:
            self.ai_model = tf.keras.models.load_model(os.path.join(self.model_dir, 'persona_model.h5'))
            self.scaler = joblib.load(os.path.join(self.model_dir, 'scaler.pkl'))
            self.encoder = joblib.load(os.path.join(self.model_dir, 'encoder.pkl'))
            print(f"✅ Đã tải Model AI từ {self.model_dir}")
            return True
        except (IOError, OSError) as e:
            print(f"⚠️ Lỗi khi tải model: {e}. Tạo model mới...")
            return self.train_and_save_model()

    def create_mock_model(self):
        """Tạo model mẫu nếu chưa có dữ liệu"""
        print("🔧 Tạo Mock Model để demo...")

        # Mock scaler và encoder
        self.scaler = StandardScaler()
        self.scaler.mean_ = np.array([35, 100000000, 10, 0.5, 3, 10000000])
        self.scaler.scale_ = np.array([10, 50000000, 8, 0.5, 2, 5000000])

        self.encoder = OneHotEncoder(sparse_output=False)
        self.encoder.categories_ = [np.array(['doanh_nhan', 'gia_dinh', 'nguoi_tre'])]

        # Mock model (sử dụng logic đơn giản)
        class MockModel:
            def predict(self, X):
                results = []
                for row in X:
                    # Logic đơn giản dựa trên features
                    if row[1] > 200000000:  # avg_balance
                        results.append([0.8, 0.1, 0.1])  # doanh_nhan
                    elif row[0] < 30:  # age
                        results.append([0.1, 0.1, 0.8])  # nguoi_tre
                    else:
                        results.append([0.1, 0.8, 0.1])  # gia_dinh
                return np.array(results)

        self.ai_model = MockModel()

        # Lưu mock files
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
        joblib.dump(self.scaler, os.path.join(self.model_dir, 'scaler.pkl'))
        joblib.dump(self.encoder, os.path.join(self.model_dir, 'encoder.pkl'))
        return True

    def train_and_save_model(self):
        """Huấn luyện và lưu model Deep Learning từ MySQL data."""
        print("🤖 Bắt đầu huấn luyện Model AI từ dữ liệu MySQL...")

        # Lấy dữ liệu từ MySQL
        customers_query = """
            SELECT c.customer_id, c.name, c.age, c.persona_type,
                   COALESCE(AVG(h.balance), 0) as avg_balance,
                   COALESCE(COUNT(DISTINCT v.flight_id), 0) as total_flights,
                   COALESCE(MAX(CASE WHEN v.ticket_class = 'business' THEN 1 ELSE 0 END), 0) as is_business_flyer,
                   COALESCE(SUM(r.nights_stayed), 0) as total_nights_stayed,
                   COALESCE(SUM(r.booking_value), 0) as total_resort_spending
            FROM customers c
            LEFT JOIN hdbank_transactions h ON c.customer_id = h.customer_id
            LEFT JOIN vietjet_flights v ON c.customer_id = v.customer_id
            LEFT JOIN resort_bookings r ON c.customer_id = r.customer_id
            WHERE c.persona_type IS NOT NULL
            GROUP BY c.customer_id, c.name, c.age, c.persona_type
        """

        merged_df = pd.read_sql(customers_query, self.db.engine)

        if merged_df.empty:
            print("📊 Không có dữ liệu để huấn luyện. Tạo dữ liệu mẫu...")
            return self.create_mock_model()

        # Feature Engineering
        merged_df['is_business_flyer_int'] = merged_df['is_business_flyer'].astype(int)
        merged_df.fillna(0, inplace=True)

        X_raw = merged_df[self.feature_columns]
        y_raw = merged_df[['persona_type']]

        # Chuẩn hóa và mã hóa
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_raw)

        self.encoder = OneHotEncoder(sparse_output=False)
        y_encoded = self.encoder.fit_transform(y_raw)

        # Xây dựng và huấn luyện model
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(X_scaled.shape[1],)),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(y_encoded.shape[1], activation='softmax')
        ])
        model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
        history = model.fit(X_scaled, y_encoded, epochs=15, batch_size=64, verbose=1)

        # Lưu trữ
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)

        model.save(os.path.join(self.model_dir, 'persona_model.h5'))
        joblib.dump(self.scaler, os.path.join(self.model_dir, 'scaler.pkl'))
        joblib.dump(self.encoder, os.path.join(self.model_dir, 'encoder.pkl'))

        self.plot_and_save_metrics(history)
        self.ai_model = model
        print(f"✅ Huấn luyện Model thành công!")
        return True

    def plot_and_save_metrics(self, history):
        """Vẽ và lưu biểu đồ accuracy và loss."""
        plt.figure(figsize=(12, 5))
        # Biểu đồ Accuracy
        plt.subplot(1, 2, 1)
        plt.plot(history.history['accuracy'], label='Training Accuracy')
        plt.title('Model Accuracy')
        plt.ylabel('Accuracy')
        plt.xlabel('Epoch')
        plt.legend(loc='lower right')
        # Biểu đồ Loss
        plt.subplot(1, 2, 2)
        plt.plot(history.history['loss'], label='Training Loss')
        plt.title('Model Loss')
        plt.ylabel('Loss')
        plt.xlabel('Epoch')
        plt.legend(loc='upper right')

        plt.tight_layout()
        metrics_path = os.path.join(self.model_dir, 'training_metrics.png')
        plt.savefig(metrics_path)
        plt.close()
        print(f"📊 Đã lưu biểu đồ Metrics tại: {metrics_path}")

    def predict_persona(self, input_data):
        """Dự đoán persona từ input data"""
        if not all([self.ai_model, self.scaler, self.encoder]):
            return None, "Model AI chưa sẵn sàng"

        input_df = pd.DataFrame([input_data])[self.feature_columns]
        input_scaled = self.scaler.transform(input_df)

        try:
            prediction_probs = self.ai_model.predict(input_scaled)
            predicted_index = np.argmax(prediction_probs, axis=1)[0]
            predicted_persona = self.encoder.categories_[0][predicted_index]
            return predicted_persona, None
        except Exception as e:
            # Fallback prediction
            if input_data['avg_balance'] > 200000000:
                return 'doanh_nhan', None
            elif input_data['age'] < 30:
                return 'nguoi_tre', None
            else:
                return 'gia_dinh', None

    def build_evidence(self, profile):
        """Sinh evidence để giải thích dự đoán AI."""
        evidences = []
        avg_balance = profile.get('hdbank_summary', {}).get('average_balance', 0) or 0
        is_biz = profile.get('vietjet_summary', {}).get('is_business_flyer', False)
        total_flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0) or 0
        resort_spending = profile.get('resort_summary', {}).get('total_spending', 0) or 0

        evidences.append({
            'label': 'Số dư trung bình',
            'value': f"{avg_balance:,.0f} VND",
            'ok': avg_balance >= 100_000_000
        })
        evidences.append({
            'label': 'Bay hạng thương gia',
            'value': 'Có' if is_biz else 'Không',
            'ok': bool(is_biz)
        })
        evidences.append({
            'label': 'Số chuyến bay/năm',
            'value': f"{total_flights} chuyến",
            'ok': total_flights >= 5
        })
        evidences.append({
            'label': 'Chi tiêu nghỉ dưỡng',
            'value': f"{resort_spending:,.0f} VND",
            'ok': resort_spending >= 20_000_000
        })

        return evidences

    def get_recommendations(self, predicted_persona, profile):
        """
        HỆ THỐNG ĐỀ XUẤT ĐA TẦNG
        Tạo đề xuất dựa trên persona, tín hiệu hành vi và chấm điểm.
        """
        all_recommendations = {}

        # --- Tầng 1: Đề xuất dựa trên Phân khúc (Persona-based) ---
        persona_recs = self._get_persona_recommendations(predicted_persona)
        for rec in persona_recs:
            all_recommendations[rec['offer_code']] = rec

        # --- Tầng 2: Đề xuất dựa trên Tín hiệu (Trigger-based) ---
        trigger_recs = self._get_trigger_recommendations(profile)
        for rec in trigger_recs:
            all_recommendations[rec['offer_code']] = rec

        # --- Tầng 3: Chấm điểm & Xếp hạng ---
        ranked_recs = sorted(
            all_recommendations.values(),
            key=lambda x: x.get('score', 0),
            reverse=True
        )

        # Trả về Top 3 đề xuất tốt nhất
        return ranked_recs[:3]

    def _get_persona_recommendations(self, persona):
        """Helper: Lấy các đề xuất nền tảng theo persona."""
        recs = []
        if persona == 'doanh_nhan':
            recs.append({
                'offer_code': 'DN001', 'score': 70,
                'title': 'Mở thẻ HDBank Visa Signature',
                'description': 'Tận hưởng đặc quyền phòng chờ sân bay và các ưu đãi golf cao cấp.'
            })
            recs.append({
                'offer_code': 'DN003', 'score': 60,
                'title': 'Gói Đầu tư Trái phiếu Doanh nghiệp',
                'description': 'Lợi suất hấp dẫn và an toàn cho dòng tiền nhàn rỗi của bạn.'
            })
        elif persona == 'gia_dinh':
            recs.append({
                'offer_code': 'GD001', 'score': 70,
                'title': 'Combo Du lịch Hè Vietjet',
                'description': 'Giảm giá 30% cho cả gia đình khi đặt vé máy bay và khách sạn qua HDBank App.'
            })
            recs.append({
                'offer_code': 'GD002', 'score': 65,
                'title': 'Gói Tiết kiệm "Chắp cánh Tương lai"',
                'description': 'Bắt đầu tích lũy cho việc học của con bạn với lãi suất ưu đãi.'
            })
        elif persona == 'nguoi_tre':
            recs.append({
                'offer_code': 'NT001', 'score': 70,
                'title': 'Mở thẻ tín dụng đầu tiên',
                'description': 'Bắt đầu xây dựng lịch sử tín dụng của bạn với thẻ HDBank Vietjet Platinum.'
            })
        return recs

    def _get_trigger_recommendations(self, profile):
        """Helper: Quét profile để tìm các tín hiệu và kích hoạt đề xuất."""
        recs = []

        # Lấy các chỉ số chính từ profile
        avg_balance = profile.get('hdbank_summary', {}).get('average_balance', 0)
        total_flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0)
        resort_spending = profile.get('resort_summary', {}).get('total_spending', 0)
        has_loan = profile.get('hdbank_summary', {}).get('total_loan_amount', 0) > 0

        # Tín hiệu 1: Khách hàng tiềm năng cao cho thẻ VIP
        if avg_balance > 500_000_000 and total_flights > 10:
            recs.append({
                'offer_code': 'TRG001', 'score': 100,
                'title': 'Nâng cấp miễn phí HDBank Visa Signature',
                'description': 'Tri ân sự gắn bó, tận hưởng đặc quyền phòng chờ thương gia miễn phí.'
            })

        # Tín hiệu 2: Khách hàng tiềm năng cho BĐS nghỉ dưỡng
        if resort_spending > 50_000_000 and avg_balance > 1_000_000_000:
            recs.append({
                'offer_code': 'TRG002', 'score': 95,
                'title': 'Đặc quyền tham dự sự kiện BĐS Sovico',
                'description': 'Nhận vé mời tham dự sự kiện ra mắt dự án bất động sản nghỉ dưỡng mới nhất.'
            })

        # Tín hiệu 3: Khách hàng có tiền nhưng chưa bay
        if total_flights == 0 and avg_balance > 200_000_000:
            recs.append({
                'offer_code': 'TRG003', 'score': 90,
                'title': 'Trải nghiệm bay Vietjet với ưu đãi 50%',
                'description': 'Tặng voucher giảm 50% cho chuyến bay nội địa đầu tiên của bạn.'
            })

        # Tín hiệu 4: Người trẻ có thu nhập ổn định, tiềm năng vay
        if (profile.get('basic_info', {}).get('age', 30) < 30) and (avg_balance > 20_000_000) and not has_loan:
            recs.append({
                'offer_code': 'TRG004', 'score': 85,
                'title': 'Gói vay tiêu dùng trả góp 0%',
                'description': 'Sở hữu ngay các sản phẩm công nghệ mới nhất với ưu đãi trả góp 0% qua HD Saison.'
            })

        return recs
