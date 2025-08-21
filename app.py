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
        if not user.customer_id:
            return jsonify({'error': 'Người dùng chưa có thông tin khách hàng'}), 400
        
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
        
        result = db.session.execute(db.text(token_query), {"customer_id": user.customer_id})
        row = result.fetchone()
        current_balance = float(row.total_svt) if row and row.total_svt else 0
        if current_balance < total_cost:
            return jsonify({'error': f'Không đủ SVT. Cần {total_cost}, có {current_balance}'}), 400
        
        # Thực hiện giao dịch
        # 1. Trừ SVT
        debit_transaction = TokenTransaction(
            tx_hash=f"purchase_{item_id}_{datetime.datetime.utcnow().timestamp()}",
            customer_id=user.customer_id,
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
