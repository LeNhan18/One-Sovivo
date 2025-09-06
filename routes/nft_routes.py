# routes/nft_routes.py
# -*- coding: utf-8 -*-
"""
NFT and blockchain routes
"""

from flask import Blueprint, jsonify, request
from services.nft_service import NFTService
from services.auth_service import require_auth

nft_bp = Blueprint('nft', __name__, url_prefix='/api/nft')

nft_service = NFTService()

@nft_bp.route('/<int:customer_id>', methods=['GET'])
def get_nft_passport(customer_id):
    """Get NFT passport metadata for a customer"""
    try:
        nft_data = nft_service.get_nft_passport(customer_id)
        
        if nft_data['success']:
            return jsonify(nft_data)
        else:
            return jsonify(nft_data), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy NFT passport: {str(e)}'
        }), 500

@nft_bp.route('/<int:customer_id>/achievements', methods=['GET'])
def get_customer_achievements(customer_id):
    """API để lấy danh sách thành tựu của khách hàng cho NFT Passport"""
    try:
        achievements = nft_service.get_customer_achievements(customer_id)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'achievements': achievements['achievements'],
            'total_achievements': achievements['total_achievements']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy achievements: {str(e)}'
        }), 500

@nft_bp.route('/update-blockchain', methods=['POST'])
def update_nft_blockchain():
    """Update NFT on blockchain"""
    try:
        data = request.get_json()
        
        result = nft_service.update_nft_on_blockchain(
            token_id=data.get('token_id'),
            customer_id=data.get('customer_id'),
            rank=data.get('rank'),
            badge=data.get('badge')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi cập nhật blockchain: {str(e)}'
        }), 500

@nft_bp.route('/mint', methods=['POST'])
def mint_nft_passport():
    """Mint new NFT passport for customer"""
    try:
        data = request.get_json()
        
        result = nft_service.mint_nft_passport(
            customer_id=data.get('customer_id')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi mint NFT: {str(e)}'
        }), 500
