# routes/admin_routes.py
"""
Admin routes blueprint for achievement management
"""
from flask import Blueprint, request, jsonify, send_from_directory

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Import service instances will be injected later
admin_service = None
customer_service = None


def init_admin_routes(service_instances):
    """Initialize admin routes with service instances"""
    global admin_service, customer_service
    admin_service = service_instances.get('admin_service')
    customer_service = service_instances.get('customer_service')


@admin_bp.route('/achievements')
def admin_achievements_page():
    """Serve admin achievements HTML page"""
    return send_from_directory('.', 'admin_achievements.html')


@admin_bp.route('/achievements/list', methods=['GET'])
def get_achievements_list():
    """API lấy danh sách achievements cho React component"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    result = admin_service.get_all_achievements()
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/customers/search', methods=['GET'])
def search_customers_admin():
    """API cho Admin tìm kiếm khách hàng"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    query_param = request.args.get('q', '').strip()
    limit = int(request.args.get('limit', 20))

    result = admin_service.search_customers(query_param, limit)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/customer/<int:customer_id>/achievements', methods=['GET'])
def get_customer_achievements_admin(customer_id):
    """API cho Admin xem achievements của khách hàng"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    result = admin_service.get_customer_achievements(customer_id)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/assign-achievement', methods=['POST'])
def assign_achievement_admin():
    """API gán achievement cho khách hàng"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    data = request.get_json()
    result = admin_service.assign_achievement(data)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/auto-assign-achievements', methods=['POST'])
def auto_assign_achievements_admin():
    """API tự động gán achievements"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    data = request.get_json()
    customer_id = data.get('customer_id')
    result = admin_service.auto_assign_achievements(customer_id)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)