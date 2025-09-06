# routes/marketplace_routes.py
# -*- coding: utf-8 -*-
"""
Marketplace and P2P trading routes
"""

from flask import Blueprint, jsonify, request
from services.marketplace_service import MarketplaceService
from services.auth_service import require_auth

marketplace_bp = Blueprint('marketplace', __name__, url_prefix='/api/marketplace')
p2p_bp = Blueprint('p2p', __name__, url_prefix='/api/p2p')

marketplace_service = MarketplaceService()

# Marketplace routes
@marketplace_bp.route('/items', methods=['GET'])
def get_marketplace_items():
    """API để lấy danh sách vật phẩm trên sàn giao dịch"""
    try:
        items = marketplace_service.get_all_items()
        return jsonify({
            'success': True,
            'items': items
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy danh sách marketplace: {str(e)}'
        }), 500

@marketplace_bp.route('/purchase', methods=['POST'])
@require_auth
def purchase_marketplace_item():
    """API để mua vật phẩm từ marketplace"""
    try:
        data = request.get_json()
        user = request.current_user
        
        result = marketplace_service.purchase_item(
            customer_id=user.customer.customer_id if user.customer else None,
            item_id=data.get('item_id'),
            quantity=data.get('quantity', 1)
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi mua hàng: {str(e)}'
        }), 500

# P2P routes
@p2p_bp.route('/listings', methods=['GET'])
def get_p2p_listings():
    """API để lấy danh sách tin đăng P2P"""
    try:
        listings = marketplace_service.get_p2p_listings()
        return jsonify({
            'success': True,
            'listings': listings
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy danh sách P2P: {str(e)}'
        }), 500

@p2p_bp.route('/create', methods=['POST'])
@require_auth
def create_p2p_listing():
    """API để tạo tin đăng P2P"""
    try:
        data = request.get_json()
        user = request.current_user
        
        result = marketplace_service.create_p2p_listing(
            seller_customer_id=user.customer.customer_id if user.customer else None,
            item_name=data.get('item_name'),
            description=data.get('description'),
            price_svt=data.get('price_svt')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi tạo tin đăng: {str(e)}'
        }), 500
