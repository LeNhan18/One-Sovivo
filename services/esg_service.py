# services/esg_service.py
# -*- coding: utf-8 -*-
"""
ESG Service - Business logic for ESG programs and contributions
"""

from sqlalchemy import text
from models.database import get_db_connection
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ESGService:
    @staticmethod
    def get_all_programs(status=None, category=None):
        """Get all ESG programs with optional filtering"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM esg_programs WHERE 1=1"
            params = []
            
            if status:
                query += " AND status = %s"
                params.append(status)
                
            if category:
                query += " AND category = %s"
                params.append(category)
                
            query += " ORDER BY created_at DESC"
            
            cursor.execute(query, params)
            programs = cursor.fetchall()
            
            # Convert decimal fields to float
            for program in programs:
                if program['target_amount']:
                    program['target_amount'] = float(program['target_amount'])
                if program['current_amount']:
                    program['current_amount'] = float(program['current_amount'])
                    
                # Calculate progress percentage
                if program['target_amount'] and program['target_amount'] > 0:
                    program['progress_percentage'] = min(100, (program['current_amount'] / program['target_amount']) * 100)
                else:
                    program['progress_percentage'] = 0
            
            cursor.close()
            conn.close()
            return programs
            
        except Exception as e:
            logger.error(f"Error getting ESG programs: {e}")
            return []

    @staticmethod
    def get_program_by_id(program_id):
        """Get specific ESG program by ID"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM esg_programs WHERE id = %s", (program_id,))
            program = cursor.fetchone()
            
            if program:
                # Convert decimal fields
                if program['target_amount']:
                    program['target_amount'] = float(program['target_amount'])
                if program['current_amount']:
                    program['current_amount'] = float(program['current_amount'])
                    
                # Calculate progress
                if program['target_amount'] and program['target_amount'] > 0:
                    program['progress_percentage'] = min(100, (program['current_amount'] / program['target_amount']) * 100)
                else:
                    program['progress_percentage'] = 0
            
            cursor.close()
            conn.close()
            return program
            
        except Exception as e:
            logger.error(f"Error getting ESG program {program_id}: {e}")
            return None

    @staticmethod
    def create_contribution(program_id, user_id, amount, svt_amount=0):
        """Create a new ESG contribution"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Insert contribution
            cursor.execute("""
                INSERT INTO esg_contributions 
                (program_id, user_id, amount, svt_amount, status, contribution_date)
                VALUES (%s, %s, %s, %s, 'completed', NOW())
            """, (program_id, user_id, amount, svt_amount))
            
            contribution_id = cursor.lastrowid
            
            # Update program current amount
            cursor.execute("""
                UPDATE esg_programs 
                SET current_amount = current_amount + %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (amount, program_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return contribution_id
            
        except Exception as e:
            logger.error(f"Error creating ESG contribution: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return None

    @staticmethod
    def get_user_contributions(user_id, limit=10):
        """Get user's ESG contributions"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT c.*, p.name as program_name, p.category as program_category
                FROM esg_contributions c
                JOIN esg_programs p ON c.program_id = p.id
                WHERE c.user_id = %s
                ORDER BY c.contribution_date DESC
                LIMIT %s
            """, (user_id, limit))
            
            contributions = cursor.fetchall()
            
            # Convert decimal fields
            for contrib in contributions:
                contrib['amount'] = float(contrib['amount'])
                contrib['svt_amount'] = float(contrib['svt_amount'])
            
            cursor.close()
            conn.close()
            return contributions
            
        except Exception as e:
            logger.error(f"Error getting user contributions: {e}")
            return []

    @staticmethod
    def get_program_contributions(program_id, limit=20):
        """Get contributions for a specific program"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT c.*, u.username
                FROM esg_contributions c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.program_id = %s
                ORDER BY c.contribution_date DESC
                LIMIT %s
            """, (program_id, limit))
            
            contributions = cursor.fetchall()
            
            # Convert decimal fields
            for contrib in contributions:
                contrib['amount'] = float(contrib['amount'])
                contrib['svt_amount'] = float(contrib['svt_amount'])
            
            cursor.close()
            conn.close()
            return contributions
            
        except Exception as e:
            logger.error(f"Error getting program contributions: {e}")
            return []

    @staticmethod
    def get_esg_stats():
        """Get overall ESG statistics"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Total programs by category
            cursor.execute("""
                SELECT 
                    category,
                    COUNT(*) as program_count,
                    SUM(target_amount) as total_target,
                    SUM(current_amount) as total_raised
                FROM esg_programs 
                WHERE status = 'active'
                GROUP BY category
            """)
            category_stats = cursor.fetchall()
            
            # Overall stats
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT p.id) as total_programs,
                    COUNT(DISTINCT c.user_id) as total_contributors,
                    SUM(c.amount) as total_contributions,
                    SUM(c.svt_amount) as total_svt_distributed
                FROM esg_programs p
                LEFT JOIN esg_contributions c ON p.id = c.program_id
                WHERE p.status = 'active'
            """)
            overall_stats = cursor.fetchone()
            
            # Convert decimal fields
            for stat in category_stats:
                stat['total_target'] = float(stat['total_target'] or 0)
                stat['total_raised'] = float(stat['total_raised'] or 0)
            
            if overall_stats:
                overall_stats['total_contributions'] = float(overall_stats['total_contributions'] or 0)
                overall_stats['total_svt_distributed'] = float(overall_stats['total_svt_distributed'] or 0)
            
            cursor.close()
            conn.close()
            
            return {
                'category_stats': category_stats,
                'overall_stats': overall_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting ESG stats: {e}")
            return {
                'category_stats': [],
                'overall_stats': {}
            }