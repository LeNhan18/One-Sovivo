# generate_data.py
# -*- coding: utf-8 -*-

import pandas as pd
from faker import Faker
import random
import numpy as np
from datetime import datetime, timedelta

# =============================================================================
# BƯỚC 1: CÀI ĐẶT VÀ CẤU HÌNH
# =============================================================================

# Khởi tạo Faker để tạo dữ liệu giả tiếng Việt
fake = Faker('vi_VN')

# Số lượng khách hàng muốn tạo
NUM_CUSTOMERS = 500

# Định nghĩa các kịch bản khách hàng (Personas)
# Đây là "linh hồn" của bộ dữ liệu, quyết định hành vi của từng nhóm
personas = {
    'doanh_nhan': {'weight': 0.2, 'age_range': (35, 55)},  # 20% là doanh nhân
    'gia_dinh': {'weight': 0.5, 'age_range': (30, 45)},  # 50% là gia đình
    'nguoi_tre': {'weight': 0.3, 'age_range': (22, 28)}  # 30% là người trẻ
}


# =============================================================================
# BƯỚC 2: TẠO DỮ LIỆU CHO FILE `customers.csv`
# =============================================================================
def create_customers_data():
    """Tạo dữ liệu khách hàng dựa trên các kịch bản đã định nghĩa."""
    customer_data = []

    # Phân bổ số lượng khách hàng cho mỗi persona dựa trên trọng số (weight)
    persona_types = []
    for p_type, p_info in personas.items():
        count = int(NUM_CUSTOMERS * p_info['weight'])
        persona_types.extend([p_type] * count)

    # Đảm bảo đủ số lượng khách hàng nếu có sai số làm tròn
    while len(persona_types) < NUM_CUSTOMERS:
        persona_types.append('gia_dinh')
    random.shuffle(persona_types)

    for i in range(NUM_CUSTOMERS):
        customer_id = 1000 + i
        persona_type = persona_types[i]
        age_range = personas[persona_type]['age_range']

        customer_data.append({
            'customer_id': customer_id,
            'name': fake.name(),
            'age': random.randint(*age_range),
            'gender': random.choice(['Nam', 'Nữ']),
            'job': fake.job(),
            'city': fake.city(),  # SỬA LỖI TẠI ĐÂY: city_name() -> city()
            'persona_type': persona_type
        })

    print(f"Đã tạo xong dữ liệu cho {len(customer_data)} khách hàng.")
    return pd.DataFrame(customer_data)


# =============================================================================
# BƯỚC 3: TẠO DỮ LIỆU CHO FILE `hdbank.csv`
# =============================================================================
def create_hdbank_data(customers_df):
    """Tạo dữ liệu giao dịch HDBank, mô phỏng hành vi của từng nhóm khách hàng."""
    transactions = []
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 8, 15)

    for _, customer in customers_df.iterrows():
        num_transactions = 0
        balance_range = (0, 0)

        # Mỗi nhóm có hành vi giao dịch khác nhau
        if customer['persona_type'] == 'doanh_nhan':
            num_transactions = random.randint(100, 300)
            balance_range = (500_000_000, 5_000_000_000)
        elif customer['persona_type'] == 'gia_dinh':
            num_transactions = random.randint(50, 150)
            balance_range = (50_000_000, 300_000_000)
        else:  # nguoi_tre
            num_transactions = random.randint(20, 100)
            balance_range = (5_000_000, 20_000_000)

        current_balance = random.randint(*balance_range)

        for _ in range(num_transactions):
            # Tạo ngày giao dịch ngẫu nhiên trong khoảng thời gian
            transaction_date = fake.date_time_between(start_date=start_date, end_date=end_date)

            # 50% là chi tiêu (debit), 50% là nhận tiền (credit)
            is_credit = random.choice([True, False])

            if is_credit:
                amount = random.randint(500_000, 50_000_000)
                current_balance += amount
                txn_type = 'credit'
            else:
                amount = random.randint(100_000, 20_000_000)
                current_balance -= amount
                txn_type = 'debit'

            transactions.append({
                'transaction_id': fake.uuid4(),
                'customer_id': customer['customer_id'],
                'transaction_date': transaction_date,
                'amount': amount,
                'transaction_type': txn_type,
                'balance': current_balance
            })

    print(f"Đã tạo xong dữ liệu cho {len(transactions)} giao dịch HDBank.")
    return pd.DataFrame(transactions)


# =============================================================================
# BƯỚC 4: TẠO DỮ LIỆU CHO FILE `vietjet.csv`
# =============================================================================
def create_vietjet_data(customers_df):
    """Tạo dữ liệu chuyến bay Vietjet, mô phỏng hành vi của từng nhóm."""
    flights = []
    domestic_routes = [('SGN', 'HAN'), ('SGN', 'DAD'), ('HAN', 'PQC')]
    international_routes = [('SGN', 'SIN'), ('HAN', 'BKK')]

    for _, customer in customers_df.iterrows():
        num_flights = 0
        if customer['persona_type'] == 'doanh_nhan':
            num_flights = random.randint(15, 50)
        elif customer['persona_type'] == 'gia_dinh':
            num_flights = random.randint(2, 8)
        else:  # nguoi_tre
            num_flights = random.randint(1, 4)

        for _ in range(num_flights):
            flight_date = fake.date_time_between(start_date=datetime(2024, 1, 1), end_date=datetime(2025, 8, 15))
            ticket_class = 'economy'
            route = random.choice(domestic_routes)

            if customer['persona_type'] == 'doanh_nhan' and random.random() < 0.7:  # 70% bay business
                ticket_class = 'business'
                if random.random() < 0.4:  # 40% bay quốc tế
                    route = random.choice(international_routes)

            booking_value = random.randint(1_500_000, 3_000_000) if ticket_class == 'economy' else random.randint(
                5_000_000, 15_000_000)

            flights.append({
                'flight_id': fake.uuid4(),
                'customer_id': customer['customer_id'],
                'flight_date': flight_date,
                'origin': route[0],
                'destination': route[1],
                'ticket_class': ticket_class,
                'booking_value': booking_value
            })

    print(f"Đã tạo xong dữ liệu cho {len(flights)} chuyến bay Vietjet.")
    return pd.DataFrame(flights)


# =============================================================================
# BƯỚC 5: TẠO DỮ LIỆU CHO FILE `hdsaison.csv`
# =============================================================================
def create_hdsaison_data(customers_df):
    """Tạo dữ liệu vay tiêu dùng HD Saison."""
    loans = []
    product_categories = ['phone', 'motorbike', 'electronics', 'home_appliance']

    for _, customer in customers_df.iterrows():
        # Chỉ một phần khách hàng có vay HD Saison
        if random.random() < 0.4:  # 40% khách hàng có vay
            num_loans = 0
            if customer['persona_type'] == 'gia_dinh':
                num_loans = random.randint(1, 3)
            elif customer['persona_type'] == 'nguoi_tre':
                num_loans = random.randint(1, 2)
            # Giả định doanh nhân không vay tiêu dùng nhỏ

            for _ in range(num_loans):
                loan_date = fake.date_time_between(start_date=datetime(2023, 1, 1), end_date=datetime(2025, 8, 15))
                product = random.choice(product_categories)
                amount = 0
                if product == 'phone':
                    amount = random.randint(10_000_000, 30_000_000)
                elif product == 'motorbike':
                    amount = random.randint(30_000_000, 70_000_000)
                else:
                    amount = random.randint(5_000_000, 20_000_000)

                loans.append({
                    'loan_id': fake.uuid4(),
                    'customer_id': customer['customer_id'],
                    'loan_date': loan_date,
                    'product_category': product,
                    'loan_amount': amount,
                    'status': random.choice(['paid', 'ongoing'])
                })

    print(f"Đã tạo xong dữ liệu cho {len(loans)} khoản vay HD Saison.")
    return pd.DataFrame(loans)


# =============================================================================
# BƯỚC 6: CHẠY TẤT CẢ VÀ LƯU FILE
# =============================================================================
if __name__ == "__main__":
    print("Bắt đầu quá trình tạo dữ liệu giả lập...")

    # 1. Tạo dữ liệu khách hàng
    customers_df = create_customers_data()
    customers_df.to_csv('customers.csv', index=False, encoding='utf-8-sig')
    print("-> Đã lưu file customers.csv")

    # 2. Tạo dữ liệu HDBank
    hdbank_df = create_hdbank_data(customers_df)
    hdbank_df.to_csv('hdbank.csv', index=False, encoding='utf-8-sig')
    print("-> Đã lưu file hdbank.csv")

    # 3. Tạo dữ liệu Vietjet
    vietjet_df = create_vietjet_data(customers_df)
    vietjet_df.to_csv('vietjet.csv', index=False, encoding='utf-8-sig')
    print("-> Đã lưu file vietjet.csv")

    # 4. Tạo dữ liệu HD Saison
    hdsaison_df = create_hdsaison_data(customers_df)
    hdsaison_df.to_csv('hdsaison.csv', index=False, encoding='utf-8-sig')
    print("-> Đã lưu file hdsaison.csv")

    print("\nQuá trình tạo dữ liệu đã hoàn tất!")
