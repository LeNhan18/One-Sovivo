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
      {/* Top Navigation */}
      <div className="bg-[#161B22] border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-white font-bold text-lg">
            {selectedApp === 'dashboard' ? '🧠 AI Insight Dashboard' : '📱 One-Sovico Super App'}
          </div>
          
          {/* App Switcher for Admin */}
          {user.role === 'admin' && (
            <div className="flex bg-[#0D1117] rounded-lg p-1">
              <button
                onClick={() => setSelectedApp('dashboard')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedApp === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setSelectedApp('superapp')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedApp === 'superapp' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Super App
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-gray-300">
            <span className="text-xs text-gray-500">{user.role === 'admin' ? 'Chuyên viên' : 'Khách hàng'}</span>
            <div className="font-semibold">{user.name}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      {selectedApp === 'dashboard' ? <Dashboard /> : <SuperApp user={user} />}
    </div>
  )
}
