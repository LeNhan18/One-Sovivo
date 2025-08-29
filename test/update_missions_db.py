"""
Script để cập nhật database với hệ thống mission chi tiết mới
"""

import mysql.connector
from detailed_missions import DetailedMissionSystem, MissionCategory, MissionLevel, CustomerType
import json
from datetime import datetime

class MissionDatabaseUpdater:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': 'nhan1811',
            'database': 'one_sovico'
        }
        self.mission_system = DetailedMissionSystem()
    
    def connect_db(self):
        """Kết nối database"""
        return mysql.connector.connect(**self.db_config)
    
    def clear_existing_missions(self):
        """Xóa dữ liệu mission cũ để cập nhật mới"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Xóa dữ liệu trong bảng mission_templates (giữ lại cấu trúc bảng)
            cursor.execute("DELETE FROM mission_templates")
            print("✅ Đã xóa dữ liệu mission templates cũ")
            
            conn.commit()
        except Exception as e:
            print(f"❌ Lỗi khi xóa dữ liệu cũ: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    def insert_new_missions(self):
        """Thêm tất cả mission mới vào database với cấu trúc bảng đã có"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        insert_query = """
        INSERT INTO mission_templates 
        (mission_id, title, description, category, level, customer_type, 
         svt_reward, requirements, prerequisites, next_missions, 
         icon, estimated_time, is_active, created_at, updated_at) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        successful_inserts = 0
        failed_inserts = 0
        
        # Mapping category names
        category_mapping = {
            'welcome': 'onboarding',
            'daily': 'lifestyle', 
            'financial': 'financial',
            'travel': 'travel',
            'social': 'social'
        }
        
        try:
            for mission_id, mission in self.mission_system.mission_templates.items():
                try:
                    # Map category to database enum
                    db_category = category_mapping.get(mission['category'], 'lifestyle')
                    
                    # Determine customer type (take first one if multiple)
                    customer_type = mission['customer_types'][0] if mission.get('customer_types') else 'new'
                    
                    # Chuẩn bị dữ liệu requirements
                    requirements_data = {
                        'action_type': mission['action_type'],
                        'target_value': mission['target_value'],
                        'validation_criteria': mission.get('validation_criteria', {}),
                        'instructions': mission.get('instructions', [])
                    }
                    
                    # Dữ liệu để insert
                    mission_data = (
                        mission_id,
                        mission['title'],
                        mission['description'],
                        db_category,
                        mission['level'],
                        customer_type,
                        mission['reward_amount'],
                        json.dumps(requirements_data),
                        json.dumps(mission.get('prerequisites', [])),
                        json.dumps([]),  # next_missions - empty for now
                        mission.get('icon', '🎯'),
                        mission.get('estimated_time', '5 phút'),
                        True,  # is_active
                        datetime.now(),
                        datetime.now()
                    )
                    
                    cursor.execute(insert_query, mission_data)
                    successful_inserts += 1
                    print(f"✅ Đã thêm mission: {mission['title']}")
                    
                except Exception as e:
                    failed_inserts += 1
                    print(f"❌ Lỗi khi thêm mission {mission_id}: {e}")
            
            conn.commit()
            print(f"\n📊 KẾT QUÁ IMPORT:")
            print(f"   • Thành công: {successful_inserts} missions")
            print(f"   • Thất bại: {failed_inserts} missions")
            
        except Exception as e:
            print(f"❌ Lỗi chung khi import missions: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    def verify_missions_imported(self):
        """Kiểm tra và hiển thị missions đã import"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Đếm tổng số missions
            cursor.execute("SELECT COUNT(*) FROM mission_templates")
            total_missions = cursor.fetchone()[0]
            
            # Đếm theo category
            cursor.execute("""
                SELECT category, COUNT(*) as count 
                FROM mission_templates 
                GROUP BY category 
                ORDER BY count DESC
            """)
            category_counts = cursor.fetchall()
            
            # Lấy một vài mission mẫu
            cursor.execute("""
                SELECT mission_id, title, category, svt_reward 
                FROM mission_templates 
                ORDER BY 
                    CASE category 
                        WHEN 'onboarding' THEN 1
                        WHEN 'lifestyle' THEN 2
                        WHEN 'financial' THEN 3
                        WHEN 'travel' THEN 4
                        WHEN 'social' THEN 5
                        ELSE 6
                    END,
                    svt_reward DESC
                LIMIT 10
            """)
            sample_missions = cursor.fetchall()
            
            print(f"\n📈 THỐNG KÊ MISSIONS TRONG DATABASE:")
            print(f"   • Tổng số missions: {total_missions}")
            print(f"\n📋 PHÂN BỐ THEO CATEGORY:")
            for category, count in category_counts:
                category_emoji = {
                    'onboarding': '🚀',
                    'lifestyle': '🗓️', 
                    'financial': '🏦',
                    'travel': '✈️',
                    'social': '🤝'
                }.get(category, '📝')
                print(f"   {category_emoji} {category.upper()}: {count} missions")
            
            print(f"\n🎯 MỘT SỐ MISSIONS MẪU:")
            for mission_id, title, category, reward in sample_missions:
                print(f"   • {title} ({category}) - {reward} SVT")
                
        except Exception as e:
            print(f"❌ Lỗi khi verify missions: {e}")
        finally:
            cursor.close()
            conn.close()
    
    def create_sample_customer_missions(self, customer_id="2015"):
        """Tạo missions mẫu cho customer test"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        try:
            # Lấy missions phù hợp cho customer mới
            available_missions = self.mission_system.get_missions_for_customer(
                customer_id, CustomerType.NEW.value, []
            )
            
            # Thêm vào bảng customer_missions 
            insert_query = """
            INSERT IGNORE INTO customer_missions 
            (customer_id, mission_id, mission_title, mission_category, 
             mission_level, status, svt_reward, created_at) 
            VALUES (%s, %s, %s, %s, %s, 'available', %s, %s)
            """
            
            assigned_count = 0
            for mission in available_missions[:5]:  # Assign 5 missions đầu tiên
                try:
                    # Map category to database enum
                    category_mapping = {
                        'welcome': 'onboarding',
                        'daily': 'lifestyle', 
                        'financial': 'financial',
                        'travel': 'travel',
                        'social': 'social'
                    }
                    db_category = category_mapping.get(mission['category'], 'lifestyle')
                    
                    cursor.execute(insert_query, (
                        customer_id, 
                        mission['id'], 
                        mission['title'],
                        db_category,
                        mission['level'],
                        mission['reward_amount'],
                        datetime.now()
                    ))
                    assigned_count += 1
                except Exception as e:
                    print(f"❌ Lỗi khi assign mission {mission['id']}: {e}")
            
            conn.commit()
            print(f"✅ Đã assign {assigned_count} missions cho customer {customer_id}")
            
        except Exception as e:
            print(f"❌ Lỗi khi tạo sample customer missions: {e}")
        finally:
            cursor.close()
            conn.close()
    
    def run_full_update(self):
        """Chạy toàn bộ quá trình cập nhật"""
        print("🚀 BẮT ĐẦU CẬP NHẬT HỆ THỐNG MISSION...")
        print("=" * 50)
        
        # Bước 1: Xóa dữ liệu cũ
        print("\n1. Xóa dữ liệu mission cũ...")
        self.clear_existing_missions()
        
        # Bước 2: Thêm missions mới
        print("\n2. Import missions mới...")
        self.insert_new_missions()
        
        # Bước 3: Verify kết quả
        print("\n3. Kiểm tra kết quả...")
        self.verify_missions_imported()
        
        # Bước 4: Tạo sample cho customer test
        print("\n4. Tạo missions mẫu cho customer test...")
        self.create_sample_customer_missions()
        
        print("\n" + "=" * 50)
        print("🎉 HOÀN TẤT CẬP NHẬT HỆ THỐNG MISSION!")

if __name__ == "__main__":
    updater = MissionDatabaseUpdater()
    updater.run_full_update()
