# models/__init__.py
"""
Database Models Module
Chứa tất cả các model để mapping với database tables
"""

# Import các models sau khi đã init database
def import_models():
    from .user import User
    from .customer import Customer
    from .transactions import HDBankTransaction, VietjetFlight, ResortBooking, TokenTransaction
    from .achievements import Achievement, CustomerAchievement
    from .missions import CustomerMission, CustomerMissionProgress
    from .marketplace import MarketplaceItem, P2PListing
    
    return {
        'User': User, 'Customer': Customer,
        'HDBankTransaction': HDBankTransaction, 'VietjetFlight': VietjetFlight, 
        'ResortBooking': ResortBooking, 'TokenTransaction': TokenTransaction,
        'Achievement': Achievement, 'CustomerAchievement': CustomerAchievement,
        'CustomerMission': CustomerMission, 'CustomerMissionProgress': CustomerMissionProgress,
        'MarketplaceItem': MarketplaceItem, 'P2PListing': P2PListing
    }

# Import individual modules for database injection
from . import user, customer, transactions, achievements, missions, marketplace

__all__ = ['import_models', 'user', 'customer', 'transactions', 'achievements', 'missions', 'marketplace']
