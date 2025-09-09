# routes/token_routes.py
# -*- coding: utf-8 -*-
"""
SVT Token management routes
"""

from flask import Blueprint, jsonify, request
from services.token_service import TokenService
from services.auth_service import require_auth

token_bp = Blueprint('tokens', __name__, url_prefix='/api/tokens')


def get_token_service():
    """Get token service with lazy initialization"""
    from models.database import db
    from flask import current_app
    return TokenService(db, current_app.config)


@token_bp.route('/<int:customer_id>', methods=['GET'])
def get_user_tokens(customer_id):
    """Get user's SVT token balance and transaction history"""
    try:
        from models.customer import Customer
        from models.transactions import TokenTransaction

        # Check if customer exists
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404

        # Get transactions directly from database
        transactions = TokenTransaction.query.filter_by(customer_id=customer.customer_id) \
            .order_by(TokenTransaction.created_at.desc()) \
            .limit(10) \
            .all()

        # Calculate balance
        all_transactions = TokenTransaction.query.filter_by(customer_id=customer.customer_id).all()
        total_earned = sum(float(t.amount) for t in all_transactions if t.amount > 0)
        total_spent = sum(float(abs(t.amount)) for t in all_transactions if t.amount < 0)
        current_balance = total_earned - total_spent

        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'balance': current_balance,
            'total_earned': total_earned,
            'total_spent': total_spent,
            'recent_transactions': [
                {
                    'id': t.id,
                    'type': t.transaction_type,
                    'amount': float(t.amount),
                    'description': t.description,
                    'created_at': t.created_at.isoformat()
                }
                for t in transactions
            ]
        })

    except Exception as e:
        import traceback
        print(f"Error in get_user_tokens: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy token balance: {str(e)}'
        }), 500


@token_bp.route('/add', methods=['POST'])
def add_svt_tokens():
    """Add SVT tokens to user account"""
    try:
        data = request.get_json()

        token_service = get_token_service()
        result = token_service.add_tokens(
            customer_id=data.get('customer_id'),
            amount=data.get('amount'),
            transaction_type=data.get('transaction_type', 'manual_add'),
            description=data.get('description', 'Manual token addition')
        )

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi thêm tokens: {str(e)}'
        }), 500


@token_bp.route('/transfer', methods=['POST'])
def transfer_tokens():
    """Transfer SVT tokens between users"""
    try:
        data = request.get_json()

        result = get_token_service().transfer_tokens(
            from_customer_id=data.get('from_customer_id'),
            to_customer_id=data.get('to_customer_id'),
            amount=data.get('amount'),
            description=data.get('description', 'Token transfer')
        )

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi chuyển tokens: {str(e)}'
        }), 500


@token_bp.route('/spend', methods=['POST'])
def spend_tokens():
    """Spend SVT tokens"""
    try:
        data = request.get_json()

        result = get_token_service().spend_tokens(
            customer_id=data.get('customer_id'),
            amount=data.get('amount'),
            transaction_type=data.get('transaction_type', 'purchase'),
            description=data.get('description', 'Token purchase')
        )

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi tiêu tokens: {str(e)}'
        }), 500


@token_bp.route('/transactions/<int:customer_id>', methods=['GET'])
def get_token_transactions(customer_id):
    """Get detailed token transaction history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        transaction_type = request.args.get('type')

        transactions = get_token_service().get_transaction_history(
            customer_id=customer_id,
            limit=limit,
            transaction_type=transaction_type
        )

        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'transactions': transactions
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy transaction history: {str(e)}'
        }), 500


@token_bp.route('/leaderboard', methods=['GET'])
def get_token_leaderboard():
    """Get SVT token leaderboard"""
    try:
        leaderboard = get_token_service().get_token_leaderboard()
        return jsonify({
            'success': True,
            'leaderboard': leaderboard
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy leaderboard: {str(e)}'
        }), 500


# Test endpoints
@token_bp.route('/test/add-svt/<int:customer_id>', methods=['POST'])
def test_add_svt_tokens(customer_id):
    """Test endpoint to add SVT tokens for testing"""
    try:
        data = request.get_json() or {}
        amount = data.get('amount', 1000)

        result = get_token_service().add_tokens(
            customer_id=customer_id,
            amount=amount,
            transaction_type='test_reward',
            description=f'Test SVT tokens - {amount} SVT'
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi test add tokens: {str(e)}'
        }), 500