# app.py
# -*- coding: utf-8 -*-

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import jwt
import datetime
import time
import uuid
import random
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

# Import blockchain integration for NFT achievements
try:
    from blockchain_simple import update_nft_on_blockchain, get_nft_metadata
    from blockchain_config import (
        evaluate_all_achievements, 
        get_highest_rank_from_achievements,
        ACHIEVEMENT_CONFIG
    )
    BLOCKCHAIN_ENABLED = True
    print("✅ Blockchain integration loaded successfully")
except ImportError as e:
    print(f"⚠️ Blockchain integration not available: {e}")
    BLOCKCHAIN_ENABLED = False

# Import mission progression system
try:
    from mission_progression import mission_system, get_missions_for_customer
    from detailed_missions import DetailedMissionSystem
    MISSION_SYSTEM_ENABLED = True
    print("✅ Mission progression system loaded successfully")
except ImportError as e:
    print(f"⚠️ Mission progression system not available: {e}")
    MISSION_SYSTEM_ENABLED = False

# =============================================================================
# KHỞI TẠO VÀ CẤU HÌNH
# =============================================================================
app = Flask(__name__)
app.config.from_object(Config)

# Initialize detailed mission system
# detailed_mission_system = DetailedMissionSystem()

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
cors = CORS(app)

# Biến toàn cục cho AI model
ai_model = None
scaler = None
encoder = None
feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int', 'total_nights_stayed',
                   'total_resort_spending']


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
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship to get actual customer record
    customer = db.relationship('Customer', backref='user_accounts')

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
    nft_token_id = db.Column(db.Integer, nullable=True)  # ID của NFT Passport trên blockchain
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
# ACHIEVEMENTS & NFT PASSPORT MODELS
# =============================================================================
class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # ví dụ: "Phi công Vàng"
    description = db.Column(db.Text, nullable=False)  # "Bay hơn 20 chuyến trong năm"
    badge_image_url = db.Column(db.String(200))  # Đường dẫn đến hình ảnh huy hiệu
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class CustomerAchievement(db.Model):
    __tablename__ = 'customer_achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref='achievements')
    achievement = db.relationship('Achievement', backref='customers')


class CustomerMission(db.Model):
    __tablename__ = 'customer_missions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    mission_id = db.Column(db.String(100), nullable=False)  # ID từ mission progression system
    mission_title = db.Column(db.String(200), nullable=False)
    mission_category = db.Column(db.String(50), nullable=False)
    mission_level = db.Column(db.String(50), nullable=False)
    status = db.Column(db.Enum('available', 'in_progress', 'completed', 'expired'), default='available')
    progress_data = db.Column(db.JSON)  # Lưu trữ tiến trình chi tiết
    svt_reward = db.Column(db.Numeric(10, 2), default=0)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref='missions')


class CustomerMissionProgress(db.Model):
    __tablename__ = 'customer_mission_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    mission_id = db.Column(db.String(100), nullable=False)
    requirement_key = db.Column(db.String(100), nullable=False)  # Ví dụ: login_count, transaction_count
    current_value = db.Column(db.Numeric(15, 2), default=0)
    required_value = db.Column(db.Numeric(15, 2), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref='mission_progress')


# =============================================================================
# MARKETPLACE & P2P MODELS
# =============================================================================
class MarketplaceItem(db.Model):
    __tablename__ = 'marketplace_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # "Voucher ăn uống 100K"
    description = db.Column(db.Text)
    price_svt = db.Column(db.Numeric(10, 2), nullable=False)  # Giá bán bằng SVT
    quantity = db.Column(db.Integer, default=0)  # Số lượng còn lại
    partner_brand = db.Column(db.String(50))  # HDBank, Vietjet, Sovico...
    image_url = db.Column(db.String(200))  # Hình ảnh sản phẩm
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class P2PListing(db.Model):
    __tablename__ = 'p2p_listings'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price_svt = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.Enum('active', 'sold', 'cancelled'), default='active')
    buyer_customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    sold_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    seller = db.relationship('Customer', foreign_keys=[seller_customer_id], backref='p2p_listings')
    buyer = db.relationship('Customer', foreign_keys=[buyer_customer_id], backref='p2p_purchases')


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
                    results.append([0.1, 0.2, 0.7])  # nguoi_tre
                else:
                    results.append([0.2, 0.7, 0.1])  # gia_dinh
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


@app.route('/api/nft/<int:customer_id>/achievements', methods=['GET'])
def get_customer_achievements_api(customer_id):
    """API để lấy danh sách thành tựu của khách hàng cho NFT Passport"""
    try:
        # Query tất cả achievements của customer
        customer_achievements = db.session.query(
            CustomerAchievement, Achievement
        ).join(Achievement).filter(
            CustomerAchievement.customer_id == customer_id
        ).all()
        
        achievements = []
        for ca, achievement in customer_achievements:
            achievements.append({
                'id': achievement.id,
                'name': achievement.name,
                'description': achievement.description,
                'badge_image_url': achievement.badge_image_url,
                'unlocked_at': ca.unlocked_at.isoformat() if ca.unlocked_at else None
            })
        
        return jsonify({
            'customer_id': customer_id,
            'achievements': achievements,
            'total_achievements': len(achievements)
        })
        
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy thành tựu: {str(e)}'}), 500


@app.route('/api/marketplace/items', methods=['GET'])
def get_marketplace_items_api():
    """API để lấy danh sách vật phẩm trên sàn giao dịch"""
    try:
        partner = request.args.get('partner')  # Lọc theo thương hiệu
        limit = int(request.args.get('limit', 50))
        
        query = MarketplaceItem.query.filter_by(is_active=True)
        
        if partner:
            query = query.filter_by(partner_brand=partner)
            
        items = query.limit(limit).all()
        
        items_data = []
        for item in items:
            items_data.append({
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'price_svt': float(item.price_svt),
                'quantity': item.quantity,
                'partner_brand': item.partner_brand,
                'image_url': item.image_url,
                'created_at': item.created_at.isoformat()
            })
        
        return jsonify({
            'items': items_data,
            'total': len(items_data)
        })
        
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy vật phẩm: {str(e)}'}), 500


@app.route('/api/marketplace/purchase', methods=['POST'])
@require_auth
def purchase_marketplace_item_api():
    """API để mua vật phẩm từ marketplace"""
    try:
        data = request.get_json()
        item_id = data.get('item_id')
        quantity = data.get('quantity', 1)
        
        # Lấy customer_id từ user đăng nhập
        user = request.current_user
        if not user.customer_id or not user.customer:
            return jsonify({'error': 'Người dùng chưa có thông tin khách hàng'}), 400
        
        # Get actual business customer_id
        actual_customer_id = user.customer.customer_id
        
        # Kiểm tra vật phẩm
        item = MarketplaceItem.query.get(item_id)
        if not item or not item.is_active:
            return jsonify({'error': 'Vật phẩm không tồn tại hoặc đã ngừng bán'}), 404
        
        if item.quantity < quantity:
            return jsonify({'error': 'Không đủ số lượng'}), 400
        
        total_cost = float(item.price_svt) * quantity
        
        # Kiểm tra số dư SVT (từ token_transactions)
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        
        result = db.session.execute(db.text(token_query), {"customer_id": actual_customer_id})
        row = result.fetchone()
        current_balance = float(row.total_svt) if row and row.total_svt else 0
        if current_balance < total_cost:
            return jsonify({'error': f'Không đủ SVT. Cần {total_cost}, có {current_balance}'}), 400
        
        # Thực hiện giao dịch
        # 1. Trừ SVT
        debit_transaction = TokenTransaction(
            tx_hash=f"purchase_{item_id}_{datetime.datetime.utcnow().timestamp()}",
            customer_id=actual_customer_id,
            transaction_type='marketplace_purchase',
            amount=-total_cost,
            description=f"Mua {quantity}x {item.name}"
        )
        db.session.add(debit_transaction)
        
        # 2. Giảm số lượng vật phẩm
        item.quantity -= quantity
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Đã mua thành công {quantity}x {item.name}',
            'transaction_id': debit_transaction.id,
            'remaining_svt': current_balance - total_cost
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi khi mua hàng: {str(e)}'}), 500


@app.route('/api/p2p/listings', methods=['GET'])
def get_p2p_listings_api():
    """API để lấy danh sách tin đăng P2P"""
    try:
        status = request.args.get('status', 'active')
        limit = int(request.args.get('limit', 20))
        
        query = P2PListing.query.filter_by(status=status)
        listings = query.order_by(P2PListing.created_at.desc()).limit(limit).all()
        
        listings_data = []
        for listing in listings:
            # Lấy thông tin người bán
            seller = Customer.query.filter_by(customer_id=listing.seller_customer_id).first()
            
            listings_data.append({
                'id': listing.id,
                'item_name': listing.item_name,
                'description': listing.description,
                'price_svt': float(listing.price_svt),
                'seller': {
                    'customer_id': listing.seller_customer_id,
                    'name': seller.name if seller else 'Unknown'
                },
                'status': listing.status,
                'created_at': listing.created_at.isoformat()
            })
        
        return jsonify({
            'listings': listings_data,
            'total': len(listings_data)
        })
        
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy tin đăng P2P: {str(e)}'}), 500


@app.route('/api/p2p/create', methods=['POST'])
@require_auth
def create_p2p_listing_api():
    """API để tạo tin đăng P2P"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not user.customer_id:
            return jsonify({'error': 'Người dùng chưa có thông tin khách hàng'}), 400
        
        listing = P2PListing(
            seller_customer_id=user.customer_id,
            item_name=data.get('item_name'),
            description=data.get('description', ''),
            price_svt=data.get('price_svt')
        )
        
        db.session.add(listing)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'listing_id': listing.id,
            'message': 'Đã tạo tin đăng thành công'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi khi tạo tin đăng: {str(e)}'}), 500


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

    # If customer role, create customer record first
    customer_db_id = None
    customer_business_id = None
    if role == 'customer':
        # Find max customer_id and increment
        max_customer = Customer.query.order_by(Customer.customer_id.desc()).first()
        next_customer_id = (max_customer.customer_id + 1) if max_customer else 2001
        
        # Create customer record
        customer = Customer(
            customer_id=next_customer_id,
            name=name,
            age=25,  # Default age
            gender='Khác',  # Default gender
            job='Khách hàng',  # Default job
            city='Hồ Chí Minh',  # Default city
            persona_type='nguoi_tre'  # Default persona
        )
        db.session.add(customer)
        db.session.flush()  # Get the auto-generated database ID
        customer_db_id = customer.id  # Database ID for foreign key
        customer_business_id = customer.customer_id  # Business ID for response

    user = User(email=email, name=name, role=role, customer_id=customer_db_id)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_token(user.id)
    return jsonify({
        'token': token,
        'user': {
            'email': user.email, 
            'name': user.name, 
            'role': user.role,
            'customer_id': customer_business_id  # Return business customer_id
        }
    })


@app.route('/auth/login', methods=['POST'])
def login_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Sai email hoặc mật khẩu'}), 401

    # Get actual customer_id from customer relationship
    actual_customer_id = None
    if user.customer_id and user.customer:
        actual_customer_id = user.customer.customer_id

    token = create_token(user.id)
    return jsonify({
        'token': token,
        'user': {
            'email': user.email, 
            'name': user.name, 
            'role': user.role,
            'customer_id': actual_customer_id
        }
    })


@app.route('/auth/me', methods=['GET'])
@require_auth
def me_api():
    user = request.current_user
    # Get actual customer_id from customer relationship
    actual_customer_id = None
    if user.customer_id and user.customer:
        actual_customer_id = user.customer.customer_id
    
    return jsonify({
        'email': user.email, 
        'name': user.name, 
        'role': user.role,
        'customer_id': actual_customer_id
    })


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
    """API nhận dữ liệu và trả về dự đoán persona với logic kiểm tra thành tựu."""
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

        # =============================================================================
        # LOGIC KIỂM TRA THÀNH TỰU VÀ CẬP NHẬT NFT BLOCKCHAIN (IMPROVED VERSION)
        # =============================================================================
        achievements = []
        customer_id = data.get('customer_id', 0)  # Lấy customer_id từ request
        
        # Tạo profile 360° từ input data để kiểm tra thành tựu
        profile = {
            'vietjet_summary': {
                'total_flights_last_year': input_data['total_flights'],
                'is_business_flyer': bool(input_data['is_business_flyer_int'])
            },
            'hdbank_summary': {
                'average_balance': input_data['avg_balance']
            },
            'resort_summary': {
                'total_spending': input_data['total_resort_spending'],
                'total_nights_stayed': input_data['total_nights_stayed']
            }
        }

        # Sử dụng achievement evaluator từ configuration
        if BLOCKCHAIN_ENABLED:
            try:
                # Evaluate all achievements using the configuration system
                earned_achievements = evaluate_all_achievements(profile)
                
                if earned_achievements:
                    # Get the highest rank from all achievements
                    highest_rank = get_highest_rank_from_achievements(earned_achievements)
                    
                    print(f"🏆 {len(earned_achievements)} thành tựu mới được phát hiện cho khách hàng {customer_id}")
                    
                    # Process each achievement
                    for achievement in earned_achievements:
                        print(f"   - {achievement['title']}: {achievement['description']}")
                        
                        # Add to response
                        achievements.append({
                            'title': achievement['title'],
                            'description': achievement['description'],
                            'badge': achievement['badge'],
                            'rank': achievement['rank'],
                            'svt_reward': achievement['svt_reward']
                        })
                        
                        # Update NFT on blockchain for each achievement
                        if customer_id:
                            try:
                                tx_hash = update_nft_on_blockchain(
                                    token_id=customer_id,
                                    new_rank=achievement['rank'],
                                    new_badge=achievement['badge']
                                )
                                
                                if tx_hash:
                                    print(f"✅ NFT updated on blockchain: {tx_hash}")
                                    achievements[-1]['blockchain_tx'] = tx_hash
                                else:
                                    print(f"❌ Blockchain update failed for {achievement['badge']}")
                                    
                            except Exception as blockchain_error:
                                print(f"❌ Blockchain update error for {achievement['badge']}: {blockchain_error}")
                                achievements[-1]['blockchain_error'] = str(blockchain_error)
                    
                    # Final rank update with the highest rank achieved
                    if customer_id and earned_achievements:
                        try:
                            final_tx = update_nft_on_blockchain(
                                token_id=customer_id,
                                new_rank=highest_rank,
                                new_badge="rank_update"
                            )
                            if final_tx:
                                print(f"✅ Final rank update to {highest_rank}: {final_tx}")
                        except Exception as e:
                            print(f"❌ Final rank update failed: {e}")
                            
                else:
                    print(f"ℹ️ Không có thành tựu mới cho khách hàng {customer_id}")
                    
            except Exception as evaluation_error:
                print(f"❌ Achievement evaluation error: {evaluation_error}")
                achievements.append({
                    'title': 'Evaluation Error',
                    'description': f'Lỗi đánh giá thành tựu: {str(evaluation_error)}',
                    'badge': 'error',
                    'rank': 'Bronze',
                    'svt_reward': 0
                })
        else:
            # Fallback: Simple achievement check without blockchain
            print("⚠️ Blockchain disabled - using fallback achievement system")
            
            if profile['vietjet_summary']['total_flights_last_year'] > 20:
                achievements.append({
                    'title': 'Frequent Flyer',
                    'description': 'Bay hơn 20 chuyến trong năm (offline)',
                    'badge': 'frequent_flyer',
                    'rank': 'Gold',
                    'svt_reward': 1000
                })
                print("🏆 Frequent Flyer achievement (offline mode)")

        # Log final summary
        if achievements:
            total_svt = sum(ach.get('svt_reward', 0) for ach in achievements)
            print(f"📊 Tổng kết: {len(achievements)} thành tựu, {total_svt} SVT tokens")
        else:
            print("📊 Không có thành tựu mới trong lần phân tích này")

        return jsonify({
            "predicted_persona": predicted_persona,
            "recommendations": recommendations,
            "achievements": achievements,
            "profile_360": profile,
            "blockchain_enabled": BLOCKCHAIN_ENABLED,
            "total_svt_reward": sum(ach.get('svt_reward', 0) for ach in achievements)
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
        'blockchain': 'enabled' if BLOCKCHAIN_ENABLED else 'disabled',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })


@app.route('/test-blockchain', methods=['POST'])
def test_blockchain():
    """Test blockchain integration endpoint."""
    if not BLOCKCHAIN_ENABLED:
        return jsonify({"error": "Blockchain integration not enabled"}), 503
    
    data = request.json or {}
    token_id = data.get('token_id', 0)
    rank = data.get('rank', 'Gold')
    badge = data.get('badge', 'test_badge')
    
    try:
        print(f"🧪 Testing blockchain update: Token {token_id}, Rank: {rank}, Badge: {badge}")
        tx_hash = update_nft_on_blockchain(token_id, rank, badge)
        
        if tx_hash:
            return jsonify({
                "success": True,
                "transaction_hash": tx_hash,
                "message": f"Successfully updated NFT #{token_id} with rank '{rank}' and badge '{badge}'"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Blockchain update failed"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Blockchain integration error"
        }), 500


@app.route('/simulate_event', methods=['POST'])
def simulate_event():
    """Simulate customer achieving VIP status and trigger blockchain updates."""
    if not BLOCKCHAIN_ENABLED:
        return jsonify({"error": "Blockchain integration not enabled"}), 503
    
    data = request.json or {}
    event_type = data.get('event_type', 'vip_upgrade')
    customer_id = data.get('customer_id', 1)
    
    try:
        print(f"🎭 Simulating event: {event_type} for customer {customer_id}")
        
        if event_type == 'vip_upgrade':
            # Simulate VIP customer profile that meets all criteria
            simulated_profile = {
                'customer_id': customer_id,
                'age': 45,
                'avg_balance': 800_000_000,  # High balance for High Roller
                'total_flights': 30,  # High flights for Frequent Flyer
                'is_business_flyer': True,  # Business class for Business Elite
                'total_nights_stayed': 50,  # Long stays for Long Stay Guest
                'total_resort_spending': 100_000_000  # High spending for Resort Lover
            }
            
            print("🚀 Simulating VIP customer profile:")
            print(f"   Balance: {simulated_profile['avg_balance']:,} VND")
            print(f"   Flights: {simulated_profile['total_flights']} (Business: {simulated_profile['is_business_flyer']})")
            print(f"   Resort nights: {simulated_profile['total_nights_stayed']}")
            print(f"   Resort spending: {simulated_profile['total_resort_spending']:,} VND")
            
            # Create profile for evaluation
            profile = {
                'vietjet_summary': {
                    'total_flights_last_year': simulated_profile['total_flights'],
                    'is_business_flyer': simulated_profile['is_business_flyer']
                },
                'hdbank_summary': {
                    'average_balance': simulated_profile['avg_balance']
                },
                'resort_summary': {
                    'total_spending': simulated_profile['total_resort_spending'],
                    'total_nights_stayed': simulated_profile['total_nights_stayed']
                }
            }
            
            # Evaluate achievements using the same logic as predict_persona
            earned_achievements = evaluate_all_achievements(profile)
            
            if earned_achievements:
                highest_rank = get_highest_rank_from_achievements(earned_achievements)
                
                print(f"🏆 {len(earned_achievements)} achievements triggered!")
                
                blockchain_updates = []
                
                # Process each achievement
                for achievement in earned_achievements:
                    print(f"   - {achievement['title']}: {achievement['description']}")
                    
                    try:
                        tx_hash = update_nft_on_blockchain(
                            token_id=customer_id,
                            new_rank=achievement['rank'],
                            new_badge=achievement['badge']
                        )
                        
                        if tx_hash:
                            print(f"     ✅ Blockchain updated: {tx_hash}")
                            blockchain_updates.append({
                                'achievement': achievement['title'],
                                'badge': achievement['badge'],
                                'rank': achievement['rank'],
                                'transaction_hash': tx_hash,
                                'svt_reward': achievement['svt_reward']
                            })
                        else:
                            print(f"     ❌ Blockchain update failed for {achievement['badge']}")
                            
                    except Exception as blockchain_error:
                        print(f"     ❌ Blockchain error: {blockchain_error}")
                
                # Final rank update
                if blockchain_updates:
                    try:
                        final_tx = update_nft_on_blockchain(
                            token_id=customer_id,
                            new_rank=highest_rank,
                            new_badge="vip_simulation_complete"
                        )
                        if final_tx:
                            print(f"✅ Final VIP rank update to {highest_rank}: {final_tx}")
                            blockchain_updates.append({
                                'achievement': 'VIP Status Confirmed',
                                'badge': 'vip_simulation_complete',
                                'rank': highest_rank,
                                'transaction_hash': final_tx,
                                'svt_reward': 0
                            })
                    except Exception as e:
                        print(f"❌ Final rank update failed: {e}")
                
                total_svt = sum(update.get('svt_reward', 0) for update in blockchain_updates)
                
                return jsonify({
                    "success": True,
                    "event_type": event_type,
                    "customer_id": customer_id,
                    "achievements_earned": len(earned_achievements),
                    "highest_rank": highest_rank,
                    "blockchain_updates": blockchain_updates,
                    "total_svt_reward": total_svt,
                    "simulated_profile": simulated_profile,
                    "message": f"Successfully simulated VIP upgrade for customer {customer_id}"
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "No achievements triggered by simulation",
                    "simulated_profile": simulated_profile
                })
        
        elif event_type == 'frequent_flyer':
            # Simulate just frequent flyer achievement
            tx_hash = update_nft_on_blockchain(customer_id, "Gold", "frequent_flyer")
            return jsonify({
                "success": True,
                "event_type": event_type,
                "customer_id": customer_id,
                "transaction_hash": tx_hash,
                "message": f"Simulated Frequent Flyer achievement for customer {customer_id}"
            })
        
        elif event_type == 'high_roller':
            # Simulate high roller achievement
            tx_hash = update_nft_on_blockchain(customer_id, "Diamond", "high_roller")
            return jsonify({
                "success": True,
                "event_type": event_type,
                "customer_id": customer_id,
                "transaction_hash": tx_hash,
                "message": f"Simulated High Roller achievement for customer {customer_id}"
            })
        
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown event type: {event_type}",
                "available_events": ["vip_upgrade", "frequent_flyer", "high_roller"]
            }), 400
            
    except Exception as e:
        print(f"❌ Simulation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Event simulation failed"
        }), 500


@app.route('/api/nft/<int:user_id>', methods=['GET'])
def get_nft_passport(user_id):
    """Get NFT passport metadata for a user"""
    try:
        if BLOCKCHAIN_ENABLED:
            metadata = get_nft_metadata(user_id)
            return jsonify({
                "success": True,
                "user_id": user_id,
                "metadata": metadata
            })
        else:
            return jsonify({
                "success": False,
                "error": "Blockchain not available",
                "metadata": {
                    "name": f"Sovico Passport #{user_id}",
                    "description": "Digital identity passport (offline mode)",
                    "image": "https://via.placeholder.com/300x400/6B7280/white?text=Offline+Mode",
                    "attributes": [
                        {"trait_type": "Status", "value": "Offline"},
                        {"trait_type": "Level", "value": "Bronze"},
                        {"trait_type": "SVT Points", "value": 0}
                    ]
                }
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "metadata": None
        }), 500


@app.route('/api/tokens/<int:user_id>', methods=['GET'])
def get_user_tokens(user_id):
    """Get user's SVT token balance from token_transactions table"""
    try:
        # Query token_transactions table to get real SVT balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :user_id
        """
        
        result = db.session.execute(db.text(token_query), {"user_id": user_id})
        row = result.fetchone()
        total_svt = float(row.total_svt) if row and row.total_svt else 0
        
        # Get recent transactions
        recent_query = """
            SELECT tx_hash, transaction_type, amount, description, created_at
            FROM token_transactions 
            WHERE customer_id = :user_id
            ORDER BY created_at DESC
            LIMIT 10
        """
        
        recent_result = db.session.execute(db.text(recent_query), {"user_id": user_id})
        transactions = []
        
        for row in recent_result:
            transactions.append({
                "txHash": row.tx_hash[:10] + "...",
                "type": row.transaction_type,
                "amount": f"{'+ ' if row.amount > 0 else '- '}{abs(row.amount):,.0f} SVT",
                "time": row.created_at.strftime("%d/%m/%Y %H:%M") if row.created_at else "N/A"
            })
        
        return jsonify({
            "success": True,
            "user_id": user_id,
            "total_svt": total_svt,
            "transactions": transactions
        })
        
    except Exception as e:
        print(f"❌ Error getting tokens for user {user_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "total_svt": 0,
            "transactions": []
        }), 500


@app.route('/api/tokens/add', methods=['POST'])
def add_svt_tokens():
    """Add SVT tokens to user account for mission rewards"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        amount = data.get('amount')
        transaction_type = data.get('transaction_type', 'mission_reward')
        description = data.get('description', 'Mission reward')
        mission_id = data.get('mission_id', '')
        log_blockchain = data.get('log_blockchain', False)
        
        if not customer_id or not amount:
            return jsonify({
                "success": False,
                "error": "Missing customer_id or amount"
            }), 400
        
        # Generate blockchain transaction hash with better uniqueness
        import uuid
        import random
        timestamp = int(time.time() * 1000000)  # Microsecond precision
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]  # Standard length
        
        # Add token transaction record
        new_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=amount,
            transaction_type=transaction_type,
            description=description,
            tx_hash=tx_hash
        )
        
        db.session.add(new_transaction)
        
        # 🔗 BLOCKCHAIN LOGGING: Update NFT on blockchain if enabled
        blockchain_result = None
        if log_blockchain and BLOCKCHAIN_ENABLED:
            try:
                # Import blockchain functions
                from blockchain_simple import update_nft_on_blockchain
                
                # Log transaction to blockchain
                blockchain_result = update_nft_on_blockchain(
                    user_id=customer_id,
                    achievements=[f"Mission: {mission_id}"],
                    persona_data={"action": "mission_reward", "amount": amount}
                )
                
                print(f"🔗 Blockchain TX logged: {blockchain_result.get('transaction_hash', 'N/A')}")
                
            except Exception as blockchain_error:
                print(f"⚠️ Blockchain logging failed: {blockchain_error}")
                # Continue with database transaction even if blockchain fails
        
        db.session.commit()
        
        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        
        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0
        
        response_data = {
            "success": True,
            "message": f"Successfully added {amount} SVT tokens",
            "new_balance": new_balance,
            "transaction_id": new_transaction.id,
            "tx_hash": tx_hash,
            "gas_used": 21000 if log_blockchain else 0
        }
        
        # Add blockchain info if available
        if blockchain_result and blockchain_result.get('success'):
            response_data.update({
                "blockchain_tx": blockchain_result.get('transaction_hash'),
                "blockchain_gas": blockchain_result.get('gas_used'),
                "blockchain_status": "confirmed"
            })
        
        return jsonify(response_data)
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding SVT tokens: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# TEST ENDPOINTS FOR DEVELOPMENT
# =============================================================================

@app.route('/api/test/add-svt/<int:customer_id>', methods=['POST'])
def test_add_svt_tokens(customer_id):
    """Test endpoint to add SVT tokens for testing marketplace"""
    try:
        data = request.get_json() or {}
        amount = data.get('amount', 1000)  # Default 1000 SVT
        
        # Generate unique transaction hash
        import time
        import uuid
        import random
        
        timestamp = int(time.time() * 1000000)
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]
        
        # Add test transaction
        test_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=amount,
            transaction_type='test_reward',
            description=f'Test tokens for marketplace testing',
            tx_hash=tx_hash
        )
        
        db.session.add(test_transaction)
        db.session.commit()
        
        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        
        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0
        
        return jsonify({
            "success": True,
            "message": f"Added {amount} test SVT tokens",
            "new_balance": new_balance,
            "transaction_id": test_transaction.id,
            "tx_hash": tx_hash
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# MISSION PROGRESSION API ENDPOINTS
# =============================================================================

@app.route('/api/missions/<int:customer_id>', methods=['GET'])
def get_customer_missions_api(customer_id):
    """API để lấy nhiệm vụ cho khách hàng với detailed mission system"""
    try:
        if not MISSION_SYSTEM_ENABLED:
            return jsonify({
                'error': 'Mission system not available',
                'customer_id': customer_id,
                'available_missions': [],
                'recommended_missions': []
            }), 503
        
        # Lấy thông tin khách hàng từ database
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404
        
        # Tính toán dữ liệu khách hàng cho mission system
        customer_data = get_customer_data_for_missions(customer_id)
        
        # Xác định loại khách hàng dựa trên dữ liệu thực tế
        if customer_data.get('total_transactions', 0) == 0:
            customer_type = 'new'
        elif customer_data.get('total_amount', 0) > 100000000:  # > 100M VNĐ
            customer_type = 'vip'
        else:
            customer_type = 'regular'
        
        # Lấy danh sách mission đã hoàn thành
        completed_missions_query = CustomerMission.query.filter_by(
            customer_id=customer_id, 
            status='completed'
        ).all()
        completed_missions = [m.mission_id for m in completed_missions_query]
        
        # Sử dụng detailed mission system
        available_missions = detailed_mission_system.get_missions_for_customer(
            customer_id, customer_type, completed_missions
        )
        recommendations = detailed_mission_system.get_next_recommended_missions(
            customer_id, customer_type, completed_missions
        )
        
        # Cập nhật database với missions mới từ template
        sync_detailed_missions_to_database(customer_id, recommendations[:5])
        
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'customer_type': customer_type,
            'customer_level': determine_customer_level(customer_data),
            'available_missions': available_missions,
            'recommended_missions': recommendations,
            'completed_missions': completed_missions,
            'total_completed': len(completed_missions),
            'total_available': len(available_missions),
            'progression_stats': {
                'days_since_registration': (datetime.datetime.now() - customer.created_at).days,
                'total_transactions': customer_data.get('transaction_count', 0),
                'profile_completeness': customer_data.get('profile_completeness', 0),
                'ai_interactions': customer_data.get('ai_interactions', 0)
            },
            'mission_categories': {
                'welcome_progress': len([m for m in completed_missions if 'complete_profile' in m or 'link_' in m]),
                'daily_streak': customer_data.get('login_streak', 0),
                'financial_level': 'beginner' if customer_data.get('total_amount', 0) < 10000000 else 'advanced',
                'travel_destinations': customer_data.get('unique_destinations', 0),
                'social_referrals': customer_data.get('successful_referrals', 0)
            }
        })
        
    except Exception as e:
        print(f"❌ Error getting missions for customer {customer_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'customer_id': customer_id
        }), 500


@app.route('/api/missions/<int:customer_id>/start', methods=['POST'])
def start_mission_api(customer_id):
    """API để bắt đầu một nhiệm vụ với detailed mission system"""
    try:
        data = request.get_json()
        mission_id = data.get('mission_id')
        
        if not mission_id:
            return jsonify({'error': 'Mission ID required'}), 400
        
        # Kiểm tra mission template tồn tại
        mission_template = detailed_mission_system.get_mission_by_id(mission_id)
        if not mission_template:
            return jsonify({'error': 'Mission template not found'}), 404
        
        # Kiểm tra customer type và availability
        customer_data = get_customer_data_for_missions(customer_id)
        customer_type = 'new' if customer_data.get('total_transactions', 0) == 0 else 'regular'
        
        completed_missions_query = CustomerMission.query.filter_by(
            customer_id=customer_id, 
            status='completed'
        ).all()
        completed_missions = [m.mission_id for m in completed_missions_query]
        
        # Kiểm tra prerequisites
        prerequisites = mission_template.get('prerequisites', [])
        unmet_prerequisites = [p for p in prerequisites if p not in completed_missions]
        
        if unmet_prerequisites:
            return jsonify({
                'error': 'Prerequisites not met',
                'unmet_prerequisites': unmet_prerequisites,
                'required_missions': [detailed_mission_system.get_mission_by_id(p)['title'] for p in unmet_prerequisites if detailed_mission_system.get_mission_by_id(p)]
            }), 400
        
        # Kiểm tra customer type phù hợp
        if customer_type not in mission_template.get('customer_types', []):
            return jsonify({
                'error': 'Mission not available for your customer type',
                'customer_type': customer_type,
                'required_types': mission_template.get('customer_types', [])
            }), 400
        
        # Kiểm tra mission đã tồn tại
        existing_mission = CustomerMission.query.filter_by(
            customer_id=customer_id,
            mission_id=mission_id
        ).first()
        
        if existing_mission:
            if existing_mission.status == 'completed':
                # Kiểm tra nếu mission có thể lặp lại
                if not mission_template.get('is_repeatable', False):
                    return jsonify({
                        'error': 'Mission already completed and not repeatable',
                        'completed_at': existing_mission.completed_at.isoformat() if existing_mission.completed_at else None
                    }), 400
                else:
                    # Reset mission cho lần lặp mới
                    existing_mission.status = 'in_progress'
                    existing_mission.started_at = datetime.datetime.utcnow()
                    existing_mission.completed_at = None
                    existing_mission.progress_data = None
            elif existing_mission.status == 'in_progress':
                return jsonify({
                    'error': 'Mission already in progress',
                    'started_at': existing_mission.started_at.isoformat() if existing_mission.started_at else None
                }), 400
            else:
                # Status là 'available', chuyển sang 'in_progress'
                existing_mission.status = 'in_progress'
                existing_mission.started_at = datetime.datetime.utcnow()
        else:
            # Tạo mission record mới
            category_mapping = {
                'welcome': 'onboarding',
                'daily': 'lifestyle', 
                'financial': 'financial',
                'travel': 'travel',
                'social': 'social'
            }
            db_category = category_mapping.get(mission_template['category'], 'lifestyle')
            
            new_mission = CustomerMission(
                customer_id=customer_id,
                mission_id=mission_id,
                mission_title=mission_template['title'],
                mission_category=db_category,
                mission_level=mission_template['level'],
                status='in_progress',
                svt_reward=mission_template['reward_amount'],
                started_at=datetime.datetime.utcnow(),
                progress_data={
                    'target_value': mission_template.get('target_value', 1),
                    'current_value': 0,
                    'action_type': mission_template.get('action_type'),
                    'instructions': mission_template.get('instructions', [])
                }
            )
            db.session.add(new_mission)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Đã bắt đầu nhiệm vụ: {mission_template["title"]}',
            'mission_id': mission_id,
            'mission_title': mission_template['title'],
            'mission_description': mission_template['description'],
            'reward_amount': mission_template['reward_amount'],
            'target_value': mission_template.get('target_value', 1),
            'estimated_time': mission_template.get('estimated_time', '5 phút'),
            'instructions': mission_template.get('instructions', []),
            'started_at': datetime.datetime.utcnow().isoformat(),
            'is_repeatable': mission_template.get('is_repeatable', False)
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error starting mission {mission_id} for customer {customer_id}: {e}")
        return jsonify({
            'error': 'Failed to start mission',
            'details': str(e)
        }), 500
        
        return jsonify({
            'success': True,
            'message': f'Đã bắt đầu nhiệm vụ: {target_mission["title"]}',
            'mission_id': mission_id,
            'estimated_time': target_mission.get('estimated_time', 'Không xác định'),
            'svt_reward': target_mission['svt_reward']
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/missions/<int:customer_id>/complete', methods=['POST'])
def complete_mission_api(customer_id):
    """API để hoàn thành một nhiệm vụ và nhận thưởng SVT"""
    try:
        data = request.get_json()
        mission_id = data.get('mission_id')
        
        if not mission_id:
            return jsonify({'error': 'Mission ID required'}), 400
        
        # Kiểm tra mission record trong database
        mission_record = CustomerMission.query.filter_by(
            customer_id=customer_id,
            mission_id=mission_id
        ).first()
        
        if not mission_record:
            return jsonify({'error': 'Mission not found in database'}), 404
        
        if mission_record.status == 'completed':
            return jsonify({
                'error': 'Mission already completed',
                'completed_at': mission_record.completed_at.isoformat() if mission_record.completed_at else None
            }), 400
        
        # Lấy thông tin mission từ detailed system
        mission_template = detailed_mission_system.get_mission_by_id(mission_id)
        if not mission_template:
            return jsonify({'error': 'Mission template not found'}), 404
        
        # Cập nhật status mission
        mission_record.status = 'completed'
        mission_record.completed_at = datetime.datetime.utcnow()
        
        # Tính toán phần thưởng SVT
        svt_reward = mission_template.get('reward_amount', 0)
        bonus_reward = 0
        
        # Kiểm tra bonus rewards (ví dụ: daily login streak)
        if mission_id == 'daily_login':
            bonus_rewards = mission_template.get('bonus_rewards', {})
            # Có thể thêm logic kiểm tra streak ở đây
            # Ví dụ: nếu login 7 ngày liên tiếp thì có bonus
        
        total_reward = svt_reward + bonus_reward
        
        # Tạo transaction hash unique
        timestamp = int(time.time() * 1000000)  # Microsecond precision
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]
        
        # Lưu phần thưởng vào token_transactions
        reward_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=total_reward,
            transaction_type='mission_reward',
            description=f"Hoàn thành nhiệm vụ: {mission_template['title']}",
            tx_hash=tx_hash,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(reward_transaction)
        
        # Cập nhật mission record với phần thưởng
        mission_record.svt_reward = total_reward
        mission_record.progress_data = {
            'completed_at': datetime.datetime.utcnow().isoformat(),
            'reward_claimed': True,
            'transaction_hash': tx_hash,
            'bonus_applied': bonus_reward > 0
        }
        
        # Commit tất cả thay đổi
        db.session.commit()
        
        # Lấy số dư SVT hiện tại
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0
        
        # 🔗 Log to blockchain if enabled
        blockchain_result = None
        if BLOCKCHAIN_ENABLED:
            try:
                from blockchain_simple import update_nft_on_blockchain
                blockchain_result = update_nft_on_blockchain(
                    user_id=customer_id,
                    achievements=[f"Mission: {mission_id}"],
                    persona_data={"mission_completed": mission_id, "reward": total_reward}
                )
                print(f"🔗 Mission completion logged to blockchain: {blockchain_result.get('transaction_hash', 'N/A')}")
            except Exception as blockchain_error:
                print(f"⚠️ Blockchain logging failed: {blockchain_error}")
        
        # Kiểm tra và unlock missions tiếp theo
        next_missions = []
        try:
            # Lấy danh sách completed missions để tính toán next missions
            completed_missions_query = CustomerMission.query.filter_by(
                customer_id=customer_id, 
                status='completed'
            ).all()
            completed_mission_ids = [m.mission_id for m in completed_missions_query]
            
            # Lấy customer type
            customer_data = get_customer_data_for_missions(customer_id)
            customer_type = 'new' if customer_data.get('total_transactions', 0) == 0 else 'regular'
            
            # Get next recommended missions
            recommendations = detailed_mission_system.get_next_recommended_missions(
                customer_id, customer_type, completed_mission_ids
            )
            
            # Sync new missions to database
            if recommendations:
                sync_detailed_missions_to_database(customer_id, recommendations[:3])
                next_missions = [{'id': m['id'], 'title': m['title']} for m in recommendations[:3]]
                
        except Exception as next_mission_error:
            print(f"⚠️ Error getting next missions: {next_mission_error}")
        
        return jsonify({
            'success': True,
            'message': f'Hoàn thành nhiệm vụ thành công: {mission_template["title"]}',
            'mission_id': mission_id,
            'mission_title': mission_template['title'],
            'svt_reward': total_reward,
            'bonus_reward': bonus_reward,
            'new_svt_balance': new_balance,
            'transaction_hash': tx_hash,
            'completed_at': mission_record.completed_at.isoformat(),
            'next_missions': next_missions,
            'blockchain_logged': blockchain_result is not None and blockchain_result.get('success', False)
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error completing mission {mission_id} for customer {customer_id}: {e}")
        return jsonify({
            'error': 'Failed to complete mission',
            'details': str(e)
        }), 500


@app.route('/api/missions/<int:customer_id>/progress/<mission_id>', methods=['GET'])
def get_mission_progress_api(customer_id, mission_id):
    """API để lấy tiến độ của một nhiệm vụ cụ thể"""
    try:
        # Lấy mission record từ database
        mission_record = CustomerMission.query.filter_by(
            customer_id=customer_id,
            mission_id=mission_id
        ).first()
        
        if not mission_record:
            return jsonify({'error': 'Mission not found'}), 404
        
        # Lấy thông tin mission template
        mission_template = detailed_mission_system.get_mission_by_id(mission_id)
        if not mission_template:
            return jsonify({'error': 'Mission template not found'}), 404
        
        # Tính toán progress
        progress_data = mission_record.progress_data or {}
        target_value = mission_template.get('target_value', 1)
        current_value = progress_data.get('current_value', 0)
        
        # Tính phần trăm hoàn thành
        progress_percentage = min(100, (current_value / target_value) * 100) if target_value > 0 else 0
        is_completed = mission_record.status == 'completed'
        
        return jsonify({
            'success': True,
            'mission_id': mission_id,
            'mission_title': mission_record.mission_title,
            'status': mission_record.status,
            'current_value': current_value,
            'target_value': target_value,
            'progress_percentage': progress_percentage,
            'is_completed': is_completed,
            'started_at': mission_record.started_at.isoformat() if mission_record.started_at else None,
            'completed_at': mission_record.completed_at.isoformat() if mission_record.completed_at else None,
            'reward_amount': float(mission_record.svt_reward) if mission_record.svt_reward else 0,
            'instructions': mission_template.get('instructions', []),
            'estimated_time': mission_template.get('estimated_time', '5 phút')
        })
        
    except Exception as e:
        print(f"❌ Error getting mission progress: {e}")
        return jsonify({
            'error': 'Failed to get mission progress',
            'details': str(e)
        }), 500


@app.route('/api/missions/leaderboard', methods=['GET'])
def get_mission_leaderboard_api():
    """API để lấy bảng xếp hạng hoàn thành mission"""
    try:
        # Tính toán số missions đã hoàn thành cho mỗi customer
        leaderboard_query = """
            SELECT 
                c.customer_id,
                c.name,
                COUNT(cm.id) as completed_missions,
                COALESCE(SUM(cm.svt_reward), 0) as total_svt_earned,
                MAX(cm.completed_at) as last_completion
            FROM customers c
            LEFT JOIN customer_missions cm ON c.customer_id = cm.customer_id 
                AND cm.status = 'completed'
            GROUP BY c.customer_id, c.name
            HAVING completed_missions > 0
            ORDER BY completed_missions DESC, total_svt_earned DESC
            LIMIT 10
        """
        
        result = db.session.execute(db.text(leaderboard_query))
        leaderboard = []
        
        for i, row in enumerate(result, 1):
            leaderboard.append({
                'rank': i,
                'customer_id': row.customer_id,
                'name': row.name,
                'completed_missions': row.completed_missions,
                'total_svt_earned': float(row.total_svt_earned),
                'last_completion': row.last_completion.isoformat() if row.last_completion else None
            })
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard,
            'total_participants': len(leaderboard)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/missions/<int:customer_id>/update-stats', methods=['POST'])
def update_customer_stats_api(customer_id):
    """API để cập nhật customer stats cho mission tracking"""
    try:
        data = request.get_json()
        stat_updates = data.get('stats', {})
        
        if not stat_updates:
            return jsonify({'error': 'No stats provided'}), 400
        
        # Update hoặc insert stats
        updated_stats = []
        for stat_key, stat_value in stat_updates.items():
            update_query = """
                INSERT INTO customer_stats (customer_id, stat_key, stat_value)
                VALUES (:customer_id, :stat_key, :stat_value)
                ON DUPLICATE KEY UPDATE 
                    stat_value = :stat_value,
                    last_updated = CURRENT_TIMESTAMP
            """
            
            db.session.execute(db.text(update_query), {
                "customer_id": customer_id,
                "stat_key": stat_key,
                "stat_value": stat_value
            })
            updated_stats.append(f"{stat_key}: {stat_value}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Updated {len(stat_updates)} stats for customer {customer_id}',
            'updated_stats': updated_stats
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/missions/templates', methods=['GET'])
def get_mission_templates_api():
    """API để lấy danh sách mission templates (cho admin)"""
    try:
        customer_type = request.args.get('customer_type')
        category = request.args.get('category')
        level = request.args.get('level')
        
        query = "SELECT * FROM mission_templates WHERE is_active = 1"
        params = {}
        
        if customer_type:
            query += " AND customer_type = :customer_type"
            params['customer_type'] = customer_type
            
        if category:
            query += " AND category = :category"
            params['category'] = category
            
        if level:
            query += " AND level = :level"
            params['level'] = level
        
        query += " ORDER BY customer_type, level, category"
        
        result = db.session.execute(db.text(query), params)
        templates = []
        
        for row in result:
            templates.append({
                'id': row.id,
                'mission_id': row.mission_id,
                'title': row.title,
                'description': row.description,
                'category': row.category,
                'level': row.level,
                'customer_type': row.customer_type,
                'svt_reward': float(row.svt_reward),
                'requirements': row.requirements,
                'prerequisites': row.prerequisites,
                'next_missions': row.next_missions,
                'icon': row.icon,
                'estimated_time': row.estimated_time,
                'created_at': row.created_at.isoformat() if row.created_at else None
            })
        
        return jsonify({
            'success': True,
            'templates': templates,
            'total': len(templates)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# MISSION HELPER FUNCTIONS
# =============================================================================

def get_customer_data_for_missions(customer_id: int) -> dict:
    """Lấy dữ liệu khách hàng để đánh giá missions từ database thật"""
    try:
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return {}
        
        # Lấy stats từ customer_stats table
        stats_query = """
            SELECT stat_key, stat_value 
            FROM customer_stats 
            WHERE customer_id = :customer_id
        """
        stats_result = db.session.execute(db.text(stats_query), {"customer_id": customer_id})
        stats_dict = {row.stat_key: float(row.stat_value) for row in stats_result}
        
        # Đếm số giao dịch thực tế
        transaction_count = TokenTransaction.query.filter_by(customer_id=customer_id).count()
        
        # Tính tổng chi tiêu thực tế
        spending_query = """
            SELECT COALESCE(SUM(ABS(amount)), 0) as total_spending
            FROM token_transactions 
            WHERE customer_id = :customer_id AND amount < 0
        """
        spending_result = db.session.execute(db.text(spending_query), {"customer_id": customer_id})
        total_spending = float(spending_result.fetchone().total_spending or 0)
        
        # Tính độ hoàn thiện profile
        profile_fields = ['name', 'age', 'gender', 'job', 'city', 'persona_type']
        filled_fields = sum(1 for field in profile_fields if getattr(customer, field))
        profile_completeness = (filled_fields / len(profile_fields)) * 100
        
        # Merge dữ liệu thực tế với stats
        customer_data = {
            'customer_id': customer_id,
            'created_at': customer.created_at,
            'transaction_count': transaction_count,
            'total_spending': total_spending,
            'profile_completeness': profile_completeness,
            # Thông tin profile
            'name_filled': bool(customer.name),
            'age_filled': bool(customer.age),
            'gender_filled': bool(customer.gender),
            'city_filled': bool(customer.city),
            'job_filled': bool(customer.job),
            'persona_type_filled': bool(customer.persona_type),
        }
        
        # Thêm stats từ database
        customer_data.update(stats_dict)
        
        return customer_data
        
    except Exception as e:
        print(f"❌ Error getting customer data: {e}")
        return {}


def sync_missions_to_database(customer_id: int, available_missions: list):
    """Đồng bộ missions có sẵn vào database"""
    try:
        for mission in available_missions:
            existing = CustomerMission.query.filter_by(
                customer_id=customer_id,
                mission_id=mission['id']
            ).first()
            
            if not existing:
                new_mission = CustomerMission(
                    customer_id=customer_id,
                    mission_id=mission['id'],
                    mission_title=mission['title'],
                    mission_category=mission['category'].value,
                    mission_level=mission['level'],
                    status='available',
                    svt_reward=mission['svt_reward']
                )
                db.session.add(new_mission)
        
        db.session.commit()
    except Exception as e:
        print(f"❌ Error syncing missions: {e}")
        db.session.rollback()


def sync_detailed_missions_to_database(customer_id: int, missions: list):
    """Đồng bộ detailed missions vào database"""
    try:
        # Map category names to database enum values
        category_mapping = {
            'welcome': 'onboarding',
            'daily': 'lifestyle', 
            'financial': 'financial',
            'travel': 'travel',
            'social': 'social'
        }
        
        for mission in missions:
            existing = CustomerMission.query.filter_by(
                customer_id=customer_id,
                mission_id=mission['id']
            ).first()
            
            if not existing:
                db_category = category_mapping.get(mission['category'], 'lifestyle')
                
                new_mission = CustomerMission(
                    customer_id=customer_id,
                    mission_id=mission['id'],
                    mission_title=mission['title'],
                    mission_category=db_category,
                    mission_level=mission['level'],
                    status='available',
                    svt_reward=mission['reward_amount']
                )
                db.session.add(new_mission)
        
        db.session.commit()
        print(f"✅ Synced {len(missions)} detailed missions for customer {customer_id}")
    except Exception as e:
        print(f"❌ Error syncing detailed missions: {e}")
        db.session.rollback()


def create_mission_progress_tracking(customer_id: int, mission_id: str, mission_data: dict):
    """Tạo progress tracking cho mission"""
    try:
        requirements = mission_data.get('requirements', {})
        
        for req_key, req_value in requirements.items():
            existing = CustomerMissionProgress.query.filter_by(
                customer_id=customer_id,
                mission_id=mission_id,
                requirement_key=req_key
            ).first()
            
            if not existing:
                progress_record = CustomerMissionProgress(
                    customer_id=customer_id,
                    mission_id=mission_id,
                    requirement_key=req_key,
                    current_value=0,
                    required_value=req_value if isinstance(req_value, (int, float)) else 1,
                    is_completed=False
                )
                db.session.add(progress_record)
        
        db.session.commit()
    except Exception as e:
        print(f"❌ Error creating progress tracking: {e}")
        db.session.rollback()


def determine_customer_level(customer_data: dict) -> str:
    """Xác định level của khách hàng dựa trên dữ liệu"""
    transaction_count = customer_data.get('transaction_count', 0)
    total_spending = customer_data.get('total_spending', 0)
    profile_completeness = customer_data.get('profile_completeness', 0)
    
    if transaction_count >= 50 and total_spending >= 100000000 and profile_completeness >= 90:
        return 'Expert'
    elif transaction_count >= 20 and total_spending >= 50000000 and profile_completeness >= 70:
        return 'Advanced'
    elif transaction_count >= 5 and profile_completeness >= 50:
        return 'Intermediate'
    else:
        return 'Beginner'


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
# TEST ENDPOINTS - For development only
# =============================================================================

@app.route('/api/test/add-svt', methods=['POST'])
def test_add_svt():
    """Test endpoint to add SVT tokens for development"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 2015)  # Default to 2015
        amount = data.get('amount', 10000)  # Default to 10000 SVT
        
        # Generate unique transaction hash
        import time
        import uuid
        import random
        timestamp = int(time.time() * 1000000)
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(8)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]
        
        # Add test transaction
        test_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=amount,
            transaction_type='test_reward',
            description=f'Test reward - {amount} SVT tokens',
            tx_hash=tx_hash
        )
        
        db.session.add(test_transaction)
        db.session.commit()
        
        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        
        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0
        
        return jsonify({
            "success": True,
            "message": f"Added {amount} SVT tokens to customer {customer_id}",
            "new_balance": new_balance,
            "transaction_id": test_transaction.id,
            "tx_hash": tx_hash
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/token-transactions/<int:customer_id>', methods=['GET'])
def get_token_transactions(customer_id):
    """Get token transactions directly from database"""
    try:
        # Get all transactions for this customer
        transactions = TokenTransaction.query.filter_by(customer_id=customer_id).order_by(TokenTransaction.created_at.desc()).all()
        
        # Calculate total balance
        total_balance = db.session.execute(
            db.text("SELECT COALESCE(SUM(amount), 0) as total FROM token_transactions WHERE customer_id = :customer_id"),
            {"customer_id": customer_id}
        ).fetchone().total or 0
        
        # Format transactions
        transaction_list = []
        for tx in transactions:
            transaction_list.append({
                "id": tx.id,
                "tx_hash": tx.tx_hash,
                "transaction_type": tx.transaction_type,
                "amount": float(tx.amount),
                "description": tx.description,
                "created_at": tx.created_at.strftime('%Y-%m-%d %H:%M:%S') if tx.created_at else None,
                "block_number": tx.block_number
            })
        
        return jsonify({
            "success": True,
            "customer_id": customer_id,
            "total_balance": float(total_balance),
            "transaction_count": len(transaction_list),
            "transactions": transaction_list
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# SERVICE INTEGRATION APIs - Real Database Operations
# =============================================================================

@app.route('/api/service/vietjet/book-flight', methods=['POST'])
def vietjet_book_flight():
    """Đặt vé máy bay Vietjet và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        flight_type = data.get('flight_type', 'domestic')  # domestic/international
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Sinh flight_id và thông tin chuyến bay
        flight_id = f"VJ{int(time.time())}"
        if flight_type == "domestic":
            origin = "HAN"
            destination = "SGN"
            ticket_class = "economy"
            booking_value = 2500000
        else:
            origin = "HAN"
            destination = "NRT"
            ticket_class = "business"
            booking_value = 8500000

        flight_date = datetime.datetime.now() + datetime.timedelta(days=random.randint(7, 30))

        new_flight = VietjetFlight(
            flight_id=flight_id,
            customer_id=customer_id,
            flight_date=flight_date,
            origin=origin,
            destination=destination,
            ticket_class=ticket_class,
            booking_value=booking_value
        )
        db.session.add(new_flight)
        
        # Tính SVT reward dựa trên loại vé
        svt_reward = 500 if flight_type == "domestic" else 1200

        # Thêm SVT token transaction
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="service_reward",
            amount=svt_reward,
            description=f"Vietjet flight booking: {origin}-{destination}",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Đặt vé {origin}-{destination} thành công!",
            "flight_id": flight_id,
            "svt_reward": svt_reward,
            "flight_details": {
                "origin": origin,
                "destination": destination,
                "ticket_class": ticket_class,
                "booking_value": booking_value,
                "flight_date": flight_date.strftime('%Y-%m-%d')
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt vé: {str(e)}"
        }), 500


def check_customer_has_card(customer_id):
    """Kiểm tra khách hàng đã có thẻ chưa"""
    try:
        # Kiểm tra transaction mở thẻ
        card_count = HDBankTransaction.query.filter_by(
            customer_id=customer_id,
            transaction_type="card_opening"
        ).count()
        
        # Nếu có transaction mở thẻ, return True
        if card_count > 0:
            return True
            
        # Nếu không có transaction mở thẻ nhưng có transaction HDBank khác
        # (có thể là dữ liệu cũ), tự động tạo transaction mở thẻ
        other_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).count()
        if other_transactions > 0:
            print(f"Auto-creating card opening transaction for customer {customer_id}")
            
            # Tạo transaction mở thẻ tự động
            card_number = f"4{random.randint(100000000000000, 999999999999999)}"
            card_id = f"AUTOCARD{int(time.time())}"
            
            card_opening_tx = HDBankTransaction(
                customer_id=customer_id,
                transaction_id=card_id,
                transaction_type="card_opening",
                amount=0,  # Không tính phí cho auto-create
                description=f"Mở thẻ HDBank Classic (Auto) - Số thẻ: {card_number}",
                transaction_date=datetime.datetime.now(),
                status="approved"
            )
            db.session.add(card_opening_tx)
            db.session.commit()
            
            return True
            
        return False
    except Exception as e:
        print(f"Error in check_customer_has_card: {e}")
        return False


def get_customer_card_info(customer_id):
    """Lấy thông tin thẻ của khách hàng"""
    try:
        card_tx = HDBankTransaction.query.filter_by(
            customer_id=customer_id,
            transaction_type="card_opening"
        ).first()
        
        if card_tx:
            # Parse thông tin từ description
            description = card_tx.description
            card_name = description.split(" - ")[0].replace("Mở thẻ ", "")
            card_number = description.split("Số thẻ: ")[1] if "Số thẻ: " in description else "****-****-****-0000"
            
            return {
                "has_card": True,
                "card_id": card_tx.transaction_id,
                "card_name": card_name,
                "card_number": f"****-****-****-{card_number[-4:]}",
                "opened_date": card_tx.transaction_date.strftime('%Y-%m-%d')
            }
        else:
            return {"has_card": False}
    except:
        return {"has_card": False}


@app.route('/api/fix/auto-create-card/<int:customer_id>', methods=['POST'])
def auto_create_card_for_existing_customer(customer_id):
    """Tự động tạo thẻ cho khách hàng đã có dữ liệu HDBank"""
    try:
        # Kiểm tra customer có tồn tại
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({
                "success": False,
                "message": "Khách hàng không tồn tại"
            }), 404
            
        # Kiểm tra đã có thẻ chưa
        existing_card = HDBankTransaction.query.filter_by(
            customer_id=customer_id,
            transaction_type="card_opening"
        ).first()
        
        if existing_card:
            return jsonify({
                "success": False,
                "message": "Khách hàng đã có thẻ",
                "card_info": {
                    "transaction_id": existing_card.transaction_id,
                    "created_date": existing_card.transaction_date.isoformat()
                }
            })
        
        # Tạo thẻ tự động
        card_number = f"4{random.randint(100000000000000, 999999999999999)}"
        card_id = f"AUTOFIX{int(time.time())}"
        
        card_opening_tx = HDBankTransaction(
            customer_id=customer_id,
            transaction_id=card_id,
            transaction_type="card_opening",
            amount=0,  # Không tính phí
            balance=1000000,  # Số dư khởi tạo 1 triệu
            description=f"Mở thẻ HDBank Classic (Auto-Fix) - Số thẻ: {card_number}",
            transaction_date=datetime.datetime.now()
        )
        db.session.add(card_opening_tx)
        
        # Tặng SVT tokens
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="auto_card_fix",
            amount=500,
            description="Auto-fix card opening bonus",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Đã tự động tạo thẻ cho {customer.name}",
            "card_details": {
                "card_id": card_id,
                "card_number": f"****-****-****-{card_number[-4:]}",
                "customer_name": customer.name,
                "auto_created": True
            },
            "rewards": {
                "svt_tokens": 500
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi tạo thẻ tự động: {str(e)}"
        }), 500


@app.route('/api/debug/customer-info/<int:customer_id>', methods=['GET'])
def debug_customer_info(customer_id):
    """Debug endpoint để kiểm tra thông tin khách hàng"""
    try:
        # Kiểm tra customer
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        
        # Kiểm tra HDBank transactions
        hdbank_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).all()
        card_transactions = HDBankTransaction.query.filter_by(
            customer_id=customer_id,
            transaction_type="card_opening"
        ).all()
        
        # Kiểm tra user account
        user = User.query.filter_by(customer_id=customer_id).first()
        
        return jsonify({
            "debug_info": {
                "customer_id": customer_id,
                "customer_exists": customer is not None,
                "customer_name": customer.name if customer else None,
                "user_exists": user is not None,
                "user_username": user.username if user else None,
                "total_hdbank_transactions": len(hdbank_transactions),
                "card_opening_transactions": len(card_transactions),
                "card_transactions_details": [
                    {
                        "transaction_id": tx.transaction_id,
                        "description": tx.description,
                        "date": tx.transaction_date.isoformat() if tx.transaction_date else None
                    } for tx in card_transactions
                ],
                "has_card_check": len(card_transactions) > 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "debug_info": {
                "customer_id": customer_id,
                "error": str(e)
            }
        }), 500


@app.route('/api/service/hdbank/dashboard/<int:customer_id>', methods=['GET'])
def hdbank_dashboard(customer_id):
    """Dashboard tổng quan dịch vụ HDBank cho khách hàng"""
    try:
        # Kiểm tra khách hàng
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({
                "success": False,
                "message": "Khách hàng không tồn tại"
            }), 404
        
        # Kiểm tra thẻ
        card_info = get_customer_card_info(customer_id)
        
        # Nếu chưa có thẻ, hiển thị giao diện mở thẻ
        if not card_info["has_card"]:
            return jsonify({
                "success": True,
                "customer_id": customer_id,
                "customer_name": customer.name,
                "has_card": False,
                "message": "Chào mừng đến với HDBank! Mở thẻ ngay để sử dụng dịch vụ",
                "action_required": {
                    "type": "open_card",
                    "title": "🏦 Mở thẻ HDBank miễn phí",
                    "description": "Nhận ngay 1 triệu VND + 500 SVT Token",
                    "benefits": [
                        "✅ Miễn phí thường niên trọn đời",
                        "🎁 Thưởng chào mừng 1 triệu VND",
                        "🪙 Tặng 500 SVT Token",
                        "💳 Hạn mức tín dụng 10 triệu VND",
                        "🏧 Sử dụng dịch vụ chuyển khoản, vay vốn"
                    ],
                    "button_text": "Mở thẻ ngay",
                    "endpoint": "/api/service/hdbank/open-card"
                },
                "available_services": []
            })
        
        # Nếu đã có thẻ, hiển thị dashboard đầy đủ
        total_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).count()
        total_spent = db.session.query(db.func.sum(HDBankTransaction.amount)).filter(
            HDBankTransaction.customer_id == customer_id,
            HDBankTransaction.amount < 0
        ).scalar() or 0
        
        total_received = db.session.query(db.func.sum(HDBankTransaction.amount)).filter(
            HDBankTransaction.customer_id == customer_id,
            HDBankTransaction.amount > 0
        ).scalar() or 0
        
        return jsonify({
            "success": True,
            "customer_id": customer_id,
            "customer_name": customer.name,
            "has_card": True,
            "card_info": card_info,
            "account_summary": {
                "total_transactions": total_transactions,
                "total_spent": abs(total_spent),
                "total_received": total_received,
                "current_balance": 500000000  # Giả lập
            },
            "available_services": [
                {
                    "type": "transfer",
                    "title": "💸 Chuyển khoản",
                    "description": "Chuyển tiền nhanh, nhận SVT Token",
                    "endpoint": "/api/service/hdbank/transfer",
                    "icon": "💸"
                },
                {
                    "type": "loan",
                    "title": "💰 Đăng ký vay",
                    "description": "Vay vốn lãi suất ưu đãi",
                    "endpoint": "/api/service/hdbank/loan",
                    "icon": "💰"
                }
            ]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi tải dashboard: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/status/<int:customer_id>', methods=['GET'])
def hdbank_service_status(customer_id):
    """Kiểm tra trạng thái dịch vụ ngân hàng của khách hàng"""
    try:
        # Kiểm tra khách hàng có tồn tại không
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({
                "success": False,
                "message": "Khách hàng không tồn tại"
            }), 404
        
        # Kiểm tra thẻ
        card_info = get_customer_card_info(customer_id)
        
        # Thống kê giao dịch
        total_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).count()
        total_amount = db.session.query(db.func.sum(HDBankTransaction.amount)).filter_by(customer_id=customer_id).scalar() or 0
        
        # Lấy giao dịch gần nhất
        recent_transactions = HDBankTransaction.query.filter_by(
            customer_id=customer_id
        ).order_by(HDBankTransaction.transaction_date.desc()).limit(5).all()
        
        recent_list = []
        for tx in recent_transactions:
            recent_list.append({
                "transaction_id": tx.transaction_id,
                "type": tx.transaction_type,
                "amount": tx.amount,
                "description": tx.description,
                "date": tx.transaction_date.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({
            "success": True,
            "customer_id": customer_id,
            "customer_name": customer.name,
            "card_status": card_info,
            "account_summary": {
                "total_transactions": total_transactions,
                "total_amount": total_amount,
                "account_balance": 500000000  # Giả lập số dư
            },
            "recent_transactions": recent_list,
            "available_services": {
                "transfer": card_info["has_card"],
                "loan": card_info["has_card"],
                "open_card": not card_info["has_card"]
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi kiểm tra trạng thái: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/transfer', methods=['POST'])
def hdbank_transfer():
    """Thực hiện chuyển khoản HDBank và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        amount = data.get('amount', 5000000)  # Default 5 triệu VND
        transfer_type = data.get('transfer_type', 'internal')
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Kiểm tra khách hàng có thẻ chưa
        if not check_customer_has_card(customer_id):
            return jsonify({
                "success": False,
                "message": "Bạn cần mở thẻ HDBank trước khi sử dụng dịch vụ chuyển khoản",
                "error_code": "NO_CARD",
                "action_required": {
                    "type": "open_card",
                    "title": "Mở thẻ HDBank",
                    "description": "Nhấn để mở thẻ HDBank miễn phí và nhận thưởng chào mừng",
                    "endpoint": "/api/service/hdbank/open-card"
                }
            }), 403
        
        # Tạo transaction ID
        transaction_id = f"HD{int(time.time())}"
        
        # Thêm bank transaction vào database
        bank_tx = HDBankTransaction(
            customer_id=customer_id,
            transaction_id=transaction_id,
            transaction_type="transfer",
            amount=amount,
            description=f"Transfer to beneficiary - {transfer_type}",
            transaction_date=datetime.datetime.now(),
            status="completed"
        )
        db.session.add(bank_tx)
        
        # Tính SVT reward dựa trên số tiền
        svt_reward = max(100, int(amount / 50000))  # 100 SVT minimum, 1 SVT per 50k VND
        
        # Thêm SVT token transaction
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="service_reward",
            amount=svt_reward,
            description=f"HDBank transfer reward: {amount:,} VND",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Chuyển khoản {amount:,} VND thành công!",
            "transaction_id": transaction_id,
            "svt_reward": svt_reward,
            "transfer_details": {
                "amount": amount,
                "type": transfer_type
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi chuyển khoản: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/loan', methods=['POST'])
def hdbank_loan():
    """Đăng ký khoản vay HDBank và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        loan_amount = data.get('loan_amount', 500000000)  # Default 500 triệu VND
        loan_type = data.get('loan_type', 'personal')
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Kiểm tra khách hàng có thẻ chưa
        if not check_customer_has_card(customer_id):
            return jsonify({
                "success": False,
                "message": "Bạn cần mở thẻ HDBank trước khi đăng ký khoản vay",
                "error_code": "NO_CARD",
                "action_required": {
                    "type": "open_card",
                    "title": "Mở thẻ HDBank",
                    "description": "Nhấn để mở thẻ HDBank miễn phí và đăng ký vay",
                    "endpoint": "/api/service/hdbank/open-card"
                }
            }), 403
        
        # Tạo loan transaction ID
        loan_id = f"LOAN{int(time.time())}"
        
        # Thêm loan transaction vào database
        loan_tx = HDBankTransaction(
            customer_id=customer_id,
            transaction_id=loan_id,
            transaction_type="loan_disbursement",
            amount=loan_amount,
            description=f"Personal loan approved - {loan_type}",
            transaction_date=datetime.datetime.now(),
            status="approved"
        )
        db.session.add(loan_tx)
        
        # SVT reward cho khoản vay lớn
        svt_reward = max(1000, int(loan_amount / 500000))  # 1000 SVT minimum, 1 SVT per 500k VND
        
        # Thêm SVT token transaction
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="service_reward",
            amount=svt_reward,
            description=f"HDBank loan approval reward: {loan_amount:,} VND",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Khoản vay {loan_amount:,} VND đã được phê duyệt!",
            "loan_id": loan_id,
            "svt_reward": svt_reward,
            "loan_details": {
                "amount": loan_amount,
                "type": loan_type,
                "interest_rate": "8.5%/năm"
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi đăng ký vay: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/open-card', methods=['POST'])
def hdbank_open_card():
    """Mở thẻ ngân hàng HDBank mới"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        card_type = data.get('card_type', 'classic')  # classic, gold, platinum
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Kiểm tra khách hàng có tồn tại không
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({
                "success": False,
                "message": "Khách hàng không tồn tại trong hệ thống"
            }), 404
        
        # Tạo số thẻ ngẫu nhiên
        card_number = f"4{random.randint(100000000000000, 999999999999999)}"
        card_id = f"CARD{int(time.time())}"
        
        # Định nghĩa các loại thẻ và phí
        card_config = {
            'classic': {
                'name': 'HDBank Classic Card',
                'annual_fee': 0,
                'credit_limit': 10000000,  # 10 triệu
                'svt_reward': 500
            },
            'gold': {
                'name': 'HDBank Gold Card',
                'annual_fee': 500000,  # 500k phí năm
                'credit_limit': 50000000,  # 50 triệu
                'svt_reward': 1000
            },
            'platinum': {
                'name': 'HDBank Platinum Card',
                'annual_fee': 2000000,  # 2 triệu phí năm
                'credit_limit': 200000000,  # 200 triệu
                'svt_reward': 2000
            }
        }
        
        card_info = card_config.get(card_type, card_config['classic'])
        
        # Tạo transaction mở thẻ
        card_opening_tx = HDBankTransaction(
            customer_id=customer_id,
            transaction_id=card_id,
            transaction_type="card_opening",
            amount=-card_info['annual_fee'],  # Trừ phí mở thẻ (nếu có)
            description=f"Mở thẻ {card_info['name']} - Số thẻ: {card_number}",
            transaction_date=datetime.datetime.now(),
            status="approved"
        )
        db.session.add(card_opening_tx)
        
        # Tạo SVT reward cho việc mở thẻ
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="card_opening_reward",
            amount=card_info['svt_reward'],
            description=f"Thưởng mở thẻ {card_info['name']}",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        # Nếu là thẻ free (classic), tặng thêm bonus
        if card_type == 'classic':
            welcome_bonus = HDBankTransaction(
                customer_id=customer_id,
                transaction_id=f"WELCOME{int(time.time())}",
                transaction_type="welcome_bonus",
                amount=1000000,  # Tặng 1 triệu VND
                description="Thưởng chào mừng mở thẻ Classic",
                transaction_date=datetime.datetime.now(),
                status="approved"
            )
            db.session.add(welcome_bonus)
        
        db.session.commit()
        
        # Tạo thông tin thẻ trả về
        expiry_date = datetime.datetime.now() + datetime.timedelta(days=365*4)  # Thẻ hết hạn sau 4 năm
        
        return jsonify({
            "success": True,
            "message": f"Mở thẻ {card_info['name']} thành công!",
            "card_details": {
                "card_id": card_id,
                "card_number": f"****-****-****-{card_number[-4:]}",  # Ẩn số thẻ
                "card_type": card_type,
                "card_name": card_info['name'],
                "credit_limit": card_info['credit_limit'],
                "annual_fee": card_info['annual_fee'],
                "expiry_date": expiry_date.strftime('%m/%y'),
                "status": "active"
            },
            "rewards": {
                "svt_tokens": card_info['svt_reward'],
                "welcome_bonus_vnd": 1000000 if card_type == 'classic' else 0
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi mở thẻ: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/cards/<int:customer_id>', methods=['GET'])
def get_customer_cards(customer_id):
    """Xem danh sách thẻ của khách hàng"""
    try:
        # Lấy tất cả transaction mở thẻ của khách hàng
        card_transactions = HDBankTransaction.query.filter_by(
            customer_id=customer_id,
            transaction_type="card_opening"
        ).all()
        
        cards = []
        for tx in card_transactions:
            # Parse thông tin thẻ từ description
            description = tx.description
            card_number = description.split("Số thẻ: ")[1] if "Số thẻ: " in description else "****-****-****-0000"
            
            cards.append({
                "card_id": tx.transaction_id,
                "card_number": f"****-****-****-{card_number[-4:]}",
                "card_name": description.split(" - ")[0].replace("Mở thẻ ", ""),
                "opened_date": tx.transaction_date.strftime('%Y-%m-%d'),
                "status": "active"
            })
        
        return jsonify({
            "success": True,
            "cards": cards,
            "total_cards": len(cards)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi lấy thông tin thẻ: {str(e)}"
        }), 500


@app.route('/api/service/hdbank/card-types', methods=['GET'])
def get_card_types():
    """Xem các loại thẻ có sẵn"""
    try:
        card_types = {
            "classic": {
                "name": "HDBank Classic Card",
                "description": "Thẻ cơ bản miễn phí cho khách hàng mới",
                "annual_fee": 0,
                "credit_limit": 10000000,
                "benefits": [
                    "Miễn phí thường niên",
                    "Hạn mức tín dụng 10 triệu VND",
                    "Tặng 500 SVT Token",
                    "Thưởng chào mừng 1 triệu VND"
                ],
                "requirements": [
                    "Độ tuổi từ 18-65",
                    "Có thu nhập ổn định"
                ]
            },
            "gold": {
                "name": "HDBank Gold Card", 
                "description": "Thẻ cao cấp với nhiều ưu đãi",
                "annual_fee": 500000,
                "credit_limit": 50000000,
                "benefits": [
                    "Hạn mức tín dụng 50 triệu VND",
                    "Tặng 1000 SVT Token",
                    "Cashback 1% cho mọi giao dịch",
                    "Miễn phí rút tiền ATM"
                ],
                "requirements": [
                    "Thu nhập tối thiểu 15 triệu/tháng",
                    "Có lịch sử tín dụng tốt"
                ]
            },
            "platinum": {
                "name": "HDBank Platinum Card",
                "description": "Thẻ cao cấp nhất với đặc quyền VIP",
                "annual_fee": 2000000,
                "credit_limit": 200000000,
                "benefits": [
                    "Hạn mức tín dụng 200 triệu VND",
                    "Tặng 2000 SVT Token",
                    "Cashback 2% cho mọi giao dịch",
                    "Dịch vụ concierge 24/7",
                    "Miễn phí phòng chờ sân bay"
                ],
                "requirements": [
                    "Thu nhập tối thiểu 50 triệu/tháng",
                    "Tài sản chứng minh từ 1 tỷ VND"
                ]
            }
        }
        
        return jsonify({
            "success": True,
            "card_types": card_types
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi lấy thông tin loại thẻ: {str(e)}"
        }), 500


@app.route('/api/service/resort/book-room', methods=['POST'])
def resort_book_room():
    """Đặt phòng Resort và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        nights = data.get('nights', 2)
        room_type = data.get('room_type', 'deluxe')
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Tạo booking ID
        booking_id = f"RST{int(time.time())}"
        
        # Tính giá phòng
        room_prices = {
            'standard': 2000000,
            'deluxe': 3500000,
            'suite': 6000000
        }
        total_price = room_prices.get(room_type, 3500000) * nights
        
        # Thêm resort booking vào database
        resort_booking = ResortBooking(
            customer_id=customer_id,
            booking_id=booking_id,
            resort_name="Sovico Premium Resort",
            room_type=room_type,
            check_in_date=datetime.datetime.now() + datetime.timedelta(days=random.randint(7, 30)),
            check_out_date=datetime.datetime.now() + datetime.timedelta(days=random.randint(7, 30) + nights),
            nights_stayed=nights,
            total_amount=total_price,
            status="confirmed"
        )
        db.session.add(resort_booking)
        
        # Tính SVT reward
        svt_reward = nights * 400  # 400 SVT per night
        
        # Thêm SVT token transaction
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="service_reward",
            amount=svt_reward,
            description=f"Resort booking reward: {nights} nights {room_type}",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Đặt phòng {room_type} {nights} đêm thành công!",
            "booking_id": booking_id,
            "svt_reward": svt_reward,
            "booking_details": {
                "room_type": room_type,
                "nights": nights,
                "total_price": total_price
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt phòng: {str(e)}"
        }), 500


@app.route('/api/service/resort/book-spa', methods=['POST'])
def resort_book_spa():
    """Đặt dịch vụ Spa và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        spa_type = data.get('spa_type', 'massage')
        
        if not customer_id:
            return jsonify({
                "success": False,
                "message": "customer_id is required"
            }), 400
        
        # Tạo spa booking ID
        spa_booking_id = f"SPA{int(time.time())}"
        
        # Tính giá spa
        spa_prices = {
            'massage': 1500000,
            'facial': 1200000,
            'body_treatment': 2000000,
            'premium_package': 3500000
        }
        spa_price = spa_prices.get(spa_type, 1500000)
        
        # Thêm spa booking như một resort booking
        spa_booking = ResortBooking(
            customer_id=customer_id,
            booking_id=spa_booking_id,
            resort_name="Sovico Premium Spa",
            room_type=f"spa_{spa_type}",
            check_in_date=datetime.datetime.now() + datetime.timedelta(days=random.randint(1, 7)),
            check_out_date=datetime.datetime.now() + datetime.timedelta(days=random.randint(1, 7)),
            nights_stayed=0,  # Spa service, not overnight
            total_amount=spa_price,
            status="confirmed"
        )
        db.session.add(spa_booking)
        
        # SVT reward cho spa
        svt_reward = int(spa_price / 5000)  # 1 SVT per 5k VND
        
        # Thêm SVT token transaction
        token_tx = TokenTransaction(
            customer_id=customer_id,
            transaction_type="service_reward",
            amount=svt_reward,
            description=f"Spa service reward: {spa_type}",
            tx_hash=f"0x{uuid.uuid4().hex}",
            block_number=random.randint(1000000, 2000000)
        )
        db.session.add(token_tx)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Đặt dịch vụ {spa_type} thành công!",
            "booking_id": spa_booking_id,
            "svt_reward": svt_reward,
            "spa_details": {
                "service": spa_type,
                "price": spa_price
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt spa: {str(e)}"
        }), 500


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
