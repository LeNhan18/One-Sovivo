# routes/debug_routes.py
# -*- coding: utf-8 -*-
"""
Debug and development routes
"""

from flask import Blueprint, jsonify, request
from services.hdbank_service import HDBankService

debug_bp = Blueprint('debug', __name__, url_prefix='/api/debug')

def get_hdbank_service():
    return HDBankService()

@debug_bp.route('/api/fix/auto-create-card/<int:customer_id>', methods=['POST'])
def auto_create_card(customer_id):
    """Debug endpoint để tự động tạo card cho customer"""
    try:
        result = get_hdbank_service().auto_create_card(customer_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi tạo card: {str(e)}'
        }), 500

@debug_bp.route('/api/debug/customer-info/<int:customer_id>', methods=['GET'])
def debug_customer_info(customer_id):
    """Debug endpoint để lấy thông tin chi tiết customer"""
    try:
        from models.customer import Customer
        from models.hdbank_card import HDBankCard
        from models.transactions import HDBankTransaction
        
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        cards = HDBankCard.query.filter_by(customer_id=customer.customer_id).all()
        transactions = HDBankTransaction.query.filter_by(customer_id=customer.customer_id).limit(5).all()
        
        return jsonify({
            'success': True,
            'customer_info': {
                'id': customer.id,
                'customer_id': customer.customer_id,
                'name': customer.name,
                'age': customer.age,
                'gender': customer.gender,
                'job': customer.job,
                'city': customer.city,
                'persona_type': customer.persona_type
            },
            'cards': [
                {
                    'id': card.id,
                    'card_id': card.card_id,
                    'card_number': card.card_number,
                    'card_type': card.card_type,
                    'status': card.status
                }
                for card in cards
            ],
            'recent_transactions': [
                {
                    'id': tx.id,
                    'amount': float(tx.amount),
                    'transaction_type': tx.transaction_type,
                    'balance': float(tx.balance),
                    'description': tx.description
                }
                for tx in transactions
            ]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Debug error: {str(e)}'
        }), 500
