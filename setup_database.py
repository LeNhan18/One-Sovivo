# setup_database.py
# Script thiết lập MySQL cho One-Sovico Platform

import os
import sys
import pymysql
from config import Config

def create_database():
    """Tạo database nếu chưa tồn tại."""
    try:
        # Kết nối MySQL mà không chỉ định database
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=int(Config.MYSQL_PORT),
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Tạo database
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ Database '{Config.MYSQL_DATABASE}' đã được tạo/kiểm tra")
            
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Lỗi tạo database: {e}")
        return False

def execute_sql_file(filename):
    """Thực thi file SQL."""
    try:
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=int(Config.MYSQL_PORT),
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE,
            charset='utf8mb4'
        )
        
        with open(filename, 'r', encoding='utf-8') as file:
            sql_content = file.read()
            
        # Tách các câu lệnh SQL
        sql_commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]
        
        with connection.cursor() as cursor:
            for command in sql_commands:
                if command.upper().startswith(('CREATE', 'INSERT', 'USE')):
                    try:
                        cursor.execute(command)
                        print(f"✅ Thực thi: {command[:50]}...")
                    except Exception as e:
                        print(f"⚠️ Lỗi: {command[:50]}... - {e}")
            
        connection.commit()
        connection.close()
        print(f"✅ Đã thực thi file {filename}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi thực thi SQL: {e}")
        return False

def test_connection():
    """Test kết nối database."""
    try:
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=int(Config.MYSQL_PORT),
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as user_count FROM users")
            user_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) as customer_count FROM customers")
            customer_count = cursor.fetchone()[0]
            
        connection.close()
        
        print(f"✅ Kết nối thành công!")
        print(f"📊 Số users: {user_count}")
        print(f"👥 Số customers: {customer_count}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi test connection: {e}")
        return False

def main():
    print("🗄️ Thiết lập MySQL cho One-Sovico Platform")
    print("=" * 50)
    
    # Check config
    print(f"📍 MySQL Host: {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
    print(f"👤 MySQL User: {Config.MYSQL_USER}")
    print(f"🏗️ Database: {Config.MYSQL_DATABASE}")
    print()
    
    # Create database
    if not create_database():
        print("❌ Không thể tạo database. Kiểm tra cấu hình MySQL.")
        return False
    
    # Execute SQL file
    sql_file = 'database.sql'
    if os.path.exists(sql_file):
        if not execute_sql_file(sql_file):
            print("❌ Không thể thực thi file SQL.")
            return False
    else:
        print(f"⚠️ Không tìm thấy file {sql_file}")
    
    # Test connection
    if not test_connection():
        print("❌ Không thể kết nối đến database sau khi thiết lập.")
        return False
    
    print("\n🎉 Thiết lập database thành công!")
    print("💡 Bạn có thể chạy: python để khởi động server")
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
