# services/auth_service.py
import datetime
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models import get_models

class AuthService:
    def __init__(self, db, bcrypt):
        self.db = db
        self.bcrypt = bcrypt
        # Get model classes after initialization
        self.models = get_models()
        self.User = self.models['User']
        self.Customer = self.models['Customer']
    
    def create_token(self, user_id: int):
        payload = {
            'sub': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    def verify_token(self, token: str):
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            return data.get('sub')
        except Exception:
            return None

    def require_auth(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Token không hợp lệ'}), 401
            
            token = auth_header.split(' ', 1)[1]
            user_id = self.verify_token(token)
            if not user_id:
                return jsonify({'error': 'Token đã hết hạn'}), 401
            
            user = self.User.query.get(user_id)
            if not user:
                return jsonify({'error': 'Người dùng không tồn tại'}), 401
            
            request.current_user = user
            return func(*args, **kwargs)

        return wrapper

    def register(self, email, password, name=None):
        """Đăng ký tài khoản mới"""
        email = email.strip().lower()
        name = name or email.split('@')[0]
        
        if self.User.query.filter_by(email=email).first():
            return {'error': 'Email đã tồn tại'}, 409

        # Determine role based on email domain
        role = 'admin' if any(domain in email for domain in ['@hdbank.', '@sovico.']) else 'customer'

        # If customer role, create customer record first
        customer_db_id = None
        customer_business_id = None
        if role == 'customer':
            # Find max customer_id and increment
            max_customer = self.Customer.query.order_by(self.Customer.customer_id.desc()).first()
            next_customer_id = (max_customer.customer_id + 1) if max_customer else 2001
            
            # Create customer record
            customer = self.Customer(
                customer_id=next_customer_id,
                name=name,
                age=25,
                gender='Khác',
                job='Khách hàng',
                city='Hồ Chí Minh',
                persona_type='nguoi_tre'
            )
            self.db.session.add(customer)
            self.db.session.flush()
            customer_db_id = customer.id
            customer_business_id = customer.customer_id

        user = self.User(email=email, name=name, role=role, customer_id=customer_db_id)
        user.set_password(password)

        self.db.session.add(user)
        self.db.session.commit()

        token = self.create_token(user.id)
        return {
            'token': token,
            'user': {
                'email': user.email, 
                'name': user.name, 
                'role': user.role,
                'customer_id': customer_business_id
            }
        }, 200

    def login(self, email, password):
        """Đăng nhập"""
        email = email.strip().lower()
        
        user = self.User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return {'error': 'Sai email hoặc mật khẩu'}, 401

        # Get actual customer_id from customer relationship
        actual_customer_id = None
        if user.customer_id and user.customer:
            actual_customer_id = user.customer.customer_id

        token = self.create_token(user.id)
        return {
            'token': token,
            'user': {
                'email': user.email, 
                'name': user.name, 
                'role': user.role,
                'customer_id': actual_customer_id
            }
        }, 200

    def get_current_user(self, user):
        """Lấy thông tin user hiện tại"""
        actual_customer_id = None
        if user.customer_id and user.customer:
            actual_customer_id = user.customer.customer_id
        return {
            'email': user.email, 
            'name': user.name, 
            'role': user.role,
            'customer_id': actual_customer_id
        }
