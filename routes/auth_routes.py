# routes/auth_routes.py
# -*- coding: utf-8 -*-
"""
Authentication routes
"""

from flask import Blueprint, request, jsonify
from services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Initialize service
auth_service = AuthService()


@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json(force=True) or {}
        email = (data.get('email') or '').strip()
        password = (data.get('password') or '').strip()
        name = (data.get('name') or '').strip()

        result = auth_service.register(email, password, name)

        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Registration error: {str(e)}'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json(force=True) or {}
        email = (data.get('email') or '').strip()
        password = (data.get('password') or '').strip()

        result = auth_service.login(email, password)

        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 401

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Login error: {str(e)}'
        }), 500


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user info endpoint"""
    try:
        from services.auth_service import verify_token

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token required'}), 401

        token = auth_header.split(' ', 1)[1]
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401

        result = auth_service.get_current_user(user_id)

        if result.get('success'):
            return jsonify(result['user'])
        else:
            return jsonify(result), 401

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Get user error: {str(e)}'
        }), 500
