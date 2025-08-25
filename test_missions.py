#!/usr/bin/env python3
"""
Test Mission Progression System
"""

import sys
sys.path.append('.')
from app import app, db
from mission_progression import mission_system

def test_mission_system():
    with app.app_context():
        print('🧪 Testing Mission Progression with Database...')
        
        # Test lấy mission cho customer 2015
        from app import get_customer_data_for_missions
        customer_data = get_customer_data_for_missions(2015)
        print('📊 Customer data keys:', list(customer_data.keys()))
        print('📊 Some values:', {k: v for k, v in customer_data.items() if k in ['transaction_count', 'profile_completeness', 'login_count']})
        
        # Test mission system
        customer_type = mission_system.get_customer_type(customer_data)
        print(f'👤 Customer type: {customer_type.value}')
        
        # Lấy completed missions (hiện tại chưa có)
        completed_missions = []
        
        # Lấy available missions
        available_missions = mission_system.get_available_missions(customer_data, completed_missions)
        print(f'🎯 Available missions: {len(available_missions)}')
        
        for i, mission in enumerate(available_missions[:3], 1):
            print(f'   {i}. {mission["title"]} ({mission["svt_reward"]} SVT)')
            print(f'      Level: {mission["level"]}, Category: {mission["category"].value}')
        
        # Test recommendations
        recommendations = mission_system.get_next_recommendations(customer_data, completed_missions)
        print(f'\n🎯 Recommended missions: {len(recommendations)}')
        
        for i, mission in enumerate(recommendations[:2], 1):
            print(f'   {i}. {mission["title"]} - {mission["description"][:50]}...')

if __name__ == "__main__":
    test_mission_system()
