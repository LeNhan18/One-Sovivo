#!/usr/bin/env python3
"""
Test Mission API endpoints
"""

import requests
import json

def test_mission_api():
    base_url = "http://127.0.0.1:5000"
    customer_id = 2015
    
    print("🧪 Testing Mission API Endpoints...")
    
    try:
        # Test get missions
        print(f"\n1. 📋 Getting missions for customer {customer_id}...")
        response = requests.get(f"{base_url}/api/missions/{customer_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Customer type: {data.get('customer_type')}")
            print(f"📊 Customer level: {data.get('customer_level')}")
            print(f"🎯 Available missions: {data.get('total_available', 0)}")
            print(f"🎯 Recommended missions: {len(data.get('recommended_missions', []))}")
            
            missions = data.get('recommended_missions', [])
            if missions:
                print("\n📝 Mission details:")
                for i, mission in enumerate(missions[:3], 1):
                    print(f"   {i}. {mission.get('icon', '🎯')} {mission.get('title')}")
                    print(f"      💰 Reward: {mission.get('svt_reward')} SVT")
                    print(f"      ⏱️ Time: {mission.get('estimated_time')}")
                    print(f"      📋 {mission.get('description')[:60]}...")
                    print()
                
                # Test start mission
                first_mission = missions[0]
                mission_id = first_mission.get('id')
                
                print(f"2. 🚀 Starting mission: {mission_id}")
                start_response = requests.post(f"{base_url}/api/missions/{customer_id}/start", 
                                             json={"mission_id": mission_id})
                
                if start_response.status_code == 200:
                    start_data = start_response.json()
                    print(f"✅ Mission started: {start_data.get('message')}")
                    
                    # Test complete mission (will likely fail as requirements not met)
                    print(f"\n3. 🏆 Attempting to complete mission: {mission_id}")
                    complete_response = requests.post(f"{base_url}/api/missions/{customer_id}/complete",
                                                    json={"mission_id": mission_id})
                    
                    if complete_response.status_code == 200:
                        complete_data = complete_response.json()
                        print(f"🎉 Mission completed: {complete_data.get('message')}")
                        print(f"💰 SVT reward: {complete_data.get('svt_reward')}")
                    else:
                        error_data = complete_response.json()
                        print(f"⚠️ Cannot complete yet: {error_data.get('error')}")
                        if 'current_progress' in error_data:
                            print(f"📊 Current progress: {error_data['current_progress']}%")
                else:
                    print(f"❌ Failed to start mission: {start_response.text}")
            else:
                print("⚠️ No missions available")
                
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure Flask server is running on port 5000")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test update stats
    print(f"\n4. 📊 Testing stats update...")
    try:
        stats_update = {
            "stats": {
                "app_tutorial_completed": 1,
                "features_explored": 4,
                "ai_interactions": 6
            }
        }
        
        stats_response = requests.post(f"{base_url}/api/missions/{customer_id}/update-stats",
                                     json=stats_update)
        
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            print(f"✅ Stats updated: {stats_data.get('message')}")
        else:
            print(f"⚠️ Stats update failed: {stats_response.text}")
            
    except Exception as e:
        print(f"❌ Stats update error: {e}")

if __name__ == "__main__":
    test_mission_api()
