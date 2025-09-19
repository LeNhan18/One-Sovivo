# routes/__init__.py
from .auth_routes import auth_bp
from .customer_routes import customer_bp, customers_bp
from .admin_routes import admin_bp
from .admin_api_routes import admin_api_bp
from .ai_routes import ai_bp
from .marketplace_routes import marketplace_bp, p2p_bp
from .mission_routes import mission_bp
from .service_routes import hdbank_bp, vietjet_bp, resort_bp
from .nft_routes import nft_bp
from .token_routes import token_bp
from .token_transaction_routes import token_transaction_bp

# Import additional blueprints if they exist
try:
    from .debug_routes import debug_bp
    DEBUG_AVAILABLE = True
except ImportError:
    DEBUG_AVAILABLE = False

try:
    from .blockchain_routes import blockchain_bp
    BLOCKCHAIN_ROUTES_AVAILABLE = True
except ImportError:
    BLOCKCHAIN_ROUTES_AVAILABLE = False

try:
    from .ai_chat_routes import ai_chat_bp
    AI_CHAT_AVAILABLE = True
except ImportError:
    AI_CHAT_AVAILABLE = False

try:
    from .esg_routes import esg_bp
    ESG_AVAILABLE = True
except ImportError:
    ESG_AVAILABLE = False

__all__ = [
    'auth_bp', 'customer_bp', 'admin_bp', 'ai_bp',
    'marketplace_bp', 'p2p_bp', 'mission_bp',
    'hdbank_bp', 'vietjet_bp', 'resort_bp',
    'nft_bp', 'token_bp', 'token_transaction_bp', 'admin_api_bp',
    'register_blueprints'
]


def register_blueprints(app):
    """Register all blueprints with the Flask app (each blueprint already has its own url_prefix)."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(customers_bp)
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
    # Register new admin API blueprint under /api/admin
    app.register_blueprint(admin_api_bp)
    
    # Register optional blueprints
    if DEBUG_AVAILABLE:
        app.register_blueprint(debug_bp)
        print("✅ Debug routes registered")
    
    if BLOCKCHAIN_ROUTES_AVAILABLE:
        app.register_blueprint(blockchain_bp)
        print("✅ Blockchain routes registered")
    
    if AI_CHAT_AVAILABLE:
        app.register_blueprint(ai_chat_bp)
        print("✅ AI Chat routes registered")
    
    if ESG_AVAILABLE:
        app.register_blueprint(esg_bp)
        print("✅ ESG routes registered")
    
    return True