#!/bin/bash
# setup_ai_chat.sh
# Script to setup AI Chat Database

echo "🚀 Setting up AI Chat Database..."
echo "=================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if mysql-connector-python is installed
python3 -c "import mysql.connector" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ mysql-connector-python not found. Installing..."
    pip install mysql-connector-python
fi

# Run the setup script
echo "🔧 Running AI Chat database setup..."
python3 setup_ai_chat_db.py

echo "✅ AI Chat setup completed!"
echo ""
echo "📋 What was created:"
echo "   - ai_chat_history table"
echo "   - ai_chat_messages table" 
echo "   - ai_service_actions table"
echo "   - Sample data for testing"
echo ""
echo "🔗 New API endpoints available:"
echo "   - GET  /api/chat/history/<customer_id>"
echo "   - POST /api/chat/save"
echo "   - DELETE /api/chat/<chat_id>"
echo "   - GET  /api/chat/<chat_id>/actions"
echo "   - POST /api/chat/actions/save"
echo "   - GET  /api/chat/stats/<customer_id>"