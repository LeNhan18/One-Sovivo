#!/usr/bin/env python3
"""
Script to populate blockchain transaction history for demo purposes
"""

import mysql.connector
import datetime
import time
import random

def generate_tx_hash():
    """Generate realistic looking blockchain transaction hash"""
    return "0x" + "".join([hex(random.randint(0, 15))[2:] for _ in range(64)])

def populate_sample_transactions():
    """Create sample blockchain transactions for customer 2015"""
    
    conn = None
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='nhan1811',
            database='one_sovico'
        )
        cursor = conn.cursor()
        
        # Sample transactions for the last 30 days
        sample_transactions = [
            {
                'customer_id': 2015,
                'amount': 1000,
                'transaction_type': 'welcome_bonus',
                'description': 'Bonus chào mừng thành viên mới',
                'days_ago': 25
            },
            {
                'customer_id': 2015,
                'amount': 500,
                'transaction_type': 'daily_checkin',
                'description': 'Điểm danh hàng ngày - Tuần 1',
                'days_ago': 20
            },
            {
                'customer_id': 2015,
                'amount': -200,
                'transaction_type': 'marketplace_purchase',
                'description': 'Mua voucher HDBank 200K',
                'days_ago': 18
            },
            {
                'customer_id': 2015,
                'amount': 1500,
                'transaction_type': 'flight_reward',
                'description': 'Thưởng đặt vé máy bay Vietjet',
                'days_ago': 15
            },
            {
                'customer_id': 2015,
                'amount': 300,
                'transaction_type': 'profile_completion',
                'description': 'Hoàn thành hồ sơ cá nhân',
                'days_ago': 12
            },
            {
                'customer_id': 2015,
                'amount': -150,
                'transaction_type': 'marketplace_purchase',
                'description': 'Mua thẻ HDSaison Premium',
                'days_ago': 10
            },
            {
                'customer_id': 2015,
                'amount': 2000,
                'transaction_type': 'banking_achievement',
                'description': 'Thành tựu: Nhà đầu tư thông minh',
                'days_ago': 8
            },
            {
                'customer_id': 2015,
                'amount': 800,
                'transaction_type': 'resort_booking',
                'description': 'Thưởng đặt phòng resort 2 đêm',
                'days_ago': 5
            },
            {
                'customer_id': 2015,
                'amount': -95,
                'transaction_type': 'marketplace_purchase', 
                'description': 'Mua voucher ăn uống 200K',
                'days_ago': 3
            },
            {
                'customer_id': 2015,
                'amount': 400,
                'transaction_type': 'ai_interaction',
                'description': 'Thưởng tương tác AI Financial Advisor',
                'days_ago': 1
            }
        ]
        
        print("🔗 Populating blockchain transaction history...")
        
        for tx in sample_transactions:
            # Calculate timestamp
            tx_date = datetime.datetime.now() - datetime.timedelta(days=tx['days_ago'])
            
            # Insert transaction
            query = """
                INSERT INTO token_transactions 
                (customer_id, amount, transaction_type, description, tx_hash, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            values = (
                tx['customer_id'],
                tx['amount'],
                tx['transaction_type'],
                tx['description'],
                generate_tx_hash(),
                tx_date
            )
            
            cursor.execute(query, values)
            print(f"✅ Added: {tx['description']} ({tx['amount']:+} SVT)")
        
        conn.commit()
        
        # Calculate final balance
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_svt
            FROM token_transactions 
            WHERE customer_id = 2015
        """)
        
        result = cursor.fetchone()
        final_balance = result[0] if result else 0
        
        print(f"\n💰 Final SVT Balance for Customer 2015: {final_balance:,} SVT")
        print(f"📊 Total Transactions: {len(sample_transactions)}")
        print("🎉 Blockchain history populated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    populate_sample_transactions()
