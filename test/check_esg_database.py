# -*- coding: utf-8 -*-
"""
Database Check Script
Kiểm tra dữ liệu ESG trong database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.database import db, get_db_connection
from config import Config

def create_app():
    """Create Flask app for testing"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def check_esg_data():
    """Check ESG data in database"""
    app = create_app()
    
    with app.app_context():
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            print("🔍 KIỂM TRA DỮ LIỆU ESG")
            print("=" * 40)
            
            # Check if tables exist
            cursor.execute("SHOW TABLES LIKE 'esg_%'")
            tables = cursor.fetchall()
            print(f"📋 ESG Tables: {[t['Tables_in_one_sovico (esg_%)'] for t in tables]}")
            
            # Check programs count
            cursor.execute("SELECT COUNT(*) as count FROM esg_programs")
            count = cursor.fetchone()
            print(f"📊 Tổng chương trình: {count['count']}")
            
            if count['count'] > 0:
                # Get programs by category
                cursor.execute("""
                    SELECT category, COUNT(*) as count, SUM(current_amount) as total
                    FROM esg_programs 
                    WHERE status = 'active'
                    GROUP BY category
                """)
                categories = cursor.fetchall()
                
                print("\n📈 Theo danh mục:")
                for cat in categories:
                    category_name = {
                        'environment': 'Môi trường',
                        'social': 'Xã hội',
                        'governance': 'Quản trị'
                    }.get(cat['category'], cat['category'])
                    total = float(cat['total']) if cat['total'] else 0
                    print(f"   {category_name}: {cat['count']} chương trình - {total:,.0f} VND")
                
                # Sample programs
                cursor.execute("SELECT id, name, category, status, current_amount FROM esg_programs LIMIT 5")
                programs = cursor.fetchall()
                
                print("\n📋 Chương trình mẫu:")
                for p in programs:
                    amount = float(p['current_amount']) if p['current_amount'] else 0
                    print(f"   {p['id']}. {p['name']} ({p['category']}) - {amount:,.0f} VND [{p['status']}]")
            
            # Check contributions count  
            cursor.execute("SELECT COUNT(*) as count FROM esg_contributions")
            count = cursor.fetchone()
            print(f"\n💰 Tổng đóng góp: {count['count']} lần")
            
            if count['count'] > 0:
                cursor.execute("SELECT SUM(amount) as total, SUM(svt_amount) as total_svt FROM esg_contributions")
                totals = cursor.fetchone()
                total_amount = float(totals['total']) if totals['total'] else 0
                total_svt = float(totals['total_svt']) if totals['total_svt'] else 0
                print(f"💵 Tổng số tiền: {total_amount:,.0f} VND")
                print(f"🪙 Tổng SVT thưởng: {total_svt:,.0f} SVT")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    check_esg_data()