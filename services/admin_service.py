# services/admin_service.py
"""
Admin Service - Xử lý tất cả business logic cho Admin
"""

class AdminService:
    def __init__(self, db, config, blockchain_enabled=False):
        self.db = db
        self.config = config
        self.blockchain_enabled = blockchain_enabled
        self.models = {}

    def set_models(self, model_classes):
        """Set model classes after initialization"""
        self.models = model_classes

    def get_all_achievements(self):
        """Get all available achievements"""
        try:
            Achievement = self.models.get('Achievement')
            CustomerAchievement = self.models.get('CustomerAchievement')
            if not Achievement:
                return {'error': 'Achievement model not found'}, 500
                
            achievements = Achievement.query.all()
            achievement_list = []
            for ach in achievements:
                customer_count = 0
                if CustomerAchievement:
                    customer_count = CustomerAchievement.query.filter_by(achievement_id=ach.id).count()
                
                achievement_data = ach.to_dict()
                achievement_data['customer_count'] = customer_count
                achievement_list.append(achievement_data)
            
            return {
                'success': True,
                'achievements': achievement_list,
                'total': len(achievement_list)
            }
        except Exception as e:
            return {'error': str(e)}, 500

    def search_customers(self, query_param, limit=20):
        """Search customers by name or ID"""
        try:
            Customer = self.models.get('Customer')
            if not Customer:
                return {'error': 'Customer model not found'}, 500

            # Kiểm tra xem query có phải là số (customer_id) không
            customers = []
            if query_param.isdigit():
                # Tìm theo customer_id
                customer = Customer.query.filter_by(customer_id=int(query_param)).first()
                if customer:
                    customers = [customer]
            else:
                # Tìm theo tên
                customers = Customer.query.filter(
                    Customer.name.ilike(f'%{query_param}%')
                ).limit(limit).all()

            customer_list = []
            for c in customers:
                customer_list.append({
                    'customer_id': c.customer_id,
                    'name': c.name,
                    'age': c.age,
                    'city': c.city,
                    'email': getattr(c, 'email', None),
                    'phone': getattr(c, 'phone', None)
                })

            return {
                'customers': customer_list,
                'total_found': len(customer_list),
                'query': query_param
            }
        except Exception as e:
            return {'error': str(e)}, 500

    def get_customer_achievements(self, customer_id):
        """Get customer's current achievements and all available achievements"""
        try:
            Customer = self.models.get('Customer')
            Achievement = self.models.get('Achievement')
            CustomerAchievement = self.models.get('CustomerAchievement')
            
            if not all([Customer, Achievement, CustomerAchievement]):
                return {'error': 'Required models not found'}, 500

            # Lấy thông tin customer
            customer = Customer.query.get(customer_id)
            if not customer:
                return {'error': f'Không tìm thấy khách hàng với ID {customer_id}'}, 404

            # Lấy achievements hiện tại của customer
            current_achievements = self.db.session.query(
                CustomerAchievement.achievement_id,
                CustomerAchievement.assigned_date,
                CustomerAchievement.assigned_by,
                Achievement.name,
                Achievement.description,
                Achievement.category,
                Achievement.icon
            ).join(
                Achievement, CustomerAchievement.achievement_id == Achievement.achievement_id
            ).filter(
                CustomerAchievement.customer_id == customer_id
            ).all()

            # Lấy tất cả achievements có sẵn
            all_achievements = Achievement.query.filter_by(is_active=True).all()

            # Tạo danh sách achievements với trạng thái
            achievement_list = []
            current_achievement_ids = [ca.achievement_id for ca in current_achievements]

            for ach in all_achievements:
                is_assigned = ach.achievement_id in current_achievement_ids
                assigned_info = None
                
                if is_assigned:
                    # Tìm thông tin gán achievement
                    assigned_achievement = next(
                        (ca for ca in current_achievements if ca.achievement_id == ach.achievement_id),
                        None
                    )
                    if assigned_achievement:
                        assigned_info = {
                            'assigned_date': assigned_achievement.assigned_date.isoformat() if assigned_achievement.assigned_date else None,
                            'assigned_by': assigned_achievement.assigned_by
                        }

                achievement_list.append({
                    'achievement_id': ach.achievement_id,
                    'name': ach.name,
                    'description': ach.description,
                    'category': ach.category,
                    'criteria': ach.criteria,
                    'icon': ach.icon,
                    'is_assigned': is_assigned,
                    'assigned_info': assigned_info
                })

            return {
                'customer': {
                    'customer_id': customer.customer_id,
                    'name': customer.name,
                    'age': customer.age,
                    'city': customer.city
                },
                'achievements': achievement_list,
                'total_assigned': len(current_achievement_ids)
            }
        except Exception as e:
            return {'error': str(e)}, 500

    def assign_achievement(self, data):
        """Assign achievement to customer"""
        try:
            customer_id = data.get('customer_id')
            achievement_id = data.get('achievement_id')

            if not customer_id or not achievement_id:
                return {'error': 'Thiếu customer_id hoặc achievement_id'}, 400

            Customer = self.models.get('Customer')
            Achievement = self.models.get('Achievement')
            CustomerAchievement = self.models.get('CustomerAchievement')
            
            if not all([Customer, Achievement, CustomerAchievement]):
                return {'error': 'Required models not found'}, 500

            # Kiểm tra customer tồn tại
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'error': f'Không tìm thấy khách hàng với ID {customer_id}'}, 404

            # Kiểm tra achievement tồn tại - sử dụng Achievement.id
            achievement = Achievement.query.get(achievement_id)
            if not achievement:
                return {'error': f'Không tìm thấy achievement với ID {achievement_id}'}, 404

            # Kiểm tra đã gán chưa
            existing = CustomerAchievement.query.filter_by(
                customer_id=customer_id,
                achievement_id=achievement_id
            ).first()

            if existing:
                return {'error': f'Achievement "{achievement.name}" đã được gán cho khách hàng này'}, 400

            # Kiểm tra điều kiện trước khi gán
            VietjetFlight = self.models.get('VietjetFlight')
            ResortBooking = self.models.get('ResortBooking')
            HDBankTransaction = self.models.get('HDBankTransaction')
            
            # Get customer stats
            total_flights = 0
            total_resort_nights = 0
            avg_balance = 0
            
            if VietjetFlight:
                total_flights = VietjetFlight.query.filter_by(customer_id=customer_id).count()
            
            if ResortBooking:
                total_resort_nights = self.db.session.query(
                    self.db.func.sum(ResortBooking.nights_stayed)
                ).filter_by(customer_id=customer_id).scalar() or 0
            
            if HDBankTransaction:
                avg_balance = self.db.session.query(
                    self.db.func.avg(HDBankTransaction.balance)
                ).filter_by(customer_id=customer_id).scalar() or 0

            # Check eligibility
            if not self._check_achievement_eligibility_by_name(achievement.name, total_flights, avg_balance, total_resort_nights):
                # Get specific reason
                eligibility_reason = self._get_eligibility_reason(achievement.name, total_flights, avg_balance, total_resort_nights)
                return {'error': f'Khách hàng chưa đủ điều kiện cho "{achievement.name}": {eligibility_reason}'}, 400

            # Gán achievement
            new_assignment = CustomerAchievement(
                customer_id=customer_id,
                achievement_id=achievement_id,
                unlocked_at=self.db.func.now()
            )

            self.db.session.add(new_assignment)
            self.db.session.commit()

            return {
                'success': True,
                'message': f'Đã gán achievement "{achievement.name}" cho khách hàng "{customer.name}"',
                'assignment': {
                    'customer_id': customer_id,
                    'customer_name': customer.name,
                    'achievement_id': achievement_id,
                    'achievement_name': achievement.name
                }
            }
        except Exception as e:
            self.db.session.rollback()
            return {'error': str(e)}, 500

    def auto_assign_achievements(self, customer_id):
        """Auto assign achievements based on customer eligibility"""
        try:
            Customer = self.models.get('Customer')
            Achievement = self.models.get('Achievement')
            CustomerAchievement = self.models.get('CustomerAchievement')
            VietjetFlight = self.models.get('VietjetFlight')
            ResortBooking = self.models.get('ResortBooking')
            HDBankTransaction = self.models.get('HDBankTransaction')
            
            if not all([Customer, Achievement, CustomerAchievement]):
                return {'error': 'Required models not found'}, 500

            # Get customer
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {'error': f'Không tìm thấy khách hàng với ID {customer_id}'}, 404

            # Get customer stats
            total_flights = 0
            total_resort_nights = 0
            avg_balance = 0
            
            if VietjetFlight:
                total_flights = VietjetFlight.query.filter_by(customer_id=customer_id).count()
            
            if ResortBooking:
                total_resort_nights = self.db.session.query(
                    self.db.func.sum(ResortBooking.nights_stayed)
                ).filter_by(customer_id=customer_id).scalar() or 0
            
            if HDBankTransaction:
                avg_balance = self.db.session.query(
                    self.db.func.avg(HDBankTransaction.balance)
                ).filter_by(customer_id=customer_id).scalar() or 0

            # Get all available achievements
            achievements = Achievement.query.all()
            
            # Get currently assigned achievements
            current_achievements = CustomerAchievement.query.filter_by(
                customer_id=customer_id
            ).all()
            
            # Lấy achievement_id từ CustomerAchievement
            current_achievement_ids = [ca.achievement_id for ca in current_achievements]

            # Check eligibility and assign
            assigned_achievements = []
            assigned_count = 0

            for ach in achievements:
                # Achievement có field 'id'
                ach_id = ach.id
                if ach_id in current_achievement_ids:
                    continue  # Already assigned
                
                # Check eligibility by name
                if self._check_achievement_eligibility_by_name(ach.name, total_flights, avg_balance, total_resort_nights):
                    try:
                        # Tạo assignment mới - CustomerAchievement.achievement_id = Achievement.id
                        new_assignment = CustomerAchievement(
                            customer_id=customer_id,
                            achievement_id=ach_id,
                            unlocked_at=self.db.func.now()
                        )
                        self.db.session.add(new_assignment)
                        assigned_achievements.append({
                            'id': ach_id,
                            'name': ach.name
                        })
                        assigned_count += 1
                    except Exception as e:
                        print(f"Error assigning achievement {ach_id}: {e}")
                        continue

            self.db.session.commit()

            return {
                'success': True,
                'message': f'Đã tự động gán {assigned_count} achievement(s) cho {customer.name}',
                'assigned_count': assigned_count,
                'assigned_achievements': assigned_achievements
            }
        except Exception as e:
            self.db.session.rollback()
            print(f"Error in auto_assign_achievements: {e}")
            return {'error': str(e)}, 500

    def _get_eligibility_reason(self, achievement_name, total_flights, avg_balance, total_resort_nights):
        """Get detailed reason why customer is/isn't eligible"""
        name = achievement_name.lower()
        
        # Phi công achievements
        if 'phi công vàng' in name:
            if total_flights >= 20:
                return f'Đủ điều kiện: {total_flights}/20 chuyến bay'
            return f'Thiếu {20 - total_flights} chuyến bay (hiện tại: {total_flights}/20)'
        elif 'phi công bạc' in name:
            if total_flights >= 10:
                return f'Đủ điều kiện: {total_flights}/10 chuyến bay'
            return f'Thiếu {10 - total_flights} chuyến bay (hiện tại: {total_flights}/10)'
        elif 'phi công đồng' in name:
            if total_flights >= 5:
                return f'Đủ điều kiện: {total_flights}/5 chuyến bay'
            return f'Thiếu {5 - total_flights} chuyến bay (hiện tại: {total_flights}/5)'
        
        # VIP achievement
        elif 'khách hàng vip' in name or 'vip' in name:
            if avg_balance >= 100_000_000:
                return f'Đủ điều kiện: {avg_balance:,.0f} VNĐ'
            return f'Thiếu {100_000_000 - avg_balance:,.0f} VNĐ (hiện tại: {avg_balance:,.0f}/100,000,000 VNĐ)'
        
        # Du lịch achievement
        elif 'người du lịch' in name or 'du lịch' in name:
            if total_resort_nights >= 10:
                return f'Đủ điều kiện: {total_resort_nights}/10 đêm nghỉ dưỡng'
            return f'Thiếu {10 - total_resort_nights} đêm nghỉ dưỡng (hiện tại: {total_resort_nights}/10)'
        
        # SVT achievements
        elif 'svt' in name:
            return 'Đủ điều kiện (achievement đặc biệt)'
        
        # Default
        else:
            return 'Đủ điều kiện (achievement đặc biệt)'

    def _check_achievement_eligibility_by_name(self, achievement_name, total_flights, avg_balance, total_resort_nights):
        """Check eligibility based on achievement name"""
        name = achievement_name.lower()
        
        # Phi công achievements
        if 'phi công vàng' in name:
            return total_flights >= 20
        elif 'phi công bạc' in name:
            return total_flights >= 10
        elif 'phi công đồng' in name:
            return total_flights >= 5
        
        # VIP achievement
        elif 'khách hàng vip' in name or 'vip' in name:
            return avg_balance >= 100_000_000
        
        # Du lịch achievement
        elif 'người du lịch' in name or 'du lịch' in name:
            return total_resort_nights >= 10
        
        # SVT achievements (always true for now)
        elif 'svt' in name:
            return True
        
        # Default: allow other achievements
        else:
            return True

    def _check_achievement_eligibility(self, profile, achievement):
        """Check if customer is eligible for achievement based on criteria"""
        try:
            criteria = achievement.criteria
            if not criteria:
                return True  # No criteria means always eligible

            # Parse criteria - expecting format like "flights:10" or "balance:1000000"
            if ':' not in criteria:
                return True

            criteria_type, criteria_value = criteria.split(':', 1)
            criteria_value = int(criteria_value)

            # Check different types of criteria
            if criteria_type == 'flights':
                total_flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0) or 0
                return total_flights >= criteria_value

            elif criteria_type == 'balance':
                avg_balance = profile.get('hdbank_summary', {}).get('average_balance', 0) or 0
                return avg_balance >= criteria_value

            elif criteria_type == 'nights':
                total_nights = profile.get('resort_summary', {}).get('total_nights_stayed', 0) or 0
                return total_nights >= criteria_value

            elif criteria_type == 'spending':
                total_spending = profile.get('resort_summary', {}).get('total_spending', 0) or 0
                return total_spending >= criteria_value

            return True
        except Exception as e:
            print(f"Error checking eligibility for achievement {achievement.achievement_id}: {e}")
            return False
