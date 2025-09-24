# routes/service_routes.py
# -*- coding: utf-8 -*-
"""
Service integration routes (HDBank, Vietjet, Resort)
"""

from flask import Blueprint, jsonify, request
from services.hdbank_service import HDBankService
from services.vietjet_service import VietjetService
from services.resort_service import ResortService

# Create blueprints
hdbank_bp = Blueprint('hdbank', __name__, url_prefix='/api/service/hdbank')
vietjet_bp = Blueprint('vietjet', __name__, url_prefix='/api/service/vietjet')
resort_bp = Blueprint('resort', __name__, url_prefix='/api/service/resort')

# Lazy service singletons (avoid instantiation before init_db runs)
_hdbank_service = None
_vietjet_service = None
_resort_service = None


def get_hdbank_service():
    global _hdbank_service
    if _hdbank_service is None:
        try:
            _hdbank_service = HDBankService()
        except Exception as e:
            print(f"❌ Error creating HDBankService: {e}")
            return None
    return _hdbank_service


def get_vietjet_service():
    global _vietjet_service
    if _vietjet_service is None:
        try:
            _vietjet_service = VietjetService()
        except Exception as e:
            print(f"❌ Error creating VietjetService: {e}")
            return None
    return _vietjet_service


def get_resort_service():
    global _resort_service
    if _resort_service is None:
        try:
            _resort_service = ResortService()
        except Exception as e:
            print(f"❌ Error creating ResortService: {e}")
            return None
    return _resort_service


# =============================================================================
# HDBANK ROUTES
# =============================================================================

@hdbank_bp.route('/dashboard/<int:customer_id>', methods=['GET'])
def hdbank_dashboard(customer_id):
    """Dashboard tổng quan dịch vụ HDBank cho khách hàng"""
    try:
        result = get_hdbank_service().get_dashboard_data(customer_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi tải dashboard: {str(e)}"
        }), 500


@hdbank_bp.route('/status/<int:customer_id>', methods=['GET'])
def hdbank_service_status(customer_id):
    """Kiểm tra trạng thái dịch vụ ngân hàng của khách hàng"""
    try:
        status = get_hdbank_service().get_service_status(customer_id)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'status': status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi kiểm tra trạng thái HDBank: {str(e)}'
        }), 500


@hdbank_bp.route('/transactions/<int:customer_id>', methods=['GET'])
def hdbank_transactions(customer_id):
    """Lấy lịch sử giao dịch HDBank của khách hàng"""
    try:
        limit = request.args.get('limit', 100, type=int)
        result = get_hdbank_service().get_transactions(customer_id, limit)
        status = 200 if result.get('success') else 500
        return jsonify(result), status
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy lịch sử giao dịch: {str(e)}'
        }), 500


@hdbank_bp.route('/transfer', methods=['POST'])
def hdbank_transfer():
    """Thực hiện chuyển khoản HDBank"""
    try:
        data = request.get_json() or {}
        
        # Support both legacy format and AI Assistant format
        from_customer_id = data.get('from_customer_id') or data.get('customer_id')
        to_account = data.get('to_account') or data.get('recipient_account') or "DEMO_TRANSFER_ACCOUNT"
        amount = data.get('amount')
        description = data.get('description', '') or data.get('purpose', '') or "Chuyển tiền qua AI Assistant"
        
        if not from_customer_id:
            return jsonify({
                'success': False,
                'error': 'Missing from_customer_id or customer_id'
            }), 400
            
        if not amount:
            return jsonify({
                'success': False,
                'error': 'Missing amount'
            }), 400
        
        result = get_hdbank_service().process_transfer(
            from_customer_id=from_customer_id,
            to_account=to_account,
            amount=amount,
            description=description
        )
        return (jsonify(result), 200) if result.get('success') else (jsonify(result), 400)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi chuyển khoản: {str(e)}'
        }), 500


@hdbank_bp.route('/loan', methods=['POST'])
def hdbank_loan():
    """Đăng ký khoản vay HDBank"""
    try:
        data = request.get_json() or {}
        result = get_hdbank_service().apply_loan(
            customer_id=data.get('customer_id'),
            loan_amount=data.get('loan_amount'),
            loan_term=data.get('loan_term'),
            loan_purpose=data.get('loan_purpose', '')
        )
        return (jsonify(result), 200) if result.get('success') else (jsonify(result), 400)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi đăng ký vay: {str(e)}'
        }), 500


@hdbank_bp.route('/open-card', methods=['POST'])
def hdbank_open_card():
    """Mở thẻ ngân hàng HDBank mới"""
    try:
        data = request.get_json() or {}
        result = get_hdbank_service().open_card(
            customer_id=data.get('customer_id'),
            card_type=data.get('card_type'),
            card_name=data.get('card_name', '')
        )
        return (jsonify(result), 200) if result.get('success') else (jsonify(result), 400)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi mở thẻ: {str(e)}'
        }), 500


@hdbank_bp.route('/cards/<int:customer_id>', methods=['GET'])
def get_customer_cards(customer_id):
    """Xem danh sách thẻ của khách hàng"""
    try:
        cards = get_hdbank_service().get_customer_cards(customer_id)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'cards': cards
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy danh sách thẻ: {str(e)}'
        }), 500


@hdbank_bp.route('/card-types', methods=['GET'])
def get_card_types():
    """Xem các loại thẻ có sẵn"""
    try:
        card_types = get_hdbank_service().get_available_card_types()
        return jsonify({
            'success': True,
            'card_types': card_types
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy loại thẻ: {str(e)}'
        }), 500


# =============================================================================
# VIETJET ROUTES
# =============================================================================

@vietjet_bp.route('/book-flight', methods=['POST'])
def vietjet_book_flight():
    """Đặt vé máy bay Vietjet và lưu vào database"""
    try:
        data = request.get_json()
        service = get_vietjet_service()
        if service is None:
            return jsonify({
                "success": False,
                "message": "Vietjet service không khả dụng"
            }), 500
            
        result = service.book_flight(
            customer_id=data.get('customer_id'),
            origin=data.get('origin', 'HAN'),
            destination=data.get('destination', 'SGN'),
            flight_date=data.get('flight_date') or data.get('departure_date'),  # Support both field names
            ticket_class=data.get('ticket_class', 'economy'),
            booking_value=data.get('booking_value', 2500000),
            passengers=data.get('passengers', 1)
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt vé: {str(e)}"
        }), 500


@vietjet_bp.route('/history/<int:customer_id>', methods=['GET'])
def vietjet_history(customer_id):
    """Lấy lịch sử đặt vé của khách hàng"""
    try:
        result = get_vietjet_service().get_booking_history(customer_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi lấy lịch sử: {str(e)}"
        }), 500


# =============================================================================
# RESORT ROUTES
# =============================================================================

@resort_bp.route('/book-room', methods=['POST'])
def resort_book_room():
    """Đặt phòng Resort và lưu vào database"""
    try:
        data = request.get_json()
        service = get_resort_service()
        if service is None:
            return jsonify({
                "success": False,
                "message": "Resort service không khả dụng"
            }), 500
            
        result = service.book_room(
            customer_id=data.get('customer_id'),
            nights=data.get('nights', 2),
            room_type=data.get('room_type', 'deluxe')
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt phòng: {str(e)}"
        }), 500


@resort_bp.route('/book-spa', methods=['POST'])
def resort_book_spa():
    """Đặt dịch vụ Spa và lưu vào database"""
    try:
        data = request.get_json()
        service = get_resort_service()
        if service is None:
            return jsonify({
                "success": False,
                "message": "Resort service không khả dụng"
            }), 500
            
        result = service.book_spa(
            customer_id=data.get('customer_id'),
            spa_type=data.get('spa_type', 'massage')
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Lỗi đặt spa: {str(e)}"
        }), 500