# app.py
# -*- coding: utf-8 -*-

from flask import Flask, jsonify, abort, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# =============================================================================
# BƯỚC 1: KHỞI TẠO ỨNG DỤNG VÀ TẢI DỮ LIỆU
# =============================================================================

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
cors = CORS(app)

try:
    print("Đang tải dữ liệu từ các file CSV...")
    customers_df = pd.read_csv('customers.csv')
    hdbank_df = pd.read_csv('hdbank.csv')
    vietjet_df = pd.read_csv('vietjet.csv')
    hdsaison_df = pd.read_csv('hdsaison.csv')

    hdbank_df['transaction_date'] = pd.to_datetime(hdbank_df['transaction_date'])
    vietjet_df['flight_date'] = pd.to_datetime(vietjet_df['flight_date'])
    hdsaison_df['loan_date'] = pd.to_datetime(hdsaison_df['loan_date'])

    print("Tải dữ liệu thành công!")
except FileNotFoundError as e:
    print(f"Lỗi: Không tìm thấy file {e.filename}. Hãy chắc chắn rằng bạn đã chạy file generate_data.py trước.")
    exit()

# =============================================================================
# BƯỚC 1.5: HUẤN LUYỆN MODEL AI (NÂNG CẤP)
# =============================================================================
ai_model = None
feature_columns = ['age', 'avg_balance', 'total_flights', 'is_business_flyer_int']


def train_ai_model():
    """
    Hàm này chuẩn bị dữ liệu và huấn luyện một mô hình Decision Tree
    để dự đoán loại ưu đãi phù hợp dựa trên hành vi của khách hàng.
    """
    global ai_model
    print("Bắt đầu huấn luyện Model AI...")

    # --- Feature Engineering: Tạo các đặc trưng cho model học ---
    # Tính toán các thông tin tổng hợp cho mỗi khách hàng
    hdbank_agg = hdbank_df.groupby('customer_id')['balance'].mean().reset_index().rename(
        columns={'balance': 'avg_balance'})
    vietjet_agg = vietjet_df.groupby('customer_id').agg(
        total_flights=('flight_id', 'count'),
        is_business_flyer=('ticket_class', lambda x: 'business' in x.unique())
    ).reset_index()

    # Kết hợp tất cả dữ liệu lại
    merged_df = pd.merge(customers_df, hdbank_agg, on='customer_id', how='left')
    merged_df = pd.merge(merged_df, vietjet_agg, on='customer_id', how='left')
    merged_df.fillna(0, inplace=True)  # Điền 0 cho các khách hàng không có dữ liệu

    # Chuyển đổi các cột boolean/categorical thành số để model hiểu
    merged_df['is_business_flyer_int'] = merged_df['is_business_flyer'].astype(int)

    # --- Chuẩn bị dữ liệu cho việc huấn luyện ---
    X = merged_df[feature_columns]
    y = merged_df['persona_type']  # Dùng persona_type làm mục tiêu dự đoán (target)

    # Huấn luyện model
    model = DecisionTreeClassifier(random_state=42)
    model.fit(X, y)

    ai_model = model
    print("Huấn luyện Model AI thành công!")


# =============================================================================
# BƯỚC 2: XÂY DỰNG LOGIC TẠO HỒ SƠ 360 ĐỘ
# =============================================================================

def get_customer_360_profile(customer_id):
    """
    Hàm này là trái tim của logic. Nó nhận vào customer_id,
    truy vấn thông tin từ tất cả các DataFrame và tổng hợp lại.
    """
    customer_info = customers_df[customers_df['customer_id'] == customer_id]
    if customer_info.empty:
        return None

    customer_hdbank = hdbank_df[hdbank_df['customer_id'] == customer_id]
    hdbank_summary = {}
    if not customer_hdbank.empty:
        three_months_ago = pd.Timestamp.now() - pd.DateOffset(months=3)
        credit_mask = (customer_hdbank['transaction_date'] > three_months_ago) & (
                    customer_hdbank['transaction_type'] == 'credit')
        debit_mask = (customer_hdbank['transaction_date'] > three_months_ago) & (
                    customer_hdbank['transaction_type'] == 'debit')
        hdbank_summary = {
            'total_transactions': int(len(customer_hdbank)),
            'average_balance': float(customer_hdbank['balance'].mean()),
            'total_credit_last_3m': float(customer_hdbank[credit_mask]['amount'].sum()),
            'total_debit_last_3m': float(customer_hdbank[debit_mask]['amount'].sum())
        }

    customer_vietjet = vietjet_df[vietjet_df['customer_id'] == customer_id]
    vietjet_summary = {}
    if not customer_vietjet.empty:
        favorite_route = customer_vietjet.groupby(
            ['origin', 'destination']).size().idxmax() if not customer_vietjet.empty else None
        vietjet_summary = {
            'total_flights_last_year': int(len(customer_vietjet[customer_vietjet['flight_date'].dt.year == 2024])),
            'total_spending': float(customer_vietjet['booking_value'].sum()),
            'is_business_flyer': bool('business' in customer_vietjet['ticket_class'].unique()),
            'favorite_route': f"{favorite_route[0]}-{favorite_route[1]}" if favorite_route else "N/A"
        }

    customer_hdsaison = hdsaison_df[hdsaison_df['customer_id'] == customer_id]
    hdsaison_summary = {}
    if not customer_hdsaison.empty:
        hdsaison_summary = {
            'has_active_loan': bool('ongoing' in customer_hdsaison['status'].unique()),
            'total_loan_amount': float(customer_hdsaison['loan_amount'].sum()),
            'most_frequent_product': customer_hdsaison['product_category'].mode()[
                0] if not customer_hdsaison.empty else "N/A"
        }

    profile_360 = {
        'basic_info': customer_info.to_dict('records')[0],
        'hdbank_summary': hdbank_summary,
        'vietjet_summary': vietjet_summary,
        'hdsaison_summary': hdsaison_summary
    }

    return profile_360


# =============================================================================
# BƯỚC 3: XÂY DỰNG BỘ MÁY ĐỀ XUẤT (RECOMMENDATION ENGINE - NÂNG CẤP)
# =============================================================================
def get_recommendations(profile):
    """
    Hàm này giờ sẽ sử dụng Model AI đã được huấn luyện để dự đoán.
    """
    global ai_model
    recommendations = []

    # --- Chuẩn bị dữ liệu đầu vào cho model ---
    input_data = {
        'age': profile['basic_info']['age'],
        'avg_balance': profile['hdbank_summary'].get('average_balance', 0),
        'total_flights': profile['vietjet_summary'].get('total_flights_last_year', 0),
        'is_business_flyer_int': int(profile['vietjet_summary'].get('is_business_flyer', False))
    }
    input_df = pd.DataFrame([input_data])
    input_df = input_df[feature_columns]  # Đảm bảo đúng thứ tự cột

    # --- Dự đoán bằng model AI ---
    predicted_persona = ai_model.predict(input_df)[0]

    print(f"Model AI dự đoán persona là: {predicted_persona}")

    # --- Trả về đề xuất dựa trên kết quả dự đoán ---
    if predicted_persona == 'doanh_nhan':
        recommendations.append({'offer_code': 'DN001', 'title': 'Mở thẻ HDBank Visa Signature',
                                'description': 'Tận hưởng đặc quyền phòng chờ sân bay và các ưu đãi golf cao cấp.'})
    elif predicted_persona == 'gia_dinh':
        recommendations.append({'offer_code': 'GD001', 'title': 'Combo Du lịch Hè Vietjet',
                                'description': 'Giảm giá 30% cho cả gia đình khi đặt vé máy bay và khách sạn qua HDBank App.'})
    elif predicted_persona == 'nguoi_tre':
        recommendations.append({'offer_code': 'NT001', 'title': 'Mở thẻ tín dụng đầu tiên',
                                'description': 'Bắt đầu xây dựng lịch sử tín dụng của bạn với thẻ HDBank Vietjet Platinum.'})

    return recommendations


def build_ai_evidence(profile):
    """Sinh các dòng bằng chứng (evidence) để giải thích vì sao model dự đoán như vậy."""
    evidences = []
    avg_balance = profile.get('hdbank_summary', {}).get('average_balance', 0) or 0
    is_biz = profile.get('vietjet_summary', {}).get('is_business_flyer', False)
    total_debit_3m = profile.get('hdbank_summary', {}).get('total_debit_last_3m', 0) or 0

    # Các ngưỡng minh họa, có thể điều chỉnh
    evidences.append({
        'label': 'Số dư trung bình cao',
        'value': f"{avg_balance:,.0f} VND",
        'ok': bool(avg_balance >= 300_000_000)
    })
    evidences.append({
        'label': 'Thường xuyên bay hạng thương gia',
        'value': 'Có' if is_biz else 'Không',
        'ok': bool(is_biz)
    })
    evidences.append({
        'label': 'Tổng chi tiêu 3 tháng gần đây',
        'value': f"{total_debit_3m:,.0f} VND",
        'ok': bool(total_debit_3m >= 50_000_000)
    })

    return evidences


# =============================================================================
# BƯỚC 4: TẠO API ENDPOINTS
# =============================================================================

@app.route('/customer/<int:customer_id>', methods=['GET'])
def get_customer_profile_api(customer_id):
    """API endpoint để lấy hồ sơ 360 độ của khách hàng."""
    print(f"Nhận được yêu cầu lấy thông tin cho customer_id: {customer_id}")
    profile = get_customer_360_profile(customer_id)
    if profile is None:
        abort(404, description=f"Không tìm thấy khách hàng với ID {customer_id}")
    return jsonify(profile)


@app.route('/customer/<int:customer_id>/recommendations', methods=['GET'])
def get_recommendations_api(customer_id):
    """API endpoint để lấy các đề xuất từ AI cho khách hàng."""
    print(f"Nhận được yêu cầu lấy đề xuất cho customer_id: {customer_id}")
    profile = get_customer_360_profile(customer_id)
    if profile is None:
        abort(404, description=f"Không tìm thấy khách hàng với ID {customer_id}")
    recommendations = get_recommendations(profile)
    return jsonify(recommendations)


@app.route('/customer/<int:customer_id>/insights', methods=['GET'])
def get_insights_api(customer_id):
    """API trả về persona dự đoán, evidence và đề xuất."""
    profile = get_customer_360_profile(customer_id)
    if profile is None:
        abort(404, description=f"Không tìm thấy khách hàng với ID {customer_id}")

    # Chuẩn bị input và dự đoán persona
    input_data = {
        'age': profile['basic_info'].get('age', 0),
        'avg_balance': profile['hdbank_summary'].get('average_balance', 0),
        'total_flights': profile['vietjet_summary'].get('total_flights_last_year', 0),
        'is_business_flyer_int': int(profile['vietjet_summary'].get('is_business_flyer', False))
    }
    input_df = pd.DataFrame([input_data])[feature_columns]
    predicted_persona = ai_model.predict(input_df)[0]

    evidence = build_ai_evidence(profile)
    recommendations = get_recommendations(profile)

    return jsonify({
        'predicted_persona': predicted_persona,
        'evidence': evidence,
        'recommendations': recommendations
    })


@app.route('/customers/suggestions', methods=['GET'])
def get_customer_suggestions_api():
    """API gợi ý một vài khách hàng đáng chú ý dựa trên dữ liệu hiện có."""
    # Tính avg_balance
    hdbank_agg = hdbank_df.groupby('customer_id')['balance'].mean().reset_index().rename(
        columns={'balance': 'avg_balance'})
    # Tính tổng chuyến bay và business flyer
    vietjet_agg = vietjet_df.groupby('customer_id').agg(
        total_flights=('flight_id', 'count'),
        is_business_flyer=('ticket_class', lambda x: 'business' in x.unique())
    ).reset_index()

    merged = customers_df[['customer_id', 'name']].merge(hdbank_agg, on='customer_id', how='left') \
        .merge(vietjet_agg, on='customer_id', how='left').fillna({'avg_balance': 0, 'total_flights': 0, 'is_business_flyer': False})

    # Xếp hạng đơn giản: ưu tiên avg_balance cao và business flyer
    merged['score'] = merged['avg_balance'] * 0.7 + merged['total_flights'] * 1_000_000 + merged['is_business_flyer'].astype(int) * 50_000_000
    top = merged.sort_values('score', ascending=False).head(5)

    def reason(row):
        r = []
        if row['avg_balance'] >= 300_000_000:
            r.append('Số dư cao')
        if row['is_business_flyer']:
            r.append('Bay hạng thương gia')
        if row['total_flights'] >= 5:
            r.append('Bay thường xuyên')
        return ', '.join(r) or 'Hoạt động nổi bật'

    data = [
        {
            'customer_id': int(row['customer_id']),
            'name': row['name'],
            'reason': reason(row)
        } for _, row in top.iterrows()
    ]

    return jsonify(data)


@app.route('/customers/search', methods=['GET'])
def search_customers_api():
    """Tìm kiếm khách hàng theo từ khóa (theo tên hoặc ID)."""
    q = (request.args.get('q') or '').strip().lower()
    if not q:
        return jsonify([])
    try:
        q_id = int(q)
    except ValueError:
        q_id = None

    def match(row):
        return (q in str(row['name']).lower()) or (q_id is not None and row['customer_id'] == q_id) or str(row['customer_id']).startswith(q)

    matches = customers_df[customers_df.apply(match, axis=1)].head(20)
    data = [
        {
            'customer_id': int(row['customer_id']),
            'name': row['name']
        } for _, row in matches.iterrows()
    ]
    return jsonify(data)


# =============================================================================
# BƯỚC 5: CHẠY ỨNG DỤNG
# =============================================================================

if __name__ == '__main__':
    train_ai_model()  # Huấn luyện model ngay khi khởi động
    app.run(debug=True)
