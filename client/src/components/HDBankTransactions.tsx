import React, { useEffect, useMemo, useState } from 'react'

type Transaction = {
  id: number
  transaction_id?: string
  transaction_date: string | null
  amount: number
  transaction_type: 'credit' | 'debit' | string
  balance?: number | null
  description?: string | null
  status?: string
}

type Props = {
  customerId: number
}

const formatCurrency = (v: number) => v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

const HDBankTransactions: React.FC<Props> = ({ customerId }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchTx = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`http://127.0.0.1:5000/api/service/hdbank/transactions/${customerId}?limit=200`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Không tải được lịch sử giao dịch')
        }
        setTransactions(data.transactions || [])
      } catch (e: any) {
        setError(e.message || 'Lỗi không xác định')
      } finally {
        setLoading(false)
      }
    }
    if (customerId) fetchTx()
  }, [customerId])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.transaction_type !== typeFilter) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${tx.transaction_id || ''} ${tx.description || ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [transactions, typeFilter, search])

  const totals = useMemo(() => {
    const credit = filtered.filter(t => t.transaction_type === 'credit').reduce((a, b) => a + (b.amount || 0), 0)
    const debit = filtered.filter(t => t.transaction_type === 'debit').reduce((a, b) => a + Math.abs(b.amount || 0), 0)
    return { credit, debit, net: credit - debit }
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">Tất cả</option>
            <option value="credit">Thu (credit)</option>
            <option value="debit">Chi (debit)</option>
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã/ghi chú"
            className="bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-56"
          />
        </div>
        <div className="text-xs md:text-sm text-gray-300 flex gap-4">
          <span>Thu: <b className="text-green-400">{formatCurrency(totals.credit)}</b></span>
          <span>Chi: <b className="text-red-400">{formatCurrency(totals.debit)}</b></span>
          <span>Còn lại: <b className={totals.net >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(totals.net)}</b></span>
        </div>
      </div>

      <div className="bg-[#161B22] border border-gray-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-gray-400 border-b border-gray-700">
          <div>Ngày</div>
          <div>Mã giao dịch</div>
          <div>Loại</div>
          <div className="text-right">Số tiền</div>
          <div className="text-right">Số dư</div>
          <div>Ghi chú</div>
        </div>
        {loading ? (
          <div className="p-6 text-gray-400">Đang tải...</div>
        ) : error ? (
          <div className="p-6 text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-400">Không có giao dịch</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(tx => (
              <div key={tx.id} className="grid grid-cols-6 gap-2 px-4 py-3 text-sm">
                <div className="text-gray-300">{tx.transaction_date ? new Date(tx.transaction_date).toLocaleString('vi-VN') : '-'}</div>
                <div className="text-gray-300 font-mono">{tx.transaction_id || '-'}</div>
                <div className={tx.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                  {tx.transaction_type}
                </div>
                <div className={`text-right ${tx.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(Math.abs(tx.amount || 0))}
                </div>
                <div className="text-right text-gray-300">{tx.balance != null ? formatCurrency(tx.balance || 0) : '-'}</div>
                <div className="text-gray-400 truncate" title={tx.description || ''}>{tx.description || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HDBankTransactions


