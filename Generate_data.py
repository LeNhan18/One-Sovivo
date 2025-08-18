# backend/generate_data.py
# -*- coding: utf-8 -*-

# Script này được nâng cấp để tạo ra nhiều dữ liệu hơn,
# phục vụ cho việc huấn luyện model Deep Learning.

import pandas as pd
from faker import Faker
import random
from datetime import datetime

# --- CẤU HÌNH ---
fake = Faker('vi_VN')
# NÂNG CẤP: Tăng số lượng khách hàng để Deep Learning học tốt hơn
NUM_CUSTOMERS = 5000
personas = {
    'doanh_nhan': {'weight': 0.2, 'age_range': (35, 55)},
    'gia_dinh': {'weight': 0.5, 'age_range': (30, 45)},
    'nguoi_tre': {'weight': 0.3, 'age_range': (22, 28)}
}


# --- CÁC HÀM TẠO DỮ LIỆU (Giữ nguyên logic, chỉ tăng số lượng) ---
def create_customers_data():
    customer_data = []
    persona_types = []
    for p_type, p_info in personas.items():
        count = int(NUM_CUSTOMERS * p_info['weight'])
        persona_types.extend([p_type] * count)
    while len(persona_types) < NUM_CUSTOMERS:
        persona_types.append('gia_dinh')
    random.shuffle(persona_types)
    for i in range(NUM_CUSTOMERS):
        customer_id = 1000 + i
        persona_type = persona_types[i]
        age_range = personas[persona_type]['age_range']
        customer_data.append({
            'customer_id': customer_id, 'name': fake.name(), 'age': random.randint(*age_range),
            'gender': random.choice(['Nam', 'Nữ']), 'job': fake.job(), 'city': fake.city(),
            'persona_type': persona_type
        })
    print(f"Đã tạo xong dữ liệu cho {len(customer_data)} khách hàng.")
    return pd.DataFrame(customer_data)


def create_hdbank_data(customers_df):
    transactions = []
    start_date, end_date = datetime(2024, 1, 1), datetime(2025, 8, 15)
    for _, customer in customers_df.iterrows():
        if customer['persona_type'] == 'doanh_nhan':
            num_transactions, balance_range = random.randint(100, 300), (500_000_000, 5_000_000_000)
        elif customer['persona_type'] == 'gia_dinh':
            num_transactions, balance_range = random.randint(50, 150), (50_000_000, 300_000_000)
        else:
            num_transactions, balance_range = random.randint(20, 100), (5_000_000, 20_000_000)
        current_balance = random.randint(*balance_range)
        for _ in range(num_transactions):
            is_credit = random.choice([True, False])
            amount = random.randint(500_000, 50_000_000) if is_credit else random.randint(100_000, 20_000_000)
            current_balance += amount if is_credit else -amount
            transactions.append({
                'transaction_id': fake.uuid4(), 'customer_id': customer['customer_id'],
                'transaction_date': fake.date_time_between(start_date=start_date, end_date=end_date),
                'amount': amount, 'transaction_type': 'credit' if is_credit else 'debit', 'balance': current_balance
            })
    print(f"Đã tạo xong dữ liệu cho {len(transactions)} giao dịch HDBank.")
    return pd.DataFrame(transactions)


def create_vietjet_data(customers_df):
    flights = []
    routes = {'domestic': [('SGN', 'HAN'), ('SGN', 'DAD')], 'international': [('SGN', 'SIN'), ('HAN', 'BKK')]}
    for _, customer in customers_df.iterrows():
        if customer['persona_type'] == 'doanh_nhan':
            num_flights = random.randint(15, 50)
        elif customer['persona_type'] == 'gia_dinh':
            num_flights = random.randint(2, 8)
        else:
            num_flights = random.randint(1, 4)
        for _ in range(num_flights):
            ticket_class = 'business' if customer[
                                             'persona_type'] == 'doanh_nhan' and random.random() < 0.7 else 'economy'
            route = random.choice(
                routes['international']) if ticket_class == 'business' and random.random() < 0.4 else random.choice(
                routes['domestic'])
            booking_value = random.randint(5_000_000, 15_000_000) if ticket_class == 'business' else random.randint(
                1_500_000, 3_000_000)
            flights.append({
                'flight_id': fake.uuid4(), 'customer_id': customer['customer_id'],
                'flight_date': fake.date_time_between(start_date=datetime(2024, 1, 1), end_date=datetime(2025, 8, 15)),
                'origin': route[0], 'destination': route[1], 'ticket_class': ticket_class,
                'booking_value': booking_value
            })
    print(f"Đã tạo xong dữ liệu cho {len(flights)} chuyến bay Vietjet.")
    return pd.DataFrame(flights)


# --- NÂNG CẤP: THÊM DỮ LIỆU NGHỈ DƯỠNG ---
def create_resorts_data(customers_df):
    """Tạo dữ liệu đặt phòng tại các khu nghỉ dưỡng."""
    bookings = []
    resort_names = ['Furama Resort Da Nang', 'Ariyana Smart Condotel Nha Trang', 'L\'Alya Ninh Van Bay']

    for _, customer in customers_df.iterrows():
        has_booking = False
        num_bookings = 0

        # Xác suất đặt phòng của mỗi nhóm là khác nhau
        if customer['persona_type'] == 'doanh_nhan' and random.random() < 0.5:  # 50% doanh nhân có đi nghỉ dưỡng
            has_booking = True
            num_bookings = random.randint(1, 4)
        elif customer['persona_type'] == 'gia_dinh' and random.random() < 0.6:  # 60% gia đình có đi
            has_booking = True
            num_bookings = random.randint(1, 2)
        elif customer['persona_type'] == 'nguoi_tre' and random.random() < 0.15:  # Chỉ 15% người trẻ đi
            has_booking = True
            num_bookings = 1

        if has_booking:
            for _ in range(num_bookings):
                nights_stayed = 0
                if customer['persona_type'] == 'doanh_nhan':
                    nights_stayed = random.randint(2, 4)
                elif customer['persona_type'] == 'gia_dinh':
                    nights_stayed = random.randint(3, 7)
                else:
                    nights_stayed = random.randint(1, 3)

                price_per_night = random.randint(2_000_000, 5_000_000)
                booking_value = price_per_night * nights_stayed

                bookings.append({
                    'booking_id': fake.uuid4(),
                    'customer_id': customer['customer_id'],
                    'resort_name': random.choice(resort_names),
                    'booking_date': fake.date_time_between(start_date=datetime(2024, 1, 1),
                                                           end_date=datetime(2025, 8, 15)),
                    'nights_stayed': nights_stayed,
                    'booking_value': booking_value
                })
    print(f"Đã tạo xong dữ liệu cho {len(bookings)} lượt đặt phòng nghỉ dưỡng.")
    return pd.DataFrame(bookings)


# --- CHẠY VÀ LƯU FILE ---
if __name__ == "__main__":
    print("Bắt đầu tạo bộ dữ liệu lớn để huấn luyện model Deep Learning...")
    customers = create_customers_data()
    customers.to_csv('customers.csv', index=False, encoding='utf-8-sig')

    hdbank = create_hdbank_data(customers)
    hdbank.to_csv('hdbank.csv', index=False, encoding='utf-8-sig')

    vietjet = create_vietjet_data(customers)
    vietjet.to_csv('vietjet.csv', index=False, encoding='utf-8-sig')

    # NÂNG CẤP: Chạy và lưu file dữ liệu mới
    resorts = create_resorts_data(customers)
    resorts.to_csv('resorts.csv', index=False, encoding='utf-8-sig')

    print("Tạo dữ liệu CSV thành công!")
