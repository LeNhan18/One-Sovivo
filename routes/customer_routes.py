# routes/customer_routes.py
"""
Customer routes blueprint
"""
from flask import Blueprint, request, jsonify

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


@customer_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_profile(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    try:
        from models.customer import Customer
        from models.achievements import CustomerAchievement
        from models.transactions import TokenTransaction

        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404

        # Get achievements count (table uses customer_id referencing customers.customer_id)
        achievements_count = CustomerAchievement.query.filter_by(customer_id=customer.customer_id).count()

        # Get token balance
        transactions = TokenTransaction.query.filter_by(customer_id=customer.customer_id).all()
        token_balance = sum(t.amount for t in transactions)

        return jsonify({
            'success': True,
            'customer': {
                'customer_id': customer.customer_id,
                'name': customer.name,
                'email': getattr(customer, 'email', ''),
                'persona_type': customer.persona_type,
                'age': customer.age,
                'gender': customer.gender,
                'job': customer.job,
                'city': customer.city,
                'is_business_flyer': getattr(customer, 'is_business_flyer', False),
                'avg_balance': getattr(customer, 'avg_balance', 0),
                'created_at': customer.created_at.isoformat() if customer.created_at else None,
                'achievements_count': achievements_count,
                'token_balance': float(token_balance) if token_balance is not None else 0.0
            }
        })

    except Exception as e:
        import traceback
        print(f"Error in get_customer_profile: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


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