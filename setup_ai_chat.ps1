# setup_ai_chat.ps1
# PowerShell script to setup AI Chat Database

Write-Host "🚀 Setting up AI Chat Database..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Python not found"
    }
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed. Please install Python first." -ForegroundColor Red
    exit 1
}

# Check if mysql-connector-python is installed
Write-Host "🔍 Checking mysql-connector-python..." -ForegroundColor Yellow
try {
    python -c "import mysql.connector" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "mysql-connector-python not found"
    }
    Write-Host "✅ mysql-connector-python is available" -ForegroundColor Green
} catch {
    Write-Host "⚠️ mysql-connector-python not found. Installing..." -ForegroundColor Yellow
    pip install mysql-connector-python
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install mysql-connector-python" -ForegroundColor Red
        exit 1
    }
}

# Run the setup script
Write-Host "🔧 Running AI Chat database setup..." -ForegroundColor Yellow
python setup_ai_chat_db.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ AI Chat setup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 What was created:" -ForegroundColor Cyan
    Write-Host "   - ai_chat_history table" -ForegroundColor White
    Write-Host "   - ai_chat_messages table" -ForegroundColor White
    Write-Host "   - ai_service_actions table" -ForegroundColor White
    Write-Host "   - Sample data for testing" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 New API endpoints available:" -ForegroundColor Cyan
    Write-Host "   - GET  /api/chat/history/<customer_id>" -ForegroundColor White
    Write-Host "   - POST /api/chat/save" -ForegroundColor White
    Write-Host "   - DELETE /api/chat/<chat_id>" -ForegroundColor White
    Write-Host "   - GET  /api/chat/<chat_id>/actions" -ForegroundColor White
    Write-Host "   - POST /api/chat/actions/save" -ForegroundColor White
    Write-Host "   - GET  /api/chat/stats/<customer_id>" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 Please restart your Flask application to load the new routes." -ForegroundColor Yellow
} else {
    Write-Host "❌ Setup failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}