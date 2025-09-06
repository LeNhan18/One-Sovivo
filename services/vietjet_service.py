# services/vietjet_service.py
# -*- coding: utf-8 -*-
"""
Vietjet flight booking service
"""

import datetime
import uuid
import random
from models import db, Customer, VietjetFlight, TokenTransaction

class VietjetService:
    
    def book_flight(self, customer_id, origin, destination, flight_date, ticket_class='economy', booking_value=None):
        """Đặt vé máy bay Vietjet"""
        try:
            # Kiểm tra customer tồn tại
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            # Validate input
            if not all([origin, destination, flight_date]):
                return {'success': False, 'error': 'Missing required flight information'}
            
            # Parse flight date
            try:
                if isinstance(flight_date, str):
                    flight_date = datetime.datetime.strptime(flight_date, '%Y-%m-%d')
            except ValueError:
                return {'success': False, 'error': 'Invalid flight date format. Use YYYY-MM-DD'}
            
            # Calculate booking value if not provided
            if booking_value is None:
                booking_value = self._calculate_flight_price(origin, destination, ticket_class)
            
            # Create flight booking
            flight = VietjetFlight(
                flight_id=f"VJ{uuid.uuid4().hex[:8].upper()}",
                customer_id=customer_id,
                flight_date=flight_date,
                origin=origin.upper(),
                destination=destination.upper(),
                ticket_class=ticket_class,
                booking_value=booking_value
            )
            db.session.add(flight)
            
            # Award SVT tokens for booking
            svt_reward = self._calculate_flight_svt_reward(booking_value, ticket_class)
            if svt_reward > 0:
                svt_tx = TokenTransaction(
                    customer_id=customer_id,
                    transaction_type="flight_booking_reward",
                    amount=svt_reward,
                    description=f"Thưởng SVT cho đặt vé {origin}-{destination}",
                    tx_hash=f"0x{uuid.uuid4().hex}",
                    block_number=random.randint(1000000, 2000000)
                )
                db.session.add(svt_tx)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Đặt vé thành công từ {origin} đến {destination}',
                'flight_info': {
                    'flight_id': flight.flight_id,
                    'origin': flight.origin,
                    'destination': flight.destination,
                    'flight_date': flight.flight_date.strftime('%Y-%m-%d'),
                    'ticket_class': flight.ticket_class,
                    'booking_value': float(flight.booking_value)
                },
                'svt_reward': svt_reward
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error booking flight: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_booking_history(self, customer_id):
        """Lấy lịch sử đặt vé của khách hàng"""
        try:
            flights = VietjetFlight.query.filter_by(
                customer_id=customer_id
            ).order_by(VietjetFlight.flight_date.desc()).all()
            
            history = []
            for flight in flights:
                history.append({
                    'flight_id': flight.flight_id,
                    'origin': flight.origin,
                    'destination': flight.destination,
                    'flight_date': flight.flight_date.strftime('%Y-%m-%d'),
                    'ticket_class': flight.ticket_class,
                    'booking_value': float(flight.booking_value),
                    'booking_date': flight.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
            
            # Calculate summary statistics
            total_flights = len(flights)
            total_spending = sum(float(f.booking_value) for f in flights)
            business_flights = len([f for f in flights if f.ticket_class == 'business'])
            
            return {
                'flights': history,
                'summary': {
                    'total_flights': total_flights,
                    'total_spending': total_spending,
                    'business_flights': business_flights,
                    'is_frequent_flyer': total_flights >= 10,
                    'average_spending': total_spending / total_flights if total_flights > 0 else 0
                }
            }
            
        except Exception as e:
            print(f"❌ Error getting booking history: {e}")
            return {'flights': [], 'summary': {}}
    
    def get_flight_routes(self):
        """Lấy danh sách tuyến bay có sẵn"""
        return [
            {'code': 'SGN', 'name': 'Hồ Chí Minh', 'country': 'Vietnam'},
            {'code': 'HAN', 'name': 'Hà Nội', 'country': 'Vietnam'},
            {'code': 'DAD', 'name': 'Đà Nẵng', 'country': 'Vietnam'},
            {'code': 'CXR', 'name': 'Nha Trang', 'country': 'Vietnam'},
            {'code': 'PQC', 'name': 'Phú Quốc', 'country': 'Vietnam'},
            {'code': 'BKK', 'name': 'Bangkok', 'country': 'Thailand'},
            {'code': 'SIN', 'name': 'Singapore', 'country': 'Singapore'},
            {'code': 'KUL', 'name': 'Kuala Lumpur', 'country': 'Malaysia'},
            {'code': 'MNL', 'name': 'Manila', 'country': 'Philippines'},
            {'code': 'ICN', 'name': 'Seoul', 'country': 'South Korea'}
        ]
    
    def search_flights(self, origin, destination, departure_date, return_date=None):
        """Tìm kiếm chuyến bay (mock data)"""
        try:
            # Mock flight search results
            flights = []
            base_price = self._calculate_flight_price(origin, destination, 'economy')
            
            # Generate some mock flights for the day
            for i in range(3):
                departure_time = f"{6 + i * 4:02d}:{random.randint(0, 5) * 10:02d}"
                arrival_time = f"{8 + i * 4:02d}:{random.randint(0, 5) * 10:02d}"
                
                flights.append({
                    'flight_number': f"VJ{100 + i * 10}",
                    'origin': origin.upper(),
                    'destination': destination.upper(),
                    'departure_date': departure_date,
                    'departure_time': departure_time,
                    'arrival_time': arrival_time,
                    'aircraft': 'Airbus A321',
                    'prices': {
                        'economy': base_price,
                        'business': base_price * 2.5
                    },
                    'available_seats': {
                        'economy': random.randint(50, 180),
                        'business': random.randint(5, 20)
                    }
                })
            
            return {
                'success': True,
                'origin': origin.upper(),
                'destination': destination.upper(),
                'departure_date': departure_date,
                'flights': flights
            }
            
        except Exception as e:
            print(f"❌ Error searching flights: {e}")
            return {'success': False, 'error': str(e)}
    
    def _calculate_flight_price(self, origin, destination, ticket_class):
        """Helper: Tính giá vé dựa trên tuyến bay"""
        # Base prices for different route types
        domestic_routes = ['SGN', 'HAN', 'DAD', 'CXR', 'PQC']
        
        if origin in domestic_routes and destination in domestic_routes:
            # Domestic flight
            base_price = 1500000
        else:
            # International flight
            base_price = 3500000
        
        # Class multipliers
        if ticket_class == 'business':
            base_price *= 2.5
        elif ticket_class == 'premium_economy':
            base_price *= 1.5
        
        # Add some randomness
        variation = random.uniform(0.8, 1.2)
        return int(base_price * variation)
    
    def _calculate_flight_svt_reward(self, booking_value, ticket_class):
        """Helper: Tính SVT reward cho đặt vé"""
        # Base reward: 1 SVT per 10,000 VND
        base_reward = booking_value / 10000
        
        # Bonus for business class
        if ticket_class == 'business':
            base_reward *= 2
        
        return int(base_reward)
