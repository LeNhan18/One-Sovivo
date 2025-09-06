# services/mission_service.py
# -*- coding: utf-8 -*-
"""
Mission progression service
"""

import datetime
import uuid
from models import db, Customer, CustomerMission, CustomerMissionProgress, TokenTransaction

# Import mission systems
try:
    from mission_progression import mission_system, get_missions_for_customer
    from detailed_missions import DetailedMissionSystem
    MISSION_SYSTEM_ENABLED = True
except ImportError:
    MISSION_SYSTEM_ENABLED = False

class MissionService:
    
    def __init__(self):
        if MISSION_SYSTEM_ENABLED:
            self.detailed_mission_system = DetailedMissionSystem()
        else:
            self.detailed_mission_system = None
    
    def get_missions_for_customer(self, customer_id):
        """Lấy danh sách missions cho customer"""
        try:
            if not MISSION_SYSTEM_ENABLED:
                return self._get_default_missions(customer_id)
            
            # Lấy dữ liệu customer để đánh giá missions
            customer_data = self._get_customer_data_for_missions(customer_id)
            
            # Lấy missions từ detailed mission system
            if self.detailed_mission_system:
                missions = self.detailed_mission_system.get_missions_for_customer(customer_data)
                # Sync vào database
                self._sync_detailed_missions_to_database(customer_id, missions)
                return missions
            else:
                # Fallback to simple mission system
                available_missions = get_missions_for_customer(customer_data)
                self._sync_missions_to_database(customer_id, available_missions)
                return available_missions
                
        except Exception as e:
            print(f"❌ Error getting missions: {e}")
            return []
    
    def start_mission(self, customer_id, mission_id):
        """Bắt đầu một mission"""
        try:
            # Kiểm tra mission có tồn tại không
            mission = CustomerMission.query.filter_by(
                customer_id=customer_id,
                mission_id=mission_id
            ).first()
            
            if not mission:
                return {'success': False, 'error': 'Mission not found'}
            
            if mission.status != 'available':
                return {'success': False, 'error': 'Mission not available'}
            
            # Cập nhật status và thời gian bắt đầu
            mission.status = 'in_progress'
            mission.started_at = datetime.datetime.utcnow()
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Đã bắt đầu mission: {mission.mission_title}',
                'mission_id': mission_id,
                'started_at': mission.started_at.isoformat()
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error starting mission: {e}")
            return {'success': False, 'error': str(e)}
    
    def complete_mission(self, customer_id, mission_id):
        """Hoàn thành mission và nhận thưởng"""
        try:
            # Kiểm tra mission
            mission = CustomerMission.query.filter_by(
                customer_id=customer_id,
                mission_id=mission_id
            ).first()
            
            if not mission:
                return {'success': False, 'error': 'Mission not found'}
            
            if mission.status != 'in_progress':
                return {'success': False, 'error': 'Mission not in progress'}
            
            # Kiểm tra điều kiện hoàn thành
            if not self._check_mission_completion(customer_id, mission_id):
                return {'success': False, 'error': 'Mission requirements not met'}
            
            # Cập nhật mission status
            mission.status = 'completed'
            mission.completed_at = datetime.datetime.utcnow()
            
            # Thêm SVT reward
            svt_reward = float(mission.svt_reward or 0)
            if svt_reward > 0:
                reward_tx = TokenTransaction(
                    customer_id=customer_id,
                    transaction_type="mission_reward",
                    amount=svt_reward,
                    description=f"Hoàn thành mission: {mission.mission_title}",
                    tx_hash=f"0x{uuid.uuid4().hex}",
                    block_number=1000000
                )
                db.session.add(reward_tx)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'Đã hoàn thành mission: {mission.mission_title}',
                'svt_reward': svt_reward,
                'completed_at': mission.completed_at.isoformat()
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error completing mission: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_mission_progress(self, customer_id, mission_id):
        """Lấy tiến độ mission"""
        try:
            progress_records = CustomerMissionProgress.query.filter_by(
                customer_id=customer_id,
                mission_id=mission_id
            ).all()
            
            progress = {}
            for record in progress_records:
                progress[record.requirement_key] = {
                    'current_value': float(record.current_value),
                    'required_value': float(record.required_value),
                    'is_completed': record.is_completed,
                    'progress_percentage': min(100, (float(record.current_value) / float(record.required_value)) * 100)
                }
            
            return progress
            
        except Exception as e:
            print(f"❌ Error getting mission progress: {e}")
            return {}
    
    def get_leaderboard(self):
        """Lấy bảng xếp hạng missions"""
        try:
            leaderboard_query = """
                SELECT c.customer_id, c.name,
                       COUNT(cm.id) as completed_missions,
                       COALESCE(SUM(cm.svt_reward), 0) as total_svt_earned
                FROM customers c
                LEFT JOIN customer_missions cm ON c.customer_id = cm.customer_id 
                    AND cm.status = 'completed'
                GROUP BY c.customer_id, c.name
                ORDER BY completed_missions DESC, total_svt_earned DESC
                LIMIT 10
            """
            
            result = db.session.execute(db.text(leaderboard_query))
            
            leaderboard = []
            for row in result:
                leaderboard.append({
                    'customer_id': row.customer_id,
                    'name': row.name,
                    'completed_missions': row.completed_missions,
                    'total_svt_earned': float(row.total_svt_earned)
                })
            
            return leaderboard
            
        except Exception as e:
            print(f"❌ Error getting leaderboard: {e}")
            return []
    
    def update_customer_stats(self, customer_id, stats_data):
        """Cập nhật customer stats và kiểm tra mission progress"""
        try:
            # Cập nhật hoặc tạo customer stats
            for stat_key, stat_value in stats_data.items():
                # Cập nhật vào bảng customer_stats (nếu có)
                # Hoặc cập nhật mission progress
                progress_records = CustomerMissionProgress.query.filter_by(
                    customer_id=customer_id,
                    requirement_key=stat_key
                ).all()
                
                for progress in progress_records:
                    progress.current_value = stat_value
                    if float(stat_value) >= float(progress.required_value):
                        progress.is_completed = True
                    progress.updated_at = datetime.datetime.utcnow()
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Customer stats updated successfully'
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error updating customer stats: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_mission_templates(self):
        """Lấy mission templates cho admin"""
        try:
            if self.detailed_mission_system:
                return self.detailed_mission_system.get_mission_templates()
            else:
                return self._get_default_mission_templates()
        except Exception as e:
            print(f"❌ Error getting mission templates: {e}")
            return []
    
    def _get_customer_data_for_missions(self, customer_id):
        """Lấy dữ liệu customer cho mission evaluation"""
        try:
            customer = Customer.query.filter_by(customer_id=customer_id).first()
            if not customer:
                return {}
            
            # Đếm số giao dịch
            transaction_count = TokenTransaction.query.filter_by(customer_id=customer_id).count()
            
            # Tính profile completeness
            profile_fields = ['name', 'age', 'gender', 'job', 'city', 'persona_type']
            filled_fields = sum(1 for field in profile_fields if getattr(customer, field))
            profile_completeness = (filled_fields / len(profile_fields)) * 100
            
            return {
                'customer_id': customer_id,
                'created_at': customer.created_at,
                'transaction_count': transaction_count,
                'profile_completeness': profile_completeness,
                'name_filled': bool(customer.name),
                'age_filled': bool(customer.age),
                'gender_filled': bool(customer.gender),
                'city_filled': bool(customer.city),
                'job_filled': bool(customer.job),
                'persona_type_filled': bool(customer.persona_type)
            }
            
        except Exception as e:
            print(f"❌ Error getting customer data: {e}")
            return {}
    
    def _sync_missions_to_database(self, customer_id, missions):
        """Đồng bộ missions vào database"""
        try:
            for mission in missions:
                existing = CustomerMission.query.filter_by(
                    customer_id=customer_id,
                    mission_id=mission['mission_id']
                ).first()
                
                if not existing:
                    customer_mission = CustomerMission(
                        customer_id=customer_id,
                        mission_id=mission['mission_id'],
                        mission_title=mission['title'],
                        mission_category=mission.get('category', 'general'),
                        mission_level=mission.get('level', 'beginner'),
                        svt_reward=mission.get('svt_reward', 100),
                        status='available'
                    )
                    db.session.add(customer_mission)
            
            db.session.commit()
        except Exception as e:
            print(f"❌ Error syncing missions: {e}")
            db.session.rollback()
    
    def _sync_detailed_missions_to_database(self, customer_id, missions):
        """Đồng bộ detailed missions vào database"""
        try:
            category_mapping = {
                'welcome': 'onboarding',
                'daily': 'lifestyle',
                'financial': 'financial',
                'travel': 'travel',
                'social': 'social'
            }
            
            for mission in missions:
                existing = CustomerMission.query.filter_by(
                    customer_id=customer_id,
                    mission_id=mission['mission_id']
                ).first()
                
                if not existing:
                    customer_mission = CustomerMission(
                        customer_id=customer_id,
                        mission_id=mission['mission_id'],
                        mission_title=mission['title'],
                        mission_category=category_mapping.get(mission.get('category', 'general'), 'general'),
                        mission_level=mission.get('level', 'Beginner'),
                        svt_reward=mission.get('svt_reward', 100),
                        status='available',
                        progress_data=mission.get('requirements', {})
                    )
                    db.session.add(customer_mission)
                    
                    # Tạo progress tracking
                    self._create_mission_progress_tracking(customer_id, mission['mission_id'], mission)
            
            db.session.commit()
        except Exception as e:
            print(f"❌ Error syncing detailed missions: {e}")
            db.session.rollback()
    
    def _create_mission_progress_tracking(self, customer_id, mission_id, mission_data):
        """Tạo progress tracking cho mission"""
        try:
            requirements = mission_data.get('requirements', {})
            
            for req_key, req_value in requirements.items():
                existing_progress = CustomerMissionProgress.query.filter_by(
                    customer_id=customer_id,
                    mission_id=mission_id,
                    requirement_key=req_key
                ).first()
                
                if not existing_progress:
                    progress = CustomerMissionProgress(
                        customer_id=customer_id,
                        mission_id=mission_id,
                        requirement_key=req_key,
                        current_value=0,
                        required_value=req_value,
                        is_completed=False
                    )
                    db.session.add(progress)
            
            db.session.commit()
        except Exception as e:
            print(f"❌ Error creating progress tracking: {e}")
            db.session.rollback()
    
    def _check_mission_completion(self, customer_id, mission_id):
        """Kiểm tra xem mission đã hoàn thành chưa"""
        try:
            progress_records = CustomerMissionProgress.query.filter_by(
                customer_id=customer_id,
                mission_id=mission_id
            ).all()
            
            if not progress_records:
                return True  # Nếu không có requirements thì coi như hoàn thành
            
            return all(record.is_completed for record in progress_records)
            
        except Exception as e:
            print(f"❌ Error checking mission completion: {e}")
            return False
    
    def _get_default_missions(self, customer_id):
        """Missions mặc định nếu không có mission system"""
        return [
            {
                'mission_id': 'welcome_001',
                'title': 'Chào mừng đến với One-Sovico',
                'description': 'Hoàn thành đăng ký tài khoản',
                'category': 'onboarding',
                'level': 'Beginner',
                'svt_reward': 100,
                'status': 'completed'
            }
        ]
    
    def _get_default_mission_templates(self):
        """Mission templates mặc định"""
        return [
            {
                'mission_id': 'welcome_001',
                'title': 'Chào mừng đến với One-Sovico',
                'category': 'onboarding',
                'level': 'Beginner',
                'svt_reward': 100
            }
        ]
