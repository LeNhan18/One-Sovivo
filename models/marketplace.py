# models/marketplace.py
import datetime
from flask_sqlalchemy import SQLAlchemy

_initialized = False
# This will be injected from app.py
db = None
MarketplaceItem = None
P2PListing = None


def init_db(database):
    global db, MarketplaceItem, P2PListing, _initialized
    if _initialized:
        return
    _initialized = True
    db = database
    
    # Define classes after db is initialized
    class MarketplaceItem(db.Model):
        __tablename__ = 'marketplace_items'

        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(100), nullable=False)  # "Voucher ăn uống 100K"
        description = db.Column(db.Text)
        price_svt = db.Column(db.Numeric(10, 2), nullable=False)  # Giá bán bằng SVT
        quantity = db.Column(db.Integer, default=0)  # Số lượng còn lại
        partner_brand = db.Column(db.String(50))  # HDBank, Vietjet, Sovico...
        image_url = db.Column(db.String(200))  # Hình ảnh sản phẩm
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


    class P2PListing(db.Model):
        __tablename__ = 'p2p_listings'

        id = db.Column(db.Integer, primary_key=True)
        seller_customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
        item_name = db.Column(db.String(100), nullable=False)
        description = db.Column(db.Text)
        price_svt = db.Column(db.Numeric(10, 2), nullable=False)
        status = db.Column(db.Enum('active', 'sold', 'cancelled'), default='active')
        buyer_customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=True)
        created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
        sold_at = db.Column(db.DateTime, nullable=True)

        # Relationships
        seller = db.relationship('Customer', foreign_keys=[seller_customer_id], backref='p2p_listings')
        buyer = db.relationship('Customer', foreign_keys=[buyer_customer_id], backref='p2p_purchases')
    
    # Assign classes to global variables
    globals()['MarketplaceItem'] = MarketplaceItem
    globals()['P2PListing'] = P2PListing