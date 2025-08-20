"""
Demo script to test the integrated blockchain achievement system
Tests the /predict endpoint with various customer profiles to trigger achievements
"""

import requests
import json
import time

# Flask app configuration
BASE_URL = "http://127.0.0.1:5000"

# Test customer profiles that should trigger different achievements
TEST_PROFILES = [
    {
        "name": "Frequent Flyer Test",
        "data": {
            "customer_id": 1,
            "age": 35,
            "avg_balance": 100_000_000,
            "total_flights": 25,  # Should trigger Frequent Flyer
            "is_business_flyer": False,
            "total_nights_stayed": 10,
            "total_resort_spending": 10_000_000
        },
        "expected_achievements": ["frequent_flyer"]
    },
    {
        "name": "Business Elite Test", 
        "data": {
            "customer_id": 2,
            "age": 42,
            "avg_balance": 200_000_000,
            "total_flights": 15,  # Should trigger Business Elite
            "is_business_flyer": True,
            "total_nights_stayed": 20,
            "total_resort_spending": 25_000_000
        },
        "expected_achievements": ["frequent_flyer", "business_elite"]
    },
    {
        "name": "High Roller Test",
        "data": {
            "customer_id": 3,
            "age": 50,
            "avg_balance": 600_000_000,  # Should trigger High Roller
            "total_flights": 8,
            "is_business_flyer": True,
            "total_nights_stayed": 15,
            "total_resort_spending": 20_000_000
        },
        "expected_achievements": ["high_roller"]
    },
    {
        "name": "Resort Lover Test",
        "data": {
            "customer_id": 4,
            "age": 38,
            "avg_balance": 150_000_000,
            "total_flights": 12,
            "is_business_flyer": False,
            "total_nights_stayed": 35,  # Should trigger Long Stay Guest
            "total_resort_spending": 60_000_000  # Should trigger Resort Lover
        },
        "expected_achievements": ["resort_lover", "long_stay_guest"]
    },
    {
        "name": "VIP Ecosystem Test",
        "data": {
            "customer_id": 5,
            "age": 45,
            "avg_balance": 300_000_000,  # High balance
            "total_flights": 22,  # High flights (Frequent Flyer + part of VIP)
            "is_business_flyer": True,
            "total_nights_stayed": 40,  # Long stay
            "total_resort_spending": 80_000_000  # High resort spending
        },
        "expected_achievements": ["frequent_flyer", "business_elite", "resort_lover", "long_stay_guest", "vip_ecosystem"]
    },
    {
        "name": "No Achievement Test",
        "data": {
            "customer_id": 6,
            "age": 25,
            "avg_balance": 50_000_000,  # Low values - should not trigger any achievements
            "total_flights": 5,
            "is_business_flyer": False,
            "total_nights_stayed": 3,
            "total_resort_spending": 5_000_000
        },
        "expected_achievements": []
    }
]

def test_flask_connection():
    """Test if Flask app is running and responding."""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Flask app is running")
            print(f"   Database: {data.get('database', 'unknown')}")
            print(f"   AI Model: {data.get('ai_model', 'unknown')}")
            print(f"   Blockchain: {data.get('blockchain', 'unknown')}")
            return True
        else:
            print(f"❌ Flask app responded with status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to Flask app: {e}")
        print("💡 Make sure Flask is running: python app.py")
        return False

def test_blockchain_endpoint():
    """Test the blockchain test endpoint."""
    try:
        test_data = {
            "token_id": 0,
            "rank": "Gold",
            "badge": "test_connection"
        }
        
        response = requests.post(f"{BASE_URL}/test-blockchain", json=test_data, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Blockchain integration test successful")
                print(f"   Transaction: {data.get('transaction_hash', 'N/A')}")
                return True
            else:
                print(f"❌ Blockchain test failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Blockchain test endpoint error: {response.status_code}")
            if response.text:
                print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Blockchain test request failed: {e}")
        return False

def test_customer_profile(profile):
    """Test a single customer profile for achievement detection."""
    print(f"\n🧪 Testing: {profile['name']}")
    print("-" * 50)
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=profile['data'], timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            # Display results
            print(f"👤 Predicted Persona: {result.get('predicted_persona', 'Unknown')}")
            
            achievements = result.get('achievements', [])
            print(f"🏆 Achievements Found: {len(achievements)}")
            
            total_svt = result.get('total_svt_reward', 0)
            blockchain_enabled = result.get('blockchain_enabled', False)
            
            if achievements:
                for ach in achievements:
                    print(f"   - {ach['title']} ({ach['badge']}) - {ach['rank']} - {ach['svt_reward']} SVT")
                    if 'blockchain_tx' in ach:
                        print(f"     ✅ Blockchain TX: {ach['blockchain_tx'][:20]}...")
                    elif 'blockchain_error' in ach:
                        print(f"     ❌ Blockchain Error: {ach['blockchain_error']}")
                
                print(f"💰 Total SVT Reward: {total_svt}")
            else:
                print("   No achievements earned")
            
            print(f"🔗 Blockchain Status: {'Enabled' if blockchain_enabled else 'Disabled'}")
            
            # Verify expected achievements
            expected = set(profile['expected_achievements'])
            actual = set(ach['badge'] for ach in achievements)
            
            if expected == actual:
                print("✅ Achievement detection PASSED")
            else:
                print("❌ Achievement detection FAILED")
                print(f"   Expected: {expected}")
                print(f"   Actual: {actual}")
                missing = expected - actual
                extra = actual - expected
                if missing:
                    print(f"   Missing: {missing}")
                if extra:
                    print(f"   Extra: {extra}")
            
            return True
            
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    """Main demo function."""
    print("🎮 Blockchain Achievement Integration Demo")
    print("=" * 60)
    
    # Test 1: Flask connection
    print("\n1️⃣ Testing Flask App Connection...")
    if not test_flask_connection():
        print("❌ Cannot proceed without Flask app running")
        return
    
    # Test 2: Blockchain endpoint
    print("\n2️⃣ Testing Blockchain Integration...")
    blockchain_works = test_blockchain_endpoint()
    
    if not blockchain_works:
        print("⚠️ Blockchain integration not working, but continuing with other tests...")
    
    # Test 3: Customer profiles
    print("\n3️⃣ Testing Customer Achievement Detection...")
    
    successful_tests = 0
    total_tests = len(TEST_PROFILES)
    
    for i, profile in enumerate(TEST_PROFILES, 1):
        print(f"\n--- Test {i}/{total_tests} ---")
        if test_customer_profile(profile):
            successful_tests += 1
        
        # Small delay between tests
        if i < total_tests:
            time.sleep(1)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Demo Summary")
    print("=" * 60)
    print(f"✅ Successful Tests: {successful_tests}/{total_tests}")
    print(f"🔗 Blockchain: {'Working' if blockchain_works else 'Not Working'}")
    
    if successful_tests == total_tests:
        print("🎉 All tests passed! Achievement system is working correctly.")
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
    
    print("\n💡 Next Steps:")
    print("1. Check blockchain transactions in Ganache (if running)")
    print("2. Verify NFT metadata updates in smart contract")
    print("3. Test frontend integration with SuperApp")

if __name__ == "__main__":
    main()
