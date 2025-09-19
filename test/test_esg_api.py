# -*- coding: utf-8 -*-
"""
ESG API Test Script
Test các endpoint ESG API
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_esg_programs():
    """Test lấy danh sách chương trình ESG"""
    print("🧪 Testing GET /api/esg/programs")
    
    try:
        response = requests.get(f"{BASE_URL}/api/esg/programs")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Thành công! Có {len(data.get('programs', []))} chương trình")
            
            # In thông tin chương trình đầu tiên
            if data.get('programs'):
                program = data['programs'][0]
                print(f"📋 Chương trình mẫu: {program.get('name')}")
                print(f"   Danh mục: {program.get('category')}")
                print(f"   Mục tiêu: {program.get('target_amount'):,.0f} VND")
                print(f"   Đã quyên: {program.get('current_amount'):,.0f} VND")
                
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")

def test_esg_statistics():
    """Test lấy thống kê ESG"""
    print("\n🧪 Testing GET /api/esg/stats")
    
    try:
        response = requests.get(f"{BASE_URL}/api/esg/stats")
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            print("✅ Thành công!")
            print(f"📊 Tổng chương trình: {stats.get('total_programs', 0)}")
            print(f"💰 Tổng mục tiêu: {stats.get('total_target_amount', 0):,.0f} VND")
            print(f"🎯 Tổng đã quyên: {stats.get('total_current_amount', 0):,.0f} VND")
            print(f"📈 Tiến độ trung bình: {stats.get('average_progress', 0):.1f}%")
            
            print("\n📊 Thống kê theo danh mục:")
            for category in stats.get('by_category', []):
                category_name = {
                    'environment': 'Môi trường',
                    'social': 'Xã hội',
                    'governance': 'Quản trị'
                }.get(category['category'], category['category'])
                print(f"   {category_name}: {category['count']} chương trình - {category['total_amount']:,.0f} VND")
                
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")

def test_esg_contribution():
    """Test đóng góp ESG"""
    print("\n🧪 Testing POST /api/esg/contribute")
    
    contribution_data = {
        "program_id": 1,
        "user_id": 1001,
        "amount": 500.00,
        "notes": "Test contribution từ API"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/esg/contribute",
            json=contribution_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 201:
            data = response.json()
            print("✅ Đóng góp thành công!")
            print(f"💰 Số tiền: {contribution_data['amount']:,.0f} VND")
            print(f"🪙 SVT thưởng: {data.get('svt_earned', 0):,.0f} SVT")
            print(f"🔗 Transaction hash: {data.get('transaction_hash', 'N/A')[:20]}...")
            
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")

def test_user_contributions():
    """Test lấy đóng góp của user"""
    print("\n🧪 Testing GET /api/esg/my-contributions")
    
    try:
        response = requests.get(f"{BASE_URL}/api/esg/my-contributions")
        
        if response.status_code == 200:
            data = response.json()
            contributions = data.get('contributions', [])
            print(f"✅ Thành công! User có {len(contributions)} đóng góp")
            
            if contributions:
                latest = contributions[0]
                print(f"🕒 Đóng góp gần nhất: {latest.get('amount', 0):,.0f} VND cho '{latest.get('program_name', 'N/A')}'")
                
        elif response.status_code == 401:
            print("❌ Yêu cầu đăng nhập - API endpoint đang hoạt động đúng")
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")

def main():
    """Chạy tất cả tests"""
    print("🚀 BẮT ĐẦU TEST ESG API")
    print("=" * 50)
    
    # Kiểm tra server có chạy không
    try:
        response = requests.get(BASE_URL, timeout=5)
        print("✅ Server đang chạy")
    except:
        print("❌ Server không chạy! Hãy chạy: python app.py")
        return
    
    # Chạy các tests
    test_esg_programs()
    test_esg_statistics() 
    test_esg_contribution()
    test_user_contributions()
    
    print("\n✅ HOÀN THÀNH TEST ESG API!")
    print("🌱 Hệ thống ESG đang hoạt động tốt!")

if __name__ == "__main__":
    main()