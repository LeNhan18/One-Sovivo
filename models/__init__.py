# models/__init__.py
from .database import db, bcrypt, init_db
from .user import User
from .customer import Customer
from .transactions import HDBankTransaction, TokenTransaction
from .hdbank_card import HDBankCard
from .achievements import Achievement, CustomerAchievement
from .missions import CustomerMission, CustomerMissionProgress
from .marketplace import MarketplaceItem, P2PListing
from .flights import VietjetFlight
from .resorts import ResortBooking

__all__ = [
    'db', 'bcrypt', 'init_db',
    'User', 'Customer',
    'HDBankTransaction', 'TokenTransaction', 'HDBankCard',
    'Achievement', 'CustomerAchievement',
    'CustomerMission', 'CustomerMissionProgress',
    'MarketplaceItem', 'P2PListing',
    'VietjetFlight', 'ResortBooking'
]
"""
Models package for One-Sovico Platform
Handles all database models with lazy initialization to avoid circular imports
"""
