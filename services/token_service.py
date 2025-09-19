# services/token_service.py
"""
Token Service - Xử lý SVT tokens và blockchain transactions
"""
import datetime
import uuid


class TokenService:
    def __init__(self, db, config, blockchain_enabled=False):
        self.db = db
        self.config = config
        self.blockchain_enabled = blockchain_enabled
        self.models = {}

    def set_models(self, model_classes):
        """Set model classes after initialization"""
        self.models = model_classes

    def get_user_balance(self, user_id):
        """Get user's SVT token balance"""
        try:
            User = self.models.get('User')
            if not User:
                return {'error': 'User model not found'}, 500

            user = User.query.get(user_id)
            if not user:
                return {'error': f'User {user_id} not found'}, 404

            return {
                'user_id': user_id,
                'svt_balance': getattr(user, 'svt_balance', 0) or 0,
                'updated_at': datetime.datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500

    def add_tokens(self, data):
        """Add SVT tokens to user account"""
        try:
            user_id = data.get('user_id')
            amount = data.get('amount', 0)
            transaction_type = data.get('type', 'manual_add')
            description = data.get('description', f'Added {amount} SVT tokens')

            if not user_id or amount <= 0:
                return {'error': 'Invalid user_id or amount'}, 400

            User = self.models.get('User')
            TokenTransaction = self.models.get('TokenTransaction')
            
            if not all([User, TokenTransaction]):
                return {'error': 'Required models not found'}, 500

            user = User.query.get(user_id)
            if not user:
                return {'error': f'User {user_id} not found'}, 404

            # Update user balance
            current_balance = getattr(user, 'svt_balance', 0) or 0
            new_balance = current_balance + amount
            user.svt_balance = new_balance

            # Record transaction
            transaction = TokenTransaction(
                transaction_id=str(uuid.uuid4()),
                user_id=user_id,
                transaction_type=transaction_type,
                amount=amount,
                balance_after=new_balance,
                description=description,
                created_at=datetime.datetime.utcnow()
            )

            self.db.session.add(transaction)
            self.db.session.commit()

            return {
                'success': True,
                'message': f'Added {amount} SVT tokens to user {user_id}',
                'user_id': user_id,
                'amount_added': amount,
                'new_balance': new_balance,
                'transaction_id': transaction.transaction_id
            }
        except Exception as e:
            self.db.session.rollback()
            return {'error': str(e)}, 500

    def add_test_tokens(self, customer_id, amount=1000):
        """Test endpoint to add SVT tokens"""
        try:
            # Check if customer exists
            Customer = self.models.get('Customer')
            if not Customer:
                return {'error': 'Customer model not found'}, 500

            customer = Customer.query.get(customer_id)
            if not customer:
                return {'error': f'Customer {customer_id} not found'}, 404

            # Find or create user for this customer
            User = self.models.get('User')
            if not User:
                return {'error': 'User model not found'}, 500

            user = User.query.filter_by(customer_id=customer_id).first()
            if not user:
                # Create new user for this customer
                user = User(
                    customer_id=customer_id,
                    username=f'customer_{customer_id}',
                    email=f'customer_{customer_id}@sovico.com',
                    svt_balance=0
                )
                self.db.session.add(user)
                self.db.session.flush()  # Get user ID

            # Add tokens using existing method
            result = self.add_tokens({
                'user_id': user.user_id,
                'amount': amount,
                'type': 'test_add',
                'description': f'Test: Added {amount} SVT tokens for customer {customer_id}'
            })

            if 'error' in result:
                return result

            return {
                'success': True,
                'message': f'Test: Added {amount} SVT tokens for customer {customer.name}',
                'customer_id': customer_id,
                'customer_name': customer.name,
                'user_id': user.user_id,
                'amount_added': amount,
                'new_balance': result.get('new_balance', 0)
            }
        except Exception as e:
            self.db.session.rollback()
            return {'error': str(e)}, 500