#!/usr/bin/env python3
"""
Script để tạo và populate các bảng mới cho tính năng "át chủ bài"
- achievements: Định nghĩa các thành tựu
- customer_achievements: Thành tựu của khách hàng
- marketplace_items: Các vật phẩm trên sàn
- p2p_listings: Các tin đăng P2P
"""

from app import app, db, Customer, Achievement, CustomerAchievement, MarketplaceItem, P2PListing
import datetime

def create_tables():
    """Tạo các bảng mới trong database"""
    with app.app_context():
        # Tạo tất cả bảng mới
        db.create_all()
        print("✅ Đã tạo tất cả các bảng mới")

def populate_achievements():
    """Tạo dữ liệu mẫu cho bảng achievements"""
    with app.app_context():
        achievements_data = [
            {
                'name': 'Phi công Vàng',
                'description': 'Bay hơn 20 chuyến bay trong năm',
                'badge_image_url': '/static/badges/pilot_gold.png'
            },
            {
                'name': 'Phi công Bạc',
                'description': 'Bay hơn 10 chuyến bay trong năm',
                'badge_image_url': '/static/badges/pilot_silver.png'
            },
            {
                'name': 'Phi công Đồng',
                'description': 'Bay hơn 5 chuyến bay trong năm',
                'badge_image_url': '/static/badges/pilot_bronze.png'
            },
            {
                'name': 'Khách hàng VIP',
                'description': 'Có số dư trung bình trên 100 triệu VND',
                'badge_image_url': '/static/badges/vip.png'
            },
            {
                'name': 'Người du lịch',
                'description': 'Đã nghỉ dưỡng hơn 10 đêm tại resort Sovico',
                'badge_image_url': '/static/badges/traveler.png'
            },
            {
                'name': 'Nhà đầu tư thông minh',
                'description': 'Có hơn 1000 SVT tokens',
                'badge_image_url': '/static/badges/investor.png'
            },
            {
                'name': 'Người tiên phong',
                'description': 'Là một trong 100 người đầu tiên tham gia hệ sinh thái Sovico',
                'badge_image_url': '/static/badges/pioneer.png'
            }
        ]
        
        for achievement_data in achievements_data:
            existing = Achievement.query.filter_by(name=achievement_data['name']).first()
            if not existing:
                achievement = Achievement(**achievement_data)
                db.session.add(achievement)
        
        db.session.commit()
        print(f"✅ Đã thêm {len(achievements_data)} thành tựu")

def populate_marketplace_items():
    """Tạo dữ liệu mẫu cho marketplace"""
    with app.app_context():
        items_data = [
            {
                'name': 'Voucher ăn uống 100K',
                'description': 'Voucher giảm giá 100,000 VND cho các nhà hàng đối tác',
                'price_svt': 50,
                'quantity': 100,
                'partner_brand': 'Sovico',
                'image_url': '/static/items/food_voucher_100k.png'
            },
            {
                'name': 'Voucher ăn uống 200K',
                'description': 'Voucher giảm giá 200,000 VND cho các nhà hàng cao cấp',
                'price_svt': 95,
                'quantity': 50,
                'partner_brand': 'Sovico',
                'image_url': '/static/items/food_voucher_200k.png'
            },
            {
                'name': 'Vé máy bay khuyến mãi',
                'description': 'Giảm 500,000 VND cho vé máy bay Vietjet',
                'price_svt': 200,
                'quantity': 20,
                'partner_brand': 'Vietjet',
                'image_url': '/static/items/flight_discount.png'
            },
            {
                'name': 'Phòng nghỉ resort 1 đêm',
                'description': 'Phòng Deluxe 1 đêm tại các resort Sovico',
                'price_svt': 300,
                'quantity': 10,
                'partner_brand': 'Sovico',
                'image_url': '/static/items/resort_room.png'
            },
            {
                'name': 'Miễn phí chuyển khoản HDBank',
                'description': 'Miễn phí 10 lần chuyển khoản qua HDBank',
                'price_svt': 25,
                'quantity': 200,
                'partner_brand': 'HDBank',
                'image_url': '/static/items/free_transfer.png'
            },
            {
                'name': 'Thẻ HDSaison Premium',
                'description': 'Miễn phí thường niên thẻ tín dụng HDSaison trong 1 năm',
                'price_svt': 150,
                'quantity': 30,
                'partner_brand': 'HDSaison',
                'image_url': '/static/items/credit_card.png'
            }
        ]
        
        for item_data in items_data:
            existing = MarketplaceItem.query.filter_by(name=item_data['name']).first()
            if not existing:
                item = MarketplaceItem(**item_data)
                db.session.add(item)
        
        db.session.commit()
        print(f"✅ Đã thêm {len(items_data)} vật phẩm vào marketplace")

def auto_assign_achievements():
    """Tự động gán thành tựu cho khách hàng dựa trên dữ liệu hiện có"""
    with app.app_context():
        customers = Customer.query.all()
        
        for customer in customers:
            # Lấy dữ liệu từ API để tính toán thành tựu
            try:
                from app import get_customer_360_profile
                profile = get_customer_360_profile(customer.customer_id)
                
                if profile:
                    # Thành tựu bay
                    flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0) or 0
                    if flights >= 20:
                        assign_achievement(customer.customer_id, 'Phi công Vàng')
                    elif flights >= 10:
                        assign_achievement(customer.customer_id, 'Phi công Bạc')
                    elif flights >= 5:
                        assign_achievement(customer.customer_id, 'Phi công Đồng')
                    
                    # Thành tựu VIP
                    balance = profile.get('hdbank_summary', {}).get('average_balance', 0) or 0
                    if balance >= 100000000:  # 100 triệu
                        assign_achievement(customer.customer_id, 'Khách hàng VIP')
                    
                    # Thành tựu du lịch
                    nights = profile.get('resort_summary', {}).get('total_nights_stayed', 0) or 0
                    if nights >= 10:
                        assign_achievement(customer.customer_id, 'Người du lịch')
                        
            except Exception as e:
                print(f"Lỗi khi gán thành tựu cho khách hàng {customer.customer_id}: {e}")
        
        print("✅ Đã tự động gán thành tựu cho khách hàng")

def assign_achievement(customer_id, achievement_name):
    """Gán thành tựu cho khách hàng"""
    achievement = Achievement.query.filter_by(name=achievement_name).first()
    if not achievement:
        return
    
    # Kiểm tra xem đã có thành tựu này chưa
    existing = CustomerAchievement.query.filter_by(
        customer_id=customer_id,
        achievement_id=achievement.id
    ).first()
    
    if not existing:
        customer_achievement = CustomerAchievement(
            customer_id=customer_id,
            achievement_id=achievement.id
        )
        db.session.add(customer_achievement)
        db.session.commit()

def create_sample_p2p_listings():
    """Tạo một số tin đăng P2P mẫu"""
    with app.app_context():
        # Lấy một số customer_id có sẵn
        customers = Customer.query.limit(3).all()
        if len(customers) < 2:
            print("Cần ít nhất 2 khách hàng để tạo tin đăng P2P mẫu")
            return
            
        p2p_data = [
            {
                'seller_customer_id': customers[0].customer_id,
                'item_name': 'Voucher Lotte Cinema',
                'description': 'Voucher xem phim Lotte Cinema giá trị 150K, hạn sử dụng 6 tháng',
                'price_svt': 75
            },
            {
                'seller_customer_id': customers[1].customer_id,
                'item_name': 'Thẻ gym 1 tháng',
                'description': 'Thẻ tập gym California Fitness, còn hạn 1 tháng',
                'price_svt': 120
            }
        ]
        
        if len(customers) >= 3:
            p2p_data.append({
                'seller_customer_id': customers[2].customer_id,
                'item_name': 'Voucher massage Tran Spa',
                'description': 'Voucher massage body 90 phút, giá trị 800K',
                'price_svt': 400
            })
        
        for listing_data in p2p_data:
            listing = P2PListing(**listing_data)
            db.session.add(listing)
        
        db.session.commit()
        print(f"✅ Đã tạo {len(p2p_data)} tin đăng P2P mẫu")

if __name__ == '__main__':
    print("🚀 Bắt đầu migrate các bảng mới...")
    
    # 1. Tạo bảng
    create_tables()
    
    # 2. Populate dữ liệu mẫu
    populate_achievements()
    populate_marketplace_items()
    
    # 3. Tự động gán thành tựu
    auto_assign_achievements()
    
    # 4. Tạo tin đăng P2P mẫu
    create_sample_p2p_listings()
    
    print("🎉 Hoàn thành migrate! Các tính năng 'át chủ bài' đã sẵn sàng.")
