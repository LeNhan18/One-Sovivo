from flask import Blueprint, request, jsonify
from models.database import get_db_connection
import json
import uuid
from datetime import datetime
import pymysql
import re
import os
import logging

# Try to initialize a Hugging Face sentiment pipeline. If transformers or torch
# are not installed or the model cannot be downloaded, HF_PIPELINE will be None
# and the code will fall back to the lightweight rule-based analyzer below.
HF_PIPELINE = None
HF_MODEL_NAME = os.environ.get('HF_SENTIMENT_MODEL', 'nlptown/bert-base-multilingual-uncased-sentiment')

def init_hf_pipeline():
    global HF_PIPELINE
    if HF_PIPELINE is not None:
        return
    try:
        from transformers import pipeline
        # device=-1 forces CPU. If torch with CUDA is installed, change to 0 to use GPU.
        HF_PIPELINE = pipeline('sentiment-analysis', model=HF_MODEL_NAME, device=-1)
        logging.info(f'HuggingFace sentiment pipeline loaded: {HF_MODEL_NAME}')
    except Exception as e:
        HF_PIPELINE = None
        logging.warning(f'Could not initialize Hugging Face pipeline: {e}')


admin_chat_bp = Blueprint('admin_chat', __name__)

@admin_chat_bp.route('/admin/chats', methods=['GET'])
def get_all_chats():
    """Lấy tất cả cuộc chat cho admin"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status', 'all')  # all, active, needs_intervention
        
        offset = (page - 1) * limit
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build WHERE clause based on status
        where_clause = "WHERE h.is_active = TRUE"
        if status == 'needs_intervention':
            where_clause += " AND h.needs_intervention = TRUE"
        
        # Get chats with customer info
        cursor.execute(f"""
            SELECT 
                h.id,
                h.customer_id,
                h.title,
                h.created_at,
                h.updated_at,
                h.needs_intervention,
                h.last_message_at,
                c.name as customer_name,
                c.age as customer_age,
                COUNT(m.id) as message_count,
                MAX(m.timestamp) as last_message_time
            FROM ai_chat_history h
            LEFT JOIN customers c ON h.customer_id = c.customer_id
            LEFT JOIN ai_chat_messages m ON h.id = m.chat_id
            {where_clause}
            GROUP BY h.id, h.customer_id, h.title, h.created_at, h.updated_at, 
                     h.needs_intervention, h.last_message_at, c.name, c.age
            ORDER BY h.updated_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        chats = []
        for row in cursor.fetchall():
            chat_dict = dict(zip([col[0] for col in cursor.description], row))
            # Convert timestamps safely
            for field in ['created_at', 'updated_at', 'last_message_at', 'last_message_time']:
                if chat_dict.get(field):
                    chat_dict[field] = chat_dict[field].isoformat()
            chats.append(chat_dict)
        
        # Get total count
        cursor.execute(f"""
            SELECT COUNT(DISTINCT h.id)
            FROM ai_chat_history h
            LEFT JOIN customers c ON h.customer_id = c.customer_id
            {where_clause}
        """)
        total = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'chats': chats,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy danh sách chat: {str(e)}'
        }), 500

@admin_chat_bp.route('/admin/chat/<chat_id>', methods=['GET'])
def get_chat_detail(chat_id):
    """Lấy chi tiết cuộc chat cho admin"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get chat info with customer details
        cursor.execute("""
            SELECT 
                h.*,
                c.name as customer_name,
                c.age as customer_age,
                c.job as customer_job,
                c.city as customer_city,
                c.persona_type
            FROM ai_chat_history h
            LEFT JOIN customers c ON h.customer_id = c.customer_id
            WHERE h.id = %s
        """, (chat_id,))
        
        chat_row = cursor.fetchone()
        if not chat_row:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy cuộc chat'
            }), 404
            
        chat = dict(zip([col[0] for col in cursor.description], chat_row))
        
        # Convert timestamps safely
        for field in ['created_at', 'updated_at', 'last_message_at']:
            if chat.get(field):
                chat[field] = chat[field].isoformat()
        
        # Get messages
        cursor.execute("""
            SELECT id, message_type, content, timestamp, actions, is_intervention
            FROM ai_chat_messages 
            WHERE chat_id = %s
            ORDER BY timestamp ASC
        """, (chat_id,))
        
        messages = []
        for row in cursor.fetchall():
            message = dict(zip([col[0] for col in cursor.description], row))
            
            # Parse JSON actions safely
            if message['actions']:
                try:
                    message['actions'] = json.loads(message['actions'])
                except:
                    message['actions'] = None
            
            # Convert timestamp safely
            if message['timestamp']:
                message['timestamp'] = message['timestamp'].isoformat()
                
            messages.append(message)

        # --- Sentiment analysis (lightweight rule-based) ---
        # This is a simple, fast fallback analyzer. Replace with a trained
        # model (joblib/tensorflow) if available in dl_model/ for better results.
        def analyze_sentiment(text: str):
            # Prefer Hugging Face pipeline when available
            if HF_PIPELINE is None:
                try:
                    init_hf_pipeline()
                except Exception:
                    pass

            if HF_PIPELINE is not None:
                try:
                    result = HF_PIPELINE(text[:512])
                    # Many HF models return labels like '1 star', '5 stars' or 'POSITIVE'
                    label = result[0].get('label')
                    score = float(result[0].get('score', 0.0))
                    # Map common labels to our schema
                    lbl = 'neutral'
                    if isinstance(label, str):
                        L = label.lower()
                        if 'neg' in L or '1' in L or '2' in L or 'bad' in L:
                            lbl = 'negative'
                            # invert score if label is star-rating (1-5)
                            if 'star' in L and L[0].isdigit():
                                try:
                                    stars = int(L[0])
                                    score = (3 - stars) / 2.0
                                except Exception:
                                    pass
                        elif 'pos' in L or '4' in L or '5' in L or 'good' in L:
                            lbl = 'positive'
                        else:
                            lbl = 'neutral'
                    return score if isinstance(score, float) else float(score), lbl
                except Exception:
                    # If HF fails, fall back to rule-based below
                    pass

            # --- Fallback lightweight rule-based ---
            if not text:
                return 0.0, 'neutral'
            txt = text.lower()
            tokens = re.findall(r"\w+", txt)
            if not tokens:
                return 0.0, 'neutral'

            positive = {
                'tốt','hài lòng','dịch vụ ok','xuất sắc','cảm ơn','thanks','thank','thông minh',
                'tốtt','ok','okay','quá tốt','ổn','helpful','hay'
            }
            negative = {
                'tệ','buồn','tức giận','không hài lòng','ghét','trả lời chậm','ngu','dở','lâu','mệt',
                'vấn đề','thất vọng','không hài lòng','không','không bao giờ','tức giận','thô lỗ','bạn trả lời chậm','đặt vé lâu'
            }

            pos_count = 0
            neg_count = 0
            for t in tokens:
                if t in positive:
                    pos_count += 1
                if t in negative:
                    neg_count += 1

            # score normalized to [-1,1]
            score = (pos_count - neg_count) / max(1, len(tokens))
            if score >= 0.08:
                label = 'positive'
            elif score <= -0.08:
                label = 'negative'
            else:
                label = 'neutral'
            return score, label

        # Attach sentiment per user message and compute chat-level summary
        try:
            user_scores = []
            for m in messages:
                if m.get('message_type') and m['message_type'].lower() == 'user':
                    s, lbl = analyze_sentiment(m.get('content') or '')
                    m['sentiment_score'] = s
                    m['sentiment_label'] = lbl
                    user_scores.append(s)

            if user_scores:
                avg_score = sum(user_scores) / len(user_scores)
                if avg_score >= 0.08:
                    overall_label = 'positive'
                elif avg_score <= -0.08:
                    overall_label = 'negative'
                else:
                    overall_label = 'neutral'
            else:
                avg_score = 0.0
                overall_label = 'neutral'

            chat['sentiment_summary'] = {
                'avg_score': round(avg_score, 3),
                'label': overall_label,
                'user_message_count': len(user_scores)
            }

            # Auto-flag chat if overall sentiment is negative
            # Threshold can be tuned. Here we flag if avg_score <= -0.08
            if overall_label == 'negative' and chat.get('needs_intervention') is not True:
                try:
                    cursor.execute("""
                        UPDATE ai_chat_history
                        SET needs_intervention = TRUE,
                            intervention_reason = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (f'auto: negative sentiment (score={avg_score:.3f})', chat_id))
                    conn.commit()
                    chat['auto_flagged'] = True
                except Exception:
                    # don't break the response if DB update fails
                    chat['auto_flagged'] = False
        except Exception:
            # If sentiment analysis fails, continue without blocking
            chat['sentiment_summary'] = {'avg_score': 0.0, 'label': 'neutral', 'user_message_count': 0}
        
        chat['messages'] = messages
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'chat': chat
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy chi tiết chat: {str(e)}'
        }), 500

@admin_chat_bp.route('/admin/chat/<chat_id>/intervene', methods=['POST'])
def intervene_chat(chat_id):
    """Can thiệp vào cuộc chat"""
    try:
        data = request.get_json()
        admin_message = data.get('message')
        admin_id = data.get('admin_id', 'admin')
        
        if not admin_message:
            return jsonify({
                'success': False,
                'message': 'Thiếu nội dung can thiệp'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert admin intervention message
        message_id = str(uuid.uuid4())[:8] + "_admin"
        desired_message_type = 'admin_intervention'

        # Determine if current DB schema accepts desired message_type; fallback if not
        message_type = desired_message_type
        try:
            cursor.execute("SHOW COLUMNS FROM ai_chat_messages LIKE 'message_type'")
            row = cursor.fetchone()
            if row:
                # row format: (Field, Type, Null, Key, Default, Extra)
                col_type = row[1]
                col_type_l = str(col_type or '').lower()
                if col_type_l.startswith('enum('):
                    if 'admin_intervention' not in col_type_l:
                        # Fallback to 'assistant' to avoid DataError until migrations applied
                        message_type = 'assistant'
                elif 'varchar' in col_type_l:
                    # Check length
                    try:
                        length = int(col_type_l[col_type_l.find('(')+1:col_type_l.find(')')])
                    except Exception:
                        length = 0
                    if length and length < len(desired_message_type):
                        message_type = 'assistant'
                # else: other types -> keep desired and hope migration fixed
        except Exception:
            # If inspection fails, proceed with desired value; DB will error if unsupported
            pass
        
        try:
            cursor.execute("""
                INSERT INTO ai_chat_messages 
                (id, chat_id, message_type, content, timestamp, is_intervention, admin_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                message_id,
                chat_id, 
                message_type,
                admin_message,
                datetime.now(),
                True,
                admin_id
            ))
        except pymysql.err.DataError as data_error:
            conn.rollback()
            print(f"ERROR: Lỗi khi chèn dữ liệu: {str(data_error)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi khi chèn dữ liệu: {str(data_error)}'
            }), 500
        except Exception as insert_error:
            conn.rollback()
            print(f"ERROR: Lỗi không xác định khi chèn dữ liệu: {str(insert_error)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi không xác định khi chèn dữ liệu: {str(insert_error)}'
            }), 500
        
        # Update chat status
        try:
            cursor.execute("""
                UPDATE ai_chat_history 
                SET needs_intervention = FALSE, updated_at = CURRENT_TIMESTAMP,
                    last_message_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (chat_id,))
        except Exception as update_error:
            conn.rollback()
            print(f"ERROR: Lỗi khi cập nhật trạng thái chat: {str(update_error)}")
            return jsonify({
                'success': False,
                'message': f'Lỗi khi cập nhật trạng thái chat: {str(update_error)}'
            }), 500
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Đã can thiệp thành công',
            'intervention_id': message_id
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: Lỗi can thiệp: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Lỗi can thiệp: {str(e)}'
        }), 500

@admin_chat_bp.route('/admin/chat/<chat_id>/flag', methods=['POST'])
def flag_chat_for_intervention(chat_id):
    """Đánh dấu chat cần can thiệp"""
    try:
        data = request.get_json()
        reason = data.get('reason', 'Admin flagged for review')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE ai_chat_history 
            SET needs_intervention = TRUE, 
                intervention_reason = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (reason, chat_id))
        
        if cursor.rowcount == 0:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy cuộc chat'
            }), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Đã đánh dấu cần can thiệp'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi đánh dấu: {str(e)}'
        }), 500

@admin_chat_bp.route('/admin/chat/stats', methods=['GET'])
def get_chat_stats():
    """Thống kê chat cho admin"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Overall stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_chats,
                COUNT(CASE WHEN needs_intervention = TRUE THEN 1 END) as needs_intervention,
                COUNT(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as today_chats,
                (SELECT AVG(message_count) FROM (
                    SELECT COUNT(*) as message_count
                    FROM ai_chat_messages
                    GROUP BY chat_id
                ) as subquery) as avg_messages_per_chat
            FROM ai_chat_history h
            WHERE is_active = TRUE
        """)
        
        stats_row = cursor.fetchone()
        stats = dict(zip([col[0] for col in cursor.description], stats_row))
        
        # Customer activity
        cursor.execute("""
            SELECT 
                c.name as customer_name,
                c.customer_id,
                COUNT(h.id) as chat_count,
                MAX(h.updated_at) as last_chat
            FROM customers c
            LEFT JOIN ai_chat_history h ON c.customer_id = h.customer_id
            WHERE h.is_active = TRUE
            GROUP BY c.customer_id, c.name
            ORDER BY COUNT(h.id) DESC
            LIMIT 10
        """)
        
        top_customers = []
        for row in cursor.fetchall():
            customer = dict(zip([col[0] for col in cursor.description], row))
            if customer['last_chat']:
                customer['last_chat'] = customer['last_chat'].isoformat()
            top_customers.append(customer)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'overview': stats,
                'top_customers': top_customers
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy thống kê: {str(e)}'
        }), 500