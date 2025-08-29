#!/usr/bin/env python3
"""
Script để kiểm tra trạng thái database hiện tại
"""

from app import app, db
import pymysql

def check_database_status():
    """Kiểm tra các bảng trong database"""
    with app.app_context():
        try:
            # Lấy danh sách tất cả bảng
            result = db.session.execute(db.text('SHOW TABLES'))
            tables = [row[0] for row in result.fetchall()]
            
            print("📊 TRẠNG THÁI CƠ SỞ DỮ LIỆU")
            print("=" * 50)
            
            # Các bảng cũ (ban đầu)
            old_tables = ['customers', 'hdbank_transactions', 'hdsaison', 'users', 'vietjet', 'resort_bookings', 'token_transactions', 'ai_predictions']
            
            # Các bảng mới (tính năng át chủ bài)
            new_tables = ['achievements', 'customer_achievements', 'marketplace_items', 'p2p_listings']
            
            print("\n🏛️  BẢNG CŨ (Ban đầu):")
            for table in old_tables:
                status = "✅" if table in tables else "❌"
                print(f"  {status} {table}")
            
            print("\n🆕 BẢNG MỚI (Tính năng át chủ bài):")
            for table in new_tables:
                status = "✅" if table in tables else "❌"
                print(f"  {status} {table}")
            
            print("\n📈 THỐNG KÊ:")
            print(f"  • Tổng số bảng: {len(tables)}")
            print(f"  • Bảng cũ: {len([t for t in old_tables if t in tables])}/{len(old_tables)}")
            print(f"  • Bảng mới: {len([t for t in new_tables if t in tables])}/{len(new_tables)}")
            
            # Kiểm tra cột nft_token_id trong bảng customers
            if 'customers' in tables:
                print("\n🔍 KIỂM TRA CỘT NFT_TOKEN_ID:")
                check_column = db.session.execute(db.text("""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'customers' 
                    AND COLUMN_NAME = 'nft_token_id'
                """))
                has_nft_column = check_column.fetchone() is not None
                status = "✅" if has_nft_column else "❌"
                print(f"  {status} customers.nft_token_id")
            
            # Kiểm tra dữ liệu mẫu
            print("\n📊 DỮ LIỆU MẪU:")
            if 'achievements' in tables:
                achievement_count = db.session.execute(db.text("SELECT COUNT(*) FROM achievements")).fetchone()[0]
                print(f"  • Achievements: {achievement_count} thành tựu")
            
            if 'marketplace_items' in tables:
                item_count = db.session.execute(db.text("SELECT COUNT(*) FROM marketplace_items")).fetchone()[0]
                print(f"  • Marketplace items: {item_count} vật phẩm")
            
            if 'p2p_listings' in tables:
                listing_count = db.session.execute(db.text("SELECT COUNT(*) FROM p2p_listings")).fetchone()[0]
                print(f"  • P2P listings: {listing_count} tin đăng")
            
            if 'customer_achievements' in tables:
                ca_count = db.session.execute(db.text("SELECT COUNT(*) FROM customer_achievements")).fetchone()[0]
                print(f"  • Customer achievements: {ca_count} thành tựu được gán")
            
            print("\n" + "=" * 50)
            
            # Kết luận
            all_new_tables_exist = all(table in tables for table in new_tables)
            if all_new_tables_exist:
                print("🎉 HOÀN THÀNH: Tất cả tính năng 'át chủ bài' đã được cài đặt!")
                print("🚀 Bạn có thể sử dụng:")
                print("   • NFT Passport với achievements")
                print("   • Marketplace với SVT tokens")
                print("   • P2P trading platform")
            else:
                print("⚠️  CHƯA HOÀN THÀNH: Một số bảng mới chưa được tạo")
                print("💡 Chạy lại: python migrate_new_tables.py")
                
        except Exception as e:
            print(f"❌ Lỗi khi kiểm tra database: {e}")

if __name__ == '__main__':
    check_database_status()
