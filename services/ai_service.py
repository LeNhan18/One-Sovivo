# services/ai_service.py
import os
import json
import numpy as np
import pandas as pd
import joblib

try:
    import tensorflow as tf
except ImportError:
    tf = None


class AIService:
    """
    AI Service for persona prediction and recommendations.

    This service loads the trained artifacts from dl_model/:
      - persona_model.h5 (Keras)
      - scaler.pkl (StandardScaler for numeric features)
      - encoder.pkl (OneHotEncoder for categorical features)
      - training_meta.json (feature metadata: numeric_cols, categorical_cols, classes)
    """

    def __init__(self, config):
        self.VERSION = "AIService/2.1"
        self.config = config
        self.model_dir = config.get('MODEL_DIR', './dl_model')
        self.use_legacy_labels = False  # Sử dụng labels trực tiếp từ model

        self.ai_model = None
        self.scaler = None
        self.encoder = None
        self.numeric_cols = []
        self.categorical_cols = []
        self.classes = []

        self.models = {}

    def set_models(self, model_classes):
        self.models = model_classes

    def is_model_loaded(self):
        return all([self.ai_model is not None, self.scaler is not None, self.encoder is not None, self.classes])

    def load_model(self):
        """Load trained model and preprocessors. Falls back to mock if missing or TF not available."""
        print(f"[AIService] init {self.VERSION} model_dir={self.model_dir}")
        # Load metadata
        meta_path = os.path.join(self.model_dir, 'training_meta.json')
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            self.numeric_cols = meta.get('numeric_cols', [])
            self.categorical_cols = meta.get('categorical_cols', [])
            self.classes = meta.get('classes', ['nguoi_moi'])
        except Exception as e:
            print(f"️ Could not load training_meta.json: {e}")
            # Provide safe defaults
            self.numeric_cols = ['age', 'monthly_income', 'total_transactions']
            self.categorical_cols = []
            self.classes = ['nguoi_moi']

        # Load preprocessors
        try:
            self.scaler = joblib.load(os.path.join(self.model_dir, 'scaler.pkl'))
        except Exception as e:
            print(f" Could not load scaler.pkl: {e}")
            self.scaler = None

        try:
            self.encoder = joblib.load(os.path.join(self.model_dir, 'encoder.pkl'))
        except Exception as e:
            print(f" Could not load encoder.pkl: {e}")
            self.encoder = None

        # Load Keras model (.keras ưu tiên, .h5 fallback)
        try:
            if tf is None:
                print("️ TensorFlow not available. Using mock model.")
                return self.create_mock_model()
            model_path = os.path.join(self.model_dir, 'persona_model.keras')
            if not os.path.exists(model_path):
                model_path = os.path.join(self.model_dir, 'persona_model.h5')
            self.ai_model = tf.keras.models.load_model(model_path)
            print(f" Loaded AI model from {self.model_dir} | classes={self.classes}")
            return True
        except Exception as e:
            print(f" Failed to load Keras model: {e}. Using mock model.")
            return self.create_mock_model()

    def create_mock_model(self):
        """Create a lightweight mock model when artifacts are unavailable."""
        # Minimal scaler/encoder dummies if missing
        if self.scaler is None:
            class _IdentityScaler:
                def transform(self, X):
                    return np.asarray(X)
            self.scaler = _IdentityScaler()

        if self.encoder is None and self.categorical_cols:
            class _IdentityEncoder:
                def transform(self, X):
                    return np.zeros((len(X), 0))
                def get_feature_names_out(self, cols=None):
                    return []
            self.encoder = _IdentityEncoder()

        # Default classes if not set
        if not self.classes:
            self.classes = ['nguoi_moi']

        class MockModel:
            def predict(self, X):
                # Uniform low-confidence distribution favoring first class
                n = X.shape[0]
                k = max(1, len(getattr(self, 'classes', ['nguoi_moi'])))
                out = np.full((n, k), 1.0 / k, dtype=float)
                return out

        self.ai_model = MockModel()
        # attach classes for reference
        setattr(self.ai_model, 'classes', self.classes)
        print(" Using Mock AI model")
        return True

    def _prepare_input_vector(self, input_data: dict) -> np.ndarray:
        """Prepare model input using saved preprocessors and metadata.
        Aligns feature names to scaler.feature_names_in_ when available to avoid mismatch.
        """
        # Determine required numeric columns based on fitted scaler
        required_numeric = []
        if hasattr(self.scaler, 'feature_names_in_') and len(getattr(self.scaler, 'feature_names_in_')):
            required_numeric = list(self.scaler.feature_names_in_)
        else:
            required_numeric = list(self.numeric_cols or [])

        # Map required cols → alternate keys (input_data có thể dùng tên khác)
        alt_map = {
            'total_transactions': ['hdbank_tx_count', 'hdbank_transaction_count'],
            'total_flights': ['vietjet_flight_count', 'flights_last_year'],
            'total_nights_stayed': ['resort_nights'],
            'total_spent': ['hdbank_total_amount', 'hdbank_spent_total'],
            'avg_balance': ['hdbank_average_balance', 'average_balance'],
            'total_resort_spending': ['resort_spent', 'total_resort_spending'],
        }

        num_vals = {}
        for col in required_numeric:
            if col in input_data:
                num_vals[col] = input_data.get(col, 0)
                continue
            for alt in alt_map.get(col, []):
                if alt in input_data:
                    num_vals[col] = input_data.get(alt, 0)
                    break
            else:
                num_vals[col] = 0

        # Build DataFrame strictly with required columns
        X_num = pd.DataFrame([num_vals]) if required_numeric else pd.DataFrame(index=[0])
        if required_numeric:
            X_num = X_num.reindex(columns=required_numeric, fill_value=0)
        X_num_tx = self.scaler.transform(X_num) if required_numeric else np.zeros((1, 0))

        # Build categorical frame
        if self.categorical_cols:
            cat_vals = {col: str(input_data.get(col, '')) for col in self.categorical_cols}
            X_cat = pd.DataFrame([cat_vals])
            try:
                X_cat_tx = self.encoder.transform(X_cat)
            except Exception:
                # If encoder missing or incompatible, fallback to zero-width
                X_cat_tx = np.zeros((1, 0))
        else:
            X_cat_tx = np.zeros((1, 0))

        # Concatenate
        return np.concatenate([X_num_tx, X_cat_tx], axis=1)

    def predict_persona(self, input_data: dict):
        """Predict persona label and confidence từ model đã train."""
        if not self.is_model_loaded():
            return None, 'AI model is not loaded'

        try:
            X = self._prepare_input_vector(input_data)
            probs = self.ai_model.predict(X)
            probs = np.asarray(probs)[0]
            idx = int(np.argmax(probs))
            label = self.classes[idx] if idx < len(self.classes) else self.classes[0]
            return {
                'label': label,
                'confidence': float(probs[idx]),
                'probs': {c: float(probs[i]) for i, c in enumerate(self.classes)}
            }, None
        except Exception as e:
            return None, f'Prediction error: {str(e)}'

    def build_evidence_from_data(self, input_data):
        evidences = []
        # Evidence keys cho 6 personas
        avg_balance = input_data.get('avg_balance', input_data.get('hdbank_average_balance', 0)) or 0
        total_flights = input_data.get('total_flights', input_data.get('vietjet_flight_count', 0)) or 0
        resort_spent = input_data.get('total_resort_spending', input_data.get('resort_spent', 0)) or 0
        age = input_data.get('age', 30)
        monthly_income = input_data.get('monthly_income', 0) or 0

        # Evidence dựa trên 6 personas - ưu tiên số dư và hoạt động
        evidences.append({'label': 'Số dư HDBank TB', 'value': f"{avg_balance:,.0f} VND", 'ok': avg_balance >= 50_000_000})
        evidences.append({'label': 'Số chuyến bay/năm', 'value': f"{total_flights}", 'ok': total_flights >= 3})
        evidences.append({'label': 'Chi tiêu nghỉ dưỡng', 'value': f"{resort_spent:,.0f} VND", 'ok': resort_spent >= 10_000_000})
        evidences.append({'label': 'Tuổi', 'value': f"{age} tuổi", 'ok': age >= 25})
        
        # Thu nhập chỉ hiển thị nếu có dữ liệu
        if monthly_income > 0:
            evidences.append({'label': 'Thu nhập hàng tháng', 'value': f"{monthly_income:,.0f} VND", 'ok': monthly_income >= 20_000_000})
        return evidences

    def get_recommendations(self, persona_label: str, input_data: dict):
        """Recommendations cho 6 personas mới."""
        recs = []
        label = persona_label or ''
        
        # Kiểm tra khách hàng mới (ít hoạt động)
        total_transactions = input_data.get('total_transactions', input_data.get('hdbank_tx_count', 0)) or 0
        total_flights = input_data.get('total_flights', input_data.get('vietjet_flight_count', 0)) or 0
        total_nights = input_data.get('total_nights_stayed', input_data.get('resort_nights', 0)) or 0
        
        # Nếu khách hàng mới (rất ít hoạt động)
        if total_transactions < 2 and total_flights < 1 and total_nights < 1:
            recs.append({'offer_code': 'NEW001', 'title': 'Mở thẻ HDBank đầu tiên!', 'description': 'Hoàn tiền 5% cho giao dịch đầu tiên khi mở thẻ tín dụng.'})
            recs.append({'offer_code': 'NEW002', 'title': 'Đặt vé máy bay đầu tiên', 'description': 'Giảm giá 30% cho chuyến bay đầu tiên và đặt phòng resort.'})
            recs.append({'offer_code': 'NEW003', 'title': 'Gói Khởi đầu Thông minh', 'description': 'Tài khoản tiết kiệm với lãi suất ưu đãi cho khách hàng mới.'})
            return recs

        if label == 'thuong_gia':
            recs.append({'offer_code': 'TG001', 'title': 'HDBank Visa VIP', 'description': 'Thẻ tín dụng cao cấp với đặc quyền VIP toàn cầu.'})
            recs.append({'offer_code': 'TG002', 'title': 'Gói Đầu tư Premium', 'description': 'Danh mục đầu tư cao cấp với lợi suất 15-20%/năm.'})
            recs.append({'offer_code': 'TG003', 'title': 'Combo Du lịch Luxury', 'description': 'Ưu đãi đặc biệt cho khách sạn 5 sao và vé hạng thương gia.'})
        elif label == 'doanh_nhan':
            recs.append({'offer_code': 'DN001', 'title': 'HDBank Visa Signature', 'description': 'Thẻ tín dụng doanh nhân với đặc quyền phòng chờ sân bay.'})
            recs.append({'offer_code': 'DN002', 'title': 'Gói Vay Kinh doanh', 'description': 'Vay vốn kinh doanh với lãi suất ưu đãi 8-10%/năm.'})
            recs.append({'offer_code': 'DN003', 'title': 'Dịch vụ Tài chính Doanh nghiệp', 'description': 'Gói dịch vụ tài chính toàn diện cho doanh nghiệp.'})
        elif label == 'sinh_vien':
            recs.append({'offer_code': 'SV001', 'title': 'Thẻ HDBank Student', 'description': 'Thẻ tín dụng dành cho sinh viên với hạn mức phù hợp.'})
            recs.append({'offer_code': 'SV002', 'title': 'Gói Tiết kiệm Sinh viên', 'description': 'Tài khoản tiết kiệm với lãi suất ưu đãi cho sinh viên.'})
            recs.append({'offer_code': 'SV003', 'title': 'Ưu đãi Du lịch Sinh viên', 'description': 'Giảm giá 50% cho vé máy bay và khách sạn sinh viên.'})
        elif label == 'nguoi_tre':
            recs.append({'offer_code': 'NT001', 'title': 'Thẻ HDBank GenZ', 'description': 'Thẻ tín dụng dành cho GenZ với hoàn tiền cao.'})
            recs.append({'offer_code': 'NT002', 'title': 'Ưu đãi 10% cho chuyến bay ', 'description': 'Sản phẩm đầu tư phù hợp với người trẻ, rủi ro thấp.'})
            recs.append({'offer_code': 'NT003', 'title': 'Combo du lịch hạng trung bình', 'description': 'Hoàn tiền 10% khi mua sắm online và đặt vé xem phim.'})
        elif label == 'du_lich':
            recs.append({'offer_code': 'DL001', 'title': 'Combo khuyến mãi Vietjet + Resort', 'description': 'Gói du lịch trọn gói với giảm giá 30% cho vé máy bay và resort.'})
            recs.append({'offer_code': 'DL002', 'title': 'Thẻ HDBank Travel', 'description': 'Thẻ tín dụng du lịch với tích miles và bảo hiểm du lịch.'})
            recs.append({'offer_code': 'DL003', 'title': 'Gói Du lịch Quốc tế', 'description': 'Ưu đãi đặc biệt cho các chuyến du lịch quốc tế.'})
        else:  # gia_dinh
            recs.append({'offer_code': 'GD001', 'title': 'Thẻ HDBank Gia đình', 'description': 'Thẻ tín dụng gia đình với ưu đãi cho cả nhà.'})
            recs.append({'offer_code': 'GD002', 'title': 'Gói Tiết kiệm Gia đình', 'description': 'Tài khoản tiết kiệm với lãi suất ưu đãi cho gia đình.'})
            recs.append({'offer_code': 'GD003', 'title': 'Combo Du lịch Gia đình', 'description': 'Ưu đãi đặc biệt cho các chuyến du lịch gia đình.'})
        return recs

    def predict_with_achievements(self, input_data: dict):
        result, error = self.predict_persona(input_data)
        if error:
            return {'error': error}
        evidences = self.build_evidence_from_data(input_data)
        recs = self.get_recommendations(result['label'], input_data)
        return {
            'predicted_persona': result['label'],
            'confidence': result['confidence'],
            'probs': result['probs'],
            'evidence': evidences,
            'recommendations': recs
        }

