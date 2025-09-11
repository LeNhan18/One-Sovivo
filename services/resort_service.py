# services/resort_service.py
# -*- coding: utf-8 -*-
"""
Resort booking service
"""

import datetime
import uuid
import random
from models.database import db
from models.customer import Customer
from models.resorts import ResortBooking
import models.transactions as tx_models


def _TokenTransaction():
    return getattr(tx_models, 'TokenTransaction', None)

class ResortService:
    
    def book_room(self, customer_id, nights=2, room_type='deluxe'):
        """Đặt phòng Resort và lưu vào database"""
        try:
            if not customer_id:
                return {
                    "success": False,
                    "message": "customer_id is required"
                }

            # Tạo booking ID
            import time
            booking_id = f"RST{int(time.time())}"

            # Tính giá phòng
            room_prices = {
                'standard': 2000000,
                'deluxe': 3500000,
                'suite': 6000000
            }
            total_price = room_prices.get(room_type, 3500000) * nights

            # Thêm resort booking vào database
            resort_booking = ResortBooking(
                customer_id=customer_id,
                booking_id=booking_id,
                resort_name=f"Sovico Premium Resort - {room_type.title()} Room",
                booking_date=datetime.datetime.now(),
                nights_stayed=nights,
                booking_value=total_price
            )
            db.session.add(resort_booking)

            # Tính SVT reward
            svt_reward = nights * 400  # 400 SVT per night

            # Thêm SVT token transaction
            TTx = _TokenTransaction()
            if not TTx:
                raise RuntimeError("TokenTransaction model not initialized")
            token_tx = TTx(
                customer_id=customer_id,
                transaction_type="service_reward",
                amount=svt_reward,
                description=f"Resort booking reward: {nights} nights {room_type}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1000000, 2000000)
            )
            db.session.add(token_tx)

            db.session.commit()

            return {
                "success": True,
                "message": f"Đặt phòng {room_type} {nights} đêm thành công!",
                "booking_id": booking_id,
                "svt_reward": svt_reward,
                "booking_details": {
                    "room_type": room_type,
                    "nights": nights,
                    "total_price": total_price
                }
            }

        except Exception as e:
            db.session.rollback()
            return {
                "success": False,
                "message": f"Lỗi đặt phòng: {str(e)}"
            }

    def book_spa(self, customer_id, spa_type='massage'):
        """Đặt dịch vụ Spa và lưu vào database"""
        try:
            if not customer_id:
                return {
                    "success": False,
                    "message": "customer_id is required"
                }

            # Tạo spa booking ID
            import time
            spa_booking_id = f"SPA{int(time.time())}"

            # Tính giá spa
            spa_prices = {
                'massage': 1500000,
                'facial': 1200000,
                'body_treatment': 2000000,
                'premium_package': 3500000
            }
            spa_price = spa_prices.get(spa_type, 1500000)

            # Thêm spa booking như một resort booking
            spa_booking = ResortBooking(
                customer_id=customer_id,
                booking_id=spa_booking_id,
                resort_name=f"Sovico Premium Spa - {spa_type.title()}",
                booking_date=datetime.datetime.now(),
                nights_stayed=0,  # Spa service, not overnight
                booking_value=spa_price
            )
            db.session.add(spa_booking)

            # SVT reward cho spa
            svt_reward = int(spa_price / 5000)  # 1 SVT per 5k VND

            # Thêm SVT token transaction
            TTx = _TokenTransaction()
            if not TTx:
                raise RuntimeError("TokenTransaction model not initialized")
            token_tx = TTx(
                customer_id=customer_id,
                transaction_type="service_reward",
                amount=svt_reward,
                description=f"Spa service reward: {spa_type}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1000000, 2000000)
            )
            db.session.add(token_tx)

            db.session.commit()

            return {
                "success": True,
                "message": f"Đặt dịch vụ {spa_type} thành công!",
                "booking_id": spa_booking_id,
                "svt_reward": svt_reward,
                "spa_details": {
                    "service": spa_type,
                    "price": spa_price
                }
            }

        except Exception as e:
            db.session.rollback()
            return {
                "success": False,
                "message": f"Lỗi đặt spa: {str(e)}"
            }
    
    def get_booking_history(self, customer_id):
        """Lấy lịch sử đặt phòng của khách hàng"""
        try:
            bookings = ResortBooking.query.filter_by(
                customer_id=customer_id
            ).order_by(ResortBooking.booking_date.desc()).all()
            
            history = []
            for booking in bookings:
                history.append({
                    'booking_id': booking.booking_id,
                    'resort_name': booking.resort_name,
                    'booking_date': booking.booking_date.strftime('%Y-%m-%d'),
                    'nights_stayed': booking.nights_stayed,
                    'booking_value': float(booking.booking_value),
                    'created_at': booking.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
            
            # Calculate summary statistics
            total_bookings = len(bookings)
            total_spending = sum(float(b.booking_value) for b in bookings)
            total_nights = sum(b.nights_stayed for b in bookings)
            
            return {
                'bookings': history,
                'summary': {
                    'total_bookings': total_bookings,
                    'total_spending': total_spending,
                    'total_nights': total_nights,
                    'average_spending': total_spending / total_bookings if total_bookings > 0 else 0,
                    'favorite_resort': self._get_favorite_resort(bookings)
                }
            }
            
        except Exception as e:
            print(f"❌ Error getting booking history: {e}")
            return {'bookings': [], 'summary': {}}
    
    def get_available_resorts(self):
        """Lấy danh sách resort có sẵn"""
        return [
            {
                'name': 'Dragon Hill Resort Sovico',
                'location': 'Đà Nẵng',
                'rating': 5,
                'amenities': ['Pool', 'Spa', 'Golf', 'Beach Access'],
                'room_types': [
                    {'type': 'Standard', 'price_per_night': 2000000},
                    {'type': 'Deluxe', 'price_per_night': 3500000},
                    {'type': 'Suite', 'price_per_night': 5000000}
                ]
            },
            {
                'name': 'Sovico Beach Resort',
                'location': 'Phú Quốc',
                'rating': 5,
                'amenities': ['Beach', 'Spa', 'Restaurant', 'Water Sports'],
                'room_types': [
                    {'type': 'Ocean View', 'price_per_night': 2500000},
                    {'type': 'Beach Villa', 'price_per_night': 4000000},
                    {'type': 'Presidential Suite', 'price_per_night': 8000000}
                ]
            },
            {
                'name': 'Sovico Mountain Lodge',
                'location': 'Sapa',
                'rating': 4,
                'amenities': ['Mountain View', 'Hiking', 'Local Tours', 'Restaurant'],
                'room_types': [
                    {'type': 'Standard', 'price_per_night': 1500000},
                    {'type': 'Mountain View', 'price_per_night': 2200000},
                    {'type': 'Premium Lodge', 'price_per_night': 3500000}
                ]
            }
        ]
    
    def get_spa_services(self):
        """Lấy danh sách dịch vụ spa"""
        return [
            {
                'name': 'Traditional Vietnamese Massage',
                'duration': '60 minutes',
                'price': 800000,
                'description': 'Relaxing full body massage with traditional techniques'
            },
            {
                'name': 'Hot Stone Therapy',
                'duration': '90 minutes',
                'price': 1200000,
                'description': 'Deep relaxation with heated volcanic stones'
            },
            {
                'name': 'Couples Spa Package',
                'duration': '120 minutes',
                'price': 2500000,
                'description': 'Romantic spa experience for two people'
            },
            {
                'name': 'Detox Body Wrap',
                'duration': '75 minutes',
                'price': 1000000,
                'description': 'Purifying body treatment with natural ingredients'
            },
            {
                'name': 'Facial Treatment Premium',
                'duration': '60 minutes',
                'price': 900000,
                'description': 'Advanced facial care with luxury products'
            }
        ]
    
    def search_availability(self, resort_name, check_in_date, check_out_date, guests=2):
        """Tìm kiếm phòng trống (mock data)"""
        try:
            # Parse dates
            if isinstance(check_in_date, str):
                check_in_date = datetime.datetime.strptime(check_in_date, '%Y-%m-%d')
            if isinstance(check_out_date, str):
                check_out_date = datetime.datetime.strptime(check_out_date, '%Y-%m-%d')
            
            nights = (check_out_date - check_in_date).days
            
            if nights <= 0:
                return {'success': False, 'error': 'Invalid date range'}
            
            # Mock availability data
            resorts = self.get_available_resorts()
            target_resort = next((r for r in resorts if r['name'] == resort_name), None)
            
            if not target_resort:
                return {'success': False, 'error': 'Resort not found'}
            
            # Generate availability for each room type
            availability = []
            for room_type in target_resort['room_types']:
                available_rooms = random.randint(1, 10)
                total_price = room_type['price_per_night'] * nights
                
                availability.append({
                    'room_type': room_type['type'],
                    'price_per_night': room_type['price_per_night'],
                    'total_price': total_price,
                    'available_rooms': available_rooms,
                    'max_guests': 2 if 'Standard' in room_type['type'] else 4
                })
            
            return {
                'success': True,
                'resort_name': resort_name,
                'check_in_date': check_in_date.strftime('%Y-%m-%d'),
                'check_out_date': check_out_date.strftime('%Y-%m-%d'),
                'nights': nights,
                'guests': guests,
                'availability': availability
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f"Lỗi tìm kiếm: {str(e)}"
            }
    
    def _calculate_resort_svt_reward(self, booking_value, nights_stayed):
        """Helper: Tính SVT reward cho booking resort"""
        # Base reward: 1 SVT per 5,000 VND
        base_reward = booking_value / 5000
        
        # Bonus for longer stays
        if nights_stayed >= 7:
            base_reward *= 1.5
        elif nights_stayed >= 3:
            base_reward *= 1.2
        
        return int(base_reward)
    
    def _get_favorite_resort(self, bookings):
        """Helper: Tìm resort được đặt nhiều nhất"""
        if not bookings:
            return 'N/A'
        
        resort_counts = {}
        for booking in bookings:
            resort_name = booking.resort_name
            resort_counts[resort_name] = resort_counts.get(resort_name, 0) + 1
        
        return max(resort_counts, key=resort_counts.get)
