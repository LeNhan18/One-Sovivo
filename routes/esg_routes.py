# routes/esg_routes.py
# -*- coding: utf-8 -*-
"""
ESG Routes - API endpoints for ESG programs and contributions
"""

from flask import Blueprint, request, jsonify
from services.esg_service import ESGService
from services.token_service import TokenService
from services.auth_service import AuthService
import logging

logger = logging.getLogger(__name__)

esg_bp = Blueprint('esg', __name__, url_prefix='/esg')

# Initialize auth service for token verification
auth_service = AuthService()

def verify_token():
    """Helper function to verify JWT token and get user_id"""
    auth_header = request.headers.get('Authorization', '')
    logger.debug(f"Auth header: {auth_header}")
    
    if not auth_header.startswith('Bearer '):
        logger.debug("No Bearer token found")
        return None

    token = auth_header.split(' ', 1)[1]
    logger.debug(f"Token: {token[:20]}...")
    
    user_id = auth_service.verify_token(token)
    logger.debug(f"Verified user_id: {user_id}")
    
    return user_id

@esg_bp.route('/programs', methods=['GET'])
def get_esg_programs():
    """Get all ESG programs with optional filtering"""
    try:
        status = request.args.get('status', 'active')
        category = request.args.get('category')
        
        programs = ESGService.get_all_programs(status=status, category=category)
        
        return jsonify({
            'success': True,
            'programs': programs,
            'total': len(programs)
        })
        
    except Exception as e:
        logger.error(f"Error in get_esg_programs: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy danh sách chương trình ESG'
        }), 500

@esg_bp.route('/programs/<int:program_id>', methods=['GET'])
def get_esg_program_detail(program_id):
    """Get specific ESG program details"""
    try:
        program = ESGService.get_program_by_id(program_id)
        
        if not program:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy chương trình ESG'
            }), 404
        
        # Get recent contributions for this program
        contributions = ESGService.get_program_contributions(program_id, limit=10)
        
        return jsonify({
            'success': True,
            'program': program,
            'recent_contributions': contributions
        })
        
    except Exception as e:
        logger.error(f"Error in get_esg_program_detail: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy thông tin chương trình ESG'
        }), 500

@esg_bp.route('/contribute', methods=['POST'])
def contribute_to_esg():
    """Make a contribution to an ESG program"""
    try:
        # Check if user is authenticated
        user_id = verify_token()
        if not user_id:
            # For testing purposes, use a mock user ID (remove this in production)
            user_id = 1001  # Mock user ID for testing
            logger.warning("Using mock user ID for ESG contribution testing")
        
        data = request.get_json()
        program_id = data.get('program_id')
        amount = data.get('amount')
        use_svt = data.get('use_svt', False)
        
        if not program_id or not amount:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin chương trình hoặc số tiền đóng góp'
            }), 400
        
        # Validate program exists
        program = ESGService.get_program_by_id(program_id)
        if not program:
            return jsonify({
                'success': False,
                'message': 'Chương trình ESG không tồn tại'
            }), 404
        
        if program['status'] != 'active':
            return jsonify({
                'success': False,
                'message': 'Chương trình ESG không còn hoạt động'
            }), 400
        
        # Handle SVT payment if requested
        svt_amount = 0
        if use_svt:
            # Convert amount to SVT (1 VND = 0.1 SVT for contributions)
            svt_required = float(amount) * 0.1
            
            # Check and deduct SVT balance
            if not TokenService.deduct_svt_balance(user_id, svt_required):
                return jsonify({
                    'success': False,
                    'message': 'Số dư SVT không đủ'
                }), 400
            
            svt_amount = svt_required
        
        # Create contribution
        contribution_id = ESGService.create_contribution(
            program_id=program_id,
            user_id=user_id,
            amount=amount,
            svt_amount=svt_amount
        )
        
        if not contribution_id:
            # Refund SVT if contribution failed
            if use_svt and svt_amount > 0:
                TokenService.add_svt_balance(user_id, svt_amount)
            
            return jsonify({
                'success': False,
                'message': 'Lỗi khi tạo đóng góp ESG'
            }), 500
        
        # Award SVT tokens as reward (10% of contribution amount)
        reward_svt = float(amount) * 0.1
        TokenService.add_svt_balance(user_id, reward_svt)
        
        # Log the transaction
        TokenService.log_transaction(
            user_id=user_id,
            transaction_type='esg_contribution',
            amount=reward_svt,
            description=f'ESG contribution reward for program: {program["name"]}'
        )
        
        return jsonify({
            'success': True,
            'message': 'Đóng góp ESG thành công!',
            'contribution_id': contribution_id,
            'svt_reward': reward_svt,
            'svt_used': svt_amount
        })
        
    except Exception as e:
        logger.error(f"Error in contribute_to_esg: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi hệ thống khi đóng góp ESG'
        }), 500

@esg_bp.route('/my-contributions', methods=['GET'])
def get_my_contributions():
    """Get current user's ESG contributions"""
    try:
        user_id = verify_token()
        if not user_id:
            # Return empty contributions for unauthenticated users instead of error
            return jsonify({
                'success': True,
                'contributions': [],
                'total': 0,
                'message': 'Đăng nhập để xem lịch sử đóng góp của bạn'
            })
        
        limit = request.args.get('limit', 10, type=int)
        
        contributions = ESGService.get_user_contributions(user_id, limit)
        
        return jsonify({
            'success': True,
            'contributions': contributions,
            'total': len(contributions)
        })
        
    except Exception as e:
        logger.error(f"Error in get_my_contributions: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy lịch sử đóng góp'
        }), 500

@esg_bp.route('/stats', methods=['GET'])
def get_esg_stats():
    """Get ESG statistics"""
    try:
        stats = ESGService.get_esg_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Error in get_esg_stats: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy thống kê ESG'
        }), 500

@esg_bp.route('/categories', methods=['GET'])
def get_esg_categories():
    """Get all ESG categories"""
    try:
        categories = ESGService.get_categories()

        return jsonify({
            'success': True,
            'categories': categories
        })
        
    except Exception as e:
        logger.error(f"Error in get_esg_categories: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy danh mục ESG'
        }), 500

@esg_bp.route('/impact-report', methods=['GET'])
def get_impact_report():
    """Get ESG impact report"""
    try:
        user_id = verify_token()
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Vui lòng đăng nhập'
            }), 401

        report = ESGService.get_user_impact_report(user_id)

        return jsonify({
            'success': True,
            'report': report
        })

    except Exception as e:
        logger.error(f"Error in get_impact_report: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy báo cáo tác động ESG'
        }), 500
