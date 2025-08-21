import axios from 'axios'

const TOKEN_KEY = 'auth_token'

export type AuthUser = { 
  email: string; 
  name: string; 
  role: 'admin' | 'customer';
  customer_id?: number;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export async function login(email: string, password: string) {
  const res = await axios.post('/api/auth/login', { email, password })
  setToken(res.data.token)
  return res.data as { token: string; user: AuthUser }
}

export async function register(name: string, email: string, password: string) {
  const res = await axios.post('/api/auth/register', { name, email, password })
  setToken(res.data.token)
  return res.data as { token: string; user: AuthUser }
}

export async function me() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.data as AuthUser
  } catch {
    setToken(null)
    return null
  }
}

// Attach token to all requests when available
axios.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    // Ensure headers is a plain object for assignment
    const headers: Record<string, string> = (config.headers as any) || {}
    headers['Authorization'] = `Bearer ${token}`
    config.headers = headers as any
  }
  return config
})
