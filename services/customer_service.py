# services/customer_service.py

class CustomerService:
    def __init__(self, db, config):
        self.db = db
        self.config = config
        self.models = {}

    def set_models(self, model_classes):
        """Set model classes after initialization"""
        self.models = model_classes

    def get_customer_360_profile(self, customer_id):
        """Lấy hồ sơ 360° từ MySQL."""
        Customer = self.models.get('Customer')
        HDBankTransaction = self.models.get('HDBankTransaction')
        VietjetFlight = self.models.get('VietjetFlight')
        ResortBooking = self.models.get('ResortBooking')

        if not Customer:
            # Return mock data if Customer model is not available
            return self._get_mock_customer_profile(customer_id)

        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            # Return mock data if customer not found
            return self._get_mock_customer_profile(customer_id)

        # HDBank summary
        hdbank_transactions = HDBankTransaction.query.filter_by(
            customer_id=customer_id).all() if HDBankTransaction else []
        hdbank_summary = {}
        if hdbank_transactions:
            balances = [float(t.balance) for t in hdbank_transactions]
            amounts = [float(t.amount) for t in hdbank_transactions]
            # Sắp xếp theo thời gian để lấy balance cuối cùng
            sorted_transactions = sorted(hdbank_transactions, key=lambda x: x.transaction_date)
            current_balance = float(sorted_transactions[-1].balance) if sorted_transactions else 0
            
            hdbank_summary = {
                'total_transactions': len(hdbank_transactions),
                'current_balance': current_balance,  # Số dư hiện tại
                'average_balance': sum(balances) / len(balances),  # Số dư trung bình
                'total_credit_last_3m': sum(
                    float(t.amount) for t in hdbank_transactions if t.transaction_type == 'credit'),
                'total_debit_last_3m': sum(
                    float(t.amount) for t in hdbank_transactions if t.transaction_type == 'debit')
            }

        # Vietjet summary
        vietjet_flights = VietjetFlight.query.filter_by(customer_id=customer_id).all() if VietjetFlight else []
        vietjet_summary = {}
        if vietjet_flights:
            vietjet_summary = {
                'total_flights_last_year': len(vietjet_flights),
                'total_spending': sum(float(f.booking_value) for f in vietjet_flights),
                'is_business_flyer': any(f.ticket_class == 'business' for f in vietjet_flights),
                'favorite_route': f"{vietjet_flights[0].origin}-{vietjet_flights[0].destination}" if vietjet_flights else "N/A"
            }

        # Resort summary
        resort_bookings = ResortBooking.query.filter_by(customer_id=customer_id).all() if ResortBooking else []
        resort_summary = {}
        if resort_bookings:
            resort_summary = {
                'total_bookings': len(resort_bookings),
                'total_nights_stayed': sum(r.nights_stayed for r in resort_bookings),
                'total_spending': sum(float(r.booking_value) for r in resort_bookings),
                'favorite_resort': resort_bookings[0].resort_name if resort_bookings else "N/A"
            }

        return {
            'basic_info': {
                'customer_id': customer.customer_id,
                'name': customer.name,
                'age': customer.age,
                'gender': customer.gender,
                'job': customer.job,
                'city': customer.city
            },
            'hdbank_summary': hdbank_summary,
            'vietjet_summary': vietjet_summary,
            'resort_summary': resort_summary
        }

    def search_customers(self, query):
        """Tìm kiếm khách hàng theo từ khóa."""
        q = query.strip().lower()
        if not q:
            return []

        try:
            q_id = int(q)
            customers = self.Customer.query.filter(
                (self.Customer.customer_id == q_id) |
                (self.Customer.name.ilike(f'%{q}%'))
            ).limit(20).all()
        except ValueError:
            customers = self.Customer.query.filter(self.Customer.name.ilike(f'%{q}%')).limit(20).all()

        return [
            {
                'customer_id': customer.customer_id,
                'name': customer.name,
                'age': customer.age,
                'city': customer.city
            } for customer in customers
        ]

    def get_customer_suggestions(self):
        """API gợi ý khách hàng đáng chú ý."""
        try:
            Customer = self.models.get('Customer')
            HDBankTransaction = self.models.get('HDBankTransaction')
            VietjetFlight = self.models.get('VietjetFlight')
            ResortBooking = self.models.get('ResortBooking')

            if not Customer:
                return self._get_mock_suggestions()

            # Get customers with some basic info
            customers = Customer.query.limit(10).all()
            
            if not customers:
                return self._get_mock_suggestions()
            
            suggestions = []
            for customer in customers:
                # Skip if name is generic demo
                if customer.name and customer.name.strip() and customer.name.lower() not in ['demo customer', 'test customer', 'customer']:
                    # Calculate basic stats for suggestions
                    reason_parts = []
                    
                    # Check HDBank data
                    if HDBankTransaction:
                        hdbank_txs = HDBankTransaction.query.filter_by(customer_id=customer.customer_id).all()
                        if hdbank_txs:
                            avg_balance = sum(float(tx.balance) for tx in hdbank_txs) / len(hdbank_txs)
                            if avg_balance >= 100000000:
                                reason_parts.append("Số dư cao")
                    
                    # Check Vietjet data
                    if VietjetFlight:
                        flights = VietjetFlight.query.filter_by(customer_id=customer.customer_id).all()
                        if len(flights) >= 3:
                            reason_parts.append("Bay thường xuyên")
                        if any(f.ticket_class == 'business' for f in flights):
                            reason_parts.append("Khách hàng thương gia")
                    
                    # Check Resort data
                    if ResortBooking:
                        bookings = ResortBooking.query.filter_by(customer_id=customer.customer_id).all()
                        total_spending = sum(float(b.booking_value) for b in bookings)
                        if total_spending >= 10000000:
                            reason_parts.append("Chi tiêu resort cao")

                    suggestions.append({
                        'customer_id': customer.customer_id,
                        'name': customer.name,
                        'reason': ', '.join(reason_parts) or 'Khách hàng tiềm năng'
                    })

            # If no valid suggestions found, add mock data
            if not suggestions:
                suggestions = self._get_mock_suggestions()

            return suggestions[:5]  # Top 5 suggestions
            
        except Exception as e:
            print(f"❌ Error in get_customer_suggestions: {e}")
            return self._get_mock_suggestions()

    def _get_mock_suggestions(self):
        """Generate mock customer suggestions with realistic Vietnamese names"""
        return [
            {'customer_id': 1001, 'name': 'Nguyễn Văn Minh', 'reason': 'Khách hàng VIP - Bay thường xuyên'},
            {'customer_id': 1002, 'name': 'Trần Thị Hương', 'reason': 'Số dư cao - Khách hàng thương gia'},
            {'customer_id': 1003, 'name': 'Lê Hoàng Nam', 'reason': 'Chi tiêu resort cao'},
            {'customer_id': 1004, 'name': 'Phạm Thị Lan', 'reason': 'Bay thường xuyên - Tích lũy miles'},
            {'customer_id': 1005, 'name': 'Võ Đức Thành', 'reason': 'Khách hàng tiềm năng'}
        ]

    def _get_mock_customer_profile(self, customer_id):
        """Generate mock customer profile with Vietnamese data"""
        # Map customer_id to predefined profiles
        profiles = {
            1: {'name': 'Nguyễn Văn Minh', 'age': 35, 'gender': 'Nam', 'job': 'Giám đốc kinh doanh', 'city': 'Hồ Chí Minh'},
            1001: {'name': 'Nguyễn Văn Minh', 'age': 35, 'gender': 'Nam', 'job': 'Giám đốc kinh doanh', 'city': 'Hồ Chí Minh'},
            1002: {'name': 'Trần Thị Hương', 'age': 28, 'gender': 'Nữ', 'job': 'Chuyên viên tài chính', 'city': 'Hà Nội'},
            1003: {'name': 'Lê Hoàng Nam', 'age': 42, 'gender': 'Nam', 'job': 'Doanh nhân', 'city': 'Đà Nẵng'},
            1004: {'name': 'Phạm Thị Lan', 'age': 31, 'gender': 'Nữ', 'job': 'Marketing Manager', 'city': 'Hồ Chí Minh'},
            1005: {'name': 'Võ Đức Thành', 'age': 25, 'gender': 'Nam', 'job': 'Kỹ sư phần mềm', 'city': 'Hà Nội'}
        }
        
        profile_data = profiles.get(customer_id, profiles[1])  # Default to profile 1
        
        return {
            'basic_info': {
                'customer_id': customer_id,
                'name': profile_data['name'],
                'age': profile_data['age'],
                'gender': profile_data['gender'],
                'job': profile_data['job'],
                'city': profile_data['city']
            },
            'hdbank_summary': {
                'total_transactions': 45,
                'average_balance': 15000000,
                'total_credit_last_3m': 25000000,
                'total_debit_last_3m': 18000000
            },
            'vietjet_summary': {
                'total_flights_last_year': 8,
                'total_spending': 12000000,
                'is_business_flyer': True,
                'favorite_route': 'SGN-HAN'
            },
            'resort_summary': {
                'total_bookings': 3,
                'total_nights_stayed': 12,
                'total_spending': 8500000,
                'favorite_resort': 'Vinpearl Phú Quốc'
            },
            'achievements_count': 5,
            'token_balance': 2500.0
        }