# routes/admin_routes.py
"""
Admin routes blueprint for achievement management
"""
from flask import Blueprint, request, jsonify, send_from_directory
from models import db
from models.customer import Customer
from models.achievements import Achievement, CustomerAchievement
from models import transactions as tx
from models.flights import VietjetFlight
from models.resorts import ResortBooking
import datetime
import uuid
import random

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Import service instances will be injected later
admin_service = None
customer_service = None


def init_admin_routes(service_instances):
    """Initialize admin routes with service instances"""
    global admin_service, customer_service
    admin_service = service_instances.get('admin_service')
    customer_service = service_instances.get('customer_service')


def _check_achievement_eligibility(achievement_name, total_flights, avg_balance, total_resort_nights):
    """Kiểm tra điều kiện đủ để nhận achievement"""
    name = achievement_name.lower()
    
    # Phi công achievements
    if 'phi công vàng' in name:
        if total_flights >= 20:
            return {'eligible': True, 'reason': f'Đã bay {total_flights} chuyến (≥20)'}
        return {'eligible': False, 'reason': f'Chỉ bay {total_flights} chuyến, cần ít nhất 20 chuyến'}
    
    if 'phi công bạc' in name:
        if total_flights >= 10:
            return {'eligible': True, 'reason': f'Đã bay {total_flights} chuyến (≥10)'}
        return {'eligible': False, 'reason': f'Chỉ bay {total_flights} chuyến, cần ít nhất 10 chuyến'}
    
    if 'phi công đồng' in name:
        if total_flights >= 5:
            return {'eligible': True, 'reason': f'Đã bay {total_flights} chuyến (≥5)'}
        return {'eligible': False, 'reason': f'Chỉ bay {total_flights} chuyến, cần ít nhất 5 chuyến'}
    
    # VIP achievement
    if 'khách hàng vip' in name or 'vip' in name:
        if avg_balance >= 100_000_000:
            return {'eligible': True, 'reason': f'Số dư trung bình {avg_balance:,.0f} VNĐ (≥100 triệu)'}
        return {'eligible': False, 'reason': f'Số dư trung bình {avg_balance:,.0f} VNĐ, cần ít nhất 100 triệu VNĐ'}
    
    # Du lịch achievement
    if 'người du lịch' in name or 'du lịch' in name:
        if total_resort_nights >= 10:
            return {'eligible': True, 'reason': f'Đã nghỉ dưỡng {total_resort_nights} đêm (≥10)'}
        return {'eligible': False, 'reason': f'Chỉ nghỉ dưỡng {total_resort_nights} đêm, cần ít nhất 10 đêm'}
    
    # SVT achievements (giả định)
    if 'svt' in name:
        # Tạm thời cho phép vì chưa có data SVT
        return {'eligible': True, 'reason': 'SVT achievement (chưa kiểm tra được số dư SVT)'}
    
    # Default: cho phép các achievement khác
    return {'eligible': True, 'reason': 'Achievement đặc biệt không có điều kiện cụ thể'}


@admin_bp.route('/achievements')
def admin_achievements_page():
    """Serve admin achievements HTML page"""
    return send_from_directory('.', 'admin_achievements.html')


@admin_bp.route('/achievements/list', methods=['GET'])
def get_achievements_list():
    """API lấy danh sách achievements cho React component"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    result = admin_service.get_all_achievements()
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/customers/search', methods=['GET'])
def search_customers_admin():
    """API cho Admin tìm kiếm khách hàng"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 20))
        
        if not query_param:
            return jsonify({'customers': []})
        
        # Search by name or customer_id
        customers = Customer.query.filter(
            db.or_(
                Customer.name.ilike(f'%{query_param}%'),
                Customer.customer_id == int(query_param) if query_param.isdigit() else False
            )
        ).limit(limit).all()
        
        result = []
        for customer in customers:
            # Get customer stats
            total_flights = VietjetFlight.query.filter_by(customer_id=customer.customer_id).count()
            total_resort_nights = db.session.query(db.func.sum(ResortBooking.nights_stayed)).filter_by(customer_id=customer.customer_id).scalar() or 0
            avg_balance = db.session.query(db.func.avg(tx.HDBankTransaction.balance)).filter_by(customer_id=customer.customer_id).scalar() or 0
            total_transactions = tx.HDBankTransaction.query.filter_by(customer_id=customer.customer_id).count()
            achievement_count = CustomerAchievement.query.filter_by(customer_id=customer.customer_id).count()
            
            customer_data = {
                'customer_id': customer.customer_id,
                'name': customer.name,
                'age': customer.age,
                'gender': customer.gender,
                'city': customer.city,
                'persona_type': customer.persona_type,
                'member_since': customer.created_at.strftime('%Y-%m-%d') if customer.created_at else None,
                'stats': {
                    'flight_count': total_flights,
                    'avg_balance': float(avg_balance),
                    'resort_nights': int(total_resort_nights),
                    'total_transactions': total_transactions,
                    'achievement_count': achievement_count
                }
            }
            result.append(customer_data)
        
        return jsonify({'customers': result})
    except Exception as e:
        print(f"Error searching customers: {e}")
        return jsonify({'error': f'Lỗi tìm kiếm khách hàng: {str(e)}'}), 500


@admin_bp.route('/customer/<int:customer_id>/achievements', methods=['GET'])
def get_customer_achievements_admin(customer_id):
    """API cho Admin xem achievements của khách hàng"""
    try:
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404

        # Get customer achievements
        customer_achievements = db.session.query(
            CustomerAchievement.id,
            CustomerAchievement.achievement_id,
            Achievement.name.label('achievement_name'),
            Achievement.badge_image_url,
            CustomerAchievement.unlocked_at.label('earned_at')
        ).join(Achievement).filter(
            CustomerAchievement.customer_id == customer_id
        ).all()
        
        achievements_data = []
        for ca in customer_achievements:
            # Calculate SVT reward based on achievement name
            name = (ca.achievement_name or '').lower()
            svt_reward = 0
            if 'vàng' in name:
                svt_reward = 2000
            elif 'bạc' in name:
                svt_reward = 1500
            elif 'đồng' in name:
                svt_reward = 1000
            elif 'vip' in name:
                svt_reward = 1500
            elif 'du lịch' in name:
                svt_reward = 800
            else:
                svt_reward = 500
                
            achievements_data.append({
                'id': ca.id,
                'achievement_id': ca.achievement_id,
                'achievement_name': ca.achievement_name,
                'badge_image_url': ca.badge_image_url,
                'earned_at': ca.earned_at.isoformat() if ca.earned_at else None,
                'svt_reward': svt_reward
            })

        return jsonify({'achievements': achievements_data})
    except Exception as e:
        print(f"Error fetching customer achievements: {e}")
        return jsonify({'error': f'Lỗi lấy thông tin achievements: {str(e)}'}), 500


@admin_bp.route('/assign-achievement', methods=['POST'])
def assign_achievement_admin():
    """API gán achievement cho khách hàng"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    data = request.get_json() or {}
    result = admin_service.assign_achievement(data)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/auto-assign-achievements', methods=['POST'])
def auto_assign_achievements_admin():
    """API tự động gán achievements"""
    if not admin_service:
        return jsonify({'error': 'Admin service not available'}), 500

    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    
    if not customer_id:
        return jsonify({'error': 'Thiếu customer_id'}), 400

    result = admin_service.auto_assign_achievements(customer_id)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@admin_bp.route('/achievements', methods=['POST'])
def create_achievement():
    """API tạo achievement mới"""
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip()
        badge_image_url = data.get('badge_image_url', '/static/badges/default.png')

        if not name or not description:
            return jsonify({'error': 'Thiếu tên hoặc mô tả achievement'}), 400

        # Check if achievement with same name exists
        existing = Achievement.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': f'Achievement "{name}" đã tồn tại'}), 400

        # Create new achievement
        ach = Achievement(
            name=name, 
            description=description, 
            badge_image_url=badge_image_url
        )
        db.session.add(ach)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đã tạo achievement "{name}" thành công',
            'achievement': ach.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating achievement: {e}")
        return jsonify({'error': f'Lỗi tạo achievement: {str(e)}'}), 500


@admin_bp.route('/check-eligibility', methods=['POST'])
def check_achievement_eligibility():
    """API kiểm tra điều kiện achievement cho khách hàng"""
    try:
        data = request.get_json() or {}
        customer_id = data.get('customer_id')
        achievement_id = data.get('achievement_id')

        if not customer_id or not achievement_id:
            return jsonify({'error': 'Thiếu customer_id hoặc achievement_id'}), 400

        # Check if customer exists
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404

        # Check if achievement exists
        achievement = Achievement.query.get(achievement_id)
        if not achievement:
            return jsonify({'error': f'Achievement {achievement_id} không tồn tại'}), 404

        # Get customer stats
        total_flights = VietjetFlight.query.filter_by(customer_id=customer_id).count()
        total_resort_nights = db.session.query(db.func.sum(ResortBooking.nights_stayed)).filter_by(customer_id=customer_id).scalar() or 0
        avg_balance = db.session.query(db.func.avg(tx.HDBankTransaction.balance)).filter_by(customer_id=customer_id).scalar() or 0

        # Check eligibility
        eligibility_check = _check_achievement_eligibility(achievement.name, total_flights, avg_balance, total_resort_nights)

        return jsonify({
            'eligible': eligibility_check['eligible'],
            'reason': eligibility_check['reason'],
            'customer_stats': {
                'total_flights': total_flights,
                'avg_balance': float(avg_balance),
                'total_resort_nights': int(total_resort_nights)
            }
        })
    except Exception as e:
        print(f"Error checking eligibility: {e}")
        return jsonify({'error': f'Lỗi kiểm tra điều kiện: {str(e)}'}), 500