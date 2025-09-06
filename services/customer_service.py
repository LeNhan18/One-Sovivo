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
            return None
            
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return None

        # HDBank summary
        hdbank_transactions = HDBankTransaction.query.filter_by(customer_id=customer_id).all() if HDBankTransaction else []
        hdbank_summary = {}
        if hdbank_transactions:
            balances = [float(t.balance) for t in hdbank_transactions]
            amounts = [float(t.amount) for t in hdbank_transactions]
            hdbank_summary = {
                'total_transactions': len(hdbank_transactions),
                'average_balance': sum(balances) / len(balances),
                'total_credit_last_3m': sum(float(t.amount) for t in hdbank_transactions if t.transaction_type == 'credit'),
                'total_debit_last_3m': sum(float(t.amount) for t in hdbank_transactions if t.transaction_type == 'debit')
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
        suggestions_query = """
            SELECT c.customer_id, c.name,
                   COALESCE(AVG(h.balance), 0) as avg_balance,
                   COALESCE(COUNT(DISTINCT v.flight_id), 0) as total_flights,
                   COALESCE(MAX(CASE WHEN v.ticket_class = 'business' THEN 1 ELSE 0 END), 0) as is_business_flyer,
                   COALESCE(SUM(r.booking_value), 0) as total_resort_spending
            FROM customers c
            LEFT JOIN hdbank_transactions h ON c.customer_id = h.customer_id
            LEFT JOIN vietjet_flights v ON c.customer_id = v.customer_id
            LEFT JOIN resort_bookings r ON c.customer_id = r.customer_id
            GROUP BY c.customer_id, c.name
            ORDER BY (avg_balance * 0.4 + total_flights * 1000000 + is_business_flyer * 50000000 + total_resort_spending * 0.3) DESC
            LIMIT 5
        """

        try:
            result = self.db.session.execute(self.db.text(suggestions_query))
            suggestions = []
            for row in result:
                reason_parts = []
                if row.avg_balance >= 100000000:
                    reason_parts.append("Số dư cao")
                if row.is_business_flyer:
                    reason_parts.append("Khách hàng thương gia")
                if row.total_flights >= 3:
                    reason_parts.append("Bay thường xuyên")
                if row.total_resort_spending >= 10000000:
                    reason_parts.append("Chi tiêu resort cao")

                suggestions.append({
                    'customer_id': row.customer_id,
                    'name': row.name,
                    'reason': ', '.join(reason_parts) or 'Khách hàng tiềm năng'
                })

            return suggestions
        except Exception as e:
            print(f"❌ Error in suggestions: {e}")
            # Fallback to simple query
            customers = self.Customer.query.limit(5).all()
            return [{
                'customer_id': c.customer_id,
                'name': c.name,
                'reason': 'Khách hàng mẫu'
            } for c in customers]
