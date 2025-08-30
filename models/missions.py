# models/missions.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# This will be injected from app.py
db = None
CustomerMission = None
CustomerMissionProgress = None


def init_db(database):
    global db, CustomerMission, CustomerMissionProgress
    db = database
    
    # Define classes after db is initialized
    class CustomerMission(db.Model):
        __tablename__ = 'customer_missions'

        id = db.Column(db.Integer, primary_key=True)
        customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
        mission_id = db.Column(db.String(100), nullable=False)  # ID từ mission progression system
        mission_title = db.Column(db.String(200), nullable=False)
        mission_category = db.Column(db.String(50), nullable=False)
        mission_level = db.Column(db.String(50), nullable=False)
        status = db.Column(db.Enum('available', 'in_progress', 'completed', 'expired'), default='available')
        progress_data = db.Column(db.JSON)  # Lưu trữ tiến trình chi tiết
        svt_reward = db.Column(db.Numeric(10, 2), default=0)
        started_at = db.Column(db.DateTime, nullable=True)
        completed_at = db.Column(db.DateTime, nullable=True)
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

        # Relationships
        customer = db.relationship('Customer', backref='missions')


    class CustomerMissionProgress(db.Model):
        __tablename__ = 'customer_mission_progress'

        id = db.Column(db.Integer, primary_key=True)
        customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
        mission_id = db.Column(db.String(100), nullable=False)
        requirement_key = db.Column(db.String(100), nullable=False)  # Ví dụ: login_count, transaction_count
        current_value = db.Column(db.Numeric(15, 2), default=0)
        required_value = db.Column(db.Numeric(15, 2), nullable=False)
        is_completed = db.Column(db.Boolean, default=False)
        updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

        # Relationships
        customer = db.relationship('Customer', backref='mission_progress')
    
    # Assign classes to global variables
    globals()['CustomerMission'] = CustomerMission
    globals()['CustomerMissionProgress'] = CustomerMissionProgress