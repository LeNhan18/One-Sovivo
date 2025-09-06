# routes/__init__.py
from .auth_routes import auth_bp
from .customer_routes import customer_bp
from .admin_routes import admin_bp
from .ai_routes import ai_bp
from .marketplace_routes import marketplace_bp, p2p_bp
from .mission_routes import mission_bp
from .service_routes import hdbank_bp, vietjet_bp, resort_bp
from .nft_routes import nft_bp
from .token_routes import token_bp

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(marketplace_bp)
    app.register_blueprint(p2p_bp)
    app.register_blueprint(mission_bp)
    app.register_blueprint(hdbank_bp)
    app.register_blueprint(vietjet_bp)
    app.register_blueprint(resort_bp)
    app.register_blueprint(nft_bp)
    app.register_blueprint(token_bp)

__all__ = [
    'auth_bp', 'customer_bp', 'admin_bp', 'ai_bp',
    'marketplace_bp', 'p2p_bp', 'mission_bp',
    'hdbank_bp', 'vietjet_bp', 'resort_bp',
    'nft_bp', 'token_bp',
    'register_blueprints'
]
"""
Routes package for One-Sovico Platform
Organize all routes into blueprints for better modularity
"""

def register_blueprints(app):
    """Register all blueprint routes with the Flask app"""
    try:
        # Import and register route blueprints
        from .auth_routes import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')
        print(" Auth routes registered")
        
        # Register other blueprints if they exist
        try:
            from .customer_routes import customer_bp
            app.register_blueprint(customer_bp, url_prefix='/customer')
            print(" Customer routes registered")
        except ImportError:
            print(" Customer routes not available")
            
        try:
            from .ai_routes import ai_bp
            app.register_blueprint(ai_bp, url_prefix='/ai')
            print("AI routes registered")
        except ImportError:
            print("️ AI routes not available")
            
        try:
            from .token_routes import token_bp
            app.register_blueprint(token_bp, url_prefix='/api/tokens')
            print(" Token routes registered")
        except ImportError:
            print(" Token routes not available")
            
        try:
            from .mission_routes import mission_bp
            app.register_blueprint(mission_bp, url_prefix='/api/missions')
            print(" Mission routes registered")
        except ImportError:
            print(" Mission routes not available")
            
        try:
            from .service_routes import service_bp
            app.register_blueprint(service_bp, url_prefix='/api/service')
            print(" Service routes registered")
        except ImportError:
            print(" Service routes not available")
        
        return True
    except Exception as e:
        print(f"Error registering blueprints: {e}")
        return False

def register_routes(app):
    """Backward compatibility function"""
    return register_blueprints(app)

__all__ = ['register_blueprints', 'register_routes']
