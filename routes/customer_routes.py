# routes/customer_routes.py
"""
Customer routes blueprint
"""
from flask import Blueprint, request, jsonify
from models.database import db

# Add url_prefix so routes are under /customer
customer_bp = Blueprint('customer', __name__, url_prefix='/customer')
customers_bp =Blueprint('customers', __name__, url_prefix='/customers')
# Import service instances will be injected later
customer_service = None
ai_service = None


def init_customer_routes(service_instances):
    """Initialize customer routes with service instances"""
    global customer_service, ai_service
    customer_service = service_instances.get('customer_service')
    ai_service = service_instances.get('ai_service')
    print(f"🔧 Customer routes initialized:")
    print(f"  - customer_service: {customer_service is not None}")
    print(f"  - ai_service: {ai_service is not None}")
    if ai_service:
        print(f"  - AI model loaded: {ai_service.is_model_loaded()}")


@customer_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_profile(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    try:
        print(f"🔍 Profile request for customer {customer_id}")
        print(f"  - customer_service: {customer_service is not None}")
        
        if not customer_service:
            print("❌ Customer service not available!")
            return jsonify({'error': 'Customer service not available'}), 500

        # Sử dụng service method để có cấu trúc dữ liệu đúng với basic_info
        profile = customer_service.get_customer_360_profile(customer_id)
        if profile is None:
            return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404

        # Thêm achievements và token balance vào profile nếu chưa có
        from models.achievements import CustomerAchievement
        from models.transactions import TokenTransaction

        # Only query database if not already in profile (i.e., not mock data)
        if 'achievements_count' not in profile:
            achievements_count = CustomerAchievement.query.filter_by(customer_id=customer_id).count() if CustomerAchievement else 0
            profile['achievements_count'] = achievements_count
        
        if 'token_balance' not in profile:
            transactions = TokenTransaction.query.filter_by(customer_id=customer_id).all() if TokenTransaction else []
            token_balance = sum(t.amount for t in transactions)
            profile['token_balance'] = float(token_balance)

        return jsonify({
            'success': True,
            'customer': profile  # Trả về profile với cấu trúc basic_info
        })

    except Exception as e:
        import traceback
        print(f"Error in get_customer_profile: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@customer_bp.route('/<int:customer_id>/insights', methods=['GET'])
def get_insights(customer_id):
    """API trả về persona dự đoán, evidence và đề xuất."""
    print(f"🔍 Insights request for customer {customer_id}")
    print(f"  - customer_service: {customer_service is not None}")
    print(f"  - ai_service: {ai_service is not None}")
    
    if not customer_service or not ai_service:
        print("❌ Services not available!")
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


@customers_bp.route('/search', methods=['GET'])
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


@customers_bp.route('/suggestions', methods=['GET'])
def get_customer_suggestions():
    """Lấy danh sách customer suggestions (for admin or customer selection)"""
    try:
        if not customer_service:
            return jsonify([]), 500  # Return empty array for frontend compatibility

        # Get customer suggestions - this could be top customers, recent customers, etc.
        suggestions = customer_service.get_customer_suggestions()
        
        # Return array directly for frontend .map() compatibility
        return jsonify(suggestions or [])
        
    except Exception as e:
        print(f"Error in get_customer_suggestions: {e}")
        return jsonify([]), 500  # Return empty array on error