from flask import Blueprint, request, jsonify
from models.database import get_db_connection
import json
import uuid
from datetime import datetime

ai_chat_bp = Blueprint('ai_chat', __name__)


@ai_chat_bp.route('/api/chat/history/<int:customer_id>', methods=['GET'])
def get_chat_history(customer_id):
    """Lấy lịch sử chat của customer"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Lấy danh sách chat
        cursor.execute("""
            SELECT id, customer_id, title, created_at, updated_at, is_active
            FROM ai_chat_history 
            WHERE customer_id = %s AND is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 50
        """, (customer_id,))

        chats = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Lấy messages cho mỗi chat
        for chat in chats:
            cursor.execute("""
                SELECT id, message_type, content, timestamp, actions
                FROM ai_chat_messages 
                WHERE chat_id = %s
                ORDER BY timestamp ASC
            """, (chat['id'],))

            messages = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

            # Parse JSON actions
            for message in messages:
                if message['actions']:
                    try:
                        message['actions'] = json.loads(message['actions'])
                    except:
                        message['actions'] = None

                # Convert timestamp to ISO string safely
                if message['timestamp']:
                    message['timestamp'] = message['timestamp'].isoformat()
                else:
                    message['timestamp'] = None

            chat['messages'] = messages
            chat['created_at'] = chat['created_at'].isoformat() if chat['created_at'] else None
            chat['updated_at'] = chat['updated_at'].isoformat() if chat['updated_at'] else None

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'chats': chats
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy lịch sử chat: {str(e)}'
        }), 500


@ai_chat_bp.route('/api/chat/save', methods=['POST'])
def save_chat():
    """Lưu cuộc trò chuyện"""
    try:
        data = request.get_json()
        print(f"[DEBUG] save_chat received data: {data}")

        chat_id = data.get('id')
        customer_id = data.get('customer_id')
        title = data.get('title')
        messages = data.get('messages', [])

        if not chat_id or not customer_id or not messages:
            print(f"[ERROR] Missing required fields: chat_id={chat_id}, customer_id={customer_id}, messages={messages}")
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin bắt buộc'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Kiểm tra xem chat đã tồn tại chưa
        cursor.execute("SELECT id FROM ai_chat_history WHERE id = %s", (chat_id,))
        existing_chat = cursor.fetchone()

        if existing_chat:
            print(f"[DEBUG] Updating existing chat: {chat_id}")
            cursor.execute("""
                UPDATE ai_chat_history 
                SET title = %s, updated_at = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (title, chat_id))
        else:
            print(f"[DEBUG] Inserting new chat: {chat_id}, customer_id={customer_id}")
            cursor.execute("""
                INSERT INTO ai_chat_history (id, customer_id, title, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (chat_id, customer_id, title))

        # Xóa tất cả messages cũ của chat này (dù có hay không)
        cursor.execute("DELETE FROM ai_chat_messages WHERE chat_id = %s", (chat_id,))
        print(f"[DEBUG] Deleted old messages for chat_id={chat_id}")

        # Insert messages
        for message in messages:
            # Generate unique ID to avoid conflicts (shorter version)
            message_id = str(uuid.uuid4())[:8] + "_" + str(int(datetime.now().timestamp()))
            message_type = message.get('type')
            content = message.get('content')
            timestamp = message.get('timestamp')
            actions = message.get('actions')

            # Convert timestamp
            if isinstance(timestamp, str):
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except Exception as ex:
                    print(f"[ERROR] Timestamp parse error: {timestamp}, ex={ex}")
                    timestamp = datetime.now()
            elif not isinstance(timestamp, datetime):
                timestamp = datetime.now()

            # Convert actions to JSON
            actions_json = json.dumps(actions) if actions else None

            print(
                f"[DEBUG] Inserting message: id={message_id}, chat_id={chat_id}, message_type={message_type}, content={content}, timestamp={timestamp}")
            cursor.execute("""
                INSERT INTO ai_chat_messages (id, chat_id, message_type, content, timestamp, actions)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (message_id, chat_id, message_type, content, timestamp, actions_json))

        conn.commit()
        print(f"[DEBUG] Chat and messages committed to DB for chat_id={chat_id}")
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Đã lưu cuộc trò chuyện'
        })

    except Exception as e:
        import traceback
        print(f"[ERROR] Exception in save_chat: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lưu chat: {str(e)}'
        }), 500


@ai_chat_bp.route('/api/chat/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """Xóa cuộc trò chuyện"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Soft delete - đánh dấu is_active = FALSE
        cursor.execute("""
            UPDATE ai_chat_history 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """, (chat_id,))

        if cursor.rowcount == 0:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy cuộc trò chuyện'
            }), 404

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Đã xóa cuộc trò chuyện'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi xóa chat: {str(e)}'
        }), 500


@ai_chat_bp.route('/api/chat/<chat_id>/actions', methods=['GET'])
def get_chat_actions(chat_id):
    """Lấy danh sách actions của một chat"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT a.*, m.content as message_content, m.timestamp as message_timestamp
            FROM ai_service_actions a
            JOIN ai_chat_messages m ON a.message_id = m.id
            WHERE a.chat_id = %s
            ORDER BY a.created_at DESC
        """, (chat_id,))

        actions = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Parse JSON fields
        for action in actions:
            if action['params']:
                try:
                    action['params'] = json.loads(action['params'])
                except:
                    action['params'] = {}

            if action['result']:
                try:
                    action['result'] = json.loads(action['result'])
                except:
                    action['result'] = {}

            # Convert timestamps
            action['created_at'] = action['created_at'].isoformat()
            action['updated_at'] = action['updated_at'].isoformat()
            action['message_timestamp'] = action['message_timestamp'].isoformat()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'actions': actions
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy actions: {str(e)}'
        }), 500


@ai_chat_bp.route('/api/chat/actions/save', methods=['POST'])
def save_action():
    """Lưu action được thực hiện"""
    try:
        data = request.get_json()

        action_id = data.get('id')
        chat_id = data.get('chat_id')
        message_id = data.get('message_id')
        service_type = data.get('service_type')
        action_type = data.get('action_type')
        params = data.get('params', {})
        status = data.get('status', 'pending')
        result = data.get('result', {})

        if not all([action_id, chat_id, message_id, service_type, action_type]):
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin bắt buộc'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert or update action
        cursor.execute("""
            INSERT INTO ai_service_actions 
            (id, chat_id, message_id, service_type, action_type, params, status, result, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            result = VALUES(result),
            updated_at = CURRENT_TIMESTAMP
        """, (
            action_id, chat_id, message_id, service_type, action_type,
            json.dumps(params), status, json.dumps(result)
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Đã lưu action'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi lưu action: {str(e)}'
        }), 500


@ai_chat_bp.route('/api/chat/stats/<int:customer_id>', methods=['GET'])
def get_chat_stats(customer_id):
    """Thống kê chat của customer"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Tổng số chat
        cursor.execute("""
            SELECT COUNT(*) as total_chats
            FROM ai_chat_history 
            WHERE customer_id = %s AND is_active = TRUE
        """, (customer_id,))
        total_chats = cursor.fetchone()[0]

        # Tổng số messages
        cursor.execute("""
            SELECT COUNT(*) as total_messages
            FROM ai_chat_messages m
            JOIN ai_chat_history h ON m.chat_id = h.id
            WHERE h.customer_id = %s AND h.is_active = TRUE
        """, (customer_id,))
        total_messages = cursor.fetchone()[0]

        # Thống kê actions
        cursor.execute("""
            SELECT 
                service_type,
                action_type,
                status,
                COUNT(*) as count
            FROM ai_service_actions a
            JOIN ai_chat_history h ON a.chat_id = h.id
            WHERE h.customer_id = %s AND h.is_active = TRUE
            GROUP BY service_type, action_type, status
            ORDER BY service_type, action_type, status
        """, (customer_id,))
        action_stats = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Chat gần đây
        cursor.execute("""
            SELECT id, title, updated_at
            FROM ai_chat_history 
            WHERE customer_id = %s AND is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 5
        """, (customer_id,))
        recent_chats = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        for chat in recent_chats:
            chat['updated_at'] = chat['updated_at'].isoformat() if chat['updated_at'] else None

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'stats': {
                'total_chats': total_chats,
                'total_messages': total_messages,
                'action_stats': action_stats,
                'recent_chats': recent_chats
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi lấy thống kê: {str(e)}'
        }), 500