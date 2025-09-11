# models/transactions.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# Guard to prevent multiple re-initializations (debug reload, etc.)
_initialized = False

# This will be injected from app.py
db = None
HDBankTransaction = None
TokenTransaction = None

def init_db(database):
    global db, HDBankTransaction, TokenTransaction, _initialized
    if _initialized:
        return
    _initialized = True
    db = database
    
    class HDBankTransaction(db.Model):
        __tablename__ = 'hdbank_transactions'

        id = db.Column(db.Integer, primary_key=True)
        transaction_id = db.Column(db.String(50), unique=True, nullable=False)
        customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
        transaction_date = db.Column(db.DateTime, nullable=False)
        amount = db.Column(db.Numeric(15, 2), nullable=False)
        transaction_type = db.Column(db.Enum('credit', 'debit', 'transfer', 'loan_disbursement'), nullable=False)
        balance = db.Column(db.Numeric(15, 2), nullable=True)
        description = db.Column(db.Text)
        status = db.Column(db.String(30), default='completed')
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


    class TokenTransaction(db.Model):
        __tablename__ = 'token_transactions'

        id = db.Column(db.Integer, primary_key=True)
        tx_hash = db.Column(db.String(100), unique=True, nullable=False)
        customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
        transaction_type = db.Column(db.String(50), nullable=False)
        amount = db.Column(db.Numeric(10, 2), nullable=False)
        description = db.Column(db.Text)
        block_number = db.Column(db.Integer)
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    globals()['HDBankTransaction'] = HDBankTransaction
    globals()['TokenTransaction'] = TokenTransaction