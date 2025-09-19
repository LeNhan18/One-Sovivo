# services/esg_service_fixed.py
# -*- coding: utf-8 -*-
"""
ESG Service - Business logic for ESG programs and contributions (Fixed version)
"""

from sqlalchemy import text
from models.database import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ESGService:
    @staticmethod
    def get_all_programs(status=None, category=None):
        """Get all ESG programs with optional filtering"""
        try:
            with db.engine.connect() as conn:
                query = text("SELECT * FROM esg_programs WHERE 1=1" + 
                           (" AND status = :status" if status else "") +
                           (" AND category = :category" if category else "") +
                           " ORDER BY created_at DESC")
                
                params = {}
                if status:
                    params['status'] = status
                if category:
                    params['category'] = category
                
                result = conn.execute(query, params)
                programs = [dict(row._mapping) for row in result]
                
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
                
                return programs
                
        except Exception as e:
            logger.error(f"Error getting ESG programs: {e}")
            return []

    @staticmethod
    def get_program_by_id(program_id):
        """Get specific ESG program by ID"""
        try:
            with db.engine.connect() as conn:
                query = text("SELECT * FROM esg_programs WHERE id = :program_id")
                result = conn.execute(query, {'program_id': program_id})
                program = result.fetchone()
                
                if program:
                    program_dict = dict(program._mapping)
                    if program_dict['target_amount']:
                        program_dict['target_amount'] = float(program_dict['target_amount'])
                    if program_dict['current_amount']:
                        program_dict['current_amount'] = float(program_dict['current_amount'])
                        
                    # Calculate progress percentage
                    if program_dict['target_amount'] and program_dict['target_amount'] > 0:
                        program_dict['progress_percentage'] = min(100, (program_dict['current_amount'] / program_dict['target_amount']) * 100)
                    else:
                        program_dict['progress_percentage'] = 0
                        
                    return program_dict
                    
                return None
                
        except Exception as e:
            logger.error(f"Error getting ESG program by ID: {e}")
            return None

    @staticmethod
    def get_user_contributions(user_id, limit=10):
        """Get user's ESG contributions"""
        try:
            with db.engine.connect() as conn:
                query = text("""
                    SELECT c.*, p.name as program_name, p.category as program_category
                    FROM esg_contributions c
                    JOIN esg_programs p ON c.program_id = p.id
                    WHERE c.user_id = :user_id
                    ORDER BY c.contribution_date DESC
                    LIMIT :limit
                """)
                
                result = conn.execute(query, {'user_id': user_id, 'limit': limit})
                contributions = [dict(row._mapping) for row in result]
                
                # Convert decimal fields to float
                for contribution in contributions:
                    if contribution['amount']:
                        contribution['amount'] = float(contribution['amount'])
                    if contribution['svt_amount']:
                        contribution['svt_amount'] = float(contribution['svt_amount'])
                
                return contributions
                
        except Exception as e:
            logger.error(f"Error getting user contributions: {e}")
            return []

    @staticmethod
    def get_esg_stats():
        """Get ESG statistics"""
        try:
            with db.engine.connect() as conn:
                # Get category statistics
                category_query = text("""
                    SELECT 
                        category,
                        COUNT(*) as program_count,
                        SUM(target_amount) as total_target,
                        SUM(current_amount) as total_raised
                    FROM esg_programs 
                    WHERE status = 'active'
                    GROUP BY category
                """)
                
                category_result = conn.execute(category_query)
                category_stats = []
                for row in category_result:
                    row_dict = dict(row._mapping)
                    row_dict['total_target'] = float(row_dict['total_target'] or 0)
                    row_dict['total_raised'] = float(row_dict['total_raised'] or 0)
                    category_stats.append(row_dict)
                
                # Get overall statistics
                overall_query = text("""
                    SELECT 
                        COUNT(DISTINCT p.id) as total_programs,
                        COUNT(DISTINCT c.user_id) as total_contributors,
                        COUNT(c.id) as total_contributions,
                        SUM(c.svt_amount) as total_svt_distributed
                    FROM esg_programs p
                    LEFT JOIN esg_contributions c ON p.id = c.program_id
                    WHERE p.status = 'active'
                """)
                
                overall_result = conn.execute(overall_query)
                overall_row = overall_result.fetchone()
                overall_stats = dict(overall_row._mapping) if overall_row else {}
                
                # Convert to proper types
                for key in overall_stats:
                    if overall_stats[key] is None:
                        overall_stats[key] = 0
                    elif key == 'total_svt_distributed':
                        overall_stats[key] = float(overall_stats[key])
                
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

    @staticmethod
    def create_contribution(program_id, user_id, amount, svt_amount=0):
        """Create a new ESG contribution"""
        try:
            import uuid
            import hashlib
            from services.token_service import TokenService
            
            with db.engine.connect() as conn:
                # Generate transaction hash (blockchain simulation)
                transaction_data = f"{program_id}_{user_id}_{amount}_{svt_amount}_{datetime.now().isoformat()}"
                transaction_hash = hashlib.sha256(transaction_data.encode()).hexdigest()
                
                # Insert contribution
                insert_query = text("""
                    INSERT INTO esg_contributions 
                    (program_id, user_id, amount, svt_amount, transaction_hash, contribution_date, status, notes)
                    VALUES (:program_id, :user_id, :amount, :svt_amount, :transaction_hash, NOW(), 'completed', 'Đóng góp qua platform')
                """)
                
                result = conn.execute(insert_query, {
                    'program_id': program_id,
                    'user_id': user_id,
                    'amount': amount,
                    'svt_amount': svt_amount,
                    'transaction_hash': transaction_hash
                })
                
                contribution_id = result.lastrowid
                
                # Update program current_amount
                update_query = text("""
                    UPDATE esg_programs 
                    SET current_amount = current_amount + :amount 
                    WHERE id = :program_id
                """)
                
                conn.execute(update_query, {
                    'amount': amount,
                    'program_id': program_id
                })
                
                # Record SVT token transaction to blockchain if svt_amount > 0
                if svt_amount > 0:
                    try:
                        # Get user's customer info for token transaction
                        user_query = text("""
                            SELECT u.customer_id as user_customer_id, c.customer_id as customer_number 
                            FROM users u 
                            JOIN customers c ON u.customer_id = c.id 
                            WHERE u.id = :user_id
                        """)
                        user_result = conn.execute(user_query, {'user_id': user_id})
                        user_row = user_result.fetchone()
                        
                        if user_row and user_row._mapping['customer_number']:
                            customer_number = user_row._mapping['customer_number']
                            
                            # Record token transaction to blockchain (using customers.customer_id)
                            insert_token_tx = text("""
                                INSERT INTO token_transactions 
                                (tx_hash, customer_id, transaction_type, amount, description, created_at)
                                VALUES (:tx_hash, :customer_id, :transaction_type, :amount, :description, NOW())
                            """)
                            
                            conn.execute(insert_token_tx, {
                                'tx_hash': f"esg_{transaction_hash[:16]}",
                                'customer_id': customer_number,  # Use customers.customer_id 
                                'transaction_type': 'esg_contribution_reward',
                                'amount': svt_amount,
                                'description': f'ESG contribution reward - Program {program_id} - {amount} VND'
                            })
                            
                            logger.info(f"Recorded {svt_amount} SVT blockchain transaction for customer {customer_number} - ESG contribution {contribution_id}")
                        else:
                            logger.warning(f"User {user_id} has no valid customer relationship for token transaction")
                        
                    except Exception as token_error:
                        logger.error(f"Error recording SVT token transaction: {token_error}")
                        # Continue even if token transaction fails
                
                # Commit all changes together
                conn.commit()
                
                logger.info(f"Created ESG contribution {contribution_id} with transaction hash: {transaction_hash}")
                return contribution_id
                
        except Exception as e:
            logger.error(f"Error creating ESG contribution: {e}")
            return None

    @staticmethod
    def get_categories():
        """Get all ESG categories"""
        return [
            {'value': 'environment', 'label': 'Môi trường'},
            {'value': 'social', 'label': 'Xã hội'},
            {'value': 'governance', 'label': 'Quản trị'}
        ]

    @staticmethod
    def get_user_impact_report(user_id):
        """Get user's ESG impact report"""
        try:
            with db.engine.connect() as conn:
                query = text("""
                    SELECT 
                        p.category,
                        COUNT(c.id) as contribution_count,
                        SUM(c.amount) as total_contributed,
                        SUM(c.svt_amount) as total_svt_used
                    FROM esg_contributions c
                    JOIN esg_programs p ON c.program_id = p.id
                    WHERE c.user_id = :user_id AND c.status = 'completed'
                    GROUP BY p.category
                """)
                
                result = conn.execute(query, {'user_id': user_id})
                impact_data = []
                
                for row in result:
                    row_dict = dict(row._mapping)
                    row_dict['total_contributed'] = float(row_dict['total_contributed'] or 0)
                    row_dict['total_svt_used'] = float(row_dict['total_svt_used'] or 0)
                    impact_data.append(row_dict)
                
                return {
                    'impact_by_category': impact_data,
                    'total_impact': {
                        'contributions': sum(item['contribution_count'] for item in impact_data),
                        'amount': sum(item['total_contributed'] for item in impact_data),
                        'svt_used': sum(item['total_svt_used'] for item in impact_data)
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting user impact report: {e}")
            return {
                'impact_by_category': [],
                'total_impact': {'contributions': 0, 'amount': 0, 'svt_used': 0}
            }