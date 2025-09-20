# models/esg_programs.py
# -*- coding: utf-8 -*-
"""
ESG Programs and Contributions Models
"""

from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, DateTime, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class ESGProgram(Base):
    __tablename__ = 'esg_programs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(Enum('environment', 'social', 'governance'), nullable=False, default='environment')
    target_amount = Column(DECIMAL(15, 2), default=0.00)
    current_amount = Column(DECIMAL(15, 2), default=0.00)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(Enum('active', 'completed', 'cancelled'), nullable=False, default='active')
    image_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    contributions = relationship("ESGContribution", back_populates="program")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'target_amount': float(self.target_amount) if self.target_amount else 0.0,
            'current_amount': float(self.current_amount) if self.current_amount else 0.0,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'image_url': self.image_url,
            'progress_percentage': self.get_progress_percentage(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_progress_percentage(self):
        if not self.target_amount or self.target_amount == 0:
            return 0
        return min(100, (float(self.current_amount or 0) / float(self.target_amount)) * 100)

class ESGContribution(Base):
    __tablename__ = 'esg_contributions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    program_id = Column(Integer, ForeignKey('esg_programs.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    svt_amount = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    transaction_hash = Column(String(255))
    contribution_date = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum('pending', 'completed', 'failed'), nullable=False, default='pending')
    notes = Column(Text)
    
    # Relationship
    program = relationship("ESGProgram", back_populates="contributions")
    
    def to_dict(self):
        return {
            'id': self.id,
            'program_id': self.program_id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'svt_amount': float(self.svt_amount),
            'transaction_hash': self.transaction_hash,
            'contribution_date': self.contribution_date.isoformat() if self.contribution_date else None,
            'status': self.status,
            'notes': self.notes,
            'program': self.program.to_dict() if self.program else None
        }