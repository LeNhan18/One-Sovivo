# routes/ai_routes.py
"""
AI prediction routes blueprint
"""
from flask import Blueprint, request, jsonify

ai_bp = Blueprint('ai', __name__)

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
