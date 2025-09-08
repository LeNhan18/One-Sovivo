# routes/nft_routes.py
# -*- coding: utf-8 -*-
"""
NFT Passport & Achievement related API routes
Provides endpoints:
  GET   /api/nft/<customer_id>                -> NFT passport metadata
  GET   /api/nft/<customer_id>/achievements   -> Achievement list for customer
  POST  /api/nft/mint                        -> Mint a new NFT passport
  POST  /api/nft/update-blockchain           -> Update NFT metadata on blockchain
"""

from flask import Blueprint, jsonify, request
from services.nft_service import NFTService

nft_bp = Blueprint('nft', __name__, url_prefix='/api/nft')

# Single service instance (stateless methods currently)
nft_service = NFTService()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _json_success(payload: dict, status: int = 200):
    resp = jsonify(payload)
    resp.status_code = status
    return resp

def _json_error(message: str, status: int):
    return _json_success({'success': False, 'error': message}, status)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@nft_bp.route('/<int:customer_id>', methods=['GET'])
def get_nft_passport(customer_id: int):
    """Return NFT passport metadata for a customer."""
    try:
        result = nft_service.get_nft_passport(customer_id)
        if not result.get('success'):
            return _json_error(result.get('error', 'Not found'), 404)
        return _json_success(result)
    except Exception as e:  # pragma: no cover (debug logging path)
        print(f"Error in get_nft_passport: {e}")
        return _json_error('Internal server error', 500)

@nft_bp.route('/<int:customer_id>/achievements', methods=['GET'])
def get_customer_achievements(customer_id: int):
    """Return achievement list (raw) used for NFT passport display."""
    try:
        data = nft_service.get_customer_achievements(customer_id)
        # If customer not found service returns empty list; decide 404 if zero achievements & customer missing
        if data.get('achievements') is None:
            return _json_error('Customer not found', 404)
        return _json_success({'success': True, 'customer_id': customer_id, **data})
    except Exception as e:
        print(f"Error in get_customer_achievements: {e}")
        return _json_error('Internal server error', 500)

@nft_bp.route('/mint', methods=['POST'])
def mint_nft_passport():
    """Mint a new NFT passport for a customer (fails if already exists)."""
    try:
        payload = request.get_json(force=True) or {}
        customer_id = payload.get('customer_id')
        if customer_id is None:
            return _json_error('customer_id is required', 400)
        result = nft_service.mint_nft_passport(customer_id)
        status = 200 if result.get('success') else (400 if 'already' in result.get('error', '').lower() else 404 if 'not found' in result.get('error', '').lower() else 500)
        return _json_success(result, status)
    except Exception as e:
        print(f"Error in mint_nft_passport: {e}")
        return _json_error('Internal server error', 500)

@nft_bp.route('/update-blockchain', methods=['POST'])
def update_nft_blockchain():
    """Update NFT metadata on blockchain (rank / badge) for an existing token."""
    try:
        payload = request.get_json(force=True) or {}
        token_id = payload.get('token_id')
        customer_id = payload.get('customer_id')
        if token_id is None or customer_id is None:
            return _json_error('token_id and customer_id are required', 400)
        result = nft_service.update_nft_on_blockchain(
            token_id=token_id,
            customer_id=customer_id,
            rank=payload.get('rank'),
            badge=payload.get('badge')
        )
        status = 200 if result.get('success') else 400
        return _json_success(result, status)
    except Exception as e:
        print(f"Error in update_nft_blockchain: {e}")
        return _json_error('Internal server error', 500)

# ---------------------------------------------------------------------------
# Simple rank calculation (kept for backward compatibility if referenced)
# ---------------------------------------------------------------------------

def calculate_customer_rank(total_points: int) -> str:
    """Calculate customer rank based purely on point totals (fallback logic)."""
    if total_points >= 1000:
        return 'Platinum'
    if total_points >= 500:
        return 'Gold'
    if total_points >= 200:
        return 'Silver'
    return 'Bronze'
