import React, { useState, useEffect } from 'react'
import { AuthUser } from '../App'

type Props = {
  user: AuthUser
}

// Icons
const UserCircleIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const PlaneIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const BankIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const BuildingIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const CubeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

export const SuperApp: React.FC<Props> = ({ user }) => {
  const [userData, setUserData] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      // Mock user data based on email
      const mockUserData = {
        name: user.name,
        memberTier: "Vàng",
        walletAddress: "0x1a2b...c3d4",
        sovicoTokens: 12500,
        services: {
          vietjet: { flights: 30, miles: 45000 },
          hdbank: { avg_balance: 6382504630 },
          resorts: { nights_stayed: 5 }
        },
        transactions: [
          { txHash: "0xabc...", type: "Tích điểm Vietjet", amount: "+ 500 SVT", time: "1 ngày trước" },
          { txHash: "0xdef...", type: "Đổi ưu đãi Resort", amount: "- 2,000 SVT", time: "3 ngày trước" },
          { txHash: "0xghi...", type: "Thưởng hạng Vàng HDBank", amount: "+ 1,000 SVT", time: "1 tuần trước" },
        ],
        ai_input: {
          age: 40,
          avg_balance: 6382504630,
          total_flights: 30,
          is_business_flyer: true,
          total_nights_stayed: 5,
          total_resort_spending: 25000000
        }
      }
      setUserData(mockUserData)
      
      // Call AI prediction API
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockUserData.ai_input)
        })
        if (response.ok) {
          const aiData = await response.json()
          setRecommendations(aiData.recommendations || [])
        }
      } catch (error) {
        console.error("Lỗi khi gọi API AI:", error)
        setRecommendations([
          { offer_code: 'ERR01', title: 'Không thể tải đề xuất', description: 'Vui lòng thử lại sau.' }
        ])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-gray-200 font-sans">
      {/* Header with User Info */}
      <div className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center">
          <div className="text-white">
            <UserCircleIcon />
          </div>
          <div className="ml-3">
            <p className="font-bold text-white">{userData?.name}</p>
            <p className="text-xs text-gray-400 font-mono">{userData?.walletAddress}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Hạng thành viên:</span>
          <span className="text-yellow-400 font-semibold flex items-center">
            <StarIcon />
            <span className="ml-1">{userData?.memberTier}</span>
          </span>
        </div>
      </div>

      <main className="p-6 space-y-8">
        {/* Sovico Token Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white text-center shadow-lg">
          <p className="text-sm opacity-80 font-semibold">SOVICO TOKEN (SVT)</p>
          <p className="text-4xl font-bold mt-2">{userData?.sovicoTokens?.toLocaleString('vi-VN')}</p>
          <div className="flex justify-center space-x-3 mt-4">
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-semibold">
              Sử dụng Token
            </button>
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-semibold">
              Lịch sử
            </button>
          </div>
        </div>

        {/* Services Overview */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Dịch vụ của bạn</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ServiceCard 
              icon={<PlaneIcon />} 
              title="Vietjet Air" 
              value={userData?.services?.vietjet?.flights} 
              unit="chuyến bay"
              color="text-red-400"
            />
            <ServiceCard 
              icon={<BankIcon />} 
              title="HDBank" 
              value={userData?.services?.hdbank?.avg_balance} 
              unit="đ" 
              isCurrency 
              color="text-blue-400"
            />
            <ServiceCard 
              icon={<BuildingIcon />} 
              title="Resort & Spa" 
              value={userData?.services?.resorts?.nights_stayed} 
              unit="đêm nghỉ"
              color="text-green-400"
            />
          </div>
        </div>
        
        {/* AI Recommendations */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">🤖 Ưu đãi AI đề xuất</h2>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={rec.offer_code || index} {...rec} />
            ))}
          </div>
        </div>

        {/* Blockchain Transaction History */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">⛓️ Lịch sử Giao dịch Token</h2>
          <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
            <div className="space-y-3">
              {userData?.transactions?.map((tx: any, index: number) => (
                <TransactionRow key={tx.txHash || index} tx={tx} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Supporting Components
type ServiceCardProps = {
  icon: React.ReactNode
  title: string
  value: number
  unit: string
  isCurrency?: boolean
  color?: string
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, value, unit, isCurrency = false, color = "text-gray-400" }) => (
  <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 flex items-center">
    <div className={color}>{icon}</div>
    <div className="ml-4">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-lg font-bold text-white">
        {isCurrency ? Math.round(value / 1_000_000).toLocaleString('vi-VN') : value}
        <span className="text-sm font-normal text-gray-400 ml-1">{isCurrency ? "triệu" : unit}</span>
      </p>
    </div>
  </div>
)

type RecommendationCardProps = {
  title: string
  description: string
  offer_code?: string
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ title, description }) => (
  <div className="bg-gradient-to-r from-[#161B22] to-blue-900/30 border border-blue-700 rounded-lg p-5 flex justify-between items-center">
    <div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-300 mt-1">{description}</p>
    </div>
    <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md text-sm whitespace-nowrap">
      Khám phá
    </button>
  </div>
)

type TransactionRowProps = {
  tx: {
    txHash: string
    type: string
    amount: string
    time: string
  }
}

const TransactionRow: React.FC<TransactionRowProps> = ({ tx }) => (
  <div className="flex items-center justify-between p-3 rounded-md hover:bg-gray-800 transition-colors">
    <div className="flex items-center">
      <div className="text-purple-400 mr-3">
        <CubeIcon />
      </div>
      <div>
        <p className="font-mono text-sm text-white">{tx.type}</p>
        <p className="font-mono text-xs text-gray-500">{tx.txHash}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`font-mono text-sm font-bold ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
        {tx.amount}
      </p>
      <p className="text-xs text-gray-500">{tx.time}</p>
    </div>
  </div>
)
