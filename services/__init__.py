# services/__init__.py
"""
Service layer exports
"""

# Core services
try:
    from .ai_service import AIService
    AI_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ AI Service not available: {e}")
    AI_SERVICE_AVAILABLE = False

try:
    from .auth_service import AuthService
    AUTH_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Auth Service not available: {e}")
    AUTH_SERVICE_AVAILABLE = False

try:
    from .customer_service import CustomerService
    CUSTOMER_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Customer Service not available: {e}")
    CUSTOMER_SERVICE_AVAILABLE = False

try:
    from .admin_service import AdminService
    ADMIN_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Admin Service not available: {e}")
    ADMIN_SERVICE_AVAILABLE = False

# Business services
try:
    from .hdbank_service import HDBankService
    HDBANK_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ HDBank Service not available: {e}")
    HDBANK_SERVICE_AVAILABLE = False

try:
    from .marketplace_service import MarketplaceService
    MARKETPLACE_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Marketplace Service not available: {e}")
    MARKETPLACE_SERVICE_AVAILABLE = False

try:
    from .mission_service import MissionService
    MISSION_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Mission Service not available: {e}")
    MISSION_SERVICE_AVAILABLE = False

try:
    from .nft_service import NFTService
    NFT_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ NFT Service not available: {e}")
    NFT_SERVICE_AVAILABLE = False

try:
    from .token_service import TokenService
    TOKEN_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Token Service not available: {e}")
    TOKEN_SERVICE_AVAILABLE = False

try:
    from .vietjet_service import VietjetService
    VIETJET_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Vietjet Service not available: {e}")
    VIETJET_SERVICE_AVAILABLE = False

try:
    from .resort_service import ResortService
    RESORT_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Resort Service not available: {e}")
    RESORT_SERVICE_AVAILABLE = False

__all__ = [
    # Core services
    'AIService', 'AuthService', 'CustomerService', 'AdminService',
    # Business services  
    'HDBankService', 'MarketplaceService', 'MissionService', 
    'NFTService', 'TokenService', 'VietjetService', 'ResortService'
]
