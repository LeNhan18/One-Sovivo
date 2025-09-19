# migrations/001_create_esg_tables.py
# -*- coding: utf-8 -*-
"""
Migration script to create ESG-related tables
Created on: 2025-09-19
"""

from sqlalchemy import text
from models.database import db

def upgrade():
    """Create ESG tables"""
    try:
        with db.engine.connect() as conn:
            # Create esg_programs table
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS esg_programs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    category ENUM('environment', 'social', 'governance') NOT NULL DEFAULT 'environment',
                    target_amount DECIMAL(15, 2) DEFAULT 0.00,
                    current_amount DECIMAL(15, 2) DEFAULT 0.00,
                    start_date DATE,
                    end_date DATE,
                    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
                    image_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            '''))

            # Create esg_contributions table
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS esg_contributions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    program_id INT NOT NULL,
                    user_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    svt_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                    transaction_hash VARCHAR(255),
                    contribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
                    notes TEXT,
                    FOREIGN KEY (program_id) REFERENCES esg_programs(id) ON DELETE CASCADE,
                    INDEX idx_program_id (program_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_contribution_date (contribution_date)
                )
            '''))

            # Insert sample ESG programs
            conn.execute(text('''
                INSERT IGNORE INTO esg_programs (id, name, description, category, target_amount, start_date, end_date, image_url) VALUES
                (1, 'Reforestation Initiative', 'Plant trees to combat climate change and restore ecosystems', 'environment', 50000.00, '2025-01-01', '2025-12-31', '/images/esg/reforestation.jpg'),
                (2, 'Clean Water Access', 'Provide clean drinking water to underserved communities', 'social', 30000.00, '2025-01-01', '2025-06-30', '/images/esg/clean-water.jpg'),
                (3, 'Digital Literacy Program', 'Teach digital skills to elderly and disadvantaged groups', 'social', 25000.00, '2025-02-01', '2025-11-30', '/images/esg/digital-literacy.jpg'),
                (4, 'Corporate Transparency Initiative', 'Improve governance and transparency in business practices', 'governance', 15000.00, '2025-01-01', '2025-12-31', '/images/esg/transparency.jpg'),
                (5, 'Renewable Energy Transition', 'Support transition to renewable energy sources', 'environment', 75000.00, '2025-01-01', '2025-12-31', '/images/esg/renewable-energy.jpg')
            '''))

            conn.commit()
            print("✅ ESG migration completed successfully")
            return True

    except Exception as e:
        print(f"❌ ESG migration failed: {e}")
        return False

def downgrade():
    """Drop ESG tables"""
    try:
        with db.engine.connect() as conn:
            conn.execute(text('DROP TABLE IF EXISTS esg_contributions'))
            conn.execute(text('DROP TABLE IF EXISTS esg_programs'))
            conn.commit()
            print("✅ ESG tables dropped successfully")
            return True

    except Exception as e:
        print(f"❌ Failed to drop ESG tables: {e}")
        return False

if __name__ == "__main__":
    # Run migration when executed directly
    from flask import Flask
    from config import Config
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        upgrade()