# services/vietjet_service.py
# -*- coding: utf-8 -*-
"""
Vietjet flight booking service
"""

import datetime
import uuid
import random
from models.database import db
from models.flights import VietjetFlight
import models.transactions as tx_models


def _TokenTransaction():
    return getattr(tx_models, 'TokenTransaction', None)


class VietjetService:

    def book_flight(
        self,
        customer_id,
        origin="HAN",
        destination="SGN",
        flight_date=None,
        ticket_class="economy",
        booking_value=2500000,
        passengers=1
    ):
        try:
            print(f"🔍 VietjetService.book_flight called with customer_id={customer_id}")

            if not customer_id:
                return {"success": False, "message": "customer_id is required"}

            # Sinh flight_id
            import time
            flight_id = f"VJ{int(time.time() * 1000)}"
            print(f"🔍 Generated flight_id: {flight_id}")

            # Parse flight_date an toàn
            if flight_date:
                try:
                    if isinstance(flight_date, str):
                        flight_datetime = datetime.datetime.strptime(flight_date, "%Y-%m-%d")
                    elif isinstance(flight_date, datetime.datetime):
                        flight_datetime = flight_date
                    else:
                        raise ValueError("flight_date phải là chuỗi 'YYYY-MM-DD' hoặc datetime object")
                except Exception as e:
                    return {"success": False, "message": f"Ngày bay không hợp lệ: {str(e)}"}
            else:
                flight_datetime = datetime.datetime.now() + datetime.timedelta(days=random.randint(7, 30))

            print(f"🔍 Flight datetime: {flight_datetime}")
            print(f"🔍 About to create VietjetFlight object...")

            # Tạo booking
            new_flight = VietjetFlight(
                flight_id=flight_id,
                customer_id=customer_id,
                flight_date=flight_datetime,
                origin=origin,
                destination=destination,
                ticket_class=ticket_class,
                booking_value=booking_value * passengers,
            )
            print(f"🔍 VietjetFlight object created: {new_flight}")
            print(f"🔍 About to add to db.session...")

            db.session.add(new_flight)
            print(f"🔍 Added to session, about to calculate SVT reward...")

            # Tính SVT reward dựa trên route
            if origin in ["HAN", "SGN", "DAD"] and destination in ["HAN", "SGN", "DAD"]:
                svt_reward = 500  # Domestic
            else:
                svt_reward = 1200  # International

            # Thêm SVT token transaction (dynamic model access)
            TTx = _TokenTransaction()
            if not TTx:
                raise RuntimeError("TokenTransaction model not initialized")

            token_tx = TTx(
                customer_id=customer_id,
                transaction_type="service_reward",
                amount=svt_reward,
                description=f"Vietjet flight booking: {origin}-{destination}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1000000, 2000000),
            )
            db.session.add(token_tx)

            db.session.commit()

            return {
                "success": True,
                "message": f"Đặt vé {origin}-{destination} thành công!",
                "flight_id": flight_id,
                "svt_reward": svt_reward,
                "flight_details": {
                    "origin": origin,
                    "destination": destination,
                    "ticket_class": ticket_class,
                    "booking_value": booking_value * passengers,
                    "flight_date": flight_datetime.strftime("%Y-%m-%d"),
                },
            }

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error booking flight: {repr(e)}")
            return {"success": False, "message": f"Lỗi đặt vé: {str(e)}"}

    def get_booking_history(self, customer_id):
        """Lấy lịch sử đặt vé của khách hàng"""
        try:
            flights = (
                VietjetFlight.query.filter_by(customer_id=customer_id)
                .order_by(VietjetFlight.flight_date.desc())
                .all()
            )

            flight_data = []
            for flight in flights:
                flight_data.append({
                    "flight_id": flight.flight_id,
                    "flight_date": flight.flight_date.strftime("%Y-%m-%d"),
                    "origin": flight.origin,
                    "destination": flight.destination,
                    "ticket_class": flight.ticket_class,
                    "booking_value": float(flight.booking_value),
                    "created_at": flight.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                })

            # Tính thống kê
            total_flights = len(flights)
            total_spending = sum(float(f.booking_value) for f in flights)
            business_flights = sum(1 for f in flights if f.ticket_class == "business")

            return {
                "success": True,
                "customer_id": customer_id,
                "flights": flight_data,
                "statistics": {
                    "total_flights": total_flights,
                    "total_spending": total_spending,
                    "business_flights": business_flights,
                    "favorite_route": f"{flights[0].origin}-{flights[0].destination}" if flights else "Chưa có",
                },
            }

        except Exception as e:
            print(f"❌ Error getting booking history: {e}")
            return {"success": False, "message": f"Lỗi lấy lịch sử: {str(e)}"}

    def get_flight_routes(self):
        """Lấy danh sách tuyến bay có sẵn"""
        return [
            {"code": "SGN", "name": "Hồ Chí Minh", "country": "Vietnam"},
            {"code": "HAN", "name": "Hà Nội", "country": "Vietnam"},
            {"code": "DAD", "name": "Đà Nẵng", "country": "Vietnam"},
            {"code": "CXR", "name": "Nha Trang", "country": "Vietnam"},
            {"code": "PQC", "name": "Phú Quốc", "country": "Vietnam"},
            {"code": "BKK", "name": "Bangkok", "country": "Thailand"},
            {"code": "SIN", "name": "Singapore", "country": "Singapore"},
            {"code": "KUL", "name": "Kuala Lumpur", "country": "Malaysia"},
            {"code": "MNL", "name": "Manila", "country": "Philippines"},
            {"code": "ICN", "name": "Seoul", "country": "South Korea"},
        ]

    def search_flights(self, origin, destination, departure_date, return_date=None):
        """Tìm kiếm chuyến bay (mock data)"""
        try:
            flights = []
            base_price = self._calculate_flight_price(origin, destination, "economy")

            for i in range(3):
                departure_time = f"{6 + i * 4:02d}:{random.randint(0, 5) * 10:02d}"
                arrival_time = f"{8 + i * 4:02d}:{random.randint(0, 5) * 10:02d}"

                flights.append({
                    "flight_number": f"VJ{100 + i * 10}",
                    "origin": origin.upper(),
                    "destination": destination.upper(),
                    "departure_date": departure_date,
                    "departure_time": departure_time,
                    "arrival_time": arrival_time,
                    "aircraft": "Airbus A321",
                    "prices": {
                        "economy": base_price,
                        "business": base_price * 2.5,
                    },
                    "available_seats": {
                        "economy": random.randint(50, 180),
                        "business": random.randint(5, 20),
                    },
                })

            return {
                "success": True,
                "origin": origin.upper(),
                "destination": destination.upper(),
                "departure_date": departure_date,
                "flights": flights,
            }

        except Exception as e:
            print(f"❌ Error searching flights: {e}")
            return {"success": False, "error": str(e)}

    def _calculate_flight_price(self, origin, destination, ticket_class):
        """Helper: Tính giá vé dựa trên tuyến bay"""
        domestic_routes = ["SGN", "HAN", "DAD", "CXR", "PQC"]

        if origin in domestic_routes and destination in domestic_routes:
            base_price = 1500000  # Domestic flight
        else:
            base_price = 3500000  # International flight

        if ticket_class == "business":
            base_price *= 2.5
        elif ticket_class == "premium_economy":
            base_price *= 1.5

        variation = random.uniform(0.8, 1.2)
        return int(base_price * variation)

    def _calculate_flight_svt_reward(self, booking_value, ticket_class):
        """Helper: Tính SVT reward cho đặt vé"""
        base_reward = booking_value / 10000
        if ticket_class == "business":
            base_reward *= 2
        return int(base_reward)
