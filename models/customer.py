# models/customer.py
# -*- coding: utf-8 -*-
"""
Customer model
"""

import datetime
from .database import db

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
    avatar_url = db.Column(db.String(255), nullable=True)  # URL của ảnh đại diện
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def to_dict(self):
        """Convert customer to dictionary"""
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'name': self.name,
            'age': self.age,
            'gender': self.gender,
            'job': self.job,
            'city': self.city,
            'persona_type': self.persona_type,
            'nft_token_id': self.nft_token_id,
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }