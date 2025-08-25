#!/usr/bin/env python3
"""
Script để thêm cột nft_token_id vào bảng customers
"""

from app import app, db
import pymysql

def add_nft_token_id_column():
    """Thêm cột nft_token_id vào bảng customers"""
    with app.app_context():
        try:
            # Kiểm tra xem cột đã tồn tại chưa
            check_query = """
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'customers' 
                AND COLUMN_NAME = 'nft_token_id'
            """
            
            result = db.session.execute(db.text(check_query))
            exists = result.fetchone()
            
            if not exists:
                # Thêm cột nft_token_id
                alter_query = """
                    ALTER TABLE customers 
                    ADD COLUMN nft_token_id INT NULL 
                    COMMENT 'ID của NFT Passport trên blockchain'
                """
                
                db.session.execute(db.text(alter_query))
                db.session.commit()
                print("✅ Đã thêm cột nft_token_id vào bảng customers")
            else:
                print("✅ Cột nft_token_id đã tồn tại trong bảng customers")
                
        except Exception as e:
            print(f"❌ Lỗi khi thêm cột nft_token_id: {e}")
            db.session.rollback()

if __name__ == '__main__':
    print("🔧 Bắt đầu alter bảng customers...")
    add_nft_token_id_column()
    print("🎉 Hoàn thành!")
