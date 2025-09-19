# -*- coding: utf-8 -*-
"""
ESG Quick Sample Data Insertion
Chèn nhanh dữ liệu mẫu ESG vào database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.database import db
from sqlalchemy import text
from datetime import datetime
import random

def create_sample_data():
    """Tạo dữ liệu mẫu ESG"""
    
    # Xóa dữ liệu cũ
    with db.engine.connect() as conn:
        conn.execute(text('DELETE FROM esg_contributions'))
        conn.execute(text('DELETE FROM esg_programs'))
        conn.commit()
    
    # Chèn chương trình ESG mẫu
    programs_sql = '''
    INSERT INTO esg_programs (id, name, description, category, target_amount, current_amount, start_date, end_date, status, image_url) VALUES
    (1, 'Trồng Rừng Việt Nam', 'Khôi phục rừng nguyên sinh và trồng mới 100,000 cây xanh tại miền núi phía Bắc', 'environment', 150000.00, 45320.50, '2025-01-15', '2025-12-15', 'active', '/images/esg/vietnam-forest.jpg'),
    (2, 'Làm Sạch Sông Mekong', 'Dự án làm sạch và bảo vệ hệ sinh thái sông Mekong', 'environment', 200000.00, 78450.00, '2025-02-01', '2026-01-31', 'active', '/images/esg/mekong-river.jpg'),
    (3, 'Năng Lượng Mặt Trời Nông Thôn', 'Lắp đặt hệ thống điện mặt trời cho 500 hộ gia đình vùng sâu vùng xa', 'environment', 300000.00, 125670.25, '2025-03-01', '2025-11-30', 'active', '/images/esg/solar-rural.jpg'),
    (4, 'Học Bổng Sinh Viên Vùng Cao', 'Cung cấp học bổng toàn phần cho 200 sinh viên dân tộc thiểu số', 'social', 120000.00, 87650.00, '2025-01-01', '2025-12-31', 'active', '/images/esg/scholarship.jpg'),
    (5, 'Trung Tâm Y Tế Cộng Đồng', 'Xây dựng trung tâm y tế cộng đồng tại các xã nghèo', 'social', 250000.00, 165430.50, '2025-01-01', '2026-06-30', 'active', '/images/esg/healthcare.jpg'),
    (6, 'Kỹ Năng Số Cho Người Cao Tuổi', 'Đào tạo kỹ năng sử dụng smartphone cho người cao tuổi', 'social', 45000.00, 32780.25, '2025-02-15', '2025-10-15', 'active', '/images/esg/digital-elderly.jpg'),
    (7, 'Minh Bạch Doanh Nghiệp', 'Nâng cao tính minh bạch trong quản trị doanh nghiệp', 'governance', 75000.00, 54320.75, '2025-01-01', '2025-12-31', 'active', '/images/esg/transparency.jpg'),
    (8, 'Đào Tạo Đạo Đức Kinh Doanh', 'Khóa đào tạo về đạo đức kinh doanh cho 1000 doanh nghiệp SME', 'governance', 100000.00, 67890.50, '2025-02-01', '2025-11-30', 'active', '/images/esg/business-ethics.jpg'),
    (9, 'Bảo Vệ Quyền Người Lao Động', 'Giám sát và cải thiện điều kiện lao động tại các khu công nghiệp', 'governance', 60000.00, 41250.25, '2025-01-15', '2025-12-15', 'active', '/images/esg/worker-rights.jpg'),
    (10, 'Nước Sạch Cho Trẻ Em', 'Đã hoàn thành cung cấp nước sạch cho 50 trường tiểu học', 'social', 80000.00, 80000.00, '2024-06-01', '2024-12-31', 'completed', '/images/esg/clean-water-complete.jpg')
    '''
    
    # Chèn contributions mẫu
    contributions_data = []
    user_ids = [1001, 1002, 1003, 1004, 1005]
    
    for i in range(50):  # 50 contributions mẫu
        program_id = random.randint(1, 9)  # Active programs only
        user_id = random.choice(user_ids)
        amount = round(random.uniform(100, 3000), 2)
        svt_amount = round(amount * 0.1, 2)
        tx_hash = f"0x{''.join(random.choices('0123456789abcdef', k=64))}"
        
        contributions_data.append(f"({program_id}, {user_id}, {amount}, {svt_amount}, '{tx_hash}', NOW(), 'completed', 'Đóng góp qua ví SVT')")
    
    contributions_sql = f'''
    INSERT INTO esg_contributions (program_id, user_id, amount, svt_amount, transaction_hash, contribution_date, status, notes) VALUES
    {', '.join(contributions_data)}
    '''
    
    try:
        with db.engine.connect() as conn:
            # Chèn programs
            conn.execute(text(programs_sql))
            print("✅ Đã chèn 10 chương trình ESG")
            
            # Chèn contributions
            conn.execute(text(contributions_sql))
            print("✅ Đã chèn 50 khoản đóng góp ESG")
            
            conn.commit()
            
            # Hiển thị thống kê
            result = conn.execute(text('''
                SELECT 
                    category,
                    COUNT(*) as count,
                    SUM(current_amount) as total
                FROM esg_programs 
                WHERE status = 'active'
                GROUP BY category
            '''))
            
            print("\n📊 THỐNG KÊ DỮ LIỆU ĐÃ TẠO:")
            print("-" * 40)
            for row in result:
                category_name = {
                    'environment': 'Môi trường',
                    'social': 'Xã hội',
                    'governance': 'Quản trị'
                }.get(row[0], row[0])
                print(f"{category_name}: {row[1]} chương trình - {row[2]:,.0f} VND")
            
            total_contributions = conn.execute(text('SELECT COUNT(*) FROM esg_contributions')).scalar()
            total_amount = conn.execute(text('SELECT SUM(amount) FROM esg_contributions')).scalar()
            total_svt = conn.execute(text('SELECT SUM(svt_amount) FROM esg_contributions')).scalar()
            
            print(f"\nTổng đóng góp: {total_contributions} lần")
            print(f"Tổng số tiền: {total_amount:,.0f} VND")
            print(f"Tổng SVT thưởng: {total_svt:,.0f} SVT")
            
            print("\n🌱 DỮ LIỆU ESG ĐÃ SẴNG SÀNG!")
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False
    
    return True

if __name__ == "__main__":
    from config import Config
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        create_sample_data()