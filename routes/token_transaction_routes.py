# routes/token_transaction_routes.py
# -*- coding: utf-8 -*-
"""
Token transaction routes for customer token history
"""

from flask import Blueprint, jsonify, request
from services.auth_service import require_auth
from models.database import db

token_transaction_bp = Blueprint('token_transactions', __name__, url_prefix='/api/token-transactions')

@token_transaction_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_token_transactions(customer_id):
    """Get token transactions for customer"""
    try:
        from models.customer import Customer
        from models.transactions import TokenTransaction
        
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        transactions = TokenTransaction.query.filter_by(customer_id=customer.customer_id)\
            .order_by(TokenTransaction.created_at.desc())\
            .all()
        
        transaction_list = []
        for transaction in transactions:
            transaction_list.append({
                'id': transaction.id,
                'transaction_type': transaction.transaction_type,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'created_at': transaction.created_at.isoformat(),
                'status': getattr(transaction, 'status', 'completed')
            })
        
        # Calculate total balance
        total_earned = sum(float(t.amount) for t in transactions if t.amount > 0)
        total_spent = sum(float(abs(t.amount)) for t in transactions if t.amount < 0)
        current_balance = total_earned - total_spent
        
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'transactions': transaction_list,
            'summary': {
                'total_earned': total_earned,
                'total_spent': total_spent,
                'current_balance': current_balance,
                'transaction_count': len(transaction_list)
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in get_customer_token_transactions: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@token_transaction_bp.route('/', methods=['POST'])
@require_auth
def create_token_transaction(user_id):
    """Create new token transaction"""
    try:
        from models.customer import Customer
        from models.transactions import TokenTransaction
        
        data = request.json
        customer_id = data.get('customer_id')
        transaction_type = data.get('transaction_type')
        amount = data.get('amount')
        description = data.get('description', '')
        
        if not all([customer_id, transaction_type, amount]):
            return jsonify({
                'success': False, 
                'error': 'customer_id, transaction_type, and amount are required'
            }), 400
        
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        transaction = TokenTransaction(
            customer_id=customer.customer_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transaction': {
                'id': transaction.id,
                'customer_id': customer_id,
                'transaction_type': transaction.transaction_type,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'created_at': transaction.created_at.isoformat()
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in create_token_transaction: {e}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
