# app.py
# -*- coding: utf-8 -*-

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import jwt
import datetime
from functools import wraps
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import joblib
import os
import matplotlib
from config import Config

matplotlib.use('Agg')  # Backend không GUI cho matplotlib
import matplotlib.pyplot as plt

# =============================================================================
# KHỞI TẠO VÀ CẤU HÌNH
# =============================================================================
app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
cors = CORS(app)

# Biến toàn cục cho AI model
ai_model = None
scaler = None
encoder = None
feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int', 'total_nights_stayed', 'total_resort_spending']

# =============================================================================
# DATABASE MODELS
# =============================================================================
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'customer'), default='customer')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.Enum('Nam', 'Nữ', 'Khác'))
    job = db.Column(db.String(100))
    city = db.Column(db.String(100))
    persona_type = db.Column(db.Enum('doanh_nhan', 'gia_dinh', 'nguoi_tre'))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class HDBankTransaction(db.Model):
    __tablename__ = 'hdbank_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    transaction_date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    transaction_type = db.Column(db.Enum('credit', 'debit'), nullable=False)
    balance = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class VietjetFlight(db.Model):
    __tablename__ = 'vietjet_flights'
    
    id = db.Column(db.Integer, primary_key=True)
    flight_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    flight_date = db.Column(db.DateTime, nullable=False)
    origin = db.Column(db.String(10), nullable=False)
    destination = db.Column(db.String(10), nullable=False)
    ticket_class = db.Column(db.Enum('economy', 'business'), nullable=False)
    booking_value = db.Column(db.Numeric(12, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class ResortBooking(db.Model):
    __tablename__ = 'resort_bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    resort_name = db.Column(db.String(200), nullable=False)
    booking_date = db.Column(db.DateTime, nullable=False)
    nights_stayed = db.Column(db.Integer, nullable=False)
    booking_value = db.Column(db.Numeric(12, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class TokenTransaction(db.Model):
    __tablename__ = 'token_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    tx_hash = db.Column(db.String(100), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.Text)
    block_number = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# =============================================================================
# AUTH UTILITIES
# =============================================================================
def create_token(user_id: int):
    payload = {
        'sub': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token: str):
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return data.get('sub')
    except Exception:
        return None

def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        token = auth_header.split(' ', 1)[1]
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        request.current_user = user
        return func(*args, **kwargs)
    return wrapper

# =============================================================================
# AI MODEL UTILITIES
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
    
    merged_df = pd.read_sql(customers_query, db.engine)
    
    if merged_df.empty:
        print("Không có dữ liệu để huấn luyện. Tạo dữ liệu mẫu...")
        return create_mock_model()

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
    if not os.path.exists(app.config['MODEL_DIR']): 
        os.makedirs(app.config['MODEL_DIR'])
    
    model.save(os.path.join(app.config['MODEL_DIR'], 'persona_model.h5'))
    joblib.dump(scaler, os.path.join(app.config['MODEL_DIR'], 'scaler.pkl'))
    joblib.dump(encoder, os.path.join(app.config['MODEL_DIR'], 'encoder.pkl'))

    plot_and_save_metrics(history, app.config['MODEL_DIR'])

    ai_model, scaler, encoder = model, scaler, encoder
    print(f"Huấn luyện Model thành công!")

def create_mock_model():
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
                    results.append([0.1, 0.2, 0.7])   # nguoi_tre
                else:
                    results.append([0.2, 0.7, 0.1])   # gia_dinh
            return np.array(results)
    
    ai_model = MockModel()
    
    # Lưu mock files
    if not os.path.exists(app.config['MODEL_DIR']): 
        os.makedirs(app.config['MODEL_DIR'])
    joblib.dump(scaler, os.path.join(app.config['MODEL_DIR'], 'scaler.pkl'))
    joblib.dump(encoder, os.path.join(app.config['MODEL_DIR'], 'encoder.pkl'))

def load_model():
    """Tải model đã được huấn luyện."""
    global ai_model, scaler, encoder
    try:
        ai_model = tf.keras.models.load_model(os.path.join(app.config['MODEL_DIR'], 'persona_model.h5'))
        scaler = joblib.load(os.path.join(app.config['MODEL_DIR'], 'scaler.pkl'))
        encoder = joblib.load(os.path.join(app.config['MODEL_DIR'], 'encoder.pkl'))
        print(f"Đã tải Model AI từ {app.config['MODEL_DIR']}")
    except (IOError, OSError) as e:
        print(f"Lỗi khi tải model: {e}. Tạo model mới...")
        train_and_save_model()

def get_customer_360_profile(customer_id):
    """Lấy hồ sơ 360° từ MySQL."""
    customer = Customer.query.filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    # HDBank summary
    hdbank_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).all()
    hdbank_summary = {}
    if hdbank_transactions:
        balances = [float(t.balance) for t in hdbank_transactions]
        amounts = [float(t.amount) for t in hdbank_transactions]
        hdbank_summary = {
            'total_transactions': len(hdbank_transactions),
            'average_balance': sum(balances) / len(balances),
            'total_credit_last_3m': sum(float(t.amount) for t in hdbank_transactions if t.transaction_type == 'credit'),
            'total_debit_last_3m': sum(float(t.amount) for t in hdbank_transactions if t.transaction_type == 'debit')
        }

    # Vietjet summary
    vietjet_flights = VietjetFlight.query.filter_by(customer_id=customer_id).all()
    vietjet_summary = {}
    if vietjet_flights:
        vietjet_summary = {
            'total_flights_last_year': len(vietjet_flights),
            'total_spending': sum(float(f.booking_value) for f in vietjet_flights),
            'is_business_flyer': any(f.ticket_class == 'business' for f in vietjet_flights),
            'favorite_route': f"{vietjet_flights[0].origin}-{vietjet_flights[0].destination}" if vietjet_flights else "N/A"
        }

    # Resort summary
    resort_bookings = ResortBooking.query.filter_by(customer_id=customer_id).all()
    resort_summary = {}
    if resort_bookings:
        resort_summary = {
            'total_bookings': len(resort_bookings),
            'total_nights_stayed': sum(r.nights_stayed for r in resort_bookings),
            'total_spending': sum(float(r.booking_value) for r in resort_bookings),
            'favorite_resort': resort_bookings[0].resort_name if resort_bookings else "N/A"
        }

    return {
        'basic_info': {
            'customer_id': customer.customer_id,
            'name': customer.name,
            'age': customer.age,
            'gender': customer.gender,
            'job': customer.job,
            'city': customer.city
        },
        'hdbank_summary': hdbank_summary,
        'vietjet_summary': vietjet_summary,
        'resort_summary': resort_summary
    }

# =============================================================================
# API ENDPOINTS
# =============================================================================

# AUTH ENDPOINTS
@app.route('/auth/register', methods=['POST'])
def register_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    name = (data.get('name') or '').strip() or email.split('@')[0]
    
    if not email or not password:
        return jsonify({'error': 'Thiếu email hoặc mật khẩu'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email đã tồn tại'}), 409
    
    # Determine role based on email domain
    role = 'admin' if any(domain in email for domain in ['@hdbank.', '@sovico.']) else 'customer'
    
    user = User(email=email, name=name, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    token = create_token(user.id)
    return jsonify({
        'token': token, 
        'user': {'email': user.email, 'name': user.name, 'role': user.role}
    })

@app.route('/auth/login', methods=['POST'])
def login_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Sai email hoặc mật khẩu'}), 401
    
    token = create_token(user.id)
    return jsonify({
        'token': token,
        'user': {'email': user.email, 'name': user.name, 'role': user.role}
    })

@app.route('/auth/me', methods=['GET'])
@require_auth
def me_api():
    user = request.current_user
    return jsonify({'email': user.email, 'name': user.name, 'role': user.role})

# CUSTOMER DATA ENDPOINTS
@app.route('/customer/<int:customer_id>', methods=['GET'])
def get_customer_profile_api(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    profile = get_customer_360_profile(customer_id)
    if profile is None:
        return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404
    return jsonify(profile)

@app.route('/customer/<int:customer_id>/insights', methods=['GET'])
def get_insights_api(customer_id):
    """API trả về persona dự đoán, evidence và đề xuất."""
    profile = get_customer_360_profile(customer_id)
    if profile is None:
        return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404

    # Chuẩn bị input và dự đoán persona
    input_data = {
        'age': profile['basic_info'].get('age', 0) or 0,
        'avg_balance': profile['hdbank_summary'].get('average_balance', 0) or 0,
        'total_flights': profile['vietjet_summary'].get('total_flights_last_year', 0) or 0,
        'is_business_flyer_int': int(profile['vietjet_summary'].get('is_business_flyer', False)),
        'total_nights_stayed': profile['resort_summary'].get('total_nights_stayed', 0) or 0,
        'total_resort_spending': profile['resort_summary'].get('total_spending', 0) or 0
    }
    
    input_df = pd.DataFrame([input_data])[feature_columns]
    input_scaled = scaler.transform(input_df)
    
    try:
        prediction_probs = ai_model.predict(input_scaled)
        predicted_index = np.argmax(prediction_probs, axis=1)[0]
        predicted_persona = encoder.categories_[0][predicted_index]
    except:
        # Fallback prediction
        if input_data['avg_balance'] > 200000000:
            predicted_persona = 'doanh_nhan'
        elif input_data['age'] < 30:
            predicted_persona = 'nguoi_tre'
        else:
            predicted_persona = 'gia_dinh'

    # Build evidence
    evidence = build_ai_evidence(profile)
    
    # Get recommendations
    recommendations = get_recommendations(predicted_persona, input_data)

    return jsonify({
        'predicted_persona': predicted_persona,
        'evidence': evidence,
        'recommendations': recommendations
    })

@app.route('/customers/search', methods=['GET'])
def search_customers_api():
    """Tìm kiếm khách hàng theo từ khóa."""
    q = (request.args.get('q') or '').strip().lower()
    if not q:
        return jsonify([])
    
    try:
        q_id = int(q)
        customers = Customer.query.filter(
            (Customer.customer_id == q_id) | 
            (Customer.name.ilike(f'%{q}%'))
        ).limit(20).all()
    except ValueError:
        customers = Customer.query.filter(Customer.name.ilike(f'%{q}%')).limit(20).all()

    data = [
        {
            'customer_id': customer.customer_id,
            'name': customer.name,
            'age': customer.age,
            'city': customer.city
        } for customer in customers
    ]
    return jsonify(data)

@app.route('/customers/suggestions', methods=['GET'])
def get_customer_suggestions_api():
    """API gợi ý khách hàng đáng chú ý."""
    # Lấy top customers dựa trên các tiêu chí
    suggestions_query = """
        SELECT c.customer_id, c.name,
               COALESCE(AVG(h.balance), 0) as avg_balance,
               COALESCE(COUNT(DISTINCT v.flight_id), 0) as total_flights,
               COALESCE(MAX(CASE WHEN v.ticket_class = 'business' THEN 1 ELSE 0 END), 0) as is_business_flyer,
               COALESCE(SUM(r.booking_value), 0) as total_resort_spending
        FROM customers c
        LEFT JOIN hdbank_transactions h ON c.customer_id = h.customer_id
        LEFT JOIN vietjet_flights v ON c.customer_id = v.customer_id
        LEFT JOIN resort_bookings r ON c.customer_id = r.customer_id
        GROUP BY c.customer_id, c.name
        ORDER BY (avg_balance * 0.4 + total_flights * 1000000 + is_business_flyer * 50000000 + total_resort_spending * 0.3) DESC
        LIMIT 5
    """
    
    try:
        result = db.session.execute(db.text(suggestions_query))
        suggestions = []
        for row in result:
            reason_parts = []
            if row.avg_balance >= 100000000:
                reason_parts.append('Số dư cao')
            if row.is_business_flyer:
                reason_parts.append('Bay hạng thương gia')
            if row.total_flights >= 3:
                reason_parts.append('Bay thường xuyên')
            if row.total_resort_spending >= 10000000:
                reason_parts.append('Chi tiêu nghỉ dưỡng cao')
            
            suggestions.append({
                'customer_id': row.customer_id,
                'name': row.name,
                'reason': ', '.join(reason_parts) or 'Khách hàng tiềm năng'
            })
        
        return jsonify(suggestions)
    except Exception as e:
        print(f"Error in suggestions: {e}")
        # Fallback to simple query
        customers = Customer.query.limit(5).all()
        return jsonify([{
            'customer_id': c.customer_id,
            'name': c.name,
            'reason': 'Khách hàng mẫu'
        } for c in customers])

# AI PREDICTION ENDPOINT
@app.route('/predict', methods=['POST'])
def predict_persona():
    """API nhận dữ liệu và trả về dự đoán persona."""
    if not all([ai_model, scaler, encoder]):
        return jsonify({"error": "Model AI chưa sẵn sàng"}), 503

    data = request.json or {}
    
    input_data = {
        'age': data.get('age', 0),
        'avg_balance': data.get('avg_balance', 0),
        'total_flights': data.get('total_flights', 0),
        'is_business_flyer_int': int(data.get('is_business_flyer', False)),
        'total_nights_stayed': data.get('total_nights_stayed', 0),
        'total_resort_spending': data.get('total_resort_spending', 0)
    }
    
    input_df = pd.DataFrame([input_data])[feature_columns]
    input_scaled = scaler.transform(input_df)

    try:
        prediction_probs = ai_model.predict(input_scaled)
        predicted_index = np.argmax(prediction_probs, axis=1)[0]
        predicted_persona = encoder.categories_[0][predicted_index]
        
        recommendations = get_recommendations(predicted_persona, input_data)
        
        return jsonify({
            "predicted_persona": predicted_persona,
            "recommendations": recommendations
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# UTILITY ENDPOINTS
@app.route('/metrics/<filename>')
def get_metric_chart(filename):
    """API để xem các biểu đồ đã lưu."""
    return send_from_directory(app.config['MODEL_DIR'], filename)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'database': 'connected' if db.engine else 'disconnected',
        'ai_model': 'loaded' if ai_model else 'not_loaded',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def build_ai_evidence(profile):
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

def get_recommendations(predicted_persona, input_data):
    """Tạo đề xuất dựa trên persona được dự đoán."""
    recommendations = []
    
    if predicted_persona == 'doanh_nhan':
        recommendations.append({
            'offer_code': 'DN001',
            'title': 'Mở thẻ HDBank Visa Signature',
            'description': 'Tận hưởng đặc quyền phòng chờ sân bay và các ưu đãi golf cao cấp.'
        })
        if input_data.get('total_resort_spending', 0) > 20_000_000:
            recommendations.append({
                'offer_code': 'DN002_VIP',
                'title': 'Tư vấn đầu tư Bất động sản nghỉ dưỡng',
                'description': 'Khám phá các cơ hội đầu tư vào các dự án BĐS cao cấp.'
            })
    elif predicted_persona == 'gia_dinh':
        recommendations.append({
            'offer_code': 'GD001',
            'title': 'Combo Du lịch Hè Vietjet',
            'description': 'Giảm giá 30% cho cả gia đình khi đặt vé máy bay và khách sạn qua HDBank App.'
        })
    elif predicted_persona == 'nguoi_tre':
        recommendations.append({
            'offer_code': 'NT001',
            'title': 'Mở thẻ tín dụng đầu tiên',
            'description': 'Bắt đầu xây dựng lịch sử tín dụng của bạn với thẻ HDBank Vietjet Platinum.'
        })
    
    return recommendations

# =============================================================================
# INITIALIZATION
# =============================================================================
def init_app():
    """Khởi tạo ứng dụng: tạo bảng và tải model."""
    with app.app_context():
        try:
            # Test database connection
            db.engine.connect()
            print("✅ Kết nối MySQL thành công!")
            
            # Create tables if not exist
            db.create_all()
            print("✅ Đã tạo/kiểm tra các bảng database")
            
            # Load or train AI model
            load_model()
            print("✅ AI Model đã sẵn sàng")
            
        except Exception as e:
            print(f"❌ Lỗi khởi tạo: {e}")
            print("💡 Hãy đảm bảo MySQL đang chạy và cấu hình đúng trong config.py")

# =============================================================================
# MAIN
# =============================================================================
if __name__ == '__main__':
    print("🚀 Khởi động One-Sovico Platform...")
    print(f"📊 Database: {Config.get_database_url()}")
    
    init_app()
    
    print("🌐 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
