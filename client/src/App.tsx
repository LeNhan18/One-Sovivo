import React, { useEffect, useState } from 'react'
import { Dashboard } from './modules/Dashboard'
import { SuperApp } from './modules/SuperApp'
import { AuthPanel } from './parts/AuthPanel'
import { me, setToken, AuthUser } from './services/auth'

export type UserRole = 'admin' | 'customer'

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [selectedApp, setSelectedApp] = useState<'dashboard' | 'superapp'>('dashboard')

  useEffect(() => {
    me().then((u) => {
      if (u) {
        setUser(u) // Backend đã trả về role, không cần xử lý thêm
        setSelectedApp(u.role === 'admin' ? 'dashboard' : 'superapp')
      }
    }).finally(() => setChecking(false))
  }, [])

  const handleLogout = () => {
    setToken(null)
    setUser(null)
  }

  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser)
    setSelectedApp(authUser.role === 'admin' ? 'dashboard' : 'superapp')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthPanel onSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Enhanced Top Navigation - Chỉ hiển thị khi không phải Welcome Screen */}
      {!(selectedApp === 'superapp' && user.role === 'customer') && (
        <div className="relative z-[10000] bg-gradient-to-r from-blue-900 to-slate-800 border-b border-blue-500/30 p-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center space-x-6">
            <div className="text-white font-bold text-xl">
              {selectedApp === 'dashboard' ? ' AI Insight Dashboard' : ' One-Sovico Super App'}
            </div>
            
            {/* App Switcher for Admin */}
            {user.role === 'admin' && (
              <div className="flex bg-[#0D1117]/50 backdrop-blur rounded-lg p-1 border border-blue-500/30">
                <button
                  onClick={() => setSelectedApp('dashboard')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    selectedApp === 'dashboard' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-blue-700/50'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setSelectedApp('superapp')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    selectedApp === 'superapp' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-blue-700/50'
                  }`}
                >
                  📱 Super App
                </button>
              </div>
            )}

            {/* Customer navigation - show dashboard option */}
            {user.role === 'customer' && selectedApp === 'superapp' && (
              <button
                onClick={() => setSelectedApp('dashboard')}
                className="flex items-center space-x-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-200 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <span>📊</span>
                <span>Quay về Dashboard</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-xs text-blue-300 font-medium">
                {user.role === 'admin' ? '👨‍💼 Chuyên viên' : '👤 Khách hàng'}
              </div>
              <div className="font-bold text-white">{user.name}</div>
            </div>
            <button
              onClick={handleLogout}
              className="group bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="group-hover:rotate-12 transition-transform">🚪</span>
                <span>Đăng xuất</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedApp === 'dashboard' ? <Dashboard /> : <SuperApp user={user} onLogout={handleLogout} onDashboard={() => setSelectedApp('dashboard')} />}
    </div>
  )
}
