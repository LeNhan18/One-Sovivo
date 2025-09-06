# models/flights.py
# -*- coding: utf-8 -*-
"""
Vietjet flight booking models
"""

import datetime
from .database import db

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

    def to_dict(self):
        return {
            'flight_id': self.flight_id,
            'customer_id': self.customer_id,
            'flight_date': self.flight_date.strftime('%Y-%m-%d %H:%M:%S'),
            'origin': self.origin,
            'destination': self.destination,
            'ticket_class': self.ticket_class,
            'booking_value': float(self.booking_value),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
