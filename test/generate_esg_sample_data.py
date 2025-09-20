# -*- coding: utf-8 -*-
"""
ESG Sample Data Generator
Tạo dữ liệu mẫu cho hệ thống ESG
Created: 2025-09-19
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.database import db
from sqlalchemy import text
from datetime import datetime, timedelta
import random

def create_app():
    """Create Flask app for data generation"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:123456@localhost/one_sovico'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def clear_existing_data():
    """Xóa dữ liệu ESG hiện tại"""
    try:
        with db.engine.connect() as conn:
            # Xóa contributions trước (vì có foreign key)
            conn.execute(text('DELETE FROM esg_contributions'))
            conn.execute(text('DELETE FROM esg_programs'))
            conn.commit()
            print("✅ Đã xóa dữ liệu ESG cũ")
    except Exception as e:
        print(f"❌ Lỗi khi xóa dữ liệu: {e}")

def generate_esg_programs():
    """Tạo các chương trình ESG mẫu"""
    programs = [
        # Environment Programs
        {
            'name': 'Trồng Rừng Việt Nam',
            'description': 'Khôi phục rừng nguyên sinh và trồng mới 100,000 cây xanh tại các tỉnh miền núi phía Bắc. Dự án nhằm chống xói mòn đất, bảo vệ nguồn nước và hấp thụ CO2.',
            'category': 'environment',
            'target_amount': 150000.00,
            'current_amount': 45320.50,
            'start_date': '2025-01-15',
            'end_date': '2025-12-15',
            'image_url': '/images/esg/vietnam-forest.jpg',
            'status': 'active'
        },
        {
            'name': 'Làm Sạch Sông Mekong',
            'description': 'Dự án làm sạch và bảo vệ hệ sinh thái sông Mekong, xử lý chất thải công nghiệp và phục hồi đa dạng sinh học thủy sản.',
            'category': 'environment',
            'target_amount': 200000.00,
            'current_amount': 78450.00,
            'start_date': '2025-02-01',
            'end_date': '2026-01-31',
            'image_url': '/images/esg/mekong-river.jpg',
            'status': 'active'
        },
        {
            'name': 'Năng Lượng Mặt Trời Nông Thôn',
            'description': 'Lắp đặt hệ thống điện mặt trời cho 500 hộ gia đình vùng sâu vùng xa, giảm phụ thuộc vào lưới điện quốc gia và năng lượng hóa thạch.',
            'category': 'environment',
            'target_amount': 300000.00,
            'current_amount': 125670.25,
            'start_date': '2025-03-01',
            'end_date': '2025-11-30',
            'image_url': '/images/esg/solar-rural.jpg',
            'status': 'active'
        },
        {
            'name': 'Bảo Vệ Rùa Biển Côn Đảo',
            'description': 'Chương trình bảo tồn rùa biển tại Côn Đảo, bảo vệ bãi đẻ và nuôi dưỡng rùa con trước khi thả về biển.',
            'category': 'environment',
            'target_amount': 80000.00,
            'current_amount': 52340.75,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'image_url': '/images/esg/sea-turtle.jpg',
            'status': 'active'
        },

        # Social Programs  
        {
            'name': 'Học Bổng Sinh Viên Vùng Cao',
            'description': 'Cung cấp học bổng toàn phần cho 200 sinh viên dân tộc thiểu số từ vùng cao, bao gồm học phí, sinh hoạt phí và sách vở.',
            'category': 'social',
            'target_amount': 120000.00,
            'current_amount': 87650.00,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'image_url': '/images/esg/scholarship.jpg',
            'status': 'active'
        },
        {
            'name': 'Trung Tâm Y Tế Cộng Đồng',
            'description': 'Xây dựng và vận hành trung tâm y tế cộng đồng tại các xã nghèo, cung cấp dịch vụ khám chữa bệnh miễn phí.',
            'category': 'social',
            'target_amount': 250000.00,
            'current_amount': 165430.50,
            'start_date': '2025-01-01',
            'end_date': '2026-06-30',
            'image_url': '/images/esg/healthcare.jpg',
            'status': 'active'
        },
        {
            'name': 'Kỹ Năng Số Cho Người Cao Tuổi',
            'description': 'Đào tạo kỹ năng sử dụng smartphone và internet cho người cao tuổi, giúp họ kết nối với gia đình và xã hội.',
            'category': 'social',
            'target_amount': 45000.00,
            'current_amount': 32780.25,
            'start_date': '2025-02-15',
            'end_date': '2025-10-15',
            'image_url': '/images/esg/digital-elderly.jpg',
            'status': 'active'
        },
        {
            'name': 'Nhà Ở Xã Hội Miền Trung',
            'description': 'Xây dựng 100 căn nhà ở xã hội cho các gia đình có hoàn cảnh khó khăn tại miền Trung, chống chịu thiên tai.',
            'category': 'social',
            'target_amount': 500000.00,
            'current_amount': 234560.00,
            'start_date': '2025-01-01',
            'end_date': '2026-12-31',
            'image_url': '/images/esg/social-housing.jpg',
            'status': 'active'
        },

        # Governance Programs
        {
            'name': 'Minh Bạch Doanh Nghiệp',
            'description': 'Chương trình nâng cao tính minh bạch trong quản trị doanh nghiệp, báo cáo tài chính và trách nhiệm xã hội.',
            'category': 'governance',
            'target_amount': 75000.00,
            'current_amount': 54320.75,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'image_url': '/images/esg/transparency.jpg',
            'status': 'active'
        },
        {
            'name': 'Đào Tạo Đạo Đức Kinh Doanh',
            'description': 'Khóa đào tạo về đạo đức kinh doanh, chống tham nhũng và quản trị bền vững cho 1000 doanh nghiệp SME.',
            'category': 'governance',
            'target_amount': 100000.00,
            'current_amount': 67890.50,
            'start_date': '2025-02-01',
            'end_date': '2025-11-30',
            'image_url': '/images/esg/business-ethics.jpg',
            'status': 'active'
        },
        {
            'name': 'Bảo Vệ Quyền Người Lao Động',
            'description': 'Chương trình giám sát và cải thiện điều kiện lao động, bảo vệ quyền lợi người lao động tại các khu công nghiệp.',
            'category': 'governance',
            'target_amount': 60000.00,
            'current_amount': 41250.25,
            'start_date': '2025-01-15',
            'end_date': '2025-12-15',
            'image_url': '/images/esg/worker-rights.jpg',
            'status': 'active'
        },

        # Completed Programs
        {
            'name': 'Nước Sạch Cho Trẻ Em',
            'description': 'Đã hoàn thành việc cung cấp nước sạch cho 50 trường tiểu học vùng khó khăn, phục vụ hơn 5,000 trẻ em.',
            'category': 'social',
            'target_amount': 80000.00,
            'current_amount': 80000.00,
            'start_date': '2024-06-01',
            'end_date': '2024-12-31',
            'image_url': '/images/esg/clean-water-complete.jpg',
            'status': 'completed'
        }
    ]

    try:
        with db.engine.connect() as conn:
            for i, program in enumerate(programs, 1):
                conn.execute(text('''
                    INSERT INTO esg_programs 
                    (id, name, description, category, target_amount, current_amount, 
                     start_date, end_date, image_url, status, created_at, updated_at)
                    VALUES 
                    (:id, :name, :description, :category, :target_amount, :current_amount, 
                     :start_date, :end_date, :image_url, :status, NOW(), NOW())
                '''), {
                    'id': i,
                    'name': program['name'],
                    'description': program['description'],
                    'category': program['category'],
                    'target_amount': program['target_amount'],
                    'current_amount': program['current_amount'],
                    'start_date': program['start_date'],
                    'end_date': program['end_date'],
                    'image_url': program['image_url'],
                    'status': program['status']
                })
            
            conn.commit()
            print(f"✅ Đã tạo {len(programs)} chương trình ESG")
            
    except Exception as e:
        print(f"❌ Lỗi khi tạo chương trình ESG: {e}")

def generate_contributions():
    """Tạo các khoản đóng góp mẫu"""
    
    # Danh sách user_id mẫu (giả định có sẵn)
    user_ids = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010]
    
    # Tạo contributions cho các chương trình
    contributions = []
    
    # Tạo contributions ngẫu nhiên cho 30 ngày qua
    for day in range(30):
        contribution_date = datetime.now() - timedelta(days=day)
        
        # Tạo 3-8 contributions mỗi ngày
        daily_contributions = random.randint(3, 8)
        
        for _ in range(daily_contributions):
            program_id = random.randint(1, 12)  # Có 12 programs
            user_id = random.choice(user_ids)
            
            # Số tiền đóng góp ngẫu nhiên
            amount = round(random.uniform(50, 5000), 2)
            
            # SVT reward = 10% of contribution amount
            svt_amount = round(amount * 0.1, 2)
            
            # Transaction hash giả
            tx_hash = f"0x{''.join(random.choices('0123456789abcdef', k=64))}"
            
            status = random.choices(['completed', 'pending', 'failed'], weights=[85, 10, 5])[0]
            
            notes_options = [
                'Đóng góp qua ví SVT',
                'Chuyển khoản ngân hàng',
                'Thanh toán qua VietjetPay',
                'Đóng góp từ HDBank',
                'Tích lũy từ chương trình loyalty',
                'Đóng góp định kỳ hàng tháng',
                'Đóng góp dịp lễ tết',
                'Quyên góp từ chương trình du lịch'
            ]
            
            contributions.append({
                'program_id': program_id,
                'user_id': user_id,
                'amount': amount,
                'svt_amount': svt_amount,
                'transaction_hash': tx_hash,
                'contribution_date': contribution_date,
                'status': status,
                'notes': random.choice(notes_options)
            })
    
    try:
        with db.engine.connect() as conn:
            for contrib in contributions:
                conn.execute(text('''
                    INSERT INTO esg_contributions 
                    (program_id, user_id, amount, svt_amount, transaction_hash, 
                     contribution_date, status, notes)
                    VALUES 
                    (:program_id, :user_id, :amount, :svt_amount, :transaction_hash, 
                     :contribution_date, :status, :notes)
                '''), contrib)
            
            conn.commit()
            print(f"✅ Đã tạo {len(contributions)} khoản đóng góp ESG")
            
    except Exception as e:
        print(f"❌ Lỗi khi tạo đóng góp ESG: {e}")

def generate_statistics():
    """Tạo thống kê tổng quan"""
    try:
        with db.engine.connect() as conn:
            # Thống kê tổng quan
            result = conn.execute(text('''
                SELECT 
                    COUNT(*) as total_programs,
                    SUM(target_amount) as total_target,
                    SUM(current_amount) as total_raised,
                    AVG(current_amount/target_amount * 100) as avg_progress
                FROM esg_programs 
                WHERE status = 'active'
            '''))
            
            stats = result.fetchone()
            
            print("\n📊 THỐNG KÊ ESG SYSTEM")
            print("=" * 50)
            print(f"Tổng số chương trình: {stats[0]}")
            print(f"Tổng mục tiêu: {stats[1]:,.0f} VND")
            print(f"Tổng đã quyên góp: {stats[2]:,.0f} VND")
            print(f"Tiến độ trung bình: {stats[3]:.1f}%")
            
            # Thống kê theo category
            result = conn.execute(text('''
                SELECT 
                    category,
                    COUNT(*) as program_count,
                    SUM(current_amount) as total_raised
                FROM esg_programs 
                WHERE status = 'active'
                GROUP BY category
            '''))
            
            print("\n📈 THỐNG KÊ THEO DANH MỤC")
            print("-" * 30)
            for row in result:
                category_name = {
                    'environment': 'Môi trường',
                    'social': 'Xã hội', 
                    'governance': 'Quản trị'
                }.get(row[0], row[0])
                print(f"{category_name}: {row[1]} chương trình - {row[2]:,.0f} VND")
            
            # Top contributors
            result = conn.execute(text('''
                SELECT 
                    user_id,
                    COUNT(*) as contribution_count,
                    SUM(amount) as total_contributed,
                    SUM(svt_amount) as total_svt_earned
                FROM esg_contributions 
                WHERE status = 'completed'
                GROUP BY user_id
                ORDER BY total_contributed DESC
                LIMIT 5
            '''))
            
            print("\n🏆 TOP CONTRIBUTORS")
            print("-" * 30)
            for i, row in enumerate(result, 1):
                print(f"{i}. User {row[0]}: {row[2]:,.0f} VND ({row[3]:,.0f} SVT)")
                
    except Exception as e:
        print(f"❌ Lỗi khi tạo thống kê: {e}")

def main():
    """Chạy generator chính"""
    print("🚀 BẮT ĐẦU TẠO DỮ LIỆU MẪU ESG")
    print("=" * 50)
    
    app = create_app()
    
    with app.app_context():
        # Bước 1: Xóa dữ liệu cũ
        print("1. Xóa dữ liệu ESG cũ...")
        clear_existing_data()
        
        # Bước 2: Tạo programs
        print("2. Tạo chương trình ESG...")
        generate_esg_programs()
        
        # Bước 3: Tạo contributions
        print("3. Tạo đóng góp ESG...")
        generate_contributions()
        
        # Bước 4: Hiển thị thống kê
        print("4. Tạo thống kê...")
        generate_statistics()
        
        print("\n✅ HOÀN THÀNH TẠO DỮ LIỆU MẪU ESG!")
        print("Hệ thống ESG đã sẵn sàng để sử dụng 🌱")

if __name__ == "__main__":
    main()