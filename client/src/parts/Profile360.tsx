import React from 'react'
import type { Profile360Data } from '../modules/Dashboard'
import ImageIcon from '../components/ImageIcon'

export const Profile360: React.FC<{ profile: Profile360Data | null, loading: boolean }> = ({ profile, loading }) => {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Hồ sơ 360°</h2>
        <span className="badge">Tổng hợp đa nguồn</span>
      </div>

      {!profile && !loading && (
        <div className="text-slate-400 text-sm">Chọn một khách hàng để xem thông tin.</div>
      )}
      {loading && (
        <div className="text-slate-400 text-sm animate-pulse">Đang tải dữ liệu...</div>
      )}

      {profile && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3">
              <div className="text-sm text-slate-400">Tên</div>
              <div className="font-medium">{profile.basic_info?.name || 'N/A'}</div>
            </div>
            <div className="card p-3">
              <div className="text-sm text-slate-400">Tuổi</div>
              <div className="font-medium">{profile.basic_info?.age || 'N/A'}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">HDBank</div>
                <span className="badge">Tài chính</span>
              </div>
              <div className="mt-2 text-sm grid gap-1">
                <div>Số dư TB: <b>{formatVND(profile.hdbank_summary?.average_balance || 0)}</b></div>
                <div>Chi tiêu 3m: <b>{formatVND(profile.hdbank_summary?.total_debit_last_3m || 0)}</b></div>
              </div>
            </div>

            <div className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium flex items-center gap-2">Vietjet <ImageIcon name="Vietjet.jpg" size={16} rounded={4} /></div>
                <span className="badge">Hàng không</span>
              </div>
              <div className="mt-2 text-sm grid gap-1">
                <div>Chuyến bay/năm: <b>{profile.vietjet_summary?.total_flights_last_year ?? 0}</b></div>
                <div>Tuyến ưa thích: <b>{profile.vietjet_summary?.favorite_route || 'N/A'}</b></div>
                <div>Hạng: <b>{profile.vietjet_summary?.is_business_flyer ? 'Thương gia' : 'Phổ thông'}</b></div>
              </div>
            </div>

            <div className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">HD Saison</div>
                <span className="badge">Tín dụng</span>
              </div>
              <div className="mt-2 text-sm grid gap-1">
                <div>Có khoản vay: <b>{profile.hdsaison_summary?.has_active_loan ? 'Có' : 'Không'}</b></div>
                <div>Tổng vay: <b>{formatVND(profile.hdsaison_summary?.total_loan_amount || 0)}</b></div>
                <div>Sản phẩm nổi bật: <b>{profile.hdsaison_summary?.most_frequent_product || 'N/A'}</b></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatVND(n?: number) {
  const v = n ?? 0
  return v.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
}
