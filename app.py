# backend/app.py
# -*- coding: utf-8 -*-

from flask import Flask, jsonify, request, send_from_directory
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import joblib
import os
import matplotlib

matplotlib.use('Agg')  # Chuyển sang chế độ backend không hiển thị GUI cho matplotlib
import matplotlib.pyplot as plt

# =============================================================================
# KHỞI TẠO VÀ CÁC BIẾN TOÀN CỤC
# =============================================================================
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# Biến toàn cục để giữ model và các công cụ tiền xử lý
ai_model = None
scaler = None
encoder = None
# Các DataFrame dữ liệu gốc
customers_df, hdbank_df, vietjet_df, resorts_df = [None] * 4

feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int', 'total_nights_stayed',
                   'total_resort_spending']
MODEL_DIR = 'dl_model'


# =============================================================================
# CÁC HÀM TIỆN ÍCH VÀ HUẤN LUYỆN MODEL
# =============================================================================
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


def train_and_save_model():
    """Huấn luyện và lưu model Deep Learning."""
    global ai_model, scaler, encoder
    print("Bắt đầu huấn luyện và lưu Model Deep Learning...")

    # Tải dữ liệu (giả định các file đã tồn tại)
    customers = pd.read_csv('customers.csv')
    hdbank = pd.read_csv('hdbank.csv')
    vietjet = pd.read_csv('vietjet.csv')
    resorts = pd.read_csv('resorts.csv')

    # --- Feature Engineering ---
    hdbank_agg = hdbank.groupby('customer_id')['balance'].mean().reset_index().rename(
        columns={'balance': 'avg_balance'})
    vietjet_agg = vietjet.groupby('customer_id').agg(
        total_flights=('flight_id', 'count'),
        is_business_flyer=('ticket_class', lambda x: 'business' in x.unique())
    ).reset_index()
    resorts_agg = resorts.groupby('customer_id').agg(
        total_nights_stayed=('nights_stayed', 'sum'),
        total_resort_spending=('booking_value', 'sum')
    ).reset_index()

    merged_df = pd.merge(customers, hdbank_agg, on='customer_id', how='left')
    merged_df = pd.merge(merged_df, vietjet_agg, on='customer_id', how='left')
    merged_df = pd.merge(merged_df, resorts_agg, on='customer_id', how='left')

    merged_df.fillna(0, inplace=True)
    merged_df['is_business_flyer_int'] = merged_df['is_business_flyer'].astype(int)

    X_raw = merged_df[feature_columns]
    y_raw = merged_df[['persona_type']]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    encoder = OneHotEncoder(sparse_output=False)
    y_encoded = encoder.fit_transform(y_raw)

    # --- Xây dựng và Huấn luyện Model ---
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(X_scaled.shape[1],)),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(y_encoded.shape[1], activation='softmax')
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    history = model.fit(X_scaled, y_encoded, epochs=15, batch_size=64, verbose=1)

    # --- Lưu trữ ---
    if not os.path.exists(MODEL_DIR): os.makedirs(MODEL_DIR)
    model.save(os.path.join(MODEL_DIR, 'persona_model.h5'))
    joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
    joblib.dump(encoder, os.path.join(MODEL_DIR, 'encoder.pkl'))

    plot_and_save_metrics(history, MODEL_DIR)

    ai_model, scaler, encoder = model, scaler, encoder
    print(f"Huấn luyện và lưu Model thành công vào thư mục '{MODEL_DIR}'")


def initial_setup():
    """Tải dữ liệu và model khi server khởi động."""
    global customers_df, hdbank_df, vietjet_df, resorts_df, ai_model, scaler, encoder
    try:
        customers_df = pd.read_csv('customers.csv')
        hdbank_df = pd.read_csv('hdbank.csv')
        vietjet_df = pd.read_csv('vietjet.csv')
        resorts_df = pd.read_csv('resorts.csv')

        ai_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'persona_model.h5'))
        scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
        encoder = joblib.load(os.path.join(MODEL_DIR, 'encoder.pkl'))
        print(f"Đã tải dữ liệu và model Deep Learning từ thư mục '{MODEL_DIR}'.")
    except (IOError, OSError) as e:
        print(f"Lỗi khi tải model hoặc dữ liệu: {e}. Bắt đầu huấn luyện model mới...")
        train_and_save_model()


# =============================================================================
# API ENDPOINTS
# =============================================================================
@app.route('/predict', methods=['POST'])
def predict_persona():
    """API nhận dữ liệu tổng hợp và trả về dự đoán."""
    if not all([ai_model, scaler, encoder]):
        return jsonify({"error": "Model AI chưa sẵn sàng"}), 503

    data = request.json

    input_data = {
        'age': data.get('age', 0),
        'avg_balance': data.get('avg_balance', 0),
        'total_flights': data.get('total_flights', 0),
        'is_business_flyer_int': int(data.get('is_business_flyer', False)),
        'total_nights_stayed': data.get('total_nights_stayed', 0),
        'total_resort_spending': data.get('total_resort_spending', 0)
    }
    input_df = pd.DataFrame([input_data])
    input_df = input_df[feature_columns]
    input_scaled = scaler.transform(input_df)

    try:
        prediction_probs = ai_model.predict(input_scaled)
        predicted_index = np.argmax(prediction_probs, axis=1)[0]
        predicted_persona = encoder.categories_[0][predicted_index]

        recommendations = []
        if predicted_persona == 'doanh_nhan':
            recommendations.append({'offer_code': 'DN001', 'title': 'Mở thẻ HDBank Visa Signature',
                                    'description': 'Tận hưởng đặc quyền phòng chờ sân bay và các ưu đãi golf cao cấp.'})
            if data.get('total_resort_spending', 0) > 20_000_000:
                recommendations.append({'offer_code': 'DN002_VIP', 'title': 'Tư vấn đầu tư Bất động sản nghỉ dưỡng',
                                        'description': 'Khám phá các cơ hội đầu tư vào các dự án BĐS cao cấp.'})
        elif predicted_persona == 'gia_dinh':
            recommendations.append({'offer_code': 'GD001', 'title': 'Combo Du lịch Hè Vietjet',
                                    'description': 'Giảm giá 30% cho cả gia đình khi đặt vé máy bay và khách sạn.'})
        elif predicted_persona == 'nguoi_tre':
            recommendations.append({'offer_code': 'NT001', 'title': 'Mở thẻ tín dụng đầu tiên',
                                    'description': 'Bắt đầu xây dựng lịch sử tín dụng của bạn với thẻ HDBank Vietjet Platinum.'})

        return jsonify({"predicted_persona": predicted_persona, "recommendations": recommendations})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/metrics/<filename>')
def get_metric_chart(filename):
    """API để xem các biểu đồ đã lưu."""
    return send_from_directory(MODEL_DIR, filename)


# =============================================================================
# CHẠY ỨNG DỤNG
# =============================================================================
if __name__ == '__main__':
    initial_setup()
    app.run(debug=True, port=5000)
