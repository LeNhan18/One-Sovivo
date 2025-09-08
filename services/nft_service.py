# services/nft_service.py
# -*- coding: utf-8 -*-
"""
NFT and blockchain service
"""

import datetime
from models import db, Customer, Achievement, CustomerAchievement

# Import blockchain integration
try:
    from blockchain_simple import update_nft_on_blockchain, get_nft_metadata
    from blockchain_config import (
        evaluate_all_achievements,
        get_highest_rank_from_achievements,
        ACHIEVEMENT_CONFIG
    )
    BLOCKCHAIN_ENABLED = True
except ImportError:
    BLOCKCHAIN_ENABLED = False

class NFTService:
    
    def get_nft_passport(self, customer_id):
        """Lấy thông tin NFT passport của customer"""
        try:
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            # Lấy achievements của customer
            achievements_data = self.get_customer_achievements(customer_id)
            
            # Tính rank dựa trên achievements
            rank = self._calculate_customer_rank(achievements_data['achievements'])
            
            # NFT metadata
            nft_metadata = {
                'token_id': customer.nft_token_id or 0,
                'customer_id': customer_id,
                'customer_name': customer.name,
                'rank': rank,
                'total_achievements': achievements_data['total_achievements'],
                'achievements': achievements_data['achievements'][:5],  # Top 5 achievements
                'created_at': customer.created_at.isoformat() if customer.created_at else None,
                'last_updated': datetime.datetime.utcnow().isoformat()
            }
            
            # Nếu có blockchain integration, lấy metadata từ blockchain
            if BLOCKCHAIN_ENABLED and customer.nft_token_id:
                try:
                    blockchain_metadata = get_nft_metadata(customer.nft_token_id)
                    if blockchain_metadata:
                        nft_metadata.update(blockchain_metadata)
                except Exception as e:
                    print(f" Error getting blockchain metadata: {e}")
            
            return {
                'success': True,
                'nft_passport': nft_metadata
            }
            
        except Exception as e:
            print(f" Error getting NFT passport: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_customer_achievements(self, customer_id):
        """Lấy danh sách achievements của customer"""
        try:
            # Query tất cả achievements của customer
            customer_achievements = db.session.query(
                CustomerAchievement, Achievement
            ).join(Achievement).filter(
                CustomerAchievement.customer_id == customer_id
            ).all()
            
            achievements = []
            for ca, achievement in customer_achievements:
                achievements.append({
                    'id': achievement.id,
                    'name': achievement.name,
                    'description': achievement.description,
                    'badge_image_url': achievement.badge_image_url,
                    'unlocked_at': ca.unlocked_at.isoformat() if ca.unlocked_at else None
                })
            
            return {
                'achievements': achievements,
                'total_achievements': len(achievements)
            }
            
        except Exception as e:
            print(f" Error getting customer achievements: {e}")
            return {'achievements': [], 'total_achievements': 0}
    
    def update_nft_on_blockchain(self, token_id, customer_id, rank=None, badge=None):
        """Cập nhật NFT trên blockchain"""
        try:
            if not BLOCKCHAIN_ENABLED:
                return {'success': False, 'error': 'Blockchain integration not available'}
            
            # Nếu không có rank/badge, tự động tính toán
            if not rank or not badge:
                achievements_data = self.get_customer_achievements(customer_id)
                rank = rank or self._calculate_customer_rank(achievements_data['achievements'])
                badge = badge or f"{rank.lower()}_badge"
            
            # Cập nhật lên blockchain
            result = update_nft_on_blockchain(token_id, rank, badge)
            
            if result.get('success'):
                # Cập nhật database
                customer = Customer.query.filter_by(customer_id=customer_id).first()
                if customer:
                    customer.nft_token_id = token_id
                    customer.updated_at = datetime.datetime.utcnow()
                    db.session.commit()
                
                return {
                    'success': True,
                    'message': 'NFT updated on blockchain successfully',
                    'token_id': token_id,
                    'rank': rank,
                    'badge': badge
                }
            else:
                return {
                    'success': False,
                    'error': f"Failed to update blockchain: {result.get('error', 'Unknown error')}"
                }
                
        except Exception as e:
            print(f" Lỗi Cập nhật NFT Blockchain: {e}")
            return {'success': False, 'error': str(e)}
    
    def mint_nft_passport(self, customer_id):
        """Mint NFT passport mới cho customer"""
        try:
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            if customer.nft_token_id:
                return {'success': False, 'error': 'Customer already has NFT passport'}
            
            # Generate token ID
            import random
            token_id = random.randint(1000, 9999)
            
            # Tính rank dựa trên achievements hiện tại
            achievements_data = self.get_customer_achievements(customer_id)
            rank = self._calculate_customer_rank(achievements_data['achievements'])
            
            # Mint NFT trên blockchain (nếu có)
            if BLOCKCHAIN_ENABLED:
                try:
                    blockchain_result = update_nft_on_blockchain(token_id, rank, f"{rank.lower()}_badge")
                    if not blockchain_result.get('success'):
                        print(f"️ Blockchain mint failed, continuing with database only")
                except Exception as e:
                    print(f"️ Blockchain mint error: {e}")
            
            # Cập nhật database
            customer.nft_token_id = token_id
            customer.updated_at = datetime.datetime.utcnow()
            db.session.commit()
            
            return {
                'success': True,
                'message': 'NFT passport minted successfully',
                'token_id': token_id,
                'customer_id': customer_id,
                'rank': rank,
                'total_achievements': achievements_data['total_achievements']
            }
            
        except Exception as e:
            db.session.rollback()
            print(f" Error minting NFT passport: {e}")
            return {'success': False, 'error': str(e)}
    
    def evaluate_and_update_achievements(self, customer_id):
        """Đánh giá và cập nhật achievements tự động"""
        try:
            if not BLOCKCHAIN_ENABLED:
                return {'success': False, 'error': 'Achievement evaluation requires blockchain integration'}
            
            # Đánh giá achievements từ blockchain config
            achievements = evaluate_all_achievements(customer_id)
            
            # Cập nhật NFT nếu có achievements mới
            if achievements:
                highest_rank = get_highest_rank_from_achievements(achievements)
                
                customer = Customer.query.filter_by(customer_id=customer_id).first()
                if customer and customer.nft_token_id:
                    self.update_nft_on_blockchain(
                        customer.nft_token_id,
                        customer_id,
                        highest_rank,
                        f"{highest_rank.lower()}_badge"
                    )
            
            return {
                'success': True,
                'achievements_evaluated': len(achievements),
                'achievements': achievements
            }
            
        except Exception as e:
            print(f"❌ Error evaluating achievements: {e}")
            return {'success': False, 'error': str(e)}
    
    def _calculate_customer_rank(self, achievements):
        """Helper: Tính rank của customer dựa trên achievements"""
        try:
            if not achievements:
                return 'Bronze'
            
            # Đếm số achievements theo loại
            flight_achievements = len([a for a in achievements if 'Phi công' in a.get('name', '')])
            vip_achievements = len([a for a in achievements if 'VIP' in a.get('name', '')])
            travel_achievements = len([a for a in achievements if 'du lịch' in a.get('name', '')])
            
            total_achievements = len(achievements)
            
            # Logic tính rank
            if total_achievements >= 10 or flight_achievements >= 3 or vip_achievements >= 2:
                return 'Diamond'
            elif total_achievements >= 7 or flight_achievements >= 2 or vip_achievements >= 1:
                return 'Platinum'
            elif total_achievements >= 5 or flight_achievements >= 1 or travel_achievements >= 2:
                return 'Gold'
            elif total_achievements >= 3:
                return 'Silver'
            else:
                return 'Bronze'
                
        except Exception as e:
            print(f"❌ Error calculating rank: {e}")
            return 'Bronze'
