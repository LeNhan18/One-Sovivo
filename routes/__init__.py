# routes/__init__.py
from .auth_routes import auth_bp
from .customer_routes import customer_bp
from .ai_routes import ai_bp
from .token_routes import token_bp
from .mission_routes import mission_bp
from .service_routes import service_bp

def register_routes(app):
    """Register all route blueprints"""
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(ai_bp, url_prefix='/ai')
    app.register_blueprint(token_bp, url_prefix='/api/tokens')
    app.register_blueprint(mission_bp, url_prefix='/api/missions')
    app.register_blueprint(service_bp, url_prefix='/api/service')

__all__ = ['register_routes']
