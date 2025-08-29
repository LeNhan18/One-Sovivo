# models/achievements.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# This will be injected from app.py
db = None

def init_db(database):
    global db
    db = database

class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # ví dụ: "Phi công Vàng"
    description = db.Column(db.Text, nullable=False)  # "Bay hơn 20 chuyến trong năm"
    badge_image_url = db.Column(db.String(200))  # Đường dẫn đến hình ảnh huy hiệu
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class CustomerAchievement(db.Model):
    __tablename__ = 'customer_achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref='achievements')
    achievement = db.relationship('Achievement', backref='customers')
