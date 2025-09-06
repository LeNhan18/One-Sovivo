# models/achievements.py
# -*- coding: utf-8 -*-
"""
Achievement models and default data creation
"""

import datetime
from .database import db

class Achievement(db.Model):
    __tablename__ = 'achievements'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # ví dụ: "Phi công Vàng"
    description = db.Column(db.Text, nullable=False)  # "Bay hơn 20 chuyến trong năm"
    badge_image_url = db.Column(db.String(200))  # Đường dẫn đến hình ảnh huy hiệu
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        """Convert achievement to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'badge_image_url': self.badge_image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CustomerAchievement(db.Model):
    __tablename__ = 'customer_achievements'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Relationships
    customer = db.relationship('Customer', backref='achievements',
                              foreign_keys=[customer_id],
                              primaryjoin="CustomerAchievement.customer_id == Customer.customer_id")
    achievement = db.relationship('Achievement', backref='customers')

    def to_dict(self):
        """Convert customer achievement to dictionary"""
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'achievement_id': self.achievement_id,
            'achievement_name': self.achievement.name if self.achievement else None,
            'achievement_description': self.achievement.description if self.achievement else None,
            'unlocked_at': self.unlocked_at.isoformat() if self.unlocked_at else None
        }

def create_default_achievements():
    """Create default achievements if they don't exist"""
    try:
        # Check if achievements already exist
        if Achievement.query.count() > 0:
            return
        
        default_achievements = [
            {
                'name': 'Chào mừng',
                'description': 'Hoàn thành đăng ký tài khoản One-Sovico',
                'badge_image_url': '/static/badges/welcome.png'
            },
            {
                'name': 'Phi công Đồng',
                'description': 'Bay ít nhất 5 chuyến với Vietjet',
                'badge_image_url': '/static/badges/pilot_bronze.png'
            },
            {
                'name': 'Phi công Bạc',
                'description': 'Bay ít nhất 10 chuyến với Vietjet',
                'badge_image_url': '/static/badges/pilot_silver.png'
            },
            {
                'name': 'Phi công Vàng',
                'description': 'Bay ít nhất 20 chuyến với Vietjet',
                'badge_image_url': '/static/badges/pilot_gold.png'
            },
            {
                'name': 'Khách hàng VIP',
                'description': 'Duy trì số dư trung bình trên 100 triệu VND',
                'badge_image_url': '/static/badges/vip.png'
            },
            {
                'name': 'Người du lịch',
                'description': 'Nghỉ dưỡng tại resort Sovico trên 10 đêm',
                'badge_image_url': '/static/badges/traveler.png'
            },
            {
                'name': 'Nhà đầu tư',
                'description': 'Sử dụng các sản phẩm đầu tư của HDBank',
                'badge_image_url': '/static/badges/investor.png'
            },
            {
                'name': 'Tiên phong',
                'description': 'Trong số 100 người dùng đầu tiên của nền tảng',
                'badge_image_url': '/static/badges/pioneer.png'
            }
        ]
        
        for achievement_data in default_achievements:
            achievement = Achievement(
                name=achievement_data['name'],
                description=achievement_data['description'],
                badge_image_url=achievement_data['badge_image_url']
            )
            db.session.add(achievement)
        
        db.session.commit()
        print(f"Created {len(default_achievements)} default achievements")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating default achievements: {e}")