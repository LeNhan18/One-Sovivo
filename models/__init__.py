# models/__init__.py
"""
Models package for One-Sovico Platform
Handles all database models with lazy initialization to avoid circular imports
"""

# Global variables for database instances
db = None
bcrypt = None

def init_models(database, bcrypt_instance):
    """Initialize all models with database and bcrypt instances"""
    global db, bcrypt
    db = database
    bcrypt = bcrypt_instance
    
    # Import models after db is initialized
    from . import user, customer, transactions, achievements, missions, marketplace
    
    # Initialize each model module
    user.init_db(db, bcrypt)
    customer.init_db(db)
    transactions.init_db(db)
    achievements.init_db(db)
    missions.init_db(db)
    marketplace.init_db(db)
    
    # Return model classes for convenience
    return {
        'User': user.User,
        'Customer': customer.Customer,
        'HDBankTransaction': transactions.HDBankTransaction,
        'VietjetFlight': transactions.VietjetFlight,
        'ResortBooking': transactions.ResortBooking,
        'TokenTransaction': transactions.TokenTransaction,
        'Achievement': achievements.Achievement,
        'CustomerAchievement': achievements.CustomerAchievement,
        'CustomerMission': missions.CustomerMission,
        'CustomerMissionProgress': missions.CustomerMissionProgress,
        'MarketplaceItem': marketplace.MarketplaceItem,
        'P2PListing': marketplace.P2PListing
    }

def get_models():
    """Get all model classes after initialization"""
    if db is None:
        raise RuntimeError("Models not initialized. Call init_models() first.")
    
    # Import models to get the initialized classes
    from . import user, customer, transactions, achievements, missions, marketplace
    
    return {
        'User': user.User,
        'Customer': customer.Customer,
        'HDBankTransaction': transactions.HDBankTransaction,
        'VietjetFlight': transactions.VietjetFlight,
        'ResortBooking': transactions.ResortBooking,
        'TokenTransaction': transactions.TokenTransaction,
        'Achievement': achievements.Achievement,
        'CustomerAchievement': achievements.CustomerAchievement,
        'CustomerMission': missions.CustomerMission,
        'CustomerMissionProgress': missions.CustomerMissionProgress,
        'MarketplaceItem': marketplace.MarketplaceItem,
        'P2PListing': marketplace.P2PListing
    }

__all__ = ['init_models', 'get_models']
