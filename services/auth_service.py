# services/auth_service.py
# -*- coding: utf-8 -*-
"""
Authentication service with JWT token management
"""

import datetime
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models.database import db, bcrypt


class AuthService:
    def __init__(self, secret_key=None):
        self.secret_key = secret_key or 'default_secret_key_for_development'

    def _get_secret_key(self):
        """Get secret key with fallback"""
        try:
            from flask import current_app
            return current_app.config.get('SECRET_KEY', self.secret_key)
        except:
            return self.secret_key

    def create_token(self, user_id: int):
        """Create JWT token for user"""
        payload = {
            'sub': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        }
        return jwt.encode(payload, self._get_secret_key(), algorithm='HS256')

    def verify_token(self, token: str):
        """Verify JWT token and return user_id"""
        try:
            data = jwt.decode(token, self._get_secret_key(), algorithms=['HS256'])
            return data.get('sub')
        except Exception:
            return None

    def register(self, email, password, name=None):
        """Đăng ký tài khoản mới"""
        try:
            from models.user import User
            from models.customer import Customer

            email = email.strip().lower()
            if not email or not password:
                return {'success': False, 'error': 'Email và password không được để trống'}

            if User.query.filter_by(email=email).first():
                return {'success': False, 'error': 'Email đã tồn tại'}

            # Determine role based on email domain
            role = 'admin' if any(domain in email for domain in ['@hdbank.', '@sovico.']) else 'customer'

            # If customer role, create customer record first
            customer_db_id = None
            customer_business_id = None
            if role == 'customer':
                # Generate unique customer_id
                import random
                customer_business_id = random.randint(100000, 999999)
                while Customer.query.filter_by(customer_id=customer_business_id).first():
                    customer_business_id = random.randint(100000, 999999)

                customer = Customer(
                    customer_id=customer_business_id,
                    name=name or email.split('@')[0],
                    persona_type='nguoi_tre'  # Default
                )
                db.session.add(customer)
                db.session.flush()
                customer_db_id = customer.id

            user = User(
                email=email,
                name=name or email.split('@')[0],
                role=role,
                customer_id=customer_db_id
            )
            user.set_password(password)

            db.session.add(user)
            db.session.commit()

            token = self.create_token(user.id)
            return {
                'success': True,
                'token': token,
                'user': {
                    'email': user.email,
                    'name': user.name,
                    'role': user.role,
                    'customer_id': customer_business_id
                }
            }

        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    def login(self, email, password):
        """Đăng nhập"""
        try:
            from models.user import User

            email = email.strip().lower()
            user = User.query.filter_by(email=email).first()

            if not user or not user.check_password(password):
                return {'success': False, 'error': 'Email hoặc password không đúng'}

            # Get actual customer_id from customer relationship
            actual_customer_id = None
            if user.customer_id and user.customer:
                actual_customer_id = user.customer.customer_id

            token = self.create_token(user.id)
            return {
                'success': True,
                'token': token,
                'user': {
                    'email': user.email,
                    'name': user.name,
                    'role': user.role,
                    'customer_id': actual_customer_id
                }
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_current_user(self, user_id):
        """Lấy thông tin user hiện tại"""
        try:
            from models.user import User

            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}

            # Get actual customer_id from customer relationship
            actual_customer_id = None
            if user.customer_id and user.customer:
                actual_customer_id = user.customer.customer_id

            return {
                'success': True,
                'user': {
                    'email': user.email,
                    'name': user.name,
                    'role': user.role,
                    'customer_id': actual_customer_id
                }
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}


# Global functions that can be imported
def create_token(user_id: int):
    """Create JWT token for user"""
    try:
        from flask import current_app
        secret_key = current_app.config.get('SECRET_KEY', 'default_secret_key_for_development')
    except:
        secret_key = 'default_secret_key_for_development'

    payload = {
        'sub': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')


def verify_token(token: str):
    """Verify JWT token and return user_id"""
    try:
        try:
            from flask import current_app
            secret_key = current_app.config.get('SECRET_KEY', 'default_secret_key_for_development')
        except:
            secret_key = 'default_secret_key_for_development'

        data = jwt.decode(token, secret_key, algorithms=['HS256'])
        return data.get('sub')
    except Exception:
        return None


def require_auth(func):
    """Decorator to require authentication"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        from flask import request, jsonify

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token không hợp lệ'}), 401

        token = auth_header.split(' ', 1)[1]
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Token đã hết hạn'}), 401

        from models.user import User
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 401

        request.current_user = user
        return func(*args, **kwargs)

    return wrapper
