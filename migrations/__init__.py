# migrations/__init__.py
# -*- coding: utf-8 -*-
"""
Database migration system for One-Sovico
"""

import os
import importlib.util
from models.database import db
from sqlalchemy import text

class MigrationManager:
    """Manages database migrations"""
    
    def __init__(self):
        self.migrations_dir = os.path.dirname(__file__)
        self.migration_table = 'migrations'
        
    def create_migration_table(self):
        """Create migrations tracking table"""
        try:
            with db.engine.connect() as conn:
                conn.execute(text(f'''
                    CREATE TABLE IF NOT EXISTS {self.migration_table} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        migration_name VARCHAR(255) NOT NULL UNIQUE,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
                conn.commit()
        except Exception as e:
            print(f"❌ Failed to create migration table: {e}")
            
    def get_executed_migrations(self):
        """Get list of executed migrations"""
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text(f'SELECT migration_name FROM {self.migration_table}'))
                return [row[0] for row in result.fetchall()]
        except:
            return []
            
    def get_pending_migrations(self):
        """Get list of pending migrations"""
        executed = self.get_executed_migrations()
        all_migrations = []
        
        # Scan migration files
        for filename in sorted(os.listdir(self.migrations_dir)):
            if filename.endswith('.py') and filename != '__init__.py':
                migration_name = filename[:-3]  # Remove .py extension
                if migration_name not in executed:
                    all_migrations.append(migration_name)
                    
        return all_migrations
        
    def run_migration(self, migration_name):
        """Execute a single migration"""
        try:
            # Import migration module
            file_path = os.path.join(self.migrations_dir, f'{migration_name}.py')
            spec = importlib.util.spec_from_file_location(migration_name, file_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Run upgrade function
            if hasattr(module, 'upgrade'):
                success = module.upgrade()
                if success:
                    # Record migration as executed
                    with db.engine.connect() as conn:
                        conn.execute(text(f'''
                            INSERT INTO {self.migration_table} (migration_name) 
                            VALUES ('{migration_name}')
                        '''))
                        conn.commit()
                    print(f"✅ Migration {migration_name} completed")
                    return True
                else:
                    print(f"❌ Migration {migration_name} failed")
                    return False
            else:
                print(f"❌ Migration {migration_name} has no upgrade function")
                return False
                
        except Exception as e:
            print(f"❌ Error running migration {migration_name}: {e}")
            return False
            
    def migrate(self):
        """Run all pending migrations"""
        self.create_migration_table()
        pending = self.get_pending_migrations()
        
        if not pending:
            print("✅ No pending migrations")
            return True
            
        print(f"🔄 Running {len(pending)} pending migrations...")
        success_count = 0
        
        for migration_name in pending:
            if self.run_migration(migration_name):
                success_count += 1
            else:
                print(f"❌ Migration stopped at {migration_name}")
                break
                
        print(f"✅ Completed {success_count}/{len(pending)} migrations")
        return success_count == len(pending)

# Global migration manager instance
migration_manager = MigrationManager()

def run_migrations():
    """Run all pending migrations"""
    return migration_manager.migrate()