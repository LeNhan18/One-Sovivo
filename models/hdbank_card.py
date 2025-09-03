# models/hdbank_card.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# This will be injected from app.py
db = None
HDBankCard = None

def init_db(database):
    global db, HDBankCard
    db = database
    
    # Define HDBankCard class after db is initialized
    class HDBankCard(db.Model):
        __tablename__ = 'hdbank_cards'

        id = db.Column(db.Integer, primary_key=True)
        customer_id = db.Column(db.Integer, nullable=False, index=True)
        card_id = db.Column(db.String(50), unique=True, nullable=False)
        card_number = db.Column(db.String(20), nullable=False)
        card_type = db.Column(db.Enum('classic', 'gold', 'platinum'), nullable=False)
        card_name = db.Column(db.String(100), nullable=False)
        credit_limit = db.Column(db.BigInteger, nullable=False)
        annual_fee = db.Column(db.BigInteger, nullable=False)
        status = db.Column(db.Enum('active', 'blocked', 'expired'), default='active')
        opened_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
        expiry_date = db.Column(db.DateTime, nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
        
        def to_dict(self):
            return {
                'card_id': self.card_id,
                'card_number': f"****-****-****-{self.card_number[-4:]}",
                'card_type': self.card_type,
                'card_name': self.card_name,
                'credit_limit': self.credit_limit,
                'status': self.status,
                'opened_date': self.opened_date.strftime('%Y-%m-%d'),
                'expiry_date': self.expiry_date.strftime('%Y-%m-%d')
            }
    
    # Assign the class to global variable
    globals()['HDBankCard'] = HDBankCard
