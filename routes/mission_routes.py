# routes/mission_routes.py
# -*- coding: utf-8 -*-
"""
Mission progression system routes
"""

from flask import Blueprint, jsonify, request
from services.mission_service import MissionService
from services.auth_service import require_auth

mission_bp = Blueprint('missions', __name__, url_prefix='/api/missions')

mission_service = MissionService()

@mission_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_missions(customer_id):
    """API để lấy nhiệm vụ cho khách hàng"""
    try:
        missions = mission_service.get_missions_for_customer(customer_id)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'missions': missions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy missions: {str(e)}'
        }), 500

@mission_bp.route('/<int:customer_id>/start', methods=['POST'])
def start_mission(customer_id):
    """API để bắt đầu một nhiệm vụ"""
    try:
        data = request.get_json()
        mission_id = data.get('mission_id')
        
        result = mission_service.start_mission(customer_id, mission_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi bắt đầu mission: {str(e)}'
        }), 500

@mission_bp.route('/<int:customer_id>/complete', methods=['POST'])
def complete_mission(customer_id):
    """API để hoàn thành một nhiệm vụ và nhận thưởng SVT"""
    try:
        data = request.get_json()
        mission_id = data.get('mission_id')
        
        result = mission_service.complete_mission(customer_id, mission_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi hoàn thành mission: {str(e)}'
        }), 500

@mission_bp.route('/<int:customer_id>/progress/<mission_id>', methods=['GET'])
def get_mission_progress(customer_id, mission_id):
    """API để lấy tiến độ của một nhiệm vụ cụ thể"""
    try:
        progress = mission_service.get_mission_progress(customer_id, mission_id)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'mission_id': mission_id,
            'progress': progress
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy tiến độ mission: {str(e)}'
        }), 500

@mission_bp.route('/leaderboard', methods=['GET'])
def get_mission_leaderboard():
    """API để lấy bảng xếp hạng hoàn thành mission"""
    try:
        leaderboard = mission_service.get_leaderboard()
        return jsonify({
            'success': True,
            'leaderboard': leaderboard
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy leaderboard: {str(e)}'
        }), 500

@mission_bp.route('/<int:customer_id>/update-stats', methods=['POST'])
def update_customer_stats(customer_id):
    """API để cập nhật customer stats cho mission tracking"""
    try:
        data = request.get_json()
        
        result = mission_service.update_customer_stats(customer_id, data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi cập nhật stats: {str(e)}'
        }), 500

@mission_bp.route('/templates', methods=['GET'])
def get_mission_templates():
    """API để lấy danh sách mission templates (cho admin)"""
    try:
        templates = mission_service.get_mission_templates()
        return jsonify({
            'success': True,
            'templates': templates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Lỗi lấy templates: {str(e)}'
        }), 500
