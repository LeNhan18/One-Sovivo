# models/customer.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# This will be injected from app.py
db = None
Customer = None

def init_db(database):
    global db, Customer
    db = database
    
    # Define Customer class after db is initialized
    class Customer(db.Model):
        __tablename__ = 'customers'

        id = db.Column(db.Integer, primary_key=True)
        customer_id = db.Column(db.Integer, unique=True, nullable=False)
        name = db.Column(db.String(100), nullable=False)
        age = db.Column(db.Integer)
        gender = db.Column(db.Enum('Nam', 'Nữ', 'Khác'))
        job = db.Column(db.String(100))
        city = db.Column(db.String(100))
        persona_type = db.Column(db.Enum('doanh_nhan', 'gia_dinh', 'nguoi_tre'))
        nft_token_id = db.Column(db.Integer, nullable=True)  # ID của NFT Passport trên blockchain
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Assign the class to global variable
    globals()['Customer'] = Customer