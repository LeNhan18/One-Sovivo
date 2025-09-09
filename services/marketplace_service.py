# services/marketplace_service.py
# -*- coding: utf-8 -*-
"""
Marketplace and P2P trading service
"""

import datetime
import uuid
from models import db, MarketplaceItem, P2PListing, Customer, TokenTransaction

class MarketplaceService:
    
    def get_all_items(self):
        """Lấy tất cả items có sẵn trong marketplace"""
        try:
            items = MarketplaceItem.query.filter_by(is_active=True).all()
            return [{
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'price_svt': float(item.price_svt),
                'quantity': item.quantity,
                'partner_brand': item.partner_brand,
                'image_url': item.image_url
            } for item in items]
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
            # Trừ SVT từ customer
            debit_tx = TokenTransaction(
                customer_id=customer_id,
                transaction_type="marketplace_purchase",
                amount=-total_cost,
                description=f"Mua {quantity}x {item.name}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=1000000
            )
            db.session.add(debit_tx)
            
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
    
    def get_p2p_listings(self):
        """Lấy danh sách tin đăng P2P"""
        try:
            listings = db.session.query(P2PListing, Customer).join(
                Customer, P2PListing.seller_customer_id == Customer.customer_id
            ).filter(P2PListing.status == 'active').all()
            
            return [{
                'id': listing.id,
                'item_name': listing.item_name,
                'description': listing.description,
                'price_svt': float(listing.price_svt),
                'seller_name': customer.name,
                'created_at': listing.created_at.strftime('%Y-%m-%d %H:%M:%S')
            } for listing, customer in listings]
            
        except Exception as e:
            print(f" Error getting P2P listings: {e}")
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
            transactions = TokenTransaction.query.filter_by(customer_id=customer_id).all()
            return sum(float(tx.amount) for tx in transactions)
        except Exception as e:
            print(f"❌ Error getting SVT balance: {e}")
            return 0
