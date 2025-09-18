import React, { useEffect, useState } from 'react'
import axios from 'axios'

type Props = {
  onPickCustomer: (id: number) => void
}

type SuggestItem = { customer_id: number; name: string; reason: string }

type SearchItem = { customer_id: number; name: string }

export const SearchPanel: React.FC<Props> = ({ onPickCustomer }) => {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [suggests, setSuggests] = useState<SuggestItem[]>([])

  useEffect(() => {
    axios.get('/api/customers/suggestions').then(res => setSuggests(res.data))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q) return setResults([])
      axios.get('/api/customers/search', { params: { q } }).then(res => setResults(res.data))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-3">Bảng điều khiển & Tìm kiếm</h2>
      <div className="relative">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Nhập customer_id hoặc tên khách hàng..."
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-slate-900/95 border border-slate-700 rounded-lg max-h-80 overflow-auto">
            {results.map(r => (
              <button key={r.customer_id} onClick={() => onPickCustomer(r.customer_id)} className="block w-full text-left px-4 py-2 hover:bg-slate-800">
                <span className="font-medium">#{r.customer_id}</span> - {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Khách hàng tiềm năng</h3>
          <span className="badge">AI gợi ý</span>
        </div>
        <div className="space-y-2">
          {suggests.map(s => (
            <button key={s.customer_id} onClick={() => onPickCustomer(s.customer_id)} className="w-full card p-3 hover:bg-slate-800/80 transition text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-slate-400">#{s.customer_id} • {s.reason}</div>
                </div>
                <span className="badge">Đáng chú ý</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
