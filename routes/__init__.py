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
from .token_transaction_routes import token_transaction_bp

__all__ = [
    'auth_bp', 'customer_bp', 'admin_bp', 'ai_bp',
    'marketplace_bp', 'p2p_bp', 'mission_bp',
    'hdbank_bp', 'vietjet_bp', 'resort_bp',
    'nft_bp', 'token_bp', 'token_transaction_bp',
    'register_blueprints'
]


def register_blueprints(app):
    """Register all blueprints with the Flask app (each blueprint already has its own url_prefix)."""
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
    app.register_blueprint(token_transaction_bp)
    return True
