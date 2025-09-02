# app_clean.py
# -*- coding: utf-8 -*-
"""
One-Sovico Platform - Clean Architecture Version
Tách riêng models, services, routes để dễ maintain
"""

import datetime
import os
import time
import uuid
import random
import pandas as pd
import numpy as np
import matplotlib

matplotlib.use('Agg')
import jwt

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

from config import Config

# =============================================================================
# IMPORT BLOCKCHAIN & MISSION SYSTEMS
# =============================================================================
try:
    from blockchain_simple import update_nft_on_blockchain, get_nft_metadata
    from blockchain_config import (
        evaluate_all_achievements,
        get_highest_rank_from_achievements,
        ACHIEVEMENT_CONFIG
    )

    BLOCKCHAIN_ENABLED = True
    print("✅ Blockchain integration loaded successfully")
except ImportError as e:
    print(f"⚠️ Blockchain integration not available: {e}")
    BLOCKCHAIN_ENABLED = False

try:
    from mission_progression import mission_system, get_missions_for_customer
    from detailed_missions import DetailedMissionSystem

    MISSION_SYSTEM_ENABLED = True
    print("✅ Mission progression system loaded successfully")
except ImportError as e:
    print(f"⚠️ Mission progression system not available: {e}")
    MISSION_SYSTEM_ENABLED = False

# =============================================================================
# FLASK APP INITIALIZATION
# =============================================================================
app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
cors = CORS(app)

# Initialize detailed mission system
if MISSION_SYSTEM_ENABLED:
    detailed_mission_system = DetailedMissionSystem()

# =============================================================================
# INITIALIZE MODELS WITH LAZY LOADING
# =============================================================================
from models import init_models, get_models

# Initialize models with database instances
model_classes = init_models(db, bcrypt)

# Extract model classes for direct use
User = model_classes['User']
Customer = model_classes['Customer']
HDBankTransaction = model_classes['HDBankTransaction']
VietjetFlight = model_classes['VietjetFlight']
ResortBooking = model_classes['ResortBooking']
TokenTransaction = model_classes['TokenTransaction']
Achievement = model_classes['Achievement']
CustomerAchievement = model_classes['CustomerAchievement']
CustomerMission = model_classes['CustomerMission']
CustomerMissionProgress = model_classes['CustomerMissionProgress']
MarketplaceItem = model_classes['MarketplaceItem']
P2PListing = model_classes['P2PListing']

# =============================================================================
# INITIALIZE SERVICES
# =============================================================================
from services import AuthService, AIService, CustomerService

auth_service = AuthService(db, bcrypt)
ai_service = AIService(db, app.config['MODEL_DIR'])
customer_service = CustomerService(db)


# =============================================================================
# CORE BUSINESS LOGIC ROUTES (Keep in main file for now)
# =============================================================================

# AUTH ENDPOINTS
@app.route('/auth/register', methods=['POST'])
def register_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    name = (data.get('name') or '').strip() or email.split('@')[0]

    if not email or not password:
        return jsonify({'error': 'Thiếu email hoặc mật khẩu'}), 400

    result, status_code = auth_service.register(email, password, name)
    return jsonify(result), status_code


@app.route('/auth/login', methods=['POST'])
def login_api():
    data = request.get_json(force=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    result, status_code = auth_service.login(email, password)
    return jsonify(result), status_code


@app.route('/auth/me', methods=['GET'])
@auth_service.require_auth
def me_api():
    user = request.current_user
    result = auth_service.get_current_user(user)
    return jsonify(result)


# CUSTOMER DATA ENDPOINTS
@app.route('/customer/<int:customer_id>', methods=['GET'])
def get_customer_profile_api(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    profile = customer_service.get_customer_360_profile(customer_id)
    if profile is None:
        return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404
    return jsonify(profile)


@app.route('/customer/<int:customer_id>/insights', methods=['GET'])
def get_insights_api(customer_id):
    """API trả về persona dự đoán, evidence và đề xuất."""
    profile = customer_service.get_customer_360_profile(customer_id)
    if profile is None:
        return jsonify({'error': f'Không tìm thấy khách hàng với ID {customer_id}'}), 404

    # Chuẩn bị input và dự đoán persona
    input_data = {
        'age': profile['basic_info'].get('age', 0) or 0,
        'avg_balance': profile['hdbank_summary'].get('average_balance', 0) or 0,
        'total_flights': profile['vietjet_summary'].get('total_flights_last_year', 0) or 0,
        'is_business_flyer_int': int(profile['vietjet_summary'].get('is_business_flyer', False)),
        'total_nights_stayed': profile['resort_summary'].get('total_nights_stayed', 0) or 0,
        'total_resort_spending': profile['resort_summary'].get('total_spending', 0) or 0
    }

    predicted_persona, error = ai_service.predict_persona(input_data)
    if error:
        return jsonify({'error': error}), 503

    # Build evidence và recommendations
    evidence = ai_service.build_evidence(profile)
    recommendations = ai_service.get_recommendations(predicted_persona, input_data)

    return jsonify({
        'predicted_persona': predicted_persona,
        'evidence': evidence,
        'recommendations': recommendations
    })


@app.route('/customers/search', methods=['GET'])
def search_customers_api():
    """Tìm kiếm khách hàng theo từ khóa."""
    q = (request.args.get('q') or '').strip()
    result = customer_service.search_customers(q)
    return jsonify(result)


@app.route('/customers/suggestions', methods=['GET'])
def get_customer_suggestions_api():
    """API gợi ý khách hàng đáng chú ý."""
    result = customer_service.get_customer_suggestions()
    return jsonify(result)


# AI PREDICTION ENDPOINT
@app.route('/predict', methods=['POST'])
def predict_persona():
    """API nhận dữ liệu và trả về dự đoán persona với logic kiểm tra thành tựu."""
    data = request.json or {}

    input_data = {
        'age': data.get('age', 0),
        'avg_balance': data.get('avg_balance', 0),
        'total_flights': data.get('total_flights', 0),
        'is_business_flyer_int': int(data.get('is_business_flyer', False)),
        'total_nights_stayed': data.get('total_nights_stayed', 0),
        'total_resort_spending': data.get('total_resort_spending', 0)
    }

    predicted_persona, error = ai_service.predict_persona(input_data)
    if error:
        return jsonify({"error": error}), 503

    recommendations = ai_service.get_recommendations(predicted_persona, input_data)

    # =============================================================================
    # ACHIEVEMENT LOGIC
    # =============================================================================
    achievements = []
    customer_id = data.get('customer_id', 0)

    # Tạo profile 360° từ input data để kiểm tra thành tựu
    profile = {
        'vietjet_summary': {
            'total_flights_last_year': input_data['total_flights'],
            'is_business_flyer': bool(input_data['is_business_flyer_int'])
        },
        'hdbank_summary': {
            'average_balance': input_data['avg_balance']
        },
        'resort_summary': {
            'total_spending': input_data['total_resort_spending'],
            'total_nights_stayed': input_data['total_nights_stayed']
        }
    }

    # Sử dụng achievement evaluator từ configuration
    if BLOCKCHAIN_ENABLED:
        try:
            earned_achievements = evaluate_all_achievements(profile)

            if earned_achievements:
                highest_rank = get_highest_rank_from_achievements(earned_achievements)
                for achievement in earned_achievements:
                    achievements.append({
                        'title': achievement['title'],
                        'description': achievement['description'],
                        'badge': achievement['badge'],
                        'rank': achievement['rank'],
                        'svt_reward': achievement['svt_reward']
                    })
                print(f"🏆 {len(earned_achievements)} achievements triggered!")
            else:
                print("📊 Không có thành tựu mới trong lần phân tích này")

        except Exception as evaluation_error:
            print(f"❌ Achievement evaluation error: {evaluation_error}")
            achievements.append({
                'title': 'Evaluation Error',
                'description': f'Lỗi đánh giá thành tựu: {str(evaluation_error)}',
                'badge': 'error',
                'rank': 'Bronze',
                'svt_reward': 0
            })
    else:
        # Fallback: Simple achievement check without blockchain
        print("⚠️ Blockchain disabled - using fallback achievement system")

        if profile['vietjet_summary']['total_flights_last_year'] > 20:
            achievements.append({
                'title': 'Frequent Flyer',
                'description': 'Bay hơn 20 chuyến trong năm (offline)',
                'badge': 'frequent_flyer',
                'rank': 'Gold',
                'svt_reward': 1000
            })
            print("🏆 Frequent Flyer achievement (offline mode)")

    return jsonify({
        "predicted_persona": predicted_persona,
        "recommendations": recommendations,
        "achievements": achievements,
        "profile_360": profile,
        "blockchain_enabled": BLOCKCHAIN_ENABLED,
        "total_svt_reward": sum(ach.get('svt_reward', 0) for ach in achievements)
    })


# =============================================================================
# TOKEN & NFT ENDPOINTS
# =============================================================================

@app.route('/api/tokens/<int:user_id>', methods=['GET'])
def get_user_tokens(user_id):
    """Get user's SVT token balance from token_transactions table"""
    try:
        # Query token_transactions table to get real SVT balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :user_id
        """

        result = db.session.execute(db.text(token_query), {"user_id": user_id})
        row = result.fetchone()
        total_svt = float(row.total_svt) if row and row.total_svt else 0

        # Get recent transactions
        recent_query = """
            SELECT tx_hash, transaction_type, amount, description, created_at
            FROM token_transactions 
            WHERE customer_id = :user_id
            ORDER BY created_at DESC
            LIMIT 10
        """

        recent_result = db.session.execute(db.text(recent_query), {"user_id": user_id})
        transactions = []

        for row in recent_result:
            transactions.append({
                "txHash": row.tx_hash[:10] + "...",
                "type": row.transaction_type,
                "amount": f"{'+ ' if row.amount > 0 else '- '}{abs(row.amount):,.0f} SVT",
                "time": row.created_at.strftime("%d/%m/%Y %H:%M") if row.created_at else "N/A"
            })

        return jsonify({
            "success": True,
            "user_id": user_id,
            "total_svt": total_svt,
            "transactions": transactions
        })

    except Exception as e:
        print(f"❌ Error getting tokens for user {user_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "total_svt": 0,
            "transactions": []
        }), 500


@app.route('/api/tokens/add', methods=['POST'])
def add_svt_tokens():
    """Add SVT tokens to user account for mission rewards"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        amount = data.get('amount')
        transaction_type = data.get('transaction_type', 'mission_reward')
        description = data.get('description', 'Mission reward')
        mission_id = data.get('mission_id', '')
        log_blockchain = data.get('log_blockchain', False)

        if not customer_id or not amount:
            return jsonify({
                "success": False,
                "error": "Missing customer_id or amount"
            }), 400

        # Generate blockchain transaction hash with better uniqueness
        timestamp = int(time.time() * 1000000)
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]

        # Add token transaction record
        new_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=amount,
            transaction_type=transaction_type,
            description=description,
            tx_hash=tx_hash
        )

        db.session.add(new_transaction)

        # 🔗 BLOCKCHAIN LOGGING
        blockchain_result = None
        if log_blockchain and BLOCKCHAIN_ENABLED:
            try:
                blockchain_result = update_nft_on_blockchain(
                    user_id=customer_id,
                    achievements=[f"Mission: {mission_id}"],
                    persona_data={"action": "mission_reward", "amount": amount}
                )
                print(f"🔗 Blockchain TX logged: {blockchain_result.get('transaction_hash', 'N/A')}")
            except Exception as blockchain_error:
                print(f"⚠️ Blockchain logging failed: {blockchain_error}")

        db.session.commit()

        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """

        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0

        response_data = {
            "success": True,
            "message": f"Successfully added {amount} SVT tokens",
            "new_balance": new_balance,
            "transaction_id": new_transaction.id,
            "tx_hash": tx_hash,
            "gas_used": 21000 if log_blockchain else 0
        }

        # Add blockchain info if available
        if blockchain_result and blockchain_result.get('success'):
            response_data.update({
                "blockchain_tx": blockchain_result.get('transaction_hash'),
                "blockchain_gas": blockchain_result.get('gas_used'),
                "blockchain_status": "confirmed"
            })

        return jsonify(response_data)

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding SVT tokens: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/nft/<int:user_id>', methods=['GET'])
def get_nft_passport(user_id):
    """Get NFT passport metadata for a user"""
    try:
        if BLOCKCHAIN_ENABLED:
            metadata = get_nft_metadata(user_id)
            return jsonify({
                "success": True,
                "user_id": user_id,
                "metadata": metadata
            })
        else:
            return jsonify({
                "success": False,
                "error": "Blockchain not available",
                "metadata": {
                    "name": f"Sovico Passport #{user_id}",
                    "description": "Digital identity passport (offline mode)",
                    "image": "https://via.placeholder.com/300x400/6B7280/white?text=Offline+Mode",
                    "attributes": [
                        {"trait_type": "Status", "value": "Offline"},
                        {"trait_type": "Level", "value": "Bronze"},
                        {"trait_type": "SVT Points", "value": 0}
                    ]
                }
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "metadata": None
        }), 500


@app.route('/api/nft/<int:user_id>/achievements', methods=['GET'])
def get_nft_achievements(user_id):
    """Get achievements for a specific user from database"""
    try:
        # Query achievements and customer_achievements tables
        query = """
            SELECT 
                a.id,
                a.name,
                a.description,
                a.badge_image_url,
                CASE 
                    WHEN ca.customer_id IS NOT NULL THEN 1 
                    ELSE 0 
                END as is_earned,
                CASE 
                    WHEN ca.customer_id IS NOT NULL THEN 'earned' 
                    ELSE 'locked' 
                END as status,
                COALESCE(ca.unlocked_at, '') as unlocked_at
            FROM achievements a
            LEFT JOIN customer_achievements ca ON a.id = ca.achievement_id AND ca.customer_id = :user_id
            ORDER BY a.id
        """
        
        result = db.session.execute(db.text(query), {"user_id": user_id})
        achievements = []
        
        for row in result:
            achievements.append({
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "badge_image_url": row.badge_image_url,
                "is_earned": bool(row.is_earned),
                "status": row.status,
                "unlocked_at": row.unlocked_at if row.unlocked_at else None
            })
        
        return jsonify({
            "success": True,
            "user_id": user_id,
            "achievements": achievements
        })
        
    except Exception as e:
        print(f"❌ Error getting achievements for user {user_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "achievements": []
        }), 500


# =============================================================================
# SERVICE INTEGRATION APIs
# =============================================================================

@app.route('/api/service/vietjet/book-flight', methods=['POST'])
def vietjet_book_flight():
    """Đặt vé máy bay Vietjet và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        flight_type = data.get('flight_type', 'domestic')
        ticket_class = data.get('ticket_class', 'economy')

        # Generate booking data
        flight_id = f"VJ{random.randint(1000, 9999)}"
        booking_value = 2500000 if flight_type == 'international' else 1500000
        if ticket_class == 'business':
            booking_value *= 3

        # Create flight record
        new_flight = VietjetFlight(
            flight_id=flight_id,
            customer_id=customer_id,
            flight_date=datetime.datetime.now() + datetime.timedelta(days=30),
            origin="SGN",
            destination="HAN" if flight_type == 'domestic' else "NRT",
            ticket_class=ticket_class,
            booking_value=booking_value
        )
        db.session.add(new_flight)

        # Award SVT tokens
        svt_reward = 500 if ticket_class == 'business' else 200
        tx_hash = f"flight_{flight_id}_{int(time.time())}"

        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='service_reward',
            description=f'Đặt vé máy bay {flight_id}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đã đặt vé máy bay {flight_id} thành công',
            'flight_id': flight_id,
            'booking_value': booking_value,
            'svt_earned': svt_reward,
            'tx_hash': tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/service/hdbank/transfer', methods=['POST'])
def hdbank_transfer():
    """Thực hiện chuyển khoản HDBank và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        amount = data.get('amount', 5000000)
        transfer_type = data.get('transfer_type', 'internal')

        # Generate transaction data
        transaction_id = f"TF{random.randint(100000, 999999)}"

        # Create bank transaction record
        new_transaction = HDBankTransaction(
            transaction_id=transaction_id,
            customer_id=customer_id,
            transaction_date=datetime.datetime.now(),
            amount=amount,
            transaction_type='debit',
            balance=500000000,  # Mock balance
            description=f'Chuyển khoản {transfer_type}'
        )
        db.session.add(new_transaction)

        # Award SVT tokens
        svt_reward = int(amount * 0.001)  # 0.1% of transfer amount
        tx_hash = f"transfer_{transaction_id}_{int(time.time())}"

        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='service_reward',
            description=f'Chuyển khoản {transaction_id}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Chuyển khoản {transaction_id} thành công',
            'transaction_id': transaction_id,
            'amount': amount,
            'svt_earned': svt_reward,
            'tx_hash': tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/service/hdbank/loan', methods=['POST'])
def hdbank_loan():
    """Đăng ký khoản vay HDBank và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        loan_amount = data.get('loan_amount', 500000000)
        loan_type = data.get('loan_type', 'personal')

        # Generate loan data
        transaction_id = f"LN{random.randint(100000, 999999)}"

        # Create loan transaction record
        new_transaction = HDBankTransaction(
            transaction_id=transaction_id,
            customer_id=customer_id,
            transaction_date=datetime.datetime.now(),
            amount=loan_amount,
            transaction_type='credit',
            balance=500000000 + loan_amount,
            description=f'Khoản vay {loan_type} - {transaction_id}'
        )
        db.session.add(new_transaction)

        # Award SVT tokens
        svt_reward = int(loan_amount * 0.002)  # 0.2% of loan amount
        tx_hash = f"loan_{transaction_id}_{int(time.time())}"

        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='service_reward',
            description=f'Khoản vay {transaction_id}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đăng ký khoản vay {transaction_id} thành công',
            'transaction_id': transaction_id,
            'loan_amount': loan_amount,
            'svt_earned': svt_reward,
            'tx_hash': tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/service/resort/book-room', methods=['POST'])
def resort_book_room():
    """Đặt phòng Resort và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        nights = data.get('nights', 2)
        room_type = data.get('room_type', 'standard')

        # Generate booking data
        booking_id = f"RS{random.randint(10000, 99999)}"
        price_per_night = 3000000 if room_type == 'suite' else 1500000 if room_type == 'deluxe' else 800000
        booking_value = price_per_night * nights

        # Create resort booking record
        new_booking = ResortBooking(
            booking_id=booking_id,
            customer_id=customer_id,
            resort_name="Sovico Premium Resort",
            booking_date=datetime.datetime.now() + datetime.timedelta(days=15),
            nights_stayed=nights,
            booking_value=booking_value
        )
        db.session.add(new_booking)

        # Award SVT tokens
        svt_reward = int(booking_value * 0.05)  # 5% of booking value
        tx_hash = f"resort_{booking_id}_{int(time.time())}"

        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='service_reward',
            description=f'Đặt phòng resort {booking_id}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đặt phòng {booking_id} thành công',
            'booking_id': booking_id,
            'nights': nights,
            'booking_value': booking_value,
            'svt_earned': svt_reward,
            'tx_hash': tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/service/resort/book-spa', methods=['POST'])
def resort_book_spa():
    """Đặt dịch vụ Spa và lưu vào database"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        spa_type = data.get('spa_type', 'massage')

        # Generate spa booking data
        booking_id = f"SP{random.randint(10000, 99999)}"
        service_prices = {
            'massage': 500000,
            'facial': 800000,
            'body_treatment': 1200000,
            'premium_package': 2500000
        }
        booking_value = service_prices.get(spa_type, 500000)

        # Create spa booking record (using resort_bookings table)
        new_booking = ResortBooking(
            booking_id=booking_id,
            customer_id=customer_id,
            resort_name="Sovico Spa & Wellness",
            booking_date=datetime.datetime.now() + datetime.timedelta(days=7),
            nights_stayed=1,  # Spa is 1-day service
            booking_value=booking_value
        )
        db.session.add(new_booking)

        # Award SVT tokens
        svt_reward = int(booking_value * 0.1)  # 10% of spa value
        tx_hash = f"spa_{booking_id}_{int(time.time())}"

        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='service_reward',
            description=f'Đặt dịch vụ spa {booking_id}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Đặt dịch vụ spa {booking_id} thành công',
            'booking_id': booking_id,
            'spa_type': spa_type,
            'booking_value': booking_value,
            'svt_earned': svt_reward,
            'tx_hash': tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'database': 'connected' if db.engine else 'disconnected',
        'ai_model': 'loaded' if ai_service.ai_model else 'not_loaded',
        'blockchain': 'enabled' if BLOCKCHAIN_ENABLED else 'disabled',
        'mission_system': 'enabled' if MISSION_SYSTEM_ENABLED else 'disabled',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })


@app.route('/metrics/<filename>')
def get_metric_chart(filename):
    """API để xem các biểu đồ đã lưu."""
    return send_from_directory(app.config['MODEL_DIR'], filename)


# =============================================================================
# TEST ENDPOINTS
# =============================================================================

@app.route('/api/test/add-svt/<int:customer_id>', methods=['POST'])
def test_add_svt_tokens(customer_id):
    """Test endpoint to add SVT tokens for testing marketplace"""
    try:
        data = request.get_json() or {}
        amount = data.get('amount', 1000)

        timestamp = int(time.time() * 1000000)
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]

        test_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=amount,
            transaction_type='test_reward',
            description=f'Test tokens for marketplace testing',
            tx_hash=tx_hash
        )

        db.session.add(test_transaction)
        db.session.commit()

        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """

        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0

        return jsonify({
            "success": True,
            "message": f"Added {amount} test SVT tokens",
            "new_balance": new_balance,
            "transaction_id": test_transaction.id,
            "tx_hash": tx_hash
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# SIMULATION ENDPOINTS
# =============================================================================

@app.route('/simulate_event', methods=['POST'])
def simulate_event():
    """Simulate various events and update blockchain"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id', 1001)
        event_type = data.get('event_type', 'vip_upgrade')
        
        print(f"🎮 Simulating {event_type} for customer {customer_id}")
        
        # Simulate different event types
        if event_type == 'vip_upgrade':
            # Simulate VIP upgrade
            svt_reward = 5000
            achievement_title = "VIP Customer"
            achievement_description = "Upgraded to VIP status"
            
        elif event_type == 'frequent_flyer':
            # Simulate frequent flyer achievement
            svt_reward = 3000
            achievement_title = "Frequent Flyer"
            achievement_description = "Completed 20+ flights this year"
            
        elif event_type == 'high_roller':
            # Simulate high roller achievement
            svt_reward = 10000
            achievement_title = "High Roller"
            achievement_description = "Spent over 100M VND on services"
            
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown event type: {event_type}"
            }), 400
        
        # Add SVT tokens
        timestamp = int(time.time() * 1000000)
        unique_id = str(uuid.uuid4()).replace('-', '')[:16]
        random_part = ''.join([hex(random.randint(0, 15))[2:] for _ in range(16)])
        tx_hash = f"0x{unique_id}{random_part}{hex(timestamp)[2:]}"[:66]
        
        token_transaction = TokenTransaction(
            customer_id=customer_id,
            amount=svt_reward,
            transaction_type='simulation_reward',
            description=f'Simulation: {achievement_title}',
            tx_hash=tx_hash
        )
        db.session.add(token_transaction)
        
        # 🔗 BLOCKCHAIN INTEGRATION
        blockchain_result = None
        if BLOCKCHAIN_ENABLED:
            try:
                blockchain_result = update_nft_on_blockchain(
                    user_id=customer_id,
                    achievements=[achievement_title],
                    persona_data={
                        "event_type": event_type,
                        "achievement": achievement_title,
                        "svt_reward": svt_reward
                    }
                )
                print(f"🔗 Blockchain updated: {blockchain_result.get('transaction_hash', 'N/A')}")
            except Exception as blockchain_error:
                print(f"⚠️ Blockchain update failed: {blockchain_error}")
        
        # Evaluate achievements
        achievement_result = None
        if BLOCKCHAIN_ENABLED:
            try:
                # Get customer profile for achievement evaluation
                profile = customer_service.get_customer_360_profile(customer_id)
                if profile:
                    earned_achievements = evaluate_all_achievements(profile)
                    if earned_achievements:
                        highest_rank = get_highest_rank_from_achievements(earned_achievements)
                        achievement_result = {
                            "earned_achievements": len(earned_achievements),
                            "highest_rank": highest_rank,
                            "achievements": earned_achievements
                        }
                        print(f"🏆 {len(earned_achievements)} achievements evaluated!")
            except Exception as eval_error:
                print(f"⚠️ Achievement evaluation failed: {eval_error}")
        
        db.session.commit()
        
        # Get updated balance
        token_query = """
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = :customer_id
        """
        
        result = db.session.execute(db.text(token_query), {"customer_id": customer_id})
        row = result.fetchone()
        new_balance = float(row.total_svt) if row and row.total_svt else 0
        
        response_data = {
            "success": True,
            "message": f"Successfully simulated {event_type}",
            "customer_id": customer_id,
            "event_type": event_type,
            "svt_reward": svt_reward,
            "new_balance": new_balance,
            "achievement_title": achievement_title,
            "achievement_description": achievement_description,
            "tx_hash": tx_hash
        }
        
        # Add blockchain info if available
        if blockchain_result and blockchain_result.get('success'):
            response_data.update({
                "blockchain_tx": blockchain_result.get('transaction_hash'),
                "blockchain_gas": blockchain_result.get('gas_used'),
                "blockchain_status": "confirmed"
            })
        
        # Add achievement evaluation result
        if achievement_result:
            response_data["achievement_evaluation"] = achievement_result
        
        return jsonify(response_data)
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Simulation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =============================================================================
# BLOCKCHAIN TEST ENDPOINTS
# =============================================================================

@app.route('/test-blockchain', methods=['POST'])
def test_blockchain():
    """Test blockchain integration endpoint."""
    if not BLOCKCHAIN_ENABLED:
        return jsonify({"error": "Blockchain integration not enabled"}), 503

    data = request.json or {}
    token_id = data.get('token_id', 0)
    rank = data.get('rank', 'Gold')
    badge = data.get('badge', 'test_badge')

    try:
        print(f"🧪 Testing blockchain update: Token {token_id}, Rank: {rank}, Badge: {badge}")
        tx_hash = update_nft_on_blockchain(token_id, rank, badge)

        if tx_hash:
            return jsonify({
                "success": True,
                "transaction_hash": tx_hash,
                "message": f"Successfully updated NFT #{token_id} with rank '{rank}' and badge '{badge}'"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Blockchain update failed"
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Blockchain integration error"
        }), 500


# =============================================================================
# INITIALIZATION
# =============================================================================

def init_app():
    """Khởi tạo ứng dụng: tạo bảng và tải model."""
    with app.app_context():
        try:
            print("🗃️ Khởi tạo database tables...")
            db.create_all()
            print("✅ Database tables created successfully")

            print("🤖 Khởi tạo AI model...")
            ai_model_loaded = ai_service.load_model()
            if ai_model_loaded:
                print("✅ AI model loaded successfully")
            else:
                print("⚠️ AI model fallback to mock model")

        except Exception as e:
            print(f"❌ Initialization error: {e}")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    print("🚀 Khởi động One-Sovico Platform (Clean Architecture)...")
    print(f"📊 Database: {Config.get_database_url()}")
    print(f"🤖 AI Service: Initialized")
    print(f"🔐 Auth Service: Initialized")
    print(f"👥 Customer Service: Initialized")
    print(f"🔗 Blockchain: {'Enabled' if BLOCKCHAIN_ENABLED else 'Disabled'}")
    print(f"🎯 Mission System: {'Enabled' if MISSION_SYSTEM_ENABLED else 'Disabled'}")

    init_app()

    print("🌐 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)