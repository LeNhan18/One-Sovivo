# routes/auth_routes.py
from flask import Blueprint, request, jsonify
from services import AuthService

auth_bp = Blueprint('auth', __name__)

# Service instance will be injected by main app
auth_service = None

def init_auth_routes(service):
    global auth_service
    auth_service = service

@auth_bp.route('/register', methods=['POST'])
def register_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    name = (data.get('name') or '').strip() or email.split('@')[0]

    if not email or not password:
        return jsonify({'error': 'Thiếu email hoặc mật khẩu'}), 400

    result, status_code = auth_service.register(email, password, name)
    return jsonify(result), status_code

@auth_bp.route('/login', methods=['POST'])
def login_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    result, status_code = auth_service.login(email, password)
    return jsonify(result), status_code

@auth_bp.route('/me', methods=['GET'])
@auth_service.require_auth
def me_api():
    user = request.current_user
    result = auth_service.get_current_user(user)
    return jsonify(result)
