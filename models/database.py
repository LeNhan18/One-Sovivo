# models/database.py
# -*- coding: utf-8 -*-
"""
Database initialization and configuration
"""

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Initialize database and bcrypt
db = SQLAlchemy()
bcrypt = Bcrypt()

def init_db(app):
    """Initialize database with Flask app"""
    db.init_app(app)
    bcrypt.init_app(app)
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Create default achievements if they don't exist
            from models.achievements import Achievement, create_default_achievements
            create_default_achievements()
            
        except Exception as e:
            print(f"❌ Error initializing database: {e}")
            raise e
