import React, { useEffect, useState } from 'react'
import { Dashboard } from './modules/Dashboard'
import { AuthPanel } from './parts/AuthPanel'
import { me, setToken } from './services/auth'

export const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    me().then((u) => setUser(u)).finally(() => setChecking(false))
  }, [])

  if (checking) return null

  if (!user) {
    return <AuthPanel onSuccess={(u) => setUser(u)} />
  }

  return (
    <div>
      <div className="p-3 flex justify-between items-center bg-[#0D1117] text-gray-200">
        <div>
          Xin chào, <span className="font-semibold">{user.name}</span>
        </div>
        <button
          onClick={() => {
            setToken(null)
            setUser(null)
          }}
          className="text-sm bg-gray-700 hover:bg-red-600 px-3 py-1 rounded-md"
        >
          Đăng xuất
        </button>
      </div>
      <Dashboard />
    </div>
  )
}
