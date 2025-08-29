# models/user.py
import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# These will be injected from app.py
db = None
bcrypt = None

def init_db(database, bcrypt_instance):
    global db, bcrypt
    db = database
    bcrypt = bcrypt_instance

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'customer'), default='customer')
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship to get actual customer record
    customer = db.relationship('Customer', backref='user_accounts')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
