import React, { useState } from 'react'
import { login as apiLogin, register as apiRegister, AuthUser } from '../services/auth'
import ImageIcon from '../components/ImageIcon'

type Props = {
  onSuccess(user: AuthUser): void
}

export const AuthPanel: React.FC<Props> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        const res = await apiLogin(email, password)
        onSuccess(res.user)
      } else {
        const res = await apiRegister(name, email, password)
        onSuccess(res.user)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Đã có lỗi, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      setEmail('admin@hdbank.com.vn')
      setPassword('123456')
      setName('Chuyên viên HDBank')
    } else {
      setEmail('khachhang@gmail.com')
      setPassword('123456')
      setName('Khách hàng Demo')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0D1117]">
      <div className="w-full max-w-md bg-[#161B22] border border-gray-700 rounded-lg p-6">
        <div className="text-center mb-6">
          {/* Replaced emoji with image */}
          <div className="mb-2 flex justify-center">
            <ImageIcon name="hdbank.jpg" size={40} rounded={10} alt="One-Sovico" />
          </div>
          <h1 className="text-2xl font-bold text-white">One-Sovico Platform</h1>
          <p className="text-gray-400 text-sm">Hệ sinh thái tài chính thông minh</p>
        </div>

        <div className="flex mb-4 border-b border-gray-700">
          <button
            className={`flex-1 py-2 text-sm ${mode === 'login' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setMode('login')}
          >
            Đăng nhập
          </button>
          <button
            className={`flex-1 py-2 text-sm ${mode === 'register' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setMode('register')}
          >
            Đăng ký
          </button>
        </div>

        {/* Demo Accounts */}
        <div className="mb-4 p-3 bg-[#0D1117] rounded-lg border border-gray-600">
          <p className="text-xs text-gray-400 mb-2">Demo nhanh:</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => fillDemo('admin')}
              className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs py-2 px-3 rounded flex items-center justify-center gap-2"
            >
              <ImageIcon name="hdbank.jpg" size={16} /> <span>Chuyên viên</span>
            </button>
            <button 
              onClick={() => fillDemo('customer')}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 text-xs py-2 px-3 rounded flex items-center justify-center gap-2"
            >
              <ImageIcon name="Vietjet.jpg" size={16} /> <span>Khách hàng</span>
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Họ và tên"
              className="w-full bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            className="w-full bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {error && <div className="text-sm text-red-400 p-2 bg-red-900/20 rounded">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p className="mb-1"><strong>Gợi ý:</strong></p>
          <p>• Email @hdbank.com hoặc @sovico.vn → Dashboard nội bộ</p>
          <p>• Email khác → Ứng dụng khách hàng</p>
        </div>
      </div>
    </div>
  )
}
