# services/ai_service.py
import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import joblib
try:
    import tensorflow as tf
except ImportError:
    tf = None
from sklearn.preprocessing import StandardScaler, OneHotEncoder

class AIService:
    def __init__(self, config):
        self.config = config
        self.model_dir = config.get('MODEL_DIR', './dl_model')
        self.ai_model = None
        self.scaler = None
        self.encoder = None
        self.feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int',
                                'total_nights_stayed', 'total_resort_spending']
        self.models = {}

    def set_models(self, model_classes):
        """Set model classes after initialization"""
        self.models = model_classes

    def is_model_loaded(self):
        """Check if AI model is loaded and ready"""
        return all([self.ai_model, self.scaler, self.encoder])

    def load_model(self):
        """Tải model đã được huấn luyện."""
        try:
            if tf is None:
                print("⚠️ TensorFlow không available, dùng mock model")
                return self.create_mock_model()
                
            self.ai_model = tf.keras.models.load_model(os.path.join(self.model_dir, 'persona_model.h5'))
            self.scaler = joblib.load(os.path.join(self.model_dir, 'scaler.pkl'))
            self.encoder = joblib.load(os.path.join(self.model_dir, 'encoder.pkl'))
            print(f"✅ Đã tải Model AI từ {self.model_dir}")
            return True
        except (IOError, OSError) as e:
            print(f"⚠️ Lỗi khi tải model: {e}. Tạo mock model...")
            return self.create_mock_model()

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
                    # Improved logic for 'doanh_nhan'
                    if row[1] > 200000000 and row[2] >= 5 and row[3] == 1:  # avg_balance > 200M, total_flights >= 5, is_business_flyer
                        results.append([0.8, 0.1, 0.1])  # doanh_nhan
                    elif row[0] < 30:  # age < 30
                        results.append([0.1, 0.1, 0.8])  # nguoi_tre
                    else:
                        results.append([0.1, 0.8, 0.1])  # gia_dinh
                return np.array(results)

        self.ai_model = MockModel()

        # Lưu mock files
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
        try:
            joblib.dump(self.scaler, os.path.join(self.model_dir, 'scaler.pkl'))
            joblib.dump(self.encoder, os.path.join(self.model_dir, 'encoder.pkl'))
        except Exception as e:
            print(f"⚠️ Không thể lưu mock files: {e}")
        return True

    def predict_persona(self, input_data):
        """Dự đoán persona từ input data"""
        if not all([self.ai_model, self.scaler, self.encoder]):
            return None, 'AI model chưa được tải'

        try:
            # Tăng cường dữ liệu đầu vào với kiểm tra chia cho 0
            input_data['resort_spending_ratio'] = (
                input_data['total_resort_spending'] / input_data['avg_balance']
                if input_data['avg_balance'] > 0 else 0
            )
            input_data['business_flight_ratio'] = (
                input_data['is_business_flyer_int'] / input_data['total_flights']
                if input_data['total_flights'] > 0 else 0
            )
            input_data['monthly_income'] = input_data.get('monthly_income', 0)
            input_data['total_transactions'] = input_data.get('total_transactions', 0)
            input_data['premium_service_usage'] = input_data.get('premium_service_usage', 0)

            # Chuẩn bị input
            input_df = pd.DataFrame([input_data])[self.feature_columns]
            print("Dữ liệu đầu vào sau khi tăng cường:", input_df)

            input_scaled = self.scaler.transform(input_df)
            print("Dữ liệu sau khi chuẩn hóa:", input_scaled)

            # Dự đoán
            predictions = self.ai_model.predict(input_scaled)
            print("Kết quả dự đoán:", predictions)

            predicted_class = np.argmax(predictions[0])
            persona_names = ['doanh_nhan', 'gia_dinh', 'nguoi_tre']
            predicted_persona = persona_names[predicted_class]
            confidence = float(predictions[0][predicted_class])

            print("Persona dự đoán:", predicted_persona, "Độ tin cậy:", confidence)
            return predicted_persona, None
        except Exception as e:
            return None, f'Lỗi dự đoán: {str(e)}'

    def predict_with_achievements(self, input_data):
        """API predict với achievements logic"""
        persona, error = self.predict_persona(input_data)
        if error:
            return {'error': error}

        # Build evidence
        evidence = self.build_evidence_from_data(input_data)
        
        # Get recommendations
        recommendations = self.get_recommendations(persona, input_data)

        return {
            'predicted_persona': persona,
            'evidence': evidence,
            'recommendations': recommendations
        }

    def build_evidence_from_data(self, input_data):
        """Build evidence từ input data"""
        evidences = []
        
        avg_balance = input_data.get('avg_balance', 0) or 0
        total_flights = input_data.get('total_flights', 0) or 0
        is_business_flyer = input_data.get('is_business_flyer_int', 0) or 0
        total_resort_spending = input_data.get('total_resort_spending', 0) or 0

        evidences.append({
            'label': 'Số dư trung bình',
            'value': f"{avg_balance:,.0f} VND",
            'ok': avg_balance >= 100_000_000
        })
        evidences.append({
            'label': 'Bay hạng thương gia',
            'value': 'Có' if is_business_flyer else 'Không',
            'ok': bool(is_business_flyer)
        })
        evidences.append({
            'label': 'Số chuyến bay/năm',
            'value': f"{total_flights} chuyến",
            'ok': total_flights >= 5
        })
        evidences.append({
            'label': 'Chi tiêu nghỉ dưỡng',
            'value': f"{total_resort_spending:,.0f} VND",
            'ok': total_resort_spending >= 20_000_000
        })

        return evidences

    def build_evidence(self, profile):
        """Build evidence từ customer profile"""
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

    def get_recommendations(self, predicted_persona, input_data):
        """Tạo đề xuất dựa trên persona được dự đoán."""
        recommendations = []

        # Gợi ý cho khách hàng mới hoàn toàn
        if input_data.get('total_transactions', 0) == 0 and input_data.get('total_flights', 0) == 0:
            recommendations.append({
                'offer_code': 'NEW001',
                'title': 'Mở thẻ HDBank Visa Classic',
                'description': 'Ưu đãi mở thẻ tín dụng lần đầu với hoàn tiền 5% cho giao dịch đầu tiên.'
            })
            recommendations.append({
                'offer_code': 'NEW002',
                'title': 'Đặt chuyến bay đầu tiên',
                'description': 'Giảm giá 20% cho chuyến bay đầu tiên khi đặt qua HDBank App.'
            })
            return recommendations

        # Gợi ý theo persona
        if predicted_persona == 'doanh_nhan':
            recommendations.append({
                'offer_code': 'DN001',
                'title': 'Mở thẻ HDBank Visa Signature',
                'description': 'Tận hưởng đặc quyền phòng chờ sân bay và các ưu đãi golf cao cấp.'
            })
            recommendations.append({
                'offer_code': 'DN002',
                'title': 'Gói Nghỉ Dưỡng VIP',
                'description': 'Ưu đãi đặc biệt cho khách hàng thường xuyên sử dụng dịch vụ resort.'
            })
        elif predicted_persona == 'gia_dinh':
            recommendations.append({
                'offer_code': 'GD001',
                'title': 'Combo Du lịch Hè Vietjet',
                'description': 'Giảm giá 30% cho cả gia đình khi đặt vé máy bay và khách sạn qua HDBank App.'
            })
            recommendations.append({
                'offer_code': 'GD002',
                'title': 'Ưu đãi Mua sắm Gia đình',
                'description': 'Hoàn tiền 10% khi mua sắm tại các siêu thị và trung tâm thương mại.'
            })
        elif predicted_persona == 'nguoi_tre':
            recommendations.append({
                'offer_code': 'NT001',
                'title': 'Thẻ Tín Dụng HDBank GenZ',
                'description': 'Ưu đãi hoàn tiền 5% khi mua sắm online và đặt vé xem phim.'
            })
            recommendations.append({
                'offer_code': 'NT002',
                'title': 'Gói Du lịch Phượt Trẻ',
                'description': 'Giảm giá 20% cho các tour du lịch khám phá.'
            })

        return recommendations
