# legacy/ai_utils.py
# -*- coding: utf-8 -*-
"""
AI utilities split from app.py without changing behavior.
Expose module-level globals: ai_model, scaler, encoder, feature_columns.
Functions expect Flask app (and db where needed) to be passed in when required.
"""
import os
import joblib
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Module-level globals
ai_model = None
scaler = None
encoder = None
feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int',
                   'total_nights_stayed', 'total_resort_spending']

# File names đồng bộ
MODEL_NAME = "persona_model.h5"
SCALER_NAME = "scaler.pkl"
ENCODER_NAME = "encoder.pkl"


def plot_and_save_metrics(history, model_dir):
    """Vẽ và lưu biểu đồ accuracy và loss."""
    plt.figure(figsize=(12, 5))
    # Accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Training Accuracy')
    plt.title('Model Accuracy')
    plt.ylabel('Accuracy')
    plt.xlabel('Epoch')
    plt.legend(loc='lower right')
    # Loss
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Training Loss')
    plt.title('Model Loss')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.legend(loc='upper right')

    plt.tight_layout()
    metrics_path = os.path.join(model_dir, 'training_metrics.png')
    plt.savefig(metrics_path)
    plt.close()
    print(f"✅ Đã lưu biểu đồ Metrics tại: {metrics_path}")


def train_and_save_model(app, db):
    """Huấn luyện và lưu model Deep Learning từ MySQL data."""
    global ai_model, scaler, encoder
    print("🚀 Bắt đầu huấn luyện Model AI từ dữ liệu MySQL...")

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

    merged_df = None
    try:
        merged_df = __import__('pandas').read_sql(customers_query, db.engine)
    except Exception as e:
        print(f"❌ Không thể đọc dữ liệu từ DB: {e}")
        return create_mock_model(app)

    if merged_df is None or merged_df.empty:
        print("⚠️ Không có dữ liệu để huấn luyện. Tạo Mock Model...")
        return create_mock_model(app)

    print(f"📊 Đã lấy {len(merged_df)} dòng dữ liệu từ DB")

    # Feature Engineering
    merged_df['is_business_flyer_int'] = merged_df['is_business_flyer'].astype(int)
    merged_df.fillna(0, inplace=True)

    X_raw = merged_df[feature_columns]
    y_raw = merged_df[['persona_type']]

    # Chuẩn hóa + one-hot
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    encoder = OneHotEncoder(sparse_output=False)
    y_encoded = encoder.fit_transform(y_raw)

    # Xây dựng model
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(X_scaled.shape[1],)),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(y_encoded.shape[1], activation='softmax')
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    print("🔄 Training model...")
    history = model.fit(X_scaled, y_encoded, epochs=15, batch_size=64, verbose=1)
    print("✅ Training hoàn tất")

    # Lưu model
    model_dir = app.config.get('MODEL_DIR', 'dl_model')
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    model.save(os.path.join(model_dir, MODEL_NAME))
    joblib.dump(scaler, os.path.join(model_dir, SCALER_NAME))
    joblib.dump(encoder, os.path.join(model_dir, ENCODER_NAME))

    plot_and_save_metrics(history, model_dir)

    ai_model, scaler, encoder = model, scaler, encoder
    print(f"✅ Huấn luyện và lưu Model thành công tại {model_dir}")


def create_mock_model(app):
    """Tạo model mẫu nếu chưa có dữ liệu"""
    global ai_model, scaler, encoder
    print("⚡ Tạo Mock Model để demo...")

    # Mock scaler
    scaler = StandardScaler()
    scaler.mean_ = np.array([35, 100000000, 10, 0.5, 3, 10000000])
    scaler.scale_ = np.array([10, 50000000, 8, 0.5, 2, 5000000])
    scaler.var_ = scaler.scale_ ** 2
    scaler.n_features_in_ = len(scaler.mean_)

    # Mock encoder
    encoder = OneHotEncoder(sparse_output=False)
    encoder.categories_ = [np.array([
        'doanh_nhan', 'gia_dinh', 'nguoi_tre', 'nguoi_moi',
        'khach_hang_tiet_kiem', 'khach_hang_dau_tu', 'khach_hang_du_lich'
    ])]

    # Mock model
    class MockModel:
        def predict(self, X):
            results = []
            for row in X:
                age, balance, flights, is_biz, nights, resort_spending = row
                if balance > 200000000 or is_biz > 0.5:
                    probs = [0.8, 0.15, 0.05, 0, 0, 0, 0]
                elif age < 30:
                    probs = [0.1, 0.2, 0.7, 0, 0, 0, 0]
                else:
                    probs = [0.2, 0.7, 0.1, 0, 0, 0, 0]
                results.append(probs)
            return np.array(results)

    ai_model = MockModel()

    model_dir = app.config.get('MODEL_DIR', 'dl_model')
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
    joblib.dump(scaler, os.path.join(model_dir, SCALER_NAME))
    joblib.dump(encoder, os.path.join(model_dir, ENCODER_NAME))


def load_model(app, db=None):
    """Tải model đã được huấn luyện. Nếu có DB thì sẽ train lại, nếu không fallback mock."""
    global ai_model, scaler, encoder
    try:
        model_dir = app.config.get('MODEL_DIR', 'dl_model')
        model_path = os.path.join(model_dir, MODEL_NAME)

        if db is not None:
            print("♻️ Train lại model từ DB...")
            return train_and_save_model(app, db)

        if os.path.exists(model_path):
            ai_model = tf.keras.models.load_model(model_path)
            scaler = joblib.load(os.path.join(model_dir, SCALER_NAME))
            encoder = joblib.load(os.path.join(model_dir, ENCODER_NAME))
            print(f"✅ Đã load model từ {model_dir}")
        else:
            print("⚠️ Không tìm thấy model. Tạo MockModel...")
            create_mock_model(app)

    except Exception as e:
        print(f"❌ Lỗi khi load model: {e}")
        create_mock_model(app)
