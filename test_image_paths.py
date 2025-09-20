#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test image paths and availability
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

def test_image_paths():
    """Test image paths and file existence"""
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:nhan1811@localhost/one_sovico'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Get ESG programs with image paths
                query = text("SELECT id, name, image_url FROM esg_programs LIMIT 5")
                result = conn.execute(query)
                programs = [dict(row._mapping) for row in result]
                
                logger.info("ESG Programs and their image paths:")
                for program in programs:
                    logger.info(f"  Program: {program['name']}")
                    logger.info(f"  Image URL: {program['image_url']}")
                    
                    # Check if file exists
                    if program['image_url']:
                        # Remove leading slash and convert to local path
                        local_path = program['image_url'].lstrip('/')
                        full_path = os.path.join(os.getcwd(), local_path)
                        
                        if os.path.exists(full_path):
                            logger.info(f"  ✅ File exists: {full_path}")
                        else:
                            logger.error(f"  ❌ File NOT found: {full_path}")
                            
                            # Try alternative paths
                            alt_path = program['image_url'].replace('/static/', 'static/')
                            alt_full_path = os.path.join(os.getcwd(), alt_path)
                            if os.path.exists(alt_full_path):
                                logger.info(f"  ✅ Alternative path exists: {alt_full_path}")
                            else:
                                logger.error(f"  ❌ Alternative path also NOT found: {alt_full_path}")
                    
                    logger.info("  ---")
                
                # Check static directory structure
                static_dir = os.path.join(os.getcwd(), 'static')
                logger.info(f"\nChecking static directory: {static_dir}")
                
                if os.path.exists(static_dir):
                    logger.info("✅ Static directory exists")
                    
                    # Check images/esg directory
                    esg_dir = os.path.join(static_dir, 'images', 'esg')
                    if os.path.exists(esg_dir):
                        logger.info("✅ ESG images directory exists")
                        
                        # List first few files
                        files = os.listdir(esg_dir)[:5]
                        logger.info("Sample files in ESG directory:")
                        for file in files:
                            logger.info(f"  - {file}")
                    else:
                        logger.error("❌ ESG images directory NOT found")
                        
                        # Check what's in static/images
                        images_dir = os.path.join(static_dir, 'images')
                        if os.path.exists(images_dir):
                            subdirs = [d for d in os.listdir(images_dir) if os.path.isdir(os.path.join(images_dir, d))]
                            logger.info(f"Subdirectories in static/images: {subdirs}")
                        
                else:
                    logger.error("❌ Static directory NOT found")
                
        except Exception as e:
            logger.error(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_image_paths()