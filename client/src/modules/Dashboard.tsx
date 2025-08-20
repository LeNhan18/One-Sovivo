import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { SearchPanel } from '../parts/SearchPanel'
import { Profile360 } from '../parts/Profile360'
import { AIInsights } from '../parts/AIInsights'
import { ActionsPanel } from '../parts/ActionsPanel'
import { ModelMetrics } from '../parts/ModelMetrics'
import BlockchainDashboard from '../components/BlockchainDashboard'

export type CustomerBasic = {
  customer_id: number
  name: string
  age: number
}

export type Profile360Data = {
  basic_info: CustomerBasic
  hdbank_summary: {
    total_transactions?: number
    average_balance?: number
    total_credit_last_3m?: number
    total_debit_last_3m?: number
  }
  vietjet_summary: {
    total_flights_last_year?: number
    total_spending?: number
    is_business_flyer?: boolean
    favorite_route?: string
  }
  hdsaison_summary: {
    has_active_loan?: boolean
    total_loan_amount?: number
    most_frequent_product?: string
  }
}

export type Insight = {
  predicted_persona: string
  evidence: { label: string; value: string; ok: boolean }[]
  recommendations: { offer_code: string; title: string; description: string }[]
}

export const Dashboard: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [profile, setProfile] = useState<Profile360Data | null>(null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [activeTab, setActiveTab] = useState<'analysis' | 'blockchain'>('analysis')

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      axios.get(`/api/customer/${selectedId}`),
      axios.get(`/api/customer/${selectedId}/insights`)
    ])
      .then(([pRes, iRes]) => {
        setProfile(pRes.data)
        setInsight(iRes.data)
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        // For demo, use mock data if API fails
        setProfile({
          basic_info: { customer_id: selectedId, name: 'Demo Customer', age: 35 },
          hdbank_summary: { average_balance: 5000000, total_transactions: 50 },
          vietjet_summary: { total_flights_last_year: 12, is_business_flyer: true },
          hdsaison_summary: { has_active_loan: false }
        })
        setInsight({
          predicted_persona: 'doanh_nhan',
          evidence: [
            { label: 'Số dư cao', value: '5,000,000 VND', ok: true },
            { label: 'Bay thường xuyên', value: '12 chuyến/năm', ok: true }
          ],
          recommendations: [
            { offer_code: 'DN001', title: 'Thẻ Visa Signature', description: 'Ưu đãi đặc biệt cho doanh nhân' }
          ]
        })
      })
      .finally(() => setLoading(false))
  }, [selectedId])

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header Controls */}
      <div className="max-w-[1400px] mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">🧠 AI Insight Dashboard</h1>
            <p className="text-gray-400">Phòng điều khiển phân tích khách hàng thông minh</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showMetrics 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              📊 Model Metrics
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              📊 Báo cáo
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              🔍 Customer Analysis
            </button>
            <button
              onClick={() => setActiveTab('blockchain')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'blockchain'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              🔗 Blockchain Achievements
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto">
        {showMetrics ? (
          <ModelMetrics onClose={() => setShowMetrics(false)} />
        ) : activeTab === 'blockchain' ? (
          <BlockchainDashboard customerId={selectedId || 1} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Search & Suggestions */}
            <div className="space-y-6">
              <SearchPanel onPickCustomer={setSelectedId} />
              
              {/* Quick Stats Card */}
              <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">📈 Thống kê hôm nay</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phân tích mới:</span>
                    <span className="text-green-400 font-medium">+127</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Độ chính xác AI:</span>
                    <span className="text-blue-400 font-medium">94.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Đề xuất thành công:</span>
                    <span className="text-yellow-400 font-medium">78.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: 360 Profile + AI Insights */}
            <div className="space-y-6">
              <Profile360 profile={profile} loading={loading} />
              <AIInsights insight={insight} />
            </div>

            {/* Column 3: Actions & Phone Simulation */}
            <div className="space-y-6">
              <ActionsPanel insight={insight} customerId={selectedId ?? undefined} />
              
              {/* System Status */}
              <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">⚡ Trạng thái hệ thống</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">AI Model</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-400 text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Database</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-400 text-sm">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">API Response</span>
                    <span className="text-blue-400 text-sm">~120ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
