"""
Blockchain Configuration for SovicoPassport Integration
Contains settings and mappings for blockchain achievements
"""

# Achievement Mapping Configuration
ACHIEVEMENT_CONFIG = {
    'frequent_flyer': {
        'criteria': 'total_flights > 20',
        'rank': 'Gold',
        'title': 'Frequent Flyer',
        'description': 'Bay hơn 20 chuyến trong năm',
        'svt_reward': 1000
    },
    'business_elite': {
        'criteria': 'is_business_flyer AND total_flights > 10',
        'rank': 'Platinum',
        'title': 'Business Elite', 
        'description': 'Bay hạng thương gia hơn 10 chuyến',
        'svt_reward': 2000
    },
    'high_roller': {
        'criteria': 'average_balance > 500_000_000',
        'rank': 'Diamond',
        'title': 'High Roller',
        'description': 'Số dư trung bình trên 500 triệu VND',
        'svt_reward': 5000
    },
    'resort_lover': {
        'criteria': 'total_resort_spending > 50_000_000',
        'rank': 'Gold',
        'title': 'Resort Lover',
        'description': 'Chi tiêu nghỉ dưỡng trên 50 triệu VND',
        'svt_reward': 1500
    },
    'long_stay_guest': {
        'criteria': 'total_nights_stayed > 30',
        'rank': 'Platinum',
        'title': 'Long Stay Guest',
        'description': 'Nghỉ dưỡng hơn 30 đêm trong năm',
        'svt_reward': 2500
    },
    'vip_ecosystem': {
        'criteria': 'total_flights > 15 AND average_balance > 200_000_000 AND total_resort_spending > 30_000_000',
        'rank': 'Diamond',
        'title': 'VIP Ecosystem Member',
        'description': 'Sử dụng tích cực tất cả dịch vụ trong hệ sinh thái',
        'svt_reward': 10000
    },
    'first_time_user': {
        'criteria': 'new_customer',
        'rank': 'Bronze',
        'title': 'First Time User',
        'description': 'Chào mừng thành viên mới',
        'svt_reward': 100
    },
    'loyalty_member': {
        'criteria': 'customer_tenure > 12_months',
        'rank': 'Silver',
        'title': 'Loyalty Member',
        'description': 'Thành viên trung thành hơn 1 năm',
        'svt_reward': 500
    }
}

# Rank Hierarchy Configuration
RANK_HIERARCHY = {
    'Bronze': 1,
    'Silver': 2,
    'Gold': 3,
    'Platinum': 4,
    'Diamond': 5
}

# Blockchain Network Configuration
BLOCKCHAIN_CONFIG = {
    'development': {
        'rpc_url': 'http://127.0.0.1:7545',
        'chain_id': 1337,
        'gas_limit': 300000,
        'gas_price_multiplier': 1.2
    },
    'testnet': {
        'rpc_url': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        'chain_id': 97,
        'gas_limit': 500000,
        'gas_price_multiplier': 1.5
    },
    'mainnet': {
        'rpc_url': 'https://bsc-dataseed1.binance.org/',
        'chain_id': 56,
        'gas_limit': 800000,
        'gas_price_multiplier': 2.0
    }
}

# Environment Variables Configuration
REQUIRED_ENV_VARS = [
    'SOVICO_PASSPORT_CONTRACT_ADDRESS',  # Optional, can be loaded from deployment file
    'PRIVATE_KEY',  # Optional for development (uses Ganache accounts)
    'BLOCKCHAIN_NETWORK'  # development, testnet, mainnet
]

# Default values
DEFAULT_NETWORK = 'development'
DEFAULT_GAS_LIMIT = 300000

def get_achievement_by_badge(badge_name):
    """Get achievement configuration by badge name."""
    return ACHIEVEMENT_CONFIG.get(badge_name)

def get_rank_value(rank_name):
    """Get numeric value for rank comparison."""
    return RANK_HIERARCHY.get(rank_name, 0)

def should_upgrade_rank(current_rank, new_rank):
    """Check if the new rank is higher than current rank."""
    current_value = get_rank_value(current_rank)
    new_value = get_rank_value(new_rank)
    return new_value > current_value

def get_blockchain_config(network=None):
    """Get blockchain configuration for specified network."""
    if not network:
        network = DEFAULT_NETWORK
    return BLOCKCHAIN_CONFIG.get(network, BLOCKCHAIN_CONFIG[DEFAULT_NETWORK])

# Achievement Evaluation Functions
def evaluate_frequent_flyer(profile):
    """Check if customer qualifies for Frequent Flyer achievement."""
    flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0)
    return flights > 20

def evaluate_business_elite(profile):
    """Check if customer qualifies for Business Elite achievement."""
    flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0)
    is_business = profile.get('vietjet_summary', {}).get('is_business_flyer', False)
    return is_business and flights > 10

def evaluate_high_roller(profile):
    """Check if customer qualifies for High Roller achievement."""
    balance = profile.get('hdbank_summary', {}).get('average_balance', 0)
    return balance > 500_000_000

def evaluate_resort_lover(profile):
    """Check if customer qualifies for Resort Lover achievement."""
    spending = profile.get('resort_summary', {}).get('total_spending', 0)
    return spending > 50_000_000

def evaluate_long_stay_guest(profile):
    """Check if customer qualifies for Long Stay Guest achievement."""
    nights = profile.get('resort_summary', {}).get('total_nights_stayed', 0)
    return nights > 30

def evaluate_vip_ecosystem(profile):
    """Check if customer qualifies for VIP Ecosystem Member achievement."""
    flights = profile.get('vietjet_summary', {}).get('total_flights_last_year', 0)
    balance = profile.get('hdbank_summary', {}).get('average_balance', 0)
    spending = profile.get('resort_summary', {}).get('total_spending', 0)
    
    return (flights > 15 and balance > 200_000_000 and spending > 30_000_000)

# Achievement Evaluator Registry
ACHIEVEMENT_EVALUATORS = {
    'frequent_flyer': evaluate_frequent_flyer,
    'business_elite': evaluate_business_elite,
    'high_roller': evaluate_high_roller,
    'resort_lover': evaluate_resort_lover,
    'long_stay_guest': evaluate_long_stay_guest,
    'vip_ecosystem': evaluate_vip_ecosystem
}

def evaluate_all_achievements(profile):
    """Evaluate all achievements for a customer profile."""
    achievements = []
    
    for badge_name, evaluator in ACHIEVEMENT_EVALUATORS.items():
        if evaluator(profile):
            config = ACHIEVEMENT_CONFIG[badge_name]
            achievements.append({
                'badge': badge_name,
                'rank': config['rank'],
                'title': config['title'],
                'description': config['description'],
                'svt_reward': config['svt_reward']
            })
    
    return achievements

def get_highest_rank_from_achievements(achievements):
    """Get the highest rank from a list of achievements."""
    if not achievements:
        return 'Bronze'
    
    highest_rank = 'Bronze'
    highest_value = 0
    
    for achievement in achievements:
        rank_value = get_rank_value(achievement['rank'])
        if rank_value > highest_value:
            highest_value = rank_value
            highest_rank = achievement['rank']
    
    return highest_rank
