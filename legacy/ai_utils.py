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

# Module-level globals mirroring original app.py
ai_model = None
scaler = None
encoder = None
feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int', 'total_nights_stayed',
                   'total_resort_spending']


def plot_and_save_metrics(history, model_dir):
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
    metrics_path = os.path.join(model_dir, 'training_metrics.png')
    plt.savefig(metrics_path)
    plt.close()
    print(f"Đã lưu biểu đồ Metrics tại: {metrics_path}")


def train_and_save_model(app, db):
    """Huấn luyện và lưu model Deep Learning từ MySQL data."""
    global ai_model, scaler, encoder
    print("Bắt đầu huấn luyện Model AI từ dữ liệu MySQL...")

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

    merged_df = None
    try:
        merged_df = __import__('pandas').read_sql(customers_query, db.engine)
    except Exception as e:
        print(f"Không thể đọc dữ liệu từ DB để huấn luyện: {e}. Sẽ tạo Mock Model.")

    if merged_df is None or merged_df.empty:
        print("Không có dữ liệu để huấn luyện. Tạo dữ liệu mẫu...")
        return create_mock_model(app)

    # Feature Engineering
    merged_df['is_business_flyer_int'] = merged_df['is_business_flyer'].astype(int)
    merged_df.fillna(0, inplace=True)

    X_raw = merged_df[feature_columns]
    y_raw = merged_df[['persona_type']]

    # Chuẩn hóa và mã hóa
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    encoder = OneHotEncoder(sparse_output=False)
    y_encoded = encoder.fit_transform(y_raw)

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
    model_dir = app.config.get('MODEL_DIR', 'dl_model')
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    model.save(os.path.join(model_dir, 'persona_model.h5'))
    joblib.dump(scaler, os.path.join(model_dir, 'scaler.pkl'))
    joblib.dump(encoder, os.path.join(model_dir, 'encoder.pkl'))

    plot_and_save_metrics(history, model_dir)

    ai_model, scaler, encoder = model, scaler, encoder
    print(f"Huấn luyện Model thành công!")


def create_mock_model(app):
    """Tạo model mẫu nếu chưa có dữ liệu"""
    global ai_model, scaler, encoder
    print("Tạo Mock Model để demo...")

    # Mock scaler và encoder
    scaler = StandardScaler()
    scaler.mean_ = np.array([35, 100000000, 10, 0.5, 3, 10000000])
    scaler.scale_ = np.array([10, 50000000, 8, 0.5, 2, 5000000])

    encoder = OneHotEncoder(sparse_output=False)
    encoder.categories_ = [np.array(['doanh_nhan', 'gia_dinh', 'nguoi_tre'])]

    # Mock model (sử dụng logic đơn giản)
    class MockModel:
        def predict(self, X):
            # Logic đơn giản dựa trên features
            results = []
            for row in X:
                age, balance, flights, is_biz, nights, resort_spending = row
                if balance > 200000000 or is_biz > 0.5:
                    results.append([0.8, 0.15, 0.05])  # doanh_nhan
                elif age < 30:
                    results.append([0.1, 0.2, 0.7])  # nguoi_tre
                else:
                    results.append([0.2, 0.7, 0.1])  # gia_dinh
            return np.array(results)

    ai_model = MockModel()

    # Lưu mock files
    model_dir = app.config.get('MODEL_DIR', 'dl_model')
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
    joblib.dump(scaler, os.path.join(model_dir, 'scaler.pkl'))
    joblib.dump(encoder, os.path.join(model_dir, 'encoder.pkl'))


def load_model(app):
    """Tải model đã được huấn luyện."""
    global ai_model, scaler, encoder
    try:
        model_dir = app.config.get('MODEL_DIR', 'dl_model')
        ai_model = tf.keras.models.load_model(os.path.join(model_dir, 'persona_model.h5'))
        scaler = joblib.load(os.path.join(model_dir, 'scaler.pkl'))
        encoder = joblib.load(os.path.join(model_dir, 'encoder.pkl'))
        print(f"Đã tải Model AI từ {model_dir}")
    except (IOError, OSError) as e:
        print(f"Lỗi khi tải model: {e}. Tạo model mới...")
        # We need a db for training, but if not provided, fall back to mock
        try:
            from models.database import db  # if available
            train_and_save_model(app, db)
        except Exception:
            create_mock_model(app)


