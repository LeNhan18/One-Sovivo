"""
Hệ thống mission progression chi tiết theo yêu cầu
Bao gồm 5 nhóm nhiệm vụ chính: Chào mừng, Hàng ngày, Tài chính, Du lịch, Cộng đồng
"""

from enum import Enum
from typing import Dict, List, Optional
import json
from datetime import datetime, timedelta

class MissionCategory(Enum):
    WELCOME = "welcome"           # Nhiệm vụ chào mừng
    DAILY = "daily"              # Nhiệm vụ hàng ngày/tuần
    FINANCIAL = "financial"      # Nhiệm vụ tài chính
    TRAVEL = "travel"           # Nhiệm vụ du lịch
    SOCIAL = "social"           # Nhiệm vụ cộng đồng

class MissionLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class CustomerType(Enum):
    NEW = "new"
    REGULAR = "regular"
    VIP = "vip"

class DetailedMissionSystem:
    def __init__(self):
        self.mission_templates = self._init_comprehensive_missions()
        
    def _init_comprehensive_missions(self) -> Dict:
        """Initialize all detailed missions according to user requirements"""
        return {
            # ===== 1. NHIỆM VỤ CHÀO MỪNG (Dành cho người dùng mới) 🚀 =====
            'complete_profile': {
                'id': 'complete_profile',
                'title': 'Hoàn thành Hồ sơ Cá nhân',
                'description': 'Cập nhật đầy đủ thông tin cá nhân (tên, ngày sinh, SĐT)',
                'category': MissionCategory.WELCOME.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 100,
                'reward_currency': 'SVT',
                'prerequisites': [],
                'customer_types': [CustomerType.NEW.value],
                'action_type': 'profile_update',
                'target_value': 1,
                'icon': '👤',
                'estimated_time': '5 phút',
                'instructions': [
                    'Truy cập vào phần "Hồ sơ cá nhân"',
                    'Điền đầy đủ họ tên',
                    'Nhập ngày sinh chính xác', 
                    'Cập nhật số điện thoại',
                    'Lưu thông tin'
                ],
                'validation_criteria': {
                    'full_name_completed': True,
                    'birth_date_completed': True,
                    'phone_number_completed': True
                }
            },
            
            'link_hdbank': {
                'id': 'link_hdbank',
                'title': 'Liên kết tài khoản HDBank',
                'description': 'Kết nối tài khoản ngân hàng HDBank hiện có vào ứng dụng',
                'category': MissionCategory.WELCOME.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 300,
                'reward_currency': 'SVT',
                'prerequisites': ['complete_profile'],
                'customer_types': [CustomerType.NEW.value],
                'action_type': 'account_link',
                'target_value': 1,
                'icon': '🏦',
                'estimated_time': '10 phút',
                'instructions': [
                    'Truy cập "Liên kết tài khoản"',
                    'Chọn HDBank từ danh sách ngân hàng',
                    'Nhập thông tin tài khoản HDBank',
                    'Xác thực OTP',
                    'Hoàn tất liên kết'
                ],
                'validation_criteria': {
                    'hdbank_account_linked': True,
                    'account_verified': True
                }
            },
            
            'link_vietjet_skyjoy': {
                'id': 'link_vietjet_skyjoy',
                'title': 'Liên kết tài khoản Vietjet SkyJoy',
                'description': 'Kết nối tài khoản khách hàng thân thiết của Vietjet',
                'category': MissionCategory.WELCOME.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 200,
                'reward_currency': 'SVT',
                'prerequisites': ['complete_profile'],
                'customer_types': [CustomerType.NEW.value],
                'action_type': 'vietjet_link',
                'target_value': 1,
                'icon': '✈️',
                'estimated_time': '8 phút',
                'instructions': [
                    'Vào phần "Đối tác liên kết"',
                    'Chọn Vietjet SkyJoy',
                    'Nhập thông tin tài khoản SkyJoy',
                    'Xác thực tài khoản',
                    'Đồng bộ điểm thưởng'
                ],
                'validation_criteria': {
                    'vietjet_account_linked': True,
                    'skyjoy_points_synced': True
                }
            },
            
            'first_transaction': {
                'id': 'first_transaction',
                'title': 'Thực hiện Giao dịch Đầu tiên',
                'description': 'Dùng thẻ HDBank thanh toán cho một dịch vụ bất kỳ',
                'category': MissionCategory.WELCOME.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 150,
                'reward_currency': 'SVT',
                'prerequisites': ['link_hdbank'],
                'customer_types': [CustomerType.NEW.value],
                'action_type': 'transaction',
                'target_value': 1,
                'icon': '💳',
                'estimated_time': '15 phút',
                'instructions': [
                    'Sử dụng thẻ HDBank đã liên kết',
                    'Thanh toán cho bất kỳ dịch vụ nào',
                    'Đảm bảo giao dịch thành công',
                    'Kiểm tra thông báo xác nhận'
                ],
                'validation_criteria': {
                    'transaction_completed': True,
                    'hdbank_card_used': True,
                    'transaction_amount_min': 10000
                }
            },
            
            # ===== 2. NHIỆM VỤ HÀNG NGÀY / HÀNG TUẦN 🗓️ =====
            'daily_login': {
                'id': 'daily_login',
                'title': 'Đăng nhập mỗi ngày',
                'description': 'Mở ứng dụng và đăng nhập hàng ngày (+10 SVT, thưởng thêm nếu đăng nhập chuỗi 7 ngày)',
                'category': MissionCategory.DAILY.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 10,
                'reward_currency': 'SVT',
                'bonus_rewards': {
                    '7_day_streak': 70,    # Thưởng thêm cho 7 ngày liên tiếp
                    '30_day_streak': 300   # Thưởng thêm cho 30 ngày liên tiếp
                },
                'prerequisites': [],
                'customer_types': [CustomerType.NEW.value, CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'daily_login',
                'target_value': 1,
                'is_repeatable': True,
                'reset_frequency': 'daily',
                'icon': '📱',
                'estimated_time': '1 phút',
                'validation_criteria': {
                    'app_opened': True,
                    'user_authenticated': True,
                    'daily_login_recorded': True
                }
            },
            
            'read_financial_news': {
                'id': 'read_financial_news',
                'title': 'Đọc tin tức Tài chính',
                'description': 'Đọc một bài viết từ chuyên mục "Tin tức & Phân tích" trong ứng dụng',
                'category': MissionCategory.DAILY.value,
                'level': MissionLevel.BEGINNER.value,
                'reward_amount': 5,
                'reward_currency': 'SVT',
                'prerequisites': [],
                'customer_types': [CustomerType.NEW.value, CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'read_news',
                'target_value': 1,
                'is_repeatable': True,
                'reset_frequency': 'daily',
                'icon': '📰',
                'estimated_time': '5 phút',
                'instructions': [
                    'Truy cập chuyên mục "Tin tức & Phân tích"',
                    'Chọn một bài viết tài chính',
                    'Đọc ít nhất 80% nội dung bài viết',
                    'Hoàn tất việc đọc'
                ],
                'validation_criteria': {
                    'news_article_opened': True,
                    'reading_time_min_seconds': 60,
                    'article_completion_rate': 0.8
                }
            },
            
            'spending_challenge': {
                'id': 'spending_challenge',
                'title': 'Thử thách Chi tiêu',
                'description': 'Giữ mức chi tiêu trong ngày dưới một hạn mức nhất định',
                'category': MissionCategory.DAILY.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 20,
                'reward_currency': 'SVT',
                'prerequisites': ['first_transaction'],
                'customer_types': [CustomerType.NEW.value, CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'spending_control',
                'target_value': 1,
                'is_repeatable': True,
                'reset_frequency': 'daily',
                'icon': '💰',
                'estimated_time': '24 giờ',
                'spending_limits': {
                    CustomerType.NEW.value: 500000,      # 500k VNĐ
                    CustomerType.REGULAR.value: 1000000, # 1M VNĐ
                    CustomerType.VIP.value: 2000000      # 2M VNĐ
                },
                'validation_criteria': {
                    'daily_spending_tracked': True,
                    'spending_under_limit': True
                }
            },
            
            # ===== 3. NHIỆM VỤ TÀI CHÍNH (HDBank & HD Saison) 🏦 =====
            'open_savings_account': {
                'id': 'open_savings_account',
                'title': 'Mở Sổ tiết kiệm Online',
                'description': 'Mở một sổ tiết kiệm mới với giá trị tối thiểu 10.000.000 VNĐ',
                'category': MissionCategory.FINANCIAL.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 1000,
                'reward_currency': 'SVT',
                'prerequisites': ['first_transaction'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'open_savings',
                'target_value': 10000000,
                'icon': '🏦',
                'estimated_time': '30 phút',
                'instructions': [
                    'Truy cập "Dịch vụ ngân hàng"',
                    'Chọn "Mở sổ tiết kiệm online"',
                    'Điền thông tin sổ tiết kiệm',
                    'Nạp tối thiểu 10.000.000 VNĐ',
                    'Xác nhận mở sổ'
                ],
                'validation_criteria': {
                    'savings_account_created': True,
                    'initial_deposit_min': 10000000,
                    'account_status_active': True
                }
            },
            
            'maintain_average_balance': {
                'id': 'maintain_average_balance',
                'title': 'Duy trì Số dư Trung bình',
                'description': 'Giữ số dư trung bình trong tài khoản thanh toán trên 50.000.000 VNĐ trong một tháng',
                'category': MissionCategory.FINANCIAL.value,
                'level': MissionLevel.ADVANCED.value,
                'reward_amount': 500,
                'reward_currency': 'SVT',
                'prerequisites': ['open_savings_account'],
                'customer_types': [CustomerType.VIP.value],
                'action_type': 'maintain_balance',
                'target_value': 50000000,
                'is_repeatable': True,
                'reset_frequency': 'monthly',
                'icon': '💎',
                'estimated_time': '30 ngày',
                'instructions': [
                    'Duy trì số dư trung bình hàng tháng',
                    'Theo dõi báo cáo số dư hàng ngày',
                    'Đảm bảo không rút quá nhiều tiền',
                    'Kiểm tra báo cáo cuối tháng'
                ],
                'validation_criteria': {
                    'monthly_average_balance_min': 50000000,
                    'balance_tracking_enabled': True
                }
            },
            
            'auto_bill_payment': {
                'id': 'auto_bill_payment',
                'title': 'Thanh toán Hóa đơn Tự động',
                'description': 'Đăng ký thành công dịch vụ thanh toán tự động cho hóa đơn điện/nước/internet',
                'category': MissionCategory.FINANCIAL.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 250,
                'reward_currency': 'SVT',
                'prerequisites': ['first_transaction'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'auto_payment',
                'target_value': 1,
                'icon': '⚡',
                'estimated_time': '20 phút',
                'supported_bills': ['electricity', 'water', 'internet', 'mobile'],
                'instructions': [
                    'Vào "Thanh toán hóa đơn"',
                    'Chọn loại hóa đơn (điện/nước/internet)',
                    'Nhập thông tin hóa đơn',
                    'Thiết lập thanh toán tự động',
                    'Xác nhận đăng ký'
                ],
                'validation_criteria': {
                    'auto_payment_registered': True,
                    'bill_info_verified': True,
                    'payment_schedule_set': True
                }
            },
            
            # ===== 4. NHIỆM VỤ DU LỊCH & PHONG CÁCH SỐNG (Vietjet & Resorts) ✈️🏨 =====
            'fly_new_destination': {
                'id': 'fly_new_destination',
                'title': 'Bay đến một Điểm đến Mới',
                'description': 'Thực hiện một chuyến bay đến một thành phố mà bạn chưa từng bay đến với Vietjet',
                'category': MissionCategory.TRAVEL.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 800,
                'reward_currency': 'SVT',
                'prerequisites': ['link_vietjet_skyjoy'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'new_destination',
                'target_value': 1,
                'icon': '🌍',
                'estimated_time': '2-5 giờ bay',
                'popular_destinations': [
                    'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Nha Trang', 'Phú Quốc',
                    'Bangkok', 'Seoul', 'Tokyo', 'Singapore', 'Kuala Lumpur'
                ],
                'instructions': [
                    'Truy cập "Đặt vé máy bay"',
                    'Chọn điểm đến chưa từng bay',
                    'Đặt vé thành công',
                    'Hoàn thành chuyến bay',
                    'Check-in tại sân bay đích'
                ],
                'validation_criteria': {
                    'flight_booked': True,
                    'new_destination_confirmed': True,
                    'flight_completed': True,
                    'vietjet_airline_used': True
                }
            },
            
            'upgrade_flight_class': {
                'id': 'upgrade_flight_class',
                'title': 'Nâng cấp Hạng vé',
                'description': 'Lần đầu tiên trải nghiệm hạng vé Business / SkyBoss',
                'category': MissionCategory.TRAVEL.value,
                'level': MissionLevel.ADVANCED.value,
                'reward_amount': 1500,
                'reward_currency': 'SVT',
                'prerequisites': ['fly_new_destination'],
                'customer_types': [CustomerType.VIP.value],
                'action_type': 'upgrade_class',
                'target_value': 1,
                'icon': '🥇',
                'estimated_time': '2-5 giờ bay',
                'class_options': ['Business', 'SkyBoss'],
                'instructions': [
                    'Đặt vé hạng Business hoặc SkyBoss',
                    'Hoặc nâng cấp từ hạng Economy',
                    'Hoàn thành chuyến bay',
                    'Trải nghiệm dịch vụ cao cấp'
                ],
                'validation_criteria': {
                    'premium_class_booked': True,
                    'flight_completed': True,
                    'first_time_premium': True
                }
            },
            
            'resort_review': {
                'id': 'resort_review',
                'title': 'Viết Đánh giá Resort',
                'description': 'Sau khi nghỉ dưỡng tại một resort trong hệ thống, viết một bài đánh giá chi tiết',
                'category': MissionCategory.TRAVEL.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 500,
                'reward_currency': 'SVT',
                'prerequisites': ['fly_new_destination'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'resort_review',
                'target_value': 1,
                'is_repeatable': True,
                'icon': '🏨',
                'estimated_time': '15 phút viết đánh giá',
                'review_requirements': {
                    'min_words': 100,
                    'rating_required': True,
                    'photos_min': 3,
                    'categories': ['service', 'location', 'facilities', 'value']
                },
                'instructions': [
                    'Nghỉ dưỡng tại resort đối tác',
                    'Vào "Đánh giá dịch vụ"',
                    'Viết đánh giá chi tiết (tối thiểu 100 từ)',
                    'Đánh giá theo từng tiêu chí',
                    'Đăng ảnh và gửi đánh giá'
                ],
                'validation_criteria': {
                    'resort_stay_confirmed': True,
                    'review_word_count_min': 100,
                    'rating_provided': True,
                    'photos_uploaded': True
                }
            },
            
            # ===== 5. NHIỆM VỤ CỘNG ĐỒNG & XÃ HỘI 🤝 =====
            'refer_friend_success': {
                'id': 'refer_friend_success',
                'title': 'Mời bạn bè thành công',
                'description': 'Gửi link giới thiệu và bạn bè của bạn đăng ký tài khoản thành công (+1,000 SVT cho mỗi lượt)',
                'category': MissionCategory.SOCIAL.value,
                'level': MissionLevel.ADVANCED.value,
                'reward_amount': 1000,
                'reward_currency': 'SVT',
                'prerequisites': ['first_transaction'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'successful_referral',
                'target_value': 1,
                'is_repeatable': True,
                'icon': '👥',
                'estimated_time': '5 phút + thời gian bạn bè đăng ký',
                'bonus_rewards': {
                    '5_friends': 2000,   # Thưởng thêm khi mời được 5 bạn
                    '10_friends': 5000   # Thưởng thêm khi mời được 10 bạn
                },
                'instructions': [
                    'Vào "Giới thiệu bạn bè"',
                    'Sao chép link giới thiệu',
                    'Gửi link cho bạn bè',
                    'Bạn bè đăng ký thành công',
                    'Bạn bè hoàn thành giao dịch đầu tiên'
                ],
                'validation_criteria': {
                    'referral_link_shared': True,
                    'friend_registered': True,
                    'friend_first_transaction': True
                }
            },
            
            'share_achievement': {
                'id': 'share_achievement',
                'title': 'Chia sẻ Thành tựu',
                'description': 'Chia sẻ Hộ chiếu NFT hoặc một huy hiệu vừa đạt được lên mạng xã hội',
                'category': MissionCategory.SOCIAL.value,
                'level': MissionLevel.INTERMEDIATE.value,
                'reward_amount': 100,
                'reward_currency': 'SVT',
                'prerequisites': ['first_transaction'],
                'customer_types': [CustomerType.REGULAR.value, CustomerType.VIP.value],
                'action_type': 'share_achievement',
                'target_value': 1,
                'is_repeatable': True,
                'icon': '📱',
                'estimated_time': '3 phút',
                'supported_platforms': ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'Zalo'],
                'shareable_achievements': ['NFT Passport', 'Badges', 'Level Progress', 'SVT Balance'],
                'instructions': [
                    'Đạt được một thành tựu bất kỳ',
                    'Vào "Hộ chiếu NFT" hoặc "Huy hiệu"',
                    'Chọn "Chia sẻ"',
                    'Chọn nền tảng mạng xã hội',
                    'Đăng và chia sẻ thành công'
                ],
                'validation_criteria': {
                    'achievement_earned': True,
                    'social_share_completed': True,
                    'platform_verified': True
                }
            }
        }
    
    def get_missions_for_customer(self, customer_id: str, customer_type: str, completed_missions: List[str] = None) -> List[Dict]:
        """Lấy danh sách nhiệm vụ phù hợp cho khách hàng"""
        if completed_missions is None:
            completed_missions = []
            
        available_missions = []
        
        for mission_id, mission in self.mission_templates.items():
            # Kiểm tra loại khách hàng
            if customer_type not in mission['customer_types']:
                continue
                
            # Kiểm tra nhiệm vụ đã hoàn thành
            if mission_id in completed_missions and not mission.get('is_repeatable', False):
                continue
                
            # Kiểm tra điều kiện tiên quyết
            prerequisites_met = all(
                prereq in completed_missions 
                for prereq in mission.get('prerequisites', [])
            )
            
            if not prerequisites_met:
                continue
                
            available_missions.append(mission)
        
        # Sắp xếp theo độ ưu tiên (Welcome > Daily > Financial > Travel > Social)
        priority_order = {
            MissionCategory.WELCOME.value: 1,
            MissionCategory.DAILY.value: 2, 
            MissionCategory.FINANCIAL.value: 3,
            MissionCategory.TRAVEL.value: 4,
            MissionCategory.SOCIAL.value: 5
        }
        
        available_missions.sort(
            key=lambda m: (priority_order.get(m['category'], 6), m['level'])
        )
        
        return available_missions
    
    def get_mission_by_id(self, mission_id: str) -> Optional[Dict]:
        """Lấy thông tin chi tiết một nhiệm vụ"""
        return self.mission_templates.get(mission_id)
    
    def get_next_recommended_missions(self, customer_id: str, customer_type: str, completed_missions: List[str]) -> List[Dict]:
        """Gợi ý nhiệm vụ tiếp theo cho khách hàng"""
        available_missions = self.get_missions_for_customer(customer_id, customer_type, completed_missions)
        
        # Ưu tiên nhiệm vụ chào mừng cho khách hàng mới
        if customer_type == CustomerType.NEW.value:
            welcome_missions = [m for m in available_missions if m['category'] == MissionCategory.WELCOME.value]
            if welcome_missions:
                return welcome_missions[:3]
        
        # Ưu tiên nhiệm vụ hàng ngày
        daily_missions = [m for m in available_missions if m['category'] == MissionCategory.DAILY.value]
        other_missions = [m for m in available_missions if m['category'] != MissionCategory.DAILY.value]
        
        # Trả về tối đa 5 nhiệm vụ (2 hàng ngày + 3 khác)
        recommended = daily_missions[:2] + other_missions[:3]
        return recommended[:5]
    
    def calculate_mission_progress(self, mission_id: str, current_value: float, target_value: float = None) -> Dict:
        """Tính toán tiến độ hoàn thành nhiệm vụ"""
        mission = self.get_mission_by_id(mission_id)
        if not mission:
            return None
            
        if target_value is None:
            target_value = mission.get('target_value', 1)
            
        progress_percentage = min(100, (current_value / target_value) * 100)
        is_completed = current_value >= target_value
        
        return {
            'mission_id': mission_id,
            'current_value': current_value,
            'target_value': target_value,
            'progress_percentage': progress_percentage,
            'is_completed': is_completed,
            'reward_amount': mission['reward_amount'] if is_completed else 0
        }
    
    def export_missions_json(self) -> str:
        """Export tất cả missions ra JSON để import vào database"""
        return json.dumps(self.mission_templates, indent=2, ensure_ascii=False)

# Test function
if __name__ == "__main__":
    mission_system = DetailedMissionSystem()
    
    # Test cho khách hàng mới
    print("=== MISSIONS FOR NEW CUSTOMER ===")
    new_missions = mission_system.get_missions_for_customer("new_customer", CustomerType.NEW.value)
    for mission in new_missions[:5]:
        print(f"• {mission['title']} - {mission['reward_amount']} SVT")
    
    print("\n=== RECOMMENDED NEXT MISSIONS ===")
    completed = ['complete_profile', 'link_hdbank']
    recommendations = mission_system.get_next_recommended_missions("customer_123", CustomerType.NEW.value, completed)
    for mission in recommendations:
        print(f"• {mission['title']} - {mission['reward_amount']} SVT")
        
    print(f"\n=== TOTAL MISSIONS: {len(mission_system.mission_templates)} ===")
