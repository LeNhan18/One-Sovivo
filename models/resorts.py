# models/resorts.py
# -*- coding: utf-8 -*-
"""
Resort booking models
"""

import datetime
from .database import db

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

    def to_dict(self):
        return {
            'booking_id': self.booking_id,
            'customer_id': self.customer_id,
            'resort_name': self.resort_name,
            'booking_date': self.booking_date.strftime('%Y-%m-%d %H:%M:%S'),
            'nights_stayed': self.nights_stayed,
            'booking_value': float(self.booking_value),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
