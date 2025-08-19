# database.sql
# MySQL Schema cho One-Sovico Platform

-- Tạo database
CREATE DATABASE IF NOT EXISTS one_sovico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE one_sovico;

-- Bảng Users (cho authentication)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng Customers (khách hàng)
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT,
    gender ENUM('Nam', 'Nữ', 'Khác'),
    job VARCHAR(100),
    city VARCHAR(100),
    persona_type ENUM('doanh_nhan', 'gia_dinh', 'nguoi_tre'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng HDBank Transactions
CREATE TABLE hdbank_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    transaction_date DATETIME NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type ENUM('credit', 'debit') NOT NULL,
    balance DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_date (customer_id, transaction_date),
    INDEX idx_transaction_date (transaction_date)
);

-- Bảng Vietjet Flights
CREATE TABLE vietjet_flights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    flight_date DATETIME NOT NULL,
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    ticket_class ENUM('economy', 'business') NOT NULL,
    booking_value DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_date (customer_id, flight_date),
    INDEX idx_flight_date (flight_date)
);

-- Bảng Resort Bookings
CREATE TABLE resort_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    resort_name VARCHAR(200) NOT NULL,
    booking_date DATETIME NOT NULL,
    nights_stayed INT NOT NULL,
    booking_value DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_date (customer_id, booking_date),
    INDEX idx_booking_date (booking_date)
);

-- Bảng Sovico Token Transactions (Blockchain simulation)
CREATE TABLE token_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    block_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_date (customer_id, created_at),
    INDEX idx_tx_hash (tx_hash)
);

-- Bảng AI Predictions (lưu kết quả dự đoán)
CREATE TABLE ai_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    predicted_persona ENUM('doanh_nhan', 'gia_dinh', 'nguoi_tre') NOT NULL,
    confidence_score DECIMAL(5,4),
    input_features JSON,
    recommendations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_date (customer_id, created_at)
);

-- Insert demo users
INSERT INTO users (email, name, password_hash, role) VALUES
('admin@hdbank.com.vn', 'Chuyên viên HDBank', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqMH1lMZ1eoNz5i', 'admin'), -- password: 123456
('admin@sovico.vn', 'Quản lý Sovico', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqMH1lMZ1eoNz5i', 'admin'),
('khachhang@gmail.com', 'Khách hàng Demo', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqMH1lMZ1eoNz5i', 'customer'),
('lannguyen@email.com', 'Lan Nguyễn', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqMH1lMZ1eoNz5i', 'customer');

-- Insert demo customers
INSERT INTO customers (customer_id, name, age, gender, job, city, persona_type) VALUES
(1001, 'Trần Văn An', 42, 'Nam', 'Giám đốc', 'Hồ Chí Minh', 'doanh_nhan'),
(1002, 'Nguyễn Thị Bình', 35, 'Nữ', 'Kế toán trưởng', 'Hà Nội', 'gia_dinh'),
(1003, 'Lê Minh Cường', 25, 'Nam', 'Lập trình viên', 'Đà Nẵng', 'nguoi_tre'),
(1004, 'Phạm Thị Dung', 38, 'Nữ', 'Bác sĩ', 'Hồ Chí Minh', 'doanh_nhan'),
(1005, 'Hoàng Văn Em', 45, 'Nam', 'Kỹ sư', 'Hà Nội', 'gia_dinh');

-- Insert demo HDBank transactions
INSERT INTO hdbank_transactions (transaction_id, customer_id, transaction_date, amount, transaction_type, balance, description) VALUES
('TXN001', 1001, '2024-12-01 10:30:00', 50000000, 'credit', 500000000, 'Chuyển khoản đến'),
('TXN002', 1001, '2024-12-02 14:15:00', 5000000, 'debit', 495000000, 'Rút tiền ATM'),
('TXN003', 1002, '2024-12-01 09:20:00', 20000000, 'credit', 80000000, 'Lương tháng 12'),
('TXN004', 1003, '2024-12-01 16:45:00', 10000000, 'credit', 15000000, 'Bonus dự án'),
('TXN005', 1004, '2024-12-02 11:30:00', 100000000, 'credit', 300000000, 'Thu nhập phẩu thuật');

-- Insert demo Vietjet flights
INSERT INTO vietjet_flights (flight_id, customer_id, flight_date, origin, destination, ticket_class, booking_value) VALUES
('VJ001', 1001, '2024-11-15 07:30:00', 'SGN', 'HAN', 'business', 5500000),
('VJ002', 1001, '2024-11-20 18:15:00', 'HAN', 'SGN', 'business', 5500000),
('VJ003', 1002, '2024-10-10 12:00:00', 'SGN', 'DAD', 'economy', 2200000),
('VJ004', 1003, '2024-09-05 15:30:00', 'HAN', 'SGN', 'economy', 1800000),
('VJ005', 1004, '2024-12-01 08:45:00', 'SGN', 'SIN', 'business', 8500000);

-- Insert demo resort bookings
INSERT INTO resort_bookings (booking_id, customer_id, resort_name, booking_date, nights_stayed, booking_value) VALUES
('RES001', 1001, 'Furama Resort Da Nang', '2024-11-25 15:00:00', 3, 15000000),
('RES002', 1002, 'Ariyana Smart Condotel Nha Trang', '2024-10-15 14:00:00', 4, 12000000),
('RES003', 1004, 'L\'Alya Ninh Van Bay', '2024-12-10 16:00:00', 2, 20000000);

-- Insert demo token transactions
INSERT INTO token_transactions (tx_hash, customer_id, transaction_type, amount, description, block_number) VALUES
('0xabc123...', 1001, 'Tích điểm Vietjet', 500.00, 'Bay business class SGN-HAN', 1001),
('0xdef456...', 1001, 'Đổi ưu đãi Resort', -2000.00, 'Đổi voucher nghỉ dưỡng', 1002),
('0xghi789...', 1002, 'Thưởng hạng Vàng HDBank', 1000.00, 'Đạt hạng thành viên Vàng', 1003),
('0xjkl012...', 1003, 'Tích điểm mua sắm', 200.00, 'Thanh toán qua HDBank App', 1004),
('0xmno345...', 1004, 'Tích điểm Vietjet', 850.00, 'Bay business class SGN-SIN', 1005);
