#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để tạo bảng hdbank_cards trong database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.customer import Customer

def create_hdbank_cards_table():
    """Tạo bảng hdbank_cards"""
    print("🚀 Bắt đầu tạo bảng hdbank_cards...")
    
    with app.app_context():
        try:
            # Tạo tất cả bảng
            db.create_all()
            print("✅ Đã tạo thành công bảng hdbank_cards!")
            
            # Kiểm tra bảng đã được tạo
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'hdbank_cards' in tables:
                print("✅ Xác nhận: Bảng hdbank_cards đã tồn tại trong database")
                
                # Hiển thị cấu trúc bảng
                columns = inspector.get_columns('hdbank_cards')
                print("\n📋 Cấu trúc bảng hdbank_cards:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
            else:
                print("❌ Lỗi: Bảng hdbank_cards không được tạo")
                
        except Exception as e:
            print(f"❌ Lỗi khi tạo bảng: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = create_hdbank_cards_table()
    if success:
        print("\n🎉 Hoàn tất! Bạn có thể restart Flask server để sử dụng bảng mới.")
    else:
        print("\n💥 Có lỗi xảy ra. Vui lòng kiểm tra lại.")
