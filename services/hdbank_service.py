# services/hdbank_service.py
# -*- coding: utf-8 -*-
"""
HDBank service integration
"""

import datetime
import uuid
import random
from models import db, Customer, HDBankTransaction, HDBankCard, TokenTransaction

class HDBankService:
    
    def get_dashboard_data(self, customer_id):
        """Lấy dữ liệu dashboard HDBank cho customer"""
        try:
            # Kiểm tra customer có thẻ không
            card_info = self._get_customer_card_info(customer_id)
            
            # Lấy thông tin giao dịch
            transactions = HDBankTransaction.query.filter_by(
                customer_id=customer_id
            ).order_by(HDBankTransaction.transaction_date.desc()).limit(10).all()
            
            # Tính toán statistics
            stats = self._calculate_account_stats(customer_id)
            
            return {
                'card_info': card_info,
                'recent_transactions': [self._transaction_to_dict(tx) for tx in transactions],
                'statistics': stats,
                'services': self._get_available_services(customer_id)
            }
            
        except Exception as e:
            print(f"❌ Error getting HDBank dashboard: {e}")
            return {}
    
    def get_service_status(self, customer_id):
        """Kiểm tra trạng thái các dịch vụ HDBank"""
        try:
            has_card = self._check_customer_has_card(customer_id)
            card_info = self._get_customer_card_info(customer_id) if has_card else {}
            
            return {
                'has_card': has_card,
                'card_status': card_info.get('status', 'inactive'),
                'account_active': has_card,
                'services_available': {
                    'transfer': has_card,
                    'loan': has_card,
                    'investment': has_card,
                    'insurance': True
                }
            }
            
        except Exception as e:
            print(f"❌ Error getting service status: {e}")
            return {'has_card': False, 'account_active': False}
    
    def process_transfer(self, from_customer_id, to_account, amount, description=''):
        """Xử lý chuyển khoản"""
        try:
            if not self._check_customer_has_card(from_customer_id):
                return {'success': False, 'error': 'Customer does not have HDBank card'}
            
            if amount <= 0:
                return {'success': False, 'error': 'Invalid transfer amount'}
            
            # Kiểm tra số dư (giả lập)
            current_balance = self._get_current_balance(from_customer_id)
            if current_balance < amount:
                return {'success': False, 'error': 'Insufficient balance'}
            
            # Tạo giao dịch chuyển tiền
            transfer_tx = HDBankTransaction(
                transaction_id=f"TF{uuid.uuid4().hex[:8].upper()}",
                customer_id=from_customer_id,
                transaction_date=datetime.datetime.utcnow(),
                amount=-amount,
                transaction_type='debit',
                balance=current_balance - amount,
                description=f"Chuyển khoản đến {to_account}: {description}"
            )
            db.session.add(transfer_tx)
            
            # Thưởng SVT cho giao dịch
            svt_reward = self._calculate_transfer_svt_reward(amount)
            if svt_reward > 0:
                svt_tx = TokenTransaction(
                    customer_id=from_customer_id,
                    transaction_type="transfer_reward",
                    amount=svt_reward,
                    description=f"Thưởng SVT cho chuyển khoản {amount:,.0f} VND",
                    tx_hash=f"0x{uuid.uuid4().hex}",
                    block_number=random.randint(1000000, 2000000)
                )
                db.session.add(svt_tx)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Chuyển khoản thành công',
                'transaction_id': transfer_tx.transaction_id,
                'amount': amount,
                'new_balance': current_balance - amount,
                'svt_reward': svt_reward
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error processing transfer: {e}")
            return {'success': False, 'error': str(e)}
    
    def apply_loan(self, customer_id, loan_amount, loan_term, loan_purpose=''):
        """Đăng ký vay vốn"""
        try:
            if not self._check_customer_has_card(customer_id):
                return {'success': False, 'error': 'Customer does not have HDBank card'}
            
            if loan_amount <= 0:
                return {'success': False, 'error': 'Invalid loan amount'}
            
            # Tạo bản ghi vay (giả lập)
            loan_tx = HDBankTransaction(
                transaction_id=f"LOAN{uuid.uuid4().hex[:8].upper()}",
                customer_id=customer_id,
                transaction_date=datetime.datetime.utcnow(),
                amount=loan_amount,
                transaction_type='credit',
                balance=self._get_current_balance(customer_id) + loan_amount,
                description=f"Giải ngân khoản vay {loan_term} tháng: {loan_purpose}"
            )
            db.session.add(loan_tx)
            
            # Thưởng SVT cho việc sử dụng dịch vụ vay
            svt_reward = 1000  # Fixed reward cho loan
            svt_tx = TokenTransaction(
                customer_id=customer_id,
                transaction_type="loan_reward",
                amount=svt_reward,
                description=f"Thưởng SVT cho đăng ký vay {loan_amount:,.0f} VND",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1000000, 2000000)
            )
            db.session.add(svt_tx)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Đăng ký vay {loan_amount:,.0f} VND thành công',
                'loan_transaction_id': loan_tx.transaction_id,
                'loan_amount': loan_amount,
                'loan_term': loan_term,
                'svt_reward': svt_reward
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error applying loan: {e}")
            return {'success': False, 'error': str(e)}
    
    def open_card(self, customer_id, card_type, card_name=''):
        """Mở thẻ HDBank mới"""
        try:
            # Kiểm tra customer đã có thẻ chưa
            if self._check_customer_has_card(customer_id):
                return {'success': False, 'error': 'Customer already has HDBank card'}
            
            # Kiểm tra customer tồn tại
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            # Tạo thẻ mới
            card_info = self._create_new_card(customer_id, card_type, card_name or f"HDBank {card_type.title()}")
            
            # Tạo transaction mở thẻ
            open_card_tx = HDBankTransaction(
                transaction_id=f"CARD{uuid.uuid4().hex[:8].upper()}",
                customer_id=customer_id,
                transaction_date=datetime.datetime.utcnow(),
                amount=0,
                transaction_type='credit',
                balance=0,
                description=f"Mở thẻ HDBank {card_type} - {card_info['card_number']}"
            )
            db.session.add(open_card_tx)
            
            # Thưởng SVT cho việc mở thẻ
            svt_reward = 500
            svt_tx = TokenTransaction(
                customer_id=customer_id,
                transaction_type="card_opening_reward",
                amount=svt_reward,
                description=f"Thưởng SVT cho mở thẻ HDBank {card_type}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1000000, 2000000)
            )
            db.session.add(svt_tx)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Mở thẻ HDBank {card_type} thành công',
                'card_info': card_info,
                'svt_reward': svt_reward
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error opening card: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_customer_cards(self, customer_id):
        """Lấy danh sách thẻ của customer"""
        try:
            cards = HDBankCard.query.filter_by(customer_id=customer_id).all()
            return [card.to_dict() for card in cards]
        except Exception as e:
            print(f"❌ Error getting customer cards: {e}")
            return []
    
    def get_available_card_types(self):
        """Lấy các loại thẻ có sẵn"""
        return [
            {
                'type': 'classic',
                'name': 'HDBank Classic',
                'credit_limit': 10000000,
                'annual_fee': 0,
                'benefits': ['Miễn phí thường niên năm đầu', 'Cashback 1%']
            },
            {
                'type': 'gold',
                'name': 'HDBank Gold',
                'credit_limit': 50000000,
                'annual_fee': 500000,
                'benefits': ['Phòng chờ sân bay', 'Cashback 1.5%', 'Bảo hiểm du lịch']
            },
            {
                'type': 'platinum',
                'name': 'HDBank Platinum',
                'credit_limit': 100000000,
                'annual_fee': 1000000,
                'benefits': ['Concierge service', 'Cashback 2%', 'Golf privileges']
            }
        ]
    
    def _get_customer_card_info(self, customer_id):
        """Helper: Lấy thông tin thẻ của customer"""
        try:
            card = HDBankCard.query.filter_by(customer_id=customer_id, status='active').first()
            return card.to_dict() if card else {'has_card': False}
        except Exception as e:
            print(f"❌ Error getting card info: {e}")
            return {'has_card': False}
    
    def _check_customer_has_card(self, customer_id):
        """Helper: Kiểm tra customer có thẻ không"""
        try:
            card_count = HDBankCard.query.filter_by(customer_id=customer_id, status='active').count()
            return card_count > 0
        except Exception as e:
            print(f"❌ Error checking card: {e}")
            return False
    
    def _get_current_balance(self, customer_id):
        """Helper: Lấy số dư hiện tại"""
        try:
            latest_tx = HDBankTransaction.query.filter_by(
                customer_id=customer_id
            ).order_by(HDBankTransaction.transaction_date.desc()).first()
            
            return float(latest_tx.balance) if latest_tx else 0
        except Exception as e:
            print(f"❌ Error getting balance: {e}")
            return 0
    
    def _transaction_to_dict(self, tx):
        """Helper: Convert transaction to dict"""
        return {
            'transaction_id': tx.transaction_id,
            'transaction_date': tx.transaction_date.strftime('%Y-%m-%d %H:%M:%S'),
            'amount': float(tx.amount),
            'transaction_type': tx.transaction_type,
            'balance': float(tx.balance),
            'description': tx.description
        }
    
    def _calculate_account_stats(self, customer_id):
        """Helper: Tính toán thống kê tài khoản"""
        try:
            transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).all()
            
            if not transactions:
                return {'total_transactions': 0, 'current_balance': 0}
            
            current_balance = float(transactions[-1].balance) if transactions else 0
            total_credit = sum(float(tx.amount) for tx in transactions if tx.transaction_type == 'credit')
            total_debit = sum(abs(float(tx.amount)) for tx in transactions if tx.transaction_type == 'debit')
            
            return {
                'total_transactions': len(transactions),
                'current_balance': current_balance,
                'total_credit': total_credit,
                'total_debit': total_debit,
                'average_transaction': (total_credit + total_debit) / len(transactions) if transactions else 0
            }
        except Exception as e:
            print(f"❌ Error calculating stats: {e}")
            return {}
    
    def _get_available_services(self, customer_id):
        """Helper: Lấy dịch vụ có sẵn cho customer"""
        has_card = self._check_customer_has_card(customer_id)
        
        return {
            'transfer': {'available': has_card, 'name': 'Chuyển khoản'},
            'loan': {'available': has_card, 'name': 'Vay vốn'},
            'investment': {'available': has_card, 'name': 'Đầu tư'},
            'insurance': {'available': True, 'name': 'Bảo hiểm'},
            'forex': {'available': has_card, 'name': 'Ngoại hối'}
        }
    
    def _calculate_transfer_svt_reward(self, amount):
        """Helper: Tính SVT reward cho chuyển khoản"""
        # 0.1% của số tiền chuyển, tối đa 100 SVT
        return min(100, amount * 0.001)
    
    def _create_new_card(self, customer_id, card_type, card_name):
        """Helper: Tạo thẻ mới trong database"""
        try:
            # Generate card number
            card_number = f"4567{random.randint(1000, 9999)}{random.randint(1000, 9999)}{random.randint(1000, 9999)}"
            
            # Card type configurations
            card_configs = {
                'classic': {'credit_limit': 10000000, 'annual_fee': 0},
                'gold': {'credit_limit': 50000000, 'annual_fee': 500000},
                'platinum': {'credit_limit': 100000000, 'annual_fee': 1000000}
            }
            
            config = card_configs.get(card_type, card_configs['classic'])
            
            card = HDBankCard(
                customer_id=customer_id,
                card_id=f"HD{uuid.uuid4().hex[:8].upper()}",
                card_number=card_number,
                card_type=card_type,
                card_name=card_name,
                credit_limit=config['credit_limit'],
                annual_fee=config['annual_fee'],
                status='active',
                opened_date=datetime.datetime.utcnow(),
                expiry_date=datetime.datetime.utcnow() + datetime.timedelta(days=1460)  # 4 years
            )
            
            db.session.add(card)
            db.session.flush()  # Get the card ID
            
            return card.to_dict()
            
        except Exception as e:
            print(f"❌ Error creating card: {e}")
            raise e
