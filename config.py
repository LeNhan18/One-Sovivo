# config.py
# Cấu hình MySQL cho One-Sovico Platform

import os
from urllib.parse import quote_plus

class Config:
    # MySQL Database Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'nhan1811')
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'one_sovico')
    
    # Escape password for URL
    password_encoded = quote_plus(MYSQL_PASSWORD) if MYSQL_PASSWORD else ''
    
    # SQLAlchemy Configuration
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{password_encoded}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 20,
        'max_overflow': 0
    }
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    JSON_AS_ASCII = False
    
    # AI Model Configuration
    MODEL_DIR = 'dl_model'
    
    @staticmethod
    def get_database_url():
        """Trả về database URL với thông tin debug"""
        config = Config()
        print(f"🔗 Connecting to MySQL: {config.MYSQL_USER}@{config.MYSQL_HOST}:{config.MYSQL_PORT}/{config.MYSQL_DATABASE}")
        return config.SQLALCHEMY_DATABASE_URI
