#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix image paths in database
"""

import sys
sys.path.append('.')

from models.database import db
from flask import Flask
import logging
from sqlalchemy import text
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_image_paths():
    """Fix image paths in database to match actual file structure"""
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:nhan1811@localhost/one_sovico'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Map of correct image files (from attachment)
                image_mapping = {
                    'vietnam-forest.jpg': '/static/images/esg/vietnam-forest.jpg',
                    'mekong-river.jpg': '/static/images/esg/mekong-river.jpg', 
                    'solar-rural.jpg': '/static/images/esg/solar-rural.jpg',
                    'scholarship.jpg': '/static/images/esg/scholarship.jpg',
                    'healthcare.jpg': '/static/images/esg/healthcare.jpg',
                    'digital-elderly.jpg': '/static/images/esg/digital-elderly.jpg',
                    'transparency.jpg': '/static/images/esg/transparency.jpg',
                    'business-ethics.jpg': '/static/images/esg/business-ethics.jpg',
                    'worker-rights.jpg': '/static/images/esg/worker-rights.jpg',
                    'clean-water-complete.jpg': '/static/images/esg/clean-water-complete.jpg'
                }
                
                # Get all programs
                query = text("SELECT id, name, image_url FROM esg_programs")
                result = conn.execute(query)
                programs = [dict(row._mapping) for row in result]
                
                logger.info("Fixing image paths...")
                
                for program in programs:
                    if program['image_url']:
                        # Extract filename from current path
                        current_path = program['image_url']
                        filename = os.path.basename(current_path)
                        
                        # Check if we have a mapping for this file
                        if filename in image_mapping:
                            new_path = image_mapping[filename]
                            
                            # Update database
                            update_query = text("""
                                UPDATE esg_programs 
                                SET image_url = :new_path 
                                WHERE id = :program_id
                            """)
                            
                            conn.execute(update_query, {
                                'new_path': new_path,
                                'program_id': program['id']
                            })
                            
                            logger.info(f"✅ Updated {program['name']}")
                            logger.info(f"   Old: {current_path}")
                            logger.info(f"   New: {new_path}")
                        else:
                            logger.warning(f"⚠️ No mapping found for {filename} in program {program['name']}")
                
                # Commit changes
                conn.commit()
                logger.info("✅ Database updated successfully!")
                
                # Verify changes
                logger.info("\nVerifying updated paths:")
                verify_query = text("SELECT id, name, image_url FROM esg_programs")
                result = conn.execute(verify_query)
                programs = [dict(row._mapping) for row in result]
                
                for program in programs:
                    if program['image_url']:
                        # Check if file exists now
                        local_path = program['image_url'].lstrip('/')
                        full_path = os.path.join(os.getcwd(), local_path)
                        
                        if os.path.exists(full_path):
                            logger.info(f"✅ {program['name']}: {program['image_url']}")
                        else:
                            logger.error(f"❌ {program['name']}: {program['image_url']} - FILE NOT FOUND")
                
        except Exception as e:
            logger.error(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_image_paths()
