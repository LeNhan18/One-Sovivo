# routes/admin_api_routes.py
# -*- coding: utf-8 -*-
"""
Admin API routes under /api/admin (auth-required), split from app.py without behavior changes.
This mirrors the admin endpoints in the monolithic app so the modular app exposes identical APIs.
"""
from flask import Blueprint, request, jsonify
from services.auth_service import require_auth
from models import db
from models.customer import Customer
from models.achievements import Achievement, CustomerAchievement
from models import transactions as tx
from models.flights import VietjetFlight
from models.resorts import ResortBooking
import datetime
import uuid
import random

admin_api_bp = Blueprint('admin_api', __name__, url_prefix='/api/admin')


def _ensure_admin():
    user = getattr(request, 'current_user', None)
    if not user or getattr(user, 'role', 'customer') != 'admin':
        return {'error': 'Chỉ admin mới có quyền thực hiện'}, 403
    return None


@admin_api_bp.route('/assign-achievement', methods=['POST'])
@require_auth
def assign_achievement_to_customer():
    try:
        # Check admin
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        data = request.get_json() or {}
        customer_id = data.get('customer_id')
        achievement_id = data.get('achievement_id')
        admin_note = data.get('admin_note', '')

        if not customer_id or not achievement_id:
            return jsonify({'error': 'Thiếu customer_id hoặc achievement_id'}), 400

        # Customer exists?
        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404

        # Achievement exists?
        achievement = Achievement.query.get(achievement_id)
        if not achievement:
            return jsonify({'error': f'Achievement {achievement_id} không tồn tại'}), 404

        # Already assigned?
        existing = CustomerAchievement.query.filter_by(
            customer_id=customer_id,
            achievement_id=achievement_id
        ).first()
        if existing:
            return jsonify({
                'error': f'Khách hàng đã có achievement "{achievement.name}" rồi',
                'unlocked_at': existing.unlocked_at.isoformat() if existing.unlocked_at else None
            }), 400

        # Assign
        ca = CustomerAchievement(
            customer_id=customer_id,
            achievement_id=achievement_id,
            unlocked_at=datetime.datetime.utcnow()
        )
        db.session.add(ca)

        # SVT reward
        name = (achievement.name or '').lower()
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

        if svt_reward > 0:
            token_tx = tx.TokenTransaction(
                customer_id=customer_id,
                transaction_type='achievement_reward',
                amount=svt_reward,
                description=f"Admin gán thành tựu: {achievement.name}" + (f" | {admin_note}" if admin_note else ''),
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1_000_000, 2_000_000)
            )
            db.session.add(token_tx)

        db.session.commit()

        user = request.current_user
        return jsonify({
            'success': True,
            'message': f'Đã gán thành tựu "{achievement.name}" cho {customer.name}',
            'customer_id': customer_id,
            'customer_name': customer.name,
            'achievement': achievement.to_dict(),
            'svt_reward': svt_reward,
            'assigned_by': getattr(user, 'email', None),
            'assigned_at': ca.unlocked_at.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi gán thành tựu: {str(e)}'}), 500


@admin_api_bp.route('/achievements', methods=['GET'])
@require_auth
def get_all_achievements():
    try:
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        achievements = Achievement.query.all()
        result = []
        for a in achievements:
            customer_count = CustomerAchievement.query.filter_by(achievement_id=a.id).count()
            d = a.to_dict()
            d['customer_count'] = customer_count
            result.append(d)
        return jsonify({'success': True, 'achievements': result, 'total': len(result)})
    except Exception as e:
        return jsonify({'error': f'Lỗi lấy danh sách achievements: {str(e)}'}), 500


@admin_api_bp.route('/create-achievement', methods=['POST'])
@require_auth
def create_new_achievement():
    try:
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = (data.get('description') or '').strip()
        badge_image_url = data.get('badge_image_url', '/static/badges/default.png')

        if not name or not description:
            return jsonify({'error': 'Thiếu tên hoặc mô tả achievement'}), 400

        existing = Achievement.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': f'Achievement "{name}" đã tồn tại'}), 400

        ach = Achievement(name=name, description=description, badge_image_url=badge_image_url)
        db.session.add(ach)
        db.session.commit()

        user = request.current_user
        return jsonify({
            'success': True,
            'message': f'Đã tạo achievement "{name}" thành công',
            'achievement': ach.to_dict(),
            'created_by': getattr(user, 'email', None)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi tạo achievement: {str(e)}'}), 500


@admin_api_bp.route('/customer/<int:customer_id>/achievements', methods=['GET'])
@require_auth
def get_customer_achievements_for_admin(customer_id):
    try:
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404

        all_achievements = Achievement.query.all()
        owned = CustomerAchievement.query.filter_by(customer_id=customer_id).all()
        owned_ids = {ca.achievement_id for ca in owned}

        achieved_list = []
        available_list = []
        for ach in all_achievements:
            data = ach.to_dict()
            if ach.id in owned_ids:
                ca = next(c for c in owned if c.achievement_id == ach.id)
                data['unlocked_at'] = ca.unlocked_at.isoformat() if ca.unlocked_at else None
                achieved_list.append(data)
            else:
                available_list.append(data)

        total_flights = VietjetFlight.query.filter_by(customer_id=customer_id).count()
        total_resort_nights = db.session.query(db.func.sum(ResortBooking.nights_stayed)).filter_by(customer_id=customer_id).scalar() or 0
        avg_balance = db.session.query(db.func.avg(tx.HDBankTransaction.balance)).filter_by(customer_id=customer_id).scalar() or 0

        return jsonify({
            'success': True,
            'customer': {
                'customer_id': customer_id,
                'name': customer.name,
                'age': customer.age,
                'city': customer.city,
                'persona_type': customer.persona_type
            },
            'achievements': {
                'achieved': achieved_list,
                'available_to_assign': available_list,
                'total_achieved': len(achieved_list),
                'total_available': len(available_list)
            },
            'customer_stats': {
                'total_flights': total_flights,
                'total_resort_nights': int(total_resort_nights),
                'avg_balance': float(avg_balance),
                'member_since': customer.created_at.strftime('%Y-%m-%d') if customer.created_at else None
            },
            'suggested_achievements': _suggest_achievements(customer_id, total_flights, total_resort_nights, avg_balance)
        })
    except Exception as e:
        return jsonify({'error': f'Lỗi lấy thông tin: {str(e)}'}), 500


def _suggest_achievements(customer_id, total_flights, total_resort_nights, avg_balance):
    suggestions = []
    existing = db.session.query(CustomerAchievement.achievement_id).filter_by(customer_id=customer_id).all()
    existing_ids = {x.achievement_id for x in existing}

    def _maybe_add(name, reason, confidence='high'):
        ach = Achievement.query.filter_by(name=name).first()
        if ach and ach.id not in existing_ids:
            suggestions.append({'achievement_id': ach.id, 'achievement_name': ach.name, 'reason': reason, 'confidence': confidence})

    if total_flights >= 20:
        _maybe_add('Phi công Vàng', f'Khách hàng đã bay {total_flights} chuyến (≥20 chuyến)')
    elif total_flights >= 10:
        _maybe_add('Phi công Bạc', f'Khách hàng đã bay {total_flights} chuyến (≥10 chuyến)')
    elif total_flights >= 5:
        _maybe_add('Phi công Đồng', f'Khách hàng đã bay {total_flights} chuyến (≥5 chuyến)')

    if avg_balance >= 100_000_000:
        _maybe_add('Khách hàng VIP', f'Số dư trung bình {avg_balance:,.0f} VNĐ (≥100 triệu)')

    if total_resort_nights >= 10:
        _maybe_add('Người du lịch', f'Đã nghỉ dưỡng {total_resort_nights} đêm (≥10 đêm)', confidence='medium')

    return suggestions[:5]


@admin_api_bp.route('/bulk-assign-achievements', methods=['POST'])
@require_auth
def bulk_assign_achievements():
    try:
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        data = request.get_json() or {}
        customer_ids = data.get('customer_ids', [])
        achievement_id = data.get('achievement_id')
        admin_note = data.get('admin_note', 'Bulk assignment')

        if not customer_ids or not achievement_id:
            return jsonify({'error': 'Thiếu customer_ids hoặc achievement_id'}), 400

        ach = Achievement.query.get(achievement_id)
        if not ach:
            return jsonify({'error': f'Achievement {achievement_id} không tồn tại'}), 404

        success_count = 0
        errors = []
        for cid in customer_ids:
            try:
                customer = Customer.query.filter_by(customer_id=cid).first()
                if not customer:
                    errors.append(f'Customer {cid}: không tồn tại')
                    continue
                existing = CustomerAchievement.query.filter_by(customer_id=cid, achievement_id=achievement_id).first()
                if existing:
                    errors.append(f'Customer {cid}: đã có achievement này')
                    continue

                ca = CustomerAchievement(customer_id=cid, achievement_id=achievement_id, unlocked_at=datetime.datetime.utcnow())
                db.session.add(ca)

                token_tx = tx.TokenTransaction(
                    customer_id=cid,
                    transaction_type='achievement_reward',
                    amount=500,
                    description=f"Bulk assignment: {ach.name} | {admin_note}",
                    tx_hash=f"0x{uuid.uuid4().hex}",
                    block_number=random.randint(1_000_000, 2_000_000)
                )
                db.session.add(token_tx)

                success_count += 1
            except Exception as e:
                errors.append(f'Customer {cid}: {str(e)}')

        db.session.commit()

        user = request.current_user
        return jsonify({
            'success': True,
            'message': f'Đã gán "{ach.name}" cho {success_count} khách hàng',
            'achievement_name': ach.name,
            'success_count': success_count,
            'total_requested': len(customer_ids),
            'errors': errors,
            'assigned_by': getattr(user, 'email', None)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi gán hàng loạt: {str(e)}'}), 500


@admin_api_bp.route('/auto-assign-achievements/<int:customer_id>', methods=['POST'])
@require_auth
def auto_assign_achievements(customer_id):
    try:
        err = _ensure_admin()
        if err:
            return jsonify(err[0]), err[1]

        customer = Customer.query.filter_by(customer_id=customer_id).first()
        if not customer:
            return jsonify({'error': f'Khách hàng {customer_id} không tồn tại'}), 404

        total_flights = VietjetFlight.query.filter_by(customer_id=customer_id).count()
        total_resort_nights = db.session.query(db.func.sum(ResortBooking.nights_stayed)).filter_by(customer_id=customer_id).scalar() or 0
        avg_balance = db.session.query(db.func.avg(tx.HDBankTransaction.balance)).filter_by(customer_id=customer_id).scalar() or 0
        total_transactions = tx.HDBankTransaction.query.filter_by(customer_id=customer_id).count()

        # Achievements already owned
        existing = db.session.query(CustomerAchievement.achievement_id).filter_by(customer_id=customer_id).all()
        existing_ids = {x.achievement_id for x in existing}

        assigned = []
        reward_total = 0

        def _assign_by_name(name, reason, reward):
            nonlocal reward_total
            ach = Achievement.query.filter_by(name=name).first()
            if not ach or ach.id in existing_ids:
                return
            ca = CustomerAchievement(customer_id=customer_id, achievement_id=ach.id, unlocked_at=datetime.datetime.utcnow())
            db.session.add(ca)
            token_tx = tx.TokenTransaction(
                customer_id=customer_id,
                transaction_type='auto_achievement_reward',
                amount=reward,
                description=f"Tự động gán: {name} | {reason}",
                tx_hash=f"0x{uuid.uuid4().hex}",
                block_number=random.randint(1_000_000, 2_000_000)
            )
            db.session.add(token_tx)
            assigned.append(name)
            reward_total += reward

        if total_flights >= 20:
            _assign_by_name('Phi công Vàng', '≥20 chuyến bay', 2000)
        elif total_flights >= 10:
            _assign_by_name('Phi công Bạc', '≥10 chuyến bay', 1500)
        elif total_flights >= 5:
            _assign_by_name('Phi công Đồng', '≥5 chuyến bay', 1000)

        if avg_balance >= 100_000_000:
            _assign_by_name('Khách hàng VIP', f'Số dư TB {avg_balance:,.0f} VNĐ', 1500)

        if total_resort_nights >= 10:
            _assign_by_name('Người du lịch', f'{total_resort_nights} đêm nghỉ dưỡng', 800)

        # Optional: Pioneer based on transaction count
        if total_transactions >= 100:
            _assign_by_name('Người tiên phong', f'{total_transactions} giao dịch', 600)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đã tự động gán {len(assigned)} achievements cho {customer.name}',
            'customer': {'customer_id': customer_id, 'name': customer.name},
            'assigned_achievements': assigned,
            'total_svt_reward': reward_total,
            'analysis_data': {
                'total_flights': total_flights,
                'avg_balance': float(avg_balance),
                'total_resort_nights': int(total_resort_nights),
                'total_transactions': total_transactions
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Lỗi tự động gán achievements: {str(e)}'}), 500
