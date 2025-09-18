import React from 'react'
import type { Insight } from '../modules/Dashboard'
import ImageIcon from '../components/ImageIcon'

export const AIInsights: React.FC<{ insight: Insight | null }> = ({ insight }) => {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">AI Insight - AI đang nghĩ gì?</h2>
        <span className="badge">Giải thích</span>
      </div>

      {!insight && (
        <div className="text-slate-400 text-sm">Chưa có dữ liệu. Hãy chọn khách hàng để xem phân tích AI.</div>
      )}

      {insight && (
        <div className="space-y-4">
          <div className="card p-3">
            <div className="text-sm text-slate-400">Dự đoán Persona</div>
            <div className="text-xl font-semibold mt-1">{labelPersona(insight.predicted_persona)}</div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {insight.evidence.map((e, i) => (
              <div key={i} className="card p-3">
                <div className="flex items-center gap-2">
                  <ImageIcon name={e.ok ? 'AI.jpg' : 'unnamed.png'} size={20} />
                  <div>
                    <div className="font-medium">{e.label}</div>
                    <div className="text-sm text-slate-400">{e.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function labelPersona(p: string) {
  switch (p) {
    case 'doanh_nhan': return 'DOANH NHÂN'
    case 'gia_dinh': return 'GIA ĐÌNH'
    case 'nguoi_tre': return 'NGƯỜI TRẺ'
    default: return p
  }
}
