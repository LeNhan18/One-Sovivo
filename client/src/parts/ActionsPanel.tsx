import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Insight } from '../modules/Dashboard'

export const ActionsPanel: React.FC<{ insight: Insight | null, customerId?: number }> = ({ insight, customerId }) => {
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const phoneRef = useRef<HTMLDivElement>(null)

  const actions = insight?.recommendations ?? []

  function sendPush(title: string, message: string) {
    setToast({ title, message })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Hành động đề xuất</h2>
          <span className="badge">Next Best Actions</span>
        </div>
        {actions.length === 0 && (
          <div className="text-slate-400 text-sm">Chưa có đề xuất. Hãy chọn khách hàng.</div>
        )}
        <div className="grid gap-2">
          {actions.slice(0, 2).map(a => (
            <button key={a.offer_code} className="btn" onClick={() => sendPush(a.title, a.description)}>
              {a.title}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Mô phỏng trải nghiệm khách hàng</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-56 h-[380px] rounded-[36px] border-4 border-slate-700 bg-slate-900 overflow-hidden" ref={phoneRef}>
            <div className="h-6 bg-slate-800 border-b border-slate-700 flex items-center justify-center text-xs text-slate-400">Điện thoại</div>
            <div className="p-3 text-slate-400 text-sm">
              {customerId ? (
                <>
                  <div>Đang xem trải nghiệm của khách hàng <b>#{customerId}</b>.</div>
                  <div className="mt-1">Nhấn nút đề xuất để gửi push notification.</div>
                </>
              ) : (
                <div>Chưa chọn khách hàng.</div>
              )}
            </div>

            {toast && (
              <div className="absolute left-3 right-3 top-10 animate-slidein">
                <div className="rounded-xl bg-slate-800 border border-slate-700 p-3 shadow-lg">
                  <div className="font-medium">{toast.title}</div>
                  <div className="text-sm text-slate-400">{toast.message}</div>
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes slidein { from { transform: translateY(-20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
            .animate-slidein { animation: slidein .35s ease-out }
          `}</style>
        </div>
      </div>
    </div>
  )
}
