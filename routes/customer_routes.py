# routes/customer_routes.py
"""
Customer routes blueprint
"""
from flask import Blueprint, request, jsonify

customer_bp = Blueprint('customer', __name__)

# Import service instances will be injected later
customer_service = None
ai_service = None

def init_customer_routes(service_instances):
    """Initialize customer routes with service instances"""
    global customer_service, ai_service
    customer_service = service_instances.get('customer_service')
    ai_service = service_instances.get('ai_service')

@customer_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_profile(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    if not customer_service:
        return jsonify({'error': 'Customer service not available'}), 500
    
    profile = customer_service.get_customer_360_profile(customer_id)
    if profile is None:
        return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404
    return jsonify(profile)

@customer_bp.route('/<int:customer_id>/insights', methods=['GET'])
def get_insights(customer_id):
    """API trả về persona dự đoán, evidence và đề xuất."""
    if not customer_service or not ai_service:
        return jsonify({'error': 'Required services not available'}), 500
    
    profile = customer_service.get_customer_360_profile(customer_id)
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

    predicted_persona, error = ai_service.predict_persona(input_data)
    if error:
        return jsonify({'error': error}), 503

    # Build evidence và recommendations
    evidence = ai_service.build_evidence(profile)
    recommendations = ai_service.get_recommendations(predicted_persona, input_data)

    return jsonify({
        'predicted_persona': predicted_persona,
        'evidence': evidence,
        'recommendations': recommendations
    })

@customer_bp.route('/search', methods=['GET'])
def search_customers():
    """Tìm kiếm khách hàng theo từ khóa."""
    if not customer_service:
        return jsonify({'error': 'Customer service not available'}), 500
    
    q = (request.args.get('q') or '').strip().lower()
    if not q:
        return jsonify([])

    # This would need to be implemented in customer_service
    # For now, return empty result
    return jsonify([])
