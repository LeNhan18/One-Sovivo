# app_modular.py
# -*- coding: utf-8 -*-
"""
One-Sovico Platform - Modular Version
Clean architecture with separated routes, services, and models
"""

import os
import datetime
import logging
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Import configuration
from config import Config

# Import models and database
from models import init_db

# Import routes
from routes import register_blueprints

# Import system integrations
try:
    from blockchain_simple import update_nft_on_blockchain, get_nft_metadata
    from blockchain_config import (
        evaluate_all_achievements,
        get_highest_rank_from_achievements,
        ACHIEVEMENT_CONFIG
    )

    BLOCKCHAIN_ENABLED = True
    print(" Blockchain integration loaded successfully")
except ImportError as e:
    print(f"Blockchain integration not available: {e}")
    BLOCKCHAIN_ENABLED = False

try:
    from mission_progression import mission_system, get_missions_for_customer
    from detailed_missions import DetailedMissionSystem

    MISSION_SYSTEM_ENABLED = True
    print(" Mission progression system loaded successfully")
except ImportError as e:
    print(f"️ Mission progression system not available: {e}")
    MISSION_SYSTEM_ENABLED = False


# =============================================================================
# APP INITIALIZATION
# =============================================================================

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize CORS with specific configuration (added :5173 for frontend dev)
    CORS(app,
         origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://localhost:5173'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)

    # Initialize database
    init_db(app)

    # Register all blueprints
    register_blueprints(app)

    # Initialize services for routes
    initialize_route_services(app)

    # Register additional routes
    register_static_routes(app)
    register_utility_routes(app)
    register_options_handlers(app)

    return app


# =============================================================================
# SERVICE INITIALIZATION FOR ROUTES
# =============================================================================

def initialize_route_services(app):
    """Initialize services for routes that need them"""
    with app.app_context():
        try:
            # Import database and models first
            from models import db
            
            # Import and initialize service instances
            from services.ai_service import AIService
            from services.customer_service import CustomerService
            from services.admin_service import AdminService
            
            # Initialize services with proper dependencies
            ai_service = AIService(app.config)
            customer_service = CustomerService(db, app.config)
            admin_service = AdminService(db, app.config)
            
            # Load AI model để service có thể predict
            try:
                ai_service.load_model()
                print(" AI model loaded successfully")
            except Exception as e:
                print(f" Warning: AI model loading failed: {e}")
                # Tạo mock model nếu load thất bại
                try:
                    ai_service.create_mock_model()
                    print(" AI mock model created successfully")
                except Exception as e2:
                    print(f" Warning: AI mock model creation failed: {e2}")
            
            # Set model classes for services that need them
            try:
                from models.customer import Customer
                from models.achievements import Achievement, CustomerAchievement  
                from models.transactions import HDBankTransaction, TokenTransaction
                from models.flights import VietjetFlight
                from models.resorts import ResortBooking
                from models.user import User
                
                model_classes = {
                    'Customer': Customer,
                    'Achievement': Achievement,
                    'CustomerAchievement': CustomerAchievement,
                    'HDBankTransaction': HDBankTransaction,
                    'TokenTransaction': TokenTransaction,
                    'VietjetFlight': VietjetFlight,
                    'ResortBooking': ResortBooking,
                    'User': User
                }
                
                # Set models for services
                ai_service.set_models(model_classes)
                customer_service.set_models(model_classes)
                admin_service.set_models(model_classes)
                
            except Exception as e:
                print(f"️ Warning: Could not load all model classes: {e}")
            
            # Create service instances dict
            service_instances = {
                'ai_service': ai_service,
                'customer_service': customer_service,
                'admin_service': admin_service
            }
            
            # Initialize route modules that need services
            try:
                from routes.ai_routes import init_ai_routes
                init_ai_routes(service_instances)
            except Exception as e:
                print(f"Warning: Could not initialize AI routes: {e}")
                
            try:
                from routes.customer_routes import init_customer_routes
                init_customer_routes(service_instances)
            except Exception as e:
                print(f" Warning: Could not initialize customer routes: {e}")
                
            try:
                from routes.admin_routes import init_admin_routes
                init_admin_routes(service_instances)
            except Exception as e:
                print(f"️ Warning: Could not initialize admin routes: {e}")
                
            # Initialize AI chat routes
            try:
                from routes.ai_chat_routes import ai_chat_bp
                print(" AI Chat routes available")
            except Exception as e:
                print(f"️ Warning: Could not initialize AI chat routes: {e}")
                
            print(" Route services initialized successfully")
            
        except Exception as e:
            print(f" Warning: Route service initialization failed: {e}")
            import traceback
            traceback.print_exc()


# =============================================================================
# STATIC AND UTILITY ROUTES
# =============================================================================

def register_static_routes(app):
    """Register static file routes"""

    @app.route('/static/<path:filename>')
    def serve_static_files(filename):
        """Serve static files (images, CSS, JS, etc.)"""
        return send_from_directory('static', filename)

    @app.route('/admin/achievements')
    def admin_achievements_page():
        """Serve admin achievements HTML page"""
        return send_from_directory('.', 'admin_achievements.html')

    @app.route('/debug/customer')
    def debug_customer_page():
        """Serve debug customer HTML page"""
        return send_from_directory('.', 'debug_customer.html')

    @app.route('/metrics/<filename>')
    def get_metric_chart(filename):
        """API để xem các biểu đồ đã lưu"""
        model_dir = app.config.get('MODEL_DIR', 'dl_model')
        return send_from_directory(model_dir, filename)

    # Missing legacy API route from app.py - achievements data endpoint
 

def register_utility_routes(app):
    """Register utility and health check routes"""

    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        from models import db

        # Check AI service
        ai_status = 'unknown'
        try:
            from services.ai_service import AIService
            ai_service = AIService()
            ai_status = 'loaded' if ai_service.is_model_loaded() else 'not_loaded'
        except Exception:
            ai_status = 'not_available'
        
        # Check Sentiment Analysis service
        sentiment_status = 'unknown'
        try:
            from services.sentiment_service import get_sentiment_analyzer
            analyzer = get_sentiment_analyzer()
            sentiment_status = 'loaded' if len(analyzer.models) > 0 or analyzer.lstm_model else 'not_loaded'
        except Exception:
            sentiment_status = 'not_available'

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'services': {
                'database': 'connected' if db.engine else 'disconnected',
                'ai_model': ai_status,
                'sentiment_analysis': sentiment_status,
                'blockchain': 'enabled' if BLOCKCHAIN_ENABLED else 'disabled',
                'mission_system': 'enabled' if MISSION_SYSTEM_ENABLED else 'disabled'
            },
            'version': '1.0.0-modular'
        })

    @app.route('/test-blockchain', methods=['POST'])
    def test_blockchain():
        """Test blockchain integration endpoint"""
        from flask import request

        if not BLOCKCHAIN_ENABLED:
            return jsonify({
                'success': False,
                'error': 'Blockchain integration not available'
            }), 503

        data = request.json or {}
        token_id = data.get('token_id', 0)
        rank = data.get('rank', 'Gold')
        badge = data.get('badge', 'test_badge')

        try:
            result = update_nft_on_blockchain(token_id, rank, badge)

            if result.get('success'):
                return jsonify({
                    'success': True,
                    'message': 'Blockchain test successful',
                    'result': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f"Blockchain test failed: {result.get('error', 'Unknown error')}"
                }), 500

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Blockchain test error: {str(e)}'
            }), 500

    @app.route('/simulate_event', methods=['POST'])
    def simulate_event():
        """Simulate customer events for testing"""
        from flask import request

        if not BLOCKCHAIN_ENABLED:
            return jsonify({
                'success': False,
                'error': 'Event simulation requires blockchain integration'
            }), 503

        data = request.json or {}
        event_type = data.get('event_type', 'vip_upgrade')
        customer_id = data.get('customer_id', 1)

        try:
            if event_type == 'vip_upgrade':
                # Simulate VIP upgrade
                achievements = evaluate_all_achievements(customer_id)
                highest_rank = get_highest_rank_from_achievements(achievements)

                return jsonify({
                    'success': True,
                    'message': f'Simulated {event_type} for customer {customer_id}',
                    'achievements': achievements,
                    'rank': highest_rank
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unknown event type: {event_type}'
                }), 400

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Event simulation error: {str(e)}'
            }), 500

    # Legacy AI prediction route for compatibility
    @app.route('/ai/predict', methods=['POST'])
    def predict_persona():
        """AI prediction endpoint - Legacy compatibility"""
        try:
            from services.ai_service import AIService
            ai_service = AIService()
            
            data = request.json or {}
            result = ai_service.predict_with_achievements(data)
            return jsonify(result)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'AI prediction error: {str(e)}'
            }), 500

    # Legacy customer profile route for compatibility
    @app.route('/customer/<int:customer_id>', methods=['GET'])
    def get_customer_profile_legacy(customer_id):
        """Customer 360 profile endpoint - Legacy compatibility"""
        try:
            from services.customer_service import CustomerService
            customer_service = CustomerService()
            
            result = customer_service.get_customer_360_profile(customer_id)
            return jsonify(result)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Customer profile error: {str(e)}'
            }), 500


def register_options_handlers(app):
    """Register OPTIONS handlers for CORS"""

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({'message': 'OK'})
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
            response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
            return response


# =============================================================================
# ERROR HANDLERS
# =============================================================================

def register_error_handlers(app):
    """Register error handlers"""

    @app.errorhandler(404)
    def not_found(error):
        logger.error(f"404 Error: {request.url} - {error}")
        return jsonify({
            'success': False,
            'error': 'Endpoint not found',
            'status_code': 404,
            'requested_url': request.url
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"500 Error: {request.url} - {error}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'status_code': 500,
            'requested_url': request.url
        }), 500

    @app.errorhandler(400)
    def bad_request(error):
        logger.error(f"400 Error: {request.url} - {error}")
        return jsonify({
            'success': False,
            'error': 'Bad request',
                'status_code': 400,
            'requested_url': request.url
        }), 400


# =============================================================================
# MAIN APPLICATION
# =============================================================================

# Create the Flask app
app = create_app()


# Add request logging
@app.before_request
def log_request_info():
    logger.debug('Request: %s %s', request.method, request.url)
    logger.debug('Headers: %s', dict(request.headers))
    logger.debug('Content-Type: %s', request.content_type)
    # Safe JSON logging without forcing parse for non-JSON GET requests
    json_payload = None
    try:
        json_payload = request.get_json(silent=True)
    except Exception:
        json_payload = None
    if json_payload is not None:
        logger.debug('Request data: %s', json_payload)


@app.after_request
def after_request(response):
    logger.debug('Response: %s %s', response.status_code, response.status)
    return response


# Register error handlers
register_error_handlers(app)


def init_app_data():
    """Initialize application data and services"""
    with app.app_context():
        try:
            print(" Initializing One-Sovico Platform (Modular)...")

            # Get database instance
            from models import db

            # Initialize AI service
            try:
                from services.ai_service import AIService
                ai_service = AIService(app.config)
                ai_service.load_model()  # Use correct method name
                print("AI service initialized")
            except Exception as e:
                print(f" AI service initialization failed: {e}")

            # Initialize default marketplace items
            try:
                from services.marketplace_service import MarketplaceService
                marketplace_service = MarketplaceService()
                # Add any default marketplace setup here
                print(" Marketplace service initialized")
            except Exception as e:
                print(f" Marketplace service initialization failed: {e}")

            # Initialize customer service
            try:
                from services.customer_service import CustomerService
                customer_service = CustomerService(db, app.config)
                print(" Customer service initialized")
            except Exception as e:
                print(f" Customer service initialization failed: {e}")

            # Initialize admin service
            try:
                from services.admin_service import AdminService
                admin_service = AdminService(db, app.config)
                print(" Admin service initialized")
            except Exception as e:
                print(f" Admin service initialization failed: {e}")

            print(" Application initialization completed")

        except Exception as e:
            print(f" Application initialization failed: {e}")
            raise e


# Sửa tên blueprint để tránh xung đột
from routes.admin_chat_routes import admin_chat_bp

# Register the blueprint with the Flask app
app.register_blueprint(admin_chat_bp, name="admin_chat_unique")
print("✅ Admin Chat routes registered")

# Integrate Sentiment Analysis
try:
    from integrate_sentiment import integrate_sentiment_routes
    integrate_sentiment_routes(app)
    print("✅ Sentiment Analysis integrated successfully!")
except Exception as e:
    print(f"⚠️ Sentiment Analysis integration failed: {e}")
    print("📊 Sentiment analysis will not be available")


if __name__ == '__main__':
    print("=" * 80)
    print(" One-Sovico Platform - Modular Architecture")
    print("=" * 80)
    print(f" Database: {Config.get_database_url()}")
    print(f"⛓  Blockchain: {'Enabled' if BLOCKCHAIN_ENABLED else 'Disabled'}")
    print(f" Missions: {'Enabled' if MISSION_SYSTEM_ENABLED else 'Disabled'}")
    print("=" * 80)

    # Initialize app data
    init_app_data()

    print(" Server starting at: http://127.0.0.1:5000")
    print(" API Documentation available at: /health")
    print(" Admin Panel: /admin/achievements")
    print(" AI Prediction: /ai/predict")
    print(" Customer Profile: /customer/<id>")
    print(" NFT Achievements: /api/nft/<id>/achievements")
    print(" Sentiment Analysis: /api/sentiment/*")
    print("=" * 80)

    # Run the application
    app.run(
        debug=True,
        port=5000,
        host='127.0.0.1'
    )