"""
Test script để kiểm tra hệ thống mission hoàn chỉnh với token transactions
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"
CUSTOMER_ID = 2015

def test_mission_system():
    """Test toàn bộ flow mission system"""
    print("🚀 TESTING MISSION SYSTEM WITH TOKEN TRANSACTIONS")
    print("=" * 60)
    
    # 1. Test get missions for customer
    print("\n1. Lấy danh sách missions cho customer...")
    response = requests.get(f"{BASE_URL}/api/missions/{CUSTOMER_ID}")
    
    if response.status_code == 200:
        missions_data = response.json()
        print(f"✅ Thành công! Có {len(missions_data.get('available_missions', []))} missions")
        print(f"   Customer type: {missions_data.get('customer_type')}")
        print(f"   Completed missions: {len(missions_data.get('completed_missions', []))}")
        
        # Hiển thị recommended missions
        recommended = missions_data.get('recommended_missions', [])
        if recommended:
            print(f"\n📋 RECOMMENDED MISSIONS:")
            for i, mission in enumerate(recommended[:3], 1):
                print(f"   {i}. {mission['title']} - {mission['reward_amount']} SVT")
                print(f"      Description: {mission['description']}")
                
            # Chọn mission đầu tiên để test
            test_mission = recommended[0]
            mission_id = test_mission['id']
            
            print(f"\n🎯 Testing với mission: {test_mission['title']}")
            
            # 2. Test start mission
            print(f"\n2. Bắt đầu mission {mission_id}...")
            start_payload = {"mission_id": mission_id}
            start_response = requests.post(
                f"{BASE_URL}/api/missions/{CUSTOMER_ID}/start",
                json=start_payload
            )
            
            if start_response.status_code == 200:
                start_data = start_response.json()
                print(f"✅ Bắt đầu mission thành công!")
                print(f"   Started at: {start_data.get('started_at')}")
                print(f"   Reward: {start_data.get('reward_amount')} SVT")
                print(f"   Instructions: {len(start_data.get('instructions', []))} steps")
                
                # 3. Test complete mission
                print(f"\n3. Hoàn thành mission {mission_id}...")
                complete_payload = {"mission_id": mission_id}
                complete_response = requests.post(
                    f"{BASE_URL}/api/missions/{CUSTOMER_ID}/complete",
                    json=complete_payload
                )
                
                if complete_response.status_code == 200:
                    complete_data = complete_response.json()
                    print(f"✅ Hoàn thành mission thành công!")
                    print(f"   SVT reward: {complete_data.get('svt_reward')} SVT")
                    print(f"   New balance: {complete_data.get('new_svt_balance')} SVT")
                    print(f"   Transaction hash: {complete_data.get('transaction_hash')}")
                    print(f"   Blockchain logged: {complete_data.get('blockchain_logged')}")
                    
                    # Hiển thị next missions
                    next_missions = complete_data.get('next_missions', [])
                    if next_missions:
                        print(f"\n🔄 NEXT MISSIONS UNLOCKED:")
                        for mission in next_missions:
                            print(f"   - {mission['title']}")
                    
                    # 4. Test check SVT balance
                    print(f"\n4. Kiểm tra số dư SVT...")
                    balance_response = requests.get(f"{BASE_URL}/api/tokens/{CUSTOMER_ID}")
                    
                    if balance_response.status_code == 200:
                        balance_data = balance_response.json()
                        print(f"✅ Số dư SVT hiện tại: {balance_data.get('total_svt')} SVT")
                        
                        # Hiển thị recent transactions
                        transactions = balance_data.get('transactions', [])
                        if transactions:
                            print(f"\n💰 RECENT TRANSACTIONS:")
                            for tx in transactions[:3]:
                                print(f"   {tx['type']}: {tx['amount']} ({tx['time']})")
                        
                        return True
                    else:
                        print(f"❌ Lỗi kiểm tra balance: {balance_response.text}")
                else:
                    print(f"❌ Lỗi complete mission: {complete_response.text}")
            else:
                print(f"❌ Lỗi start mission: {start_response.text}")
        else:
            print("⚠️ Không có recommended missions")
    else:
        print(f"❌ Lỗi lấy missions: {response.text}")
    
    return False

def test_multiple_missions():
    """Test hoàn thành nhiều missions"""
    print(f"\n🔄 TESTING MULTIPLE MISSIONS")
    print("=" * 40)
    
    # Lấy danh sách missions
    response = requests.get(f"{BASE_URL}/api/missions/{CUSTOMER_ID}")
    if response.status_code != 200:
        print(f"❌ Không thể lấy missions: {response.text}")
        return
    
    missions_data = response.json()
    available_missions = missions_data.get('available_missions', [])
    
    completed_count = 0
    total_svt_earned = 0
    
    for mission in available_missions[:3]:  # Test 3 missions đầu tiên
        mission_id = mission['id']
        print(f"\n🎯 Testing mission: {mission['title']}")
        
        # Start mission
        start_response = requests.post(
            f"{BASE_URL}/api/missions/{CUSTOMER_ID}/start",
            json={"mission_id": mission_id}
        )
        
        if start_response.status_code == 200:
            print(f"   ✅ Started successfully")
            
            # Simulate some delay
            time.sleep(1)
            
            # Complete mission
            complete_response = requests.post(
                f"{BASE_URL}/api/missions/{CUSTOMER_ID}/complete",
                json={"mission_id": mission_id}
            )
            
            if complete_response.status_code == 200:
                complete_data = complete_response.json()
                reward = complete_data.get('svt_reward', 0)
                total_svt_earned += reward
                completed_count += 1
                print(f"   ✅ Completed! Earned {reward} SVT")
            else:
                print(f"   ❌ Complete failed: {complete_response.text}")
        else:
            print(f"   ❌ Start failed: {start_response.text}")
    
    print(f"\n📊 SUMMARY:")
    print(f"   Missions completed: {completed_count}")
    print(f"   Total SVT earned: {total_svt_earned}")
    
    # Check final balance
    balance_response = requests.get(f"{BASE_URL}/api/tokens/{CUSTOMER_ID}")
    if balance_response.status_code == 200:
        balance_data = balance_response.json()
        print(f"   Final SVT balance: {balance_data.get('total_svt')} SVT")

if __name__ == "__main__":
    print("⏳ Waiting for Flask server to start...")
    time.sleep(2)
    
    try:
        # Test basic mission flow
        if test_mission_system():
            print(f"\n{'='*60}")
            print("✅ BASIC MISSION SYSTEM TEST PASSED!")
            
            # Test multiple missions
            test_multiple_missions()
            
            print(f"\n{'='*60}")
            print("🎉 ALL MISSION TESTS COMPLETED!")
        else:
            print(f"\n{'='*60}")
            print("❌ MISSION SYSTEM TEST FAILED!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Không thể kết nối Flask server. Hãy chạy app.py trước!")
    except Exception as e:
        print(f"❌ Test error: {e}")
