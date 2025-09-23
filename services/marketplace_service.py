# services/marketplace_service.py
# -*- coding: utf-8 -*-
"""
Marketplace and P2P trading service
"""

import datetime
import uuid
from models.database import db
from models.marketplace import MarketplaceItem, P2PListing
from models.customer import Customer

class MarketplaceService:
    
    def get_all_items(self):
        """Lấy tất cả items có sẵn trong marketplace"""
        try:
            items = MarketplaceItem.query.filter_by(is_active=True).all()
            items_data = []
            for item in items:
                items_data.append({
                    'id': item.id,
                    'name': item.name,
                    'description': item.description,
                    'price_svt': float(item.price_svt),
                    'quantity': item.quantity,
                    'partner_brand': item.partner_brand,
                    'image_url': item.image_url,
                    'created_at': item.created_at.isoformat()
                })
            return items_data
        except Exception as e:
            print(f"Error getting marketplace items: {e}")
            return []
    
    def purchase_item(self, customer_id, item_id, quantity=1):
        """Mua item từ marketplace"""
        try:
            if not customer_id:
                return {'success': False, 'error': 'Customer ID required'}
            
            # Kiểm tra item tồn tại
            item = MarketplaceItem.query.get(item_id)
            if not item or not item.is_active:
                return {'success': False, 'error': 'Item not found or inactive'}
            
            # Kiểm tra số lượng
            if item.quantity < quantity:
                return {'success': False, 'error': 'Insufficient quantity'}
            
            # Tính tổng giá
            total_cost = float(item.price_svt) * quantity
            
            # Kiểm tra số dư SVT của customer
            current_balance = self._get_customer_svt_balance(customer_id)
            if current_balance < total_cost:
                return {'success': False, 'error': 'Insufficient SVT balance'}
            
            # Thực hiện giao dịch
            # Sử dụng SQLAlchemy ORM để tạo transaction record
            try:
                from models.transactions import TokenTransaction

                # Tạo transaction record mới
                transaction = TokenTransaction(
                    customer_id=customer_id,
                    transaction_type="marketplace_purchase",
                    amount=-total_cost,
                    description=f"Mua {quantity}x {item.name}",
                    tx_hash=f"0x{uuid.uuid4().hex}",
                    block_number=1000000
                )

                db.session.add(transaction)
                db.session.flush()  # Flush để đảm bảo transaction được tạo trước khi commit

            except Exception as tx_error:
                print(f" Error creating transaction: {tx_error}")
                db.session.rollback()
                return {'success': False, 'error': 'Failed to process payment'}
            
            # Giảm số lượng item
            item.quantity -= quantity
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Đã mua {quantity}x {item.name} thành công',
                'total_cost': total_cost,
                'remaining_balance': current_balance - total_cost
            }
            
        except Exception as e:
            db.session.rollback()
            print(f" Error purchasing item: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_all_p2p_listings(self):
        """Lấy danh sách tin đăng P2P"""
        try:
            listings = P2PListing.query.filter_by(status='active').order_by(P2PListing.created_at.desc()).all()
            
            listings_data = []
            for listing in listings:
                # Lấy thông tin người bán
                seller = Customer.query.filter_by(customer_id=listing.seller_customer_id).first()
                
                listings_data.append({
                    'id': listing.id,
                    'item_name': listing.item_name,
                    'description': listing.description,
                    'price_svt': float(listing.price_svt),
                    'seller': {
                        'customer_id': listing.seller_customer_id,
                        'name': seller.name if seller else 'Unknown'
                    },
                    'status': listing.status,
                    'created_at': listing.created_at.isoformat()
                })
            
            return listings_data
            
        except Exception as e:
            print(f"Error getting P2P listings: {e}")
            return []
    
    def create_p2p_listing(self, seller_customer_id, item_name, description, price_svt):
        """Tạo tin đăng P2P mới"""
        try:
            if not seller_customer_id:
                return {'success': False, 'error': 'Seller customer ID required'}
            
            if not item_name or not price_svt:
                return {'success': False, 'error': 'Item name and price required'}
            
            listing = P2PListing(
                seller_customer_id=seller_customer_id,
                item_name=item_name,
                description=description or '',
                price_svt=price_svt,
                status='active'
            )
            
            db.session.add(listing)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Tin đăng P2P đã được tạo thành công',
                'listing_id': listing.id
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating P2P listing: {e}")
            return {'success': False, 'error': str(e)}
    
    def _get_customer_svt_balance(self, customer_id):
        """Helper: Tính số dư SVT của customer"""
        try:
            # Use SQLAlchemy ORM instead of raw SQL for better error handling
            from models.transactions import TokenTransaction

            # Get all transactions for this customer
            transactions = TokenTransaction.query.filter_by(customer_id=customer_id).all()

            # Calculate balance
            balance = sum(float(t.amount) for t in transactions)

            print(f"✅ Customer {customer_id} SVT balance: {balance}")
            return balance

        except Exception as e:
            print(f"❌ Error getting SVT balance: {e}")
            # Fallback to raw SQL if ORM fails
            try:
                from models.database import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM token_transactions WHERE customer_id = %s",
                    (customer_id,)
                )
                result = cursor.fetchone()
                balance = float(result[0]) if result and result[0] is not None else 0
                cursor.close()
                conn.close()
                print(f"✅ Fallback - Customer {customer_id} SVT balance: {balance}")
                return balance
            except Exception as fallback_error:
                print(f"❌ Fallback also failed: {fallback_error}")
                return 0
