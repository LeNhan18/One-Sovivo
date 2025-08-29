# models/transactions.py
import datetime
from flask_sqlalchemy import SQLAlchemy

# This will be injected from app.py
db = None

def init_db(database):
    global db
    db = database

class HDBankTransaction(db.Model):
    __tablename__ = 'hdbank_transactions'

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    transaction_date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    transaction_type = db.Column(db.Enum('credit', 'debit'), nullable=False)
    balance = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class VietjetFlight(db.Model):
    __tablename__ = 'vietjet_flights'

    id = db.Column(db.Integer, primary_key=True)
    flight_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    flight_date = db.Column(db.DateTime, nullable=False)
    origin = db.Column(db.String(10), nullable=False)
    destination = db.Column(db.String(10), nullable=False)
    ticket_class = db.Column(db.Enum('economy', 'business'), nullable=False)
    booking_value = db.Column(db.Numeric(12, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class ResortBooking(db.Model):
    __tablename__ = 'resort_bookings'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    resort_name = db.Column(db.String(200), nullable=False)
    booking_date = db.Column(db.DateTime, nullable=False)
    nights_stayed = db.Column(db.Integer, nullable=False)
    booking_value = db.Column(db.Numeric(12, 2), nullable=False)
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
