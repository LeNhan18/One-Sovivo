# models/database.py
# -*- coding: utf-8 -*-
"""
Database initialization and configuration
"""

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from sqlalchemy import text, create_engine
from config import Config

# Initialize database and bcrypt
db = SQLAlchemy()
bcrypt = Bcrypt()

def get_db_connection():
    """Get a direct database connection for raw SQL queries"""
    from flask import current_app
    # Use SQLAlchemy's engine to get raw connection
    return current_app.extensions['sqlalchemy'].db.engine.raw_connection()

def _auto_migrate_hdbank_transactions():
    """Ensure hdbank_transactions table has required columns / enum values."""
    try:
        with db.engine.connect() as conn:
            # Check if table exists first
            table_check = conn.execute(text("SHOW TABLES LIKE 'hdbank_transactions'"))
            if table_check.rowcount == 0:
                return  # Table not yet created
            # 1. Add status column if missing
            col_check = conn.execute(text("SHOW COLUMNS FROM hdbank_transactions LIKE 'status'"))
            if col_check.rowcount == 0:
                conn.execute(text("ALTER TABLE hdbank_transactions ADD COLUMN status VARCHAR(30) DEFAULT 'completed' AFTER description"))
                print("🔧 Added status column to hdbank_transactions")
            # 2. Extend ENUM for transaction_type if still old definition
            enum_check = conn.execute(text("SHOW COLUMNS FROM hdbank_transactions LIKE 'transaction_type'"))
            row = enum_check.fetchone()
            if row and isinstance(row, tuple):
                col_type = row[1]  # Field, Type, Null, Key, Default, Extra
            elif row and hasattr(row, 'Type'):
                col_type = row.Type
            else:
                col_type = ''
            needed_enum = "enum('credit','debit','transfer','loan_disbursement')"
            if "loan_disbursement" not in col_type:
                conn.execute(text("ALTER TABLE hdbank_transactions MODIFY COLUMN transaction_type ENUM('credit','debit','transfer','loan_disbursement') NOT NULL"))
                print("🔧 Extended transaction_type ENUM in hdbank_transactions")
    except Exception as e:
        print(f"⚠️ Auto-migration skipped: {e}")

def init_db(app):
    """Initialize database with Flask app and dynamic model modules"""
    db.init_app(app)
    bcrypt.init_app(app)
    
    with app.app_context():
        try:
            # Initialize dynamic model modules that define classes at runtime
            from . import transactions, missions, hdbank_card, flights, resorts
            transactions.init_db(db)
            missions.init_db(db)
            hdbank_card.init_db(db)
            # flights, resorts & marketplace are static declarative; just import to register
            from . import user, customer, achievements, marketplace, flights as _f, resorts as _r
            # Create all tables
            db.create_all()
            # Apply automatic migrations
            _auto_migrate_hdbank_transactions()
            # Run database migrations
            from migrations import run_migrations
            run_migrations()
            print("✅ Database tables created successfully")

            # Create default achievements if they don't exist
            from models.achievements import create_default_achievements
            create_default_achievements()
            
        except Exception as e:
            print(f" Error initializing database: {e}")
            raise e
