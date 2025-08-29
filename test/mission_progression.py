# mission_progression.py
# -*- coding: utf-8 -*-
"""
Mission Progression System for One-Sovico Platform
Hệ thống nhiệm vụ tiến triển từ cơ bản đến nâng cao cho khách hàng mới và cũ
"""

import datetime
from enum import Enum
from typing import Dict, List, Optional

class CustomerType(Enum):
    NEW = "new"          # Khách hàng mới (< 30 ngày)
    REGULAR = "regular"  # Khách hàng thường (30-365 ngày)
    VIP = "vip"          # Khách hàng VIP (> 365 ngày)

class MissionLevel(Enum):
    BEGINNER = "beginner"     # Cấp độ người mới bắt đầu
    INTERMEDIATE = "intermediate"  # Cấp độ trung cấp
    ADVANCED = "advanced"     # Cấp độ nâng cao
    EXPERT = "expert"         # Cấp độ chuyên gia

class MissionCategory(Enum):
    ONBOARDING = "onboarding"     # Nhiệm vụ làm quen
    PROFILE = "profile"           # Hoàn thiện hồ sơ
    FINANCIAL = "financial"       # Giao dịch tài chính
    TRAVEL = "travel"             # Du lịch & bay
    LIFESTYLE = "lifestyle"       # Phong cách sống
    SOCIAL = "social"             # Tương tác xã hội
    INVESTMENT = "investment"     # Đầu tư
    LOYALTY = "loyalty"           # Lòng trung thành

class MissionProgressionSystem:
    """Hệ thống quản lý tiến triển nhiệm vụ"""
    
    def __init__(self):
        self.mission_trees = self._initialize_mission_trees()
    
    def _initialize_mission_trees(self) -> Dict:
        """Khởi tạo cây nhiệm vụ cho từng loại khách hàng"""
        return {
            CustomerType.NEW: self._get_new_customer_missions(),
            CustomerType.REGULAR: self._get_regular_customer_missions(),
            CustomerType.VIP: self._get_vip_customer_missions()
        }
    
    def _get_new_customer_missions(self) -> Dict:
        """Nhiệm vụ cho khách hàng mới - tập trung vào onboarding"""
        return {
            MissionLevel.BEGINNER: [
                {
                    'id': 'new_welcome',
                    'title': 'Chào mừng đến với Sovico!',
                    'description': 'Hoàn thành hướng dẫn cơ bản của ứng dụng',
                    'category': MissionCategory.ONBOARDING,
                    'svt_reward': 500,
                    'requirements': {'app_tutorial_completed': True},
                    'next_missions': ['new_profile_basic'],
                    'icon': '👋',
                    'estimated_time': '5 phút'
                },
                {
                    'id': 'new_profile_basic',
                    'title': 'Hoàn thành thông tin cơ bản',
                    'description': 'Điền đầy đủ họ tên, tuổi, giới tính và thành phố',
                    'category': MissionCategory.PROFILE,
                    'svt_reward': 300,
                    'requirements': {
                        'name_filled': True,
                        'age_filled': True,
                        'gender_filled': True,
                        'city_filled': True
                    },
                    'next_missions': ['new_first_login'],
                    'icon': '👤',
                    'estimated_time': '3 phút'
                },
                {
                    'id': 'new_first_login',
                    'title': 'Đăng nhập đầu tiên',
                    'description': 'Đăng nhập thành công vào ứng dụng',
                    'category': MissionCategory.ONBOARDING,
                    'svt_reward': 200,
                    'requirements': {'login_count': 1},
                    'next_missions': ['new_explore_features'],
                    'icon': '🔐',
                    'estimated_time': '1 phút'
                }
            ],
            MissionLevel.INTERMEDIATE: [
                {
                    'id': 'new_explore_features',
                    'title': 'Khám phá tính năng',
                    'description': 'Truy cập ít nhất 3 tính năng khác nhau (Profile360, AI Assistant, NFT Passport)',
                    'category': MissionCategory.ONBOARDING,
                    'svt_reward': 400,
                    'requirements': {'features_explored': 3},
                    'next_missions': ['new_first_ai_chat'],
                    'icon': '🔍',
                    'estimated_time': '10 phút'
                },
                {
                    'id': 'new_first_ai_chat',
                    'title': 'Trò chuyện với AI lần đầu',
                    'description': 'Sử dụng AI Financial Assistant để đặt câu hỏi tài chính',
                    'category': MissionCategory.ONBOARDING,
                    'svt_reward': 600,
                    'requirements': {'ai_interactions': 1},
                    'next_missions': ['new_profile_advanced'],
                    'icon': '🤖',
                    'estimated_time': '5 phút'
                },
                {
                    'id': 'new_profile_advanced',
                    'title': 'Hoàn thiện hồ sơ nâng cao',
                    'description': 'Điền thêm thông tin nghề nghiệp và sở thích',
                    'category': MissionCategory.PROFILE,
                    'svt_reward': 500,
                    'requirements': {
                        'job_filled': True,
                        'persona_type_filled': True
                    },
                    'next_missions': ['new_first_transaction'],
                    'icon': '📝',
                    'estimated_time': '5 phút'
                }
            ],
            MissionLevel.ADVANCED: [
                {
                    'id': 'new_first_transaction',
                    'title': 'Giao dịch đầu tiên',
                    'description': 'Thực hiện giao dịch tài chính đầu tiên (có thể là demo)',
                    'category': MissionCategory.FINANCIAL,
                    'svt_reward': 1000,
                    'requirements': {'transaction_count': 1},
                    'next_missions': ['new_marketplace_visit'],
                    'icon': '💳',
                    'estimated_time': '10 phút'
                },
                {
                    'id': 'new_marketplace_visit',
                    'title': 'Khám phá Marketplace',
                    'description': 'Truy cập và xem các sản phẩm trong Marketplace',
                    'category': MissionCategory.LIFESTYLE,
                    'svt_reward': 300,
                    'requirements': {'marketplace_visits': 1},
                    'next_missions': ['new_week_streak'],
                    'icon': '🛒',
                    'estimated_time': '5 phút'
                },
                {
                    'id': 'new_week_streak',
                    'title': 'Sử dụng ứng dụng 7 ngày liên tục',
                    'description': 'Duy trì thói quen sử dụng ứng dụng hàng ngày',
                    'category': MissionCategory.LOYALTY,
                    'svt_reward': 1500,
                    'requirements': {'daily_streak': 7},
                    'next_missions': [],  # Tốt nghiệp thành regular customer
                    'icon': '🔥',
                    'estimated_time': '7 ngày'
                }
            ]
        }
    
    def _get_regular_customer_missions(self) -> Dict:
        """Nhiệm vụ cho khách hàng thường - tập trung vào engagement và growth"""
        return {
            MissionLevel.BEGINNER: [
                {
                    'id': 'reg_daily_checkin',
                    'title': 'Điểm danh hàng ngày',
                    'description': 'Điểm danh 5 ngày trong tuần',
                    'category': MissionCategory.LOYALTY,
                    'svt_reward': 800,
                    'requirements': {'weekly_checkins': 5},
                    'next_missions': ['reg_profile_optimization'],
                    'icon': '✅',
                    'estimated_time': 'Hàng ngày'
                },
                {
                    'id': 'reg_profile_optimization',
                    'title': 'Tối ưu hóa hồ sơ',
                    'description': 'Cập nhật thông tin chi tiết và ảnh đại diện',
                    'category': MissionCategory.PROFILE,
                    'svt_reward': 600,
                    'requirements': {
                        'profile_completeness': 80,
                        'avatar_uploaded': True
                    },
                    'next_missions': ['reg_financial_goal'],
                    'icon': '🎯',
                    'estimated_time': '10 phút'
                }
            ],
            MissionLevel.INTERMEDIATE: [
                {
                    'id': 'reg_financial_goal',
                    'title': 'Đặt mục tiêu tài chính',
                    'description': 'Thiết lập mục tiêu tiết kiệm hoặc đầu tư',
                    'category': MissionCategory.FINANCIAL,
                    'svt_reward': 1000,
                    'requirements': {'financial_goals_set': 1},
                    'next_missions': ['reg_transaction_milestone'],
                    'icon': '🎯',
                    'estimated_time': '15 phút'
                },
                {
                    'id': 'reg_transaction_milestone',
                    'title': 'Hoàn thành 10 giao dịch',
                    'description': 'Thực hiện thành công 10 giao dịch tài chính',
                    'category': MissionCategory.FINANCIAL,
                    'svt_reward': 1500,
                    'requirements': {'transaction_count': 10},
                    'next_missions': ['reg_travel_booking'],
                    'icon': '💰',
                    'estimated_time': '1 tháng'
                },
                {
                    'id': 'reg_travel_booking',
                    'title': 'Đặt chuyến bay đầu tiên',
                    'description': 'Sử dụng tính năng đặt vé máy bay Vietjet',
                    'category': MissionCategory.TRAVEL,
                    'svt_reward': 2000,
                    'requirements': {'flight_bookings': 1},
                    'next_missions': ['reg_ai_consultation'],
                    'icon': '✈️',
                    'estimated_time': '20 phút'
                }
            ],
            MissionLevel.ADVANCED: [
                {
                    'id': 'reg_ai_consultation',
                    'title': 'Tư vấn AI chuyên sâu',
                    'description': 'Sử dụng AI Assistant ít nhất 10 lần cho tư vấn tài chính',
                    'category': MissionCategory.FINANCIAL,
                    'svt_reward': 1200,
                    'requirements': {'ai_consultations': 10},
                    'next_missions': ['reg_investment_start'],
                    'icon': '🧠',
                    'estimated_time': '2 tuần'
                },
                {
                    'id': 'reg_investment_start',
                    'title': 'Bắt đầu đầu tư',
                    'description': 'Thực hiện khoản đầu tư đầu tiên hoặc mở tài khoản đầu tư',
                    'category': MissionCategory.INVESTMENT,
                    'svt_reward': 3000,
                    'requirements': {'investment_accounts': 1},
                    'next_missions': ['reg_social_sharing'],
                    'icon': '📈',
                    'estimated_time': '30 phút'
                },
                {
                    'id': 'reg_social_sharing',
                    'title': 'Chia sẻ thành tựu',
                    'description': 'Chia sẻ NFT Passport hoặc thành tựu trên mạng xã hội',
                    'category': MissionCategory.SOCIAL,
                    'svt_reward': 800,
                    'requirements': {'social_shares': 1},
                    'next_missions': ['reg_mentor_others'],
                    'icon': '📱',
                    'estimated_time': '5 phút'
                }
            ],
            MissionLevel.EXPERT: [
                {
                    'id': 'reg_mentor_others',
                    'title': 'Hướng dẫn người mới',
                    'description': 'Giới thiệu và hướng dẫn 3 người bạn sử dụng ứng dụng',
                    'category': MissionCategory.SOCIAL,
                    'svt_reward': 5000,
                    'requirements': {'referrals_successful': 3},
                    'next_missions': [],  # Tốt nghiệp thành VIP
                    'icon': '👥',
                    'estimated_time': '1 tháng'
                }
            ]
        }
    
    def _get_vip_customer_missions(self) -> Dict:
        """Nhiệm vụ cho khách hàng VIP - tập trung vào advanced features và exclusive content"""
        return {
            MissionLevel.EXPERT: [
                {
                    'id': 'vip_portfolio_management',
                    'title': 'Quản lý danh mục đầu tư',
                    'description': 'Sử dụng tính năng quản lý danh mục đầu tư nâng cao',
                    'category': MissionCategory.INVESTMENT,
                    'svt_reward': 3000,
                    'requirements': {'portfolio_value': 100000000},  # 100M VND
                    'next_missions': ['vip_exclusive_events'],
                    'icon': '💎',
                    'estimated_time': '1 giờ'
                },
                {
                    'id': 'vip_exclusive_events',
                    'title': 'Tham gia sự kiện độc quyền',
                    'description': 'Tham dự webinar hoặc sự kiện dành riêng cho VIP',
                    'category': MissionCategory.LIFESTYLE,
                    'svt_reward': 2500,
                    'requirements': {'exclusive_events_attended': 1},
                    'next_missions': ['vip_advanced_trading'],
                    'icon': '🎪',
                    'estimated_time': '2 giờ'
                },
                {
                    'id': 'vip_advanced_trading',
                    'title': 'Giao dịch nâng cao',
                    'description': 'Thực hiện giao dịch với giá trị lớn hoặc sản phẩm phức tạp',
                    'category': MissionCategory.INVESTMENT,
                    'svt_reward': 5000,
                    'requirements': {
                        'large_transactions': 1,
                        'transaction_value_min': 50000000  # 50M VND
                    },
                    'next_missions': ['vip_community_leader'],
                    'icon': '🏆',
                    'estimated_time': '30 phút'
                },
                {
                    'id': 'vip_community_leader',
                    'title': 'Lãnh đạo cộng đồng',
                    'description': 'Trở thành người ảnh hưởng trong cộng đồng Sovico',
                    'category': MissionCategory.SOCIAL,
                    'svt_reward': 10000,
                    'requirements': {
                        'community_posts': 10,
                        'helpful_answers': 20,
                        'followers': 100
                    },
                    'next_missions': ['vip_brand_ambassador'],
                    'icon': '👑',
                    'estimated_time': '3 tháng'
                },
                {
                    'id': 'vip_brand_ambassador',
                    'title': 'Đại sứ thương hiệu Sovico',
                    'description': 'Trở thành đại diện chính thức của thương hiệu',
                    'category': MissionCategory.SOCIAL,
                    'svt_reward': 25000,
                    'requirements': {
                        'ambassador_application': True,
                        'content_creation': 5,
                        'engagement_rate': 0.05  # 5%
                    },
                    'next_missions': [],  # Đỉnh cao của hệ thống
                    'icon': '🌟',
                    'estimated_time': '6 tháng'
                }
            ]
        }
    
    def get_customer_type(self, customer_data: Dict) -> CustomerType:
        """Xác định loại khách hàng dựa trên dữ liệu"""
        created_at = customer_data.get('created_at')
        if not created_at:
            return CustomerType.NEW
        
        # Tính số ngày từ khi tạo tài khoản
        if isinstance(created_at, str):
            created_at = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        days_since_created = (datetime.datetime.now() - created_at).days
        
        # Xét thêm các yếu tố khác
        transaction_count = customer_data.get('transaction_count', 0)
        total_spending = customer_data.get('total_spending', 0)
        
        if days_since_created < 30:
            return CustomerType.NEW
        elif (days_since_created > 365 or 
              transaction_count > 50 or 
              total_spending > 500000000):  # 500M VND
            return CustomerType.VIP
        else:
            return CustomerType.REGULAR
    
    def get_available_missions(self, customer_data: Dict, completed_missions: List[str]) -> List[Dict]:
        """Lấy danh sách nhiệm vụ có thể thực hiện cho khách hàng"""
        customer_type = self.get_customer_type(customer_data)
        customer_missions = self.mission_trees[customer_type]
        
        available_missions = []
        
        # Duyệt qua các cấp độ
        for level, missions in customer_missions.items():
            for mission in missions:
                mission_id = mission['id']
                
                # Bỏ qua nhiệm vụ đã hoàn thành
                if mission_id in completed_missions:
                    continue
                
                # Kiểm tra điều kiện tiên quyết
                if self._check_prerequisites(mission, completed_missions):
                    # Kiểm tra yêu cầu cụ thể
                    if self._check_requirements(mission, customer_data):
                        mission_copy = mission.copy()
                        mission_copy['level'] = level.value
                        mission_copy['customer_type'] = customer_type.value
                        available_missions.append(mission_copy)
        
        return available_missions
    
    def _check_prerequisites(self, mission: Dict, completed_missions: List[str]) -> bool:
        """Kiểm tra điều kiện tiên quyết của nhiệm vụ"""
        # Tìm các nhiệm vụ có next_missions chứa mission này
        mission_id = mission['id']
        
        # Tìm tất cả missions trong hệ thống
        all_missions = []
        for customer_type_missions in self.mission_trees.values():
            for level_missions in customer_type_missions.values():
                all_missions.extend(level_missions)
        
        # Tìm prerequisite missions
        prerequisite_missions = []
        for m in all_missions:
            if mission_id in m.get('next_missions', []):
                prerequisite_missions.append(m['id'])
        
        # Nếu không có prerequisite, có thể thực hiện
        if not prerequisite_missions:
            return True
        
        # Kiểm tra ít nhất một prerequisite đã hoàn thành
        return any(prereq in completed_missions for prereq in prerequisite_missions)
    
    def _check_requirements(self, mission: Dict, customer_data: Dict) -> bool:
        """Kiểm tra yêu cầu cụ thể của nhiệm vụ"""
        requirements = mission.get('requirements', {})
        
        for req_key, req_value in requirements.items():
            customer_value = customer_data.get(req_key, 0)
            
            if isinstance(req_value, bool):
                if bool(customer_value) != req_value:
                    return False
            elif isinstance(req_value, (int, float)):
                if customer_value < req_value:
                    return False
        
        return True
    
    def get_mission_progress(self, mission_id: str, customer_data: Dict) -> Dict:
        """Lấy tiến độ hoàn thành nhiệm vụ"""
        # Tìm mission
        mission = None
        for customer_type_missions in self.mission_trees.values():
            for level_missions in customer_type_missions.values():
                for m in level_missions:
                    if m['id'] == mission_id:
                        mission = m
                        break
        
        if not mission:
            return {'error': 'Mission not found'}
        
        requirements = mission.get('requirements', {})
        progress = {}
        
        for req_key, req_value in requirements.items():
            customer_value = customer_data.get(req_key, 0)
            
            if isinstance(req_value, bool):
                progress[req_key] = {
                    'current': bool(customer_value),
                    'required': req_value,
                    'completed': bool(customer_value) == req_value
                }
            elif isinstance(req_value, (int, float)):
                progress[req_key] = {
                    'current': customer_value,
                    'required': req_value,
                    'completed': customer_value >= req_value,
                    'percentage': min(100, (customer_value / req_value) * 100) if req_value > 0 else 0
                }
        
        # Tính tổng tiến độ
        completed_reqs = sum(1 for p in progress.values() if p['completed'])
        total_reqs = len(progress)
        overall_progress = (completed_reqs / total_reqs * 100) if total_reqs > 0 else 0
        
        return {
            'mission_id': mission_id,
            'mission_title': mission['title'],
            'overall_progress': overall_progress,
            'is_completed': overall_progress >= 100,
            'requirements_progress': progress,
            'estimated_time': mission.get('estimated_time', 'Không xác định'),
            'svt_reward': mission.get('svt_reward', 0)
        }
    
    def get_next_recommendations(self, customer_data: Dict, completed_missions: List[str]) -> List[Dict]:
        """Đề xuất nhiệm vụ tiếp theo cho khách hàng"""
        available_missions = self.get_available_missions(customer_data, completed_missions)
        
        # Sắp xếp theo độ ưu tiên
        def mission_priority(mission):
            priority_map = {
                MissionCategory.ONBOARDING.value: 10,
                MissionCategory.PROFILE.value: 9,
                MissionCategory.FINANCIAL.value: 8,
                MissionCategory.TRAVEL.value: 7,
                MissionCategory.LIFESTYLE.value: 6,
                MissionCategory.SOCIAL.value: 5,
                MissionCategory.INVESTMENT.value: 4,
                MissionCategory.LOYALTY.value: 3
            }
            
            category_priority = priority_map.get(mission['category'].value, 0)
            svt_reward = mission.get('svt_reward', 0)
            
            return category_priority * 1000 + svt_reward
        
        available_missions.sort(key=mission_priority, reverse=True)
        
        # Trả về top 5 nhiệm vụ đề xuất
        return available_missions[:5]


# Khởi tạo hệ thống progression
mission_system = MissionProgressionSystem()


def get_missions_for_customer(customer_id: int) -> Dict:
    """API function để lấy nhiệm vụ cho khách hàng cụ thể"""
    try:
        # Lấy dữ liệu khách hàng từ database (sẽ implement trong API)
        customer_data = {
            'customer_id': customer_id,
            'created_at': datetime.datetime.now() - datetime.timedelta(days=15),  # Mock: 15 ngày trước
            'transaction_count': 5,
            'total_spending': 10000000,  # 10M VND
            'login_count': 10,
            'ai_interactions': 3,
            'features_explored': 2,
            'profile_completeness': 60,
            # ... thêm các field khác
        }
        
        # Lấy danh sách nhiệm vụ đã hoàn thành (sẽ lấy từ database)
        completed_missions = ['new_welcome', 'new_profile_basic']  # Mock data
        
        customer_type = mission_system.get_customer_type(customer_data)
        available_missions = mission_system.get_available_missions(customer_data, completed_missions)
        recommendations = mission_system.get_next_recommendations(customer_data, completed_missions)
        
        return {
            'customer_id': customer_id,
            'customer_type': customer_type.value,
            'available_missions': available_missions,
            'recommended_missions': recommendations,
            'completed_missions': completed_missions,
            'total_completed': len(completed_missions),
            'total_available': len(available_missions)
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'customer_id': customer_id
        }


if __name__ == "__main__":
    # Test hệ thống
    print("🚀 Testing Mission Progression System...")
    
    # Test với khách hàng mới
    result = get_missions_for_customer(2015)
    print(f"\n📊 Kết quả cho khách hàng {result['customer_id']}:")
    print(f"   Loại khách hàng: {result['customer_type']}")
    print(f"   Nhiệm vụ khả dụng: {result['total_available']}")
    print(f"   Nhiệm vụ đề xuất: {len(result['recommended_missions'])}")
    
    print("\n🎯 Top 3 nhiệm vụ đề xuất:")
    for i, mission in enumerate(result['recommended_missions'][:3], 1):
        print(f"   {i}. {mission['icon']} {mission['title']}")
        print(f"      📝 {mission['description']}")
        print(f"      💰 Thưởng: {mission['svt_reward']} SVT")
        print(f"      ⏱️ Thời gian: {mission['estimated_time']}")
        print()
