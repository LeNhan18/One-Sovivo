# routes/ai_routes.py
"""
AI prediction routes blueprint
"""
from flask import Blueprint, request, jsonify, send_from_directory
import os
import datetime

ai_bp = Blueprint('ai', __name__, url_prefix='/ai')

# Import service instances will be injected later
ai_service = None

def init_ai_routes(service_instances):
    """Initialize AI routes with service instances"""
    global ai_service
    ai_service = service_instances.get('ai_service')

@ai_bp.route('/predict', methods=['POST'])
def predict_persona():
    """API nhận dữ liệu và trả về dự đoán persona"""
    if not ai_service:
        return jsonify({'error': 'AI service not available'}), 500
    
    data = request.json or {}
    result = ai_service.predict_with_achievements(data)
    return jsonify(result)

@ai_bp.route('/metrics/<filename>')
def get_metric_chart(filename):
    """Serve metric charts from model directory"""
    from flask import current_app
    try:
        model_dir = current_app.config.get('MODEL_DIR', 'dl_model')
        return send_from_directory(model_dir, filename)
    except Exception as e:
        return jsonify({'error': f'File not found: {str(e)}'}), 404

@ai_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'ai_service_available': ai_service is not None,
            'timestamp': str(datetime.datetime.utcnow())
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
