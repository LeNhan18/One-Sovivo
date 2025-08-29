#!/usr/bin/env python3
"""
Setup Mission Database Tables
Tạo các bảng cần thiết cho hệ thống mission progression
"""

import mysql.connector
import datetime

def create_mission_tables():
    """Tạo các bảng cho mission system"""
    
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='nhan1811',
            database='one_sovico'
        )
        cursor = conn.cursor()
        
        print("🗄️ Creating mission database tables...")
        
        # 1. Customer Missions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_missions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                mission_id VARCHAR(100) NOT NULL,
                mission_title VARCHAR(200) NOT NULL,
                mission_category VARCHAR(50) NOT NULL,
                mission_level VARCHAR(50) NOT NULL,
                status ENUM('available', 'in_progress', 'completed', 'expired') DEFAULT 'available',
                progress_data JSON,
                svt_reward DECIMAL(10,2) DEFAULT 0,
                started_at DATETIME NULL,
                completed_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
                UNIQUE KEY unique_customer_mission (customer_id, mission_id),
                INDEX idx_customer_status (customer_id, status),
                INDEX idx_mission_category (mission_category),
                INDEX idx_completed_at (completed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Created customer_missions table")
        
        # 2. Customer Mission Progress Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_mission_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                mission_id VARCHAR(100) NOT NULL,
                requirement_key VARCHAR(100) NOT NULL,
                current_value DECIMAL(15,2) DEFAULT 0,
                required_value DECIMAL(15,2) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
                UNIQUE KEY unique_progress (customer_id, mission_id, requirement_key),
                INDEX idx_customer_mission (customer_id, mission_id),
                INDEX idx_requirement (requirement_key),
                INDEX idx_completion (is_completed)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Created customer_mission_progress table")
        
        # 3. Mission Templates Table (cho admin quản lý)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mission_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mission_id VARCHAR(100) UNIQUE NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                category ENUM('onboarding', 'profile', 'financial', 'travel', 'lifestyle', 'social', 'investment', 'loyalty') NOT NULL,
                level ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
                customer_type ENUM('new', 'regular', 'vip') NOT NULL,
                svt_reward DECIMAL(10,2) NOT NULL,
                requirements JSON NOT NULL,
                prerequisites JSON,
                next_missions JSON,
                icon VARCHAR(10) DEFAULT '🎯',
                estimated_time VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category_level (category, level),
                INDEX idx_customer_type (customer_type),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Created mission_templates table")
        
        # 4. Customer Stats Table (để tracking thống kê cho missions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                stat_key VARCHAR(100) NOT NULL,
                stat_value DECIMAL(15,2) DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
                UNIQUE KEY unique_customer_stat (customer_id, stat_key),
                INDEX idx_stat_key (stat_key),
                INDEX idx_last_updated (last_updated)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Created customer_stats table")
        
        conn.commit()
        
        # Insert sample mission templates
        insert_sample_missions(cursor, conn)
        
        print("\n🎉 Mission database setup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if conn:
            conn.close()


def insert_sample_missions(cursor, conn):
    """Chèn các mission templates mẫu"""
    
    print("\n📝 Inserting sample mission templates...")
    
    sample_missions = [
        # NEW CUSTOMER MISSIONS - BEGINNER
        {
            'mission_id': 'new_welcome',
            'title': 'Chào mừng đến với Sovico!',
            'description': 'Hoàn thành hướng dẫn cơ bản của ứng dụng',
            'category': 'onboarding',
            'level': 'beginner',
            'customer_type': 'new',
            'svt_reward': 500,
            'requirements': '{"app_tutorial_completed": true}',
            'prerequisites': '[]',
            'next_missions': '["new_profile_basic"]',
            'icon': '👋',
            'estimated_time': '5 phút'
        },
        {
            'mission_id': 'new_profile_basic',
            'title': 'Hoàn thành thông tin cơ bản',
            'description': 'Điền đầy đủ họ tên, tuổi, giới tính và thành phố',
            'category': 'profile',
            'level': 'beginner',
            'customer_type': 'new',
            'svt_reward': 300,
            'requirements': '{"name_filled": true, "age_filled": true, "gender_filled": true, "city_filled": true}',
            'prerequisites': '["new_welcome"]',
            'next_missions': '["new_first_login"]',
            'icon': '👤',
            'estimated_time': '3 phút'
        },
        {
            'mission_id': 'new_first_login',
            'title': 'Đăng nhập đầu tiên',
            'description': 'Đăng nhập thành công vào ứng dụng',
            'category': 'onboarding',
            'level': 'beginner',
            'customer_type': 'new',
            'svt_reward': 200,
            'requirements': '{"login_count": 1}',
            'prerequisites': '["new_profile_basic"]',
            'next_missions': '["new_explore_features"]',
            'icon': '🔐',
            'estimated_time': '1 phút'
        },
        
        # NEW CUSTOMER MISSIONS - INTERMEDIATE
        {
            'mission_id': 'new_explore_features',
            'title': 'Khám phá tính năng',
            'description': 'Truy cập ít nhất 3 tính năng khác nhau (Profile360, AI Assistant, NFT Passport)',
            'category': 'onboarding',
            'level': 'intermediate',
            'customer_type': 'new',
            'svt_reward': 400,
            'requirements': '{"features_explored": 3}',
            'prerequisites': '["new_first_login"]',
            'next_missions': '["new_first_ai_chat"]',
            'icon': '🔍',
            'estimated_time': '10 phút'
        },
        {
            'mission_id': 'new_first_ai_chat',
            'title': 'Trò chuyện với AI lần đầu',
            'description': 'Sử dụng AI Financial Assistant để đặt câu hỏi tài chính',
            'category': 'onboarding',
            'level': 'intermediate',
            'customer_type': 'new',
            'svt_reward': 600,
            'requirements': '{"ai_interactions": 1}',
            'prerequisites': '["new_explore_features"]',
            'next_missions': '["new_profile_advanced"]',
            'icon': '🤖',
            'estimated_time': '5 phút'
        },
        
        # REGULAR CUSTOMER MISSIONS
        {
            'mission_id': 'reg_daily_checkin',
            'title': 'Điểm danh hàng ngày',
            'description': 'Điểm danh 5 ngày trong tuần',
            'category': 'loyalty',
            'level': 'beginner',
            'customer_type': 'regular',
            'svt_reward': 800,
            'requirements': '{"weekly_checkins": 5}',
            'prerequisites': '[]',
            'next_missions': '["reg_profile_optimization"]',
            'icon': '✅',
            'estimated_time': 'Hàng ngày'
        },
        {
            'mission_id': 'reg_transaction_milestone',
            'title': 'Hoàn thành 10 giao dịch',
            'description': 'Thực hiện thành công 10 giao dịch tài chính',
            'category': 'financial',
            'level': 'intermediate',
            'customer_type': 'regular',
            'svt_reward': 1500,
            'requirements': '{"transaction_count": 10}',
            'prerequisites': '["reg_daily_checkin"]',
            'next_missions': '["reg_travel_booking"]',
            'icon': '💰',
            'estimated_time': '1 tháng'
        },
        
        # VIP CUSTOMER MISSIONS
        {
            'mission_id': 'vip_portfolio_management',
            'title': 'Quản lý danh mục đầu tư',
            'description': 'Sử dụng tính năng quản lý danh mục đầu tư nâng cao',
            'category': 'investment',
            'level': 'expert',
            'customer_type': 'vip',
            'svt_reward': 3000,
            'requirements': '{"portfolio_value": 100000000}',
            'prerequisites': '[]',
            'next_missions': '["vip_exclusive_events"]',
            'icon': '💎',
            'estimated_time': '1 giờ'
        }
    ]
    
    for mission in sample_missions:
        try:
            cursor.execute("""
                INSERT IGNORE INTO mission_templates 
                (mission_id, title, description, category, level, customer_type, 
                 svt_reward, requirements, prerequisites, next_missions, icon, estimated_time)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                mission['mission_id'], mission['title'], mission['description'],
                mission['category'], mission['level'], mission['customer_type'],
                mission['svt_reward'], mission['requirements'], mission['prerequisites'],
                mission['next_missions'], mission['icon'], mission['estimated_time']
            ))
            print(f"✅ Added mission: {mission['title']}")
        except Exception as e:
            print(f"❌ Error adding mission {mission['mission_id']}: {e}")
    
    conn.commit()


def initialize_customer_stats():
    """Khởi tạo customer stats cho customer 2015"""
    
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='nhan1811',
            database='one_sovico'
        )
        cursor = conn.cursor()
        
        print("\n📊 Initializing customer stats...")
        
        customer_id = 2015
        
        # Stats cho customer 2015
        stats = [
            ('login_count', 15),
            ('ai_interactions', 5),
            ('features_explored', 3),
            ('profile_completeness', 75),
            ('transaction_count', 10),
            ('app_tutorial_completed', 1),
            ('name_filled', 1),
            ('age_filled', 1),
            ('gender_filled', 1),
            ('city_filled', 1),
            ('weekly_checkins', 6),
            ('daily_streak', 5),
            ('marketplace_visits', 3)
        ]
        
        for stat_key, stat_value in stats:
            cursor.execute("""
                INSERT INTO customer_stats (customer_id, stat_key, stat_value)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE stat_value = %s
            """, (customer_id, stat_key, stat_value, stat_value))
        
        conn.commit()
        print(f"✅ Initialized stats for customer {customer_id}")
        
    except Exception as e:
        print(f"❌ Error initializing stats: {e}")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print("🚀 Setting up Mission Progression Database...")
    create_mission_tables()
    initialize_customer_stats()
    print("\n🎉 Setup completed! Ready to use mission progression system.")
