import React, { useState, useEffect } from 'react'
import { AuthUser } from '../services/auth'
import SVTWallet from '../components/SVTWallet'
import SVTMarketplace from '../components/SVTMarketplace'
import AIFinancialAssistant from '../components/AIFinancialAssistant'
import TransactionHistory from '../components/TransactionHistory'
import NFTPassport from '../components/NFTPassport'

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
  const [activeSection, setActiveSection] = useState<'home' | 'wallet' | 'marketplace' | 'ai-assistant' | 'history'>('home')
  const [userData, setUserData] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [achievementsCount, setAchievementsCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        // Lấy dữ liệu thực từ backend sử dụng customer_id của user
        const customerId = user.customer_id || 1001; // Sử dụng customer_id từ user, fallback 1001
        console.log('🔍 SuperApp Debug - User:', user);
        console.log('🔍 SuperApp Debug - Customer ID:', customerId);
        
        const response = await fetch(`http://127.0.0.1:5000/customer/${customerId}`)
        if (response.ok) {
          const customerData = await response.json()
          console.log('🔍 SuperApp Debug - Customer Data:', customerData);
          
          // Lấy dữ liệu token từ blockchain/database  
          const tokenResponse = await fetch(`http://127.0.0.1:5000/api/nft/${customerId}`)
          const tokenData = tokenResponse.ok ? await tokenResponse.json() : null
          
          // Tính tổng SVT tokens thực từ token_transactions
          const tokensResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${customerId}`)
          const tokensInfo = tokensResponse.ok ? await tokensResponse.json() : { total_svt: 0 }
          console.log('🔍 SuperApp Debug - Tokens Info:', tokensInfo);
          
          // Tính tier dựa trên SVT balance thực tế
          const calculateTier = (svtBalance: number) => {
            if (svtBalance >= 200000) return 'Diamond';
            if (svtBalance >= 50000) return 'Gold';
            if (svtBalance >= 10000) return 'Silver';
            return 'Bronze';
          };

          const realUserData = {
            customerId: customerData.basic_info?.customer_id || customerId,
            name: customerData.basic_info?.name || user.name,
            memberTier: calculateTier(tokensInfo.total_svt || 0),
            walletAddress: "0x" + customerId.toString().padStart(40, '0'),
            sovicoTokens: tokensInfo.total_svt || 0, // SVT thực từ DB
            services: {
              vietjet: {
                flights: customerData.vietjet_summary?.total_flights_last_year || 0,
                miles: (customerData.vietjet_summary?.total_flights_last_year || 0) * 1500
              },
              hdbank: {
                avg_balance: customerData.hdbank_summary?.average_balance || 0
              },
              resorts: {
                nights_stayed: customerData.resort_summary?.total_nights_stayed || 0
              }
            },
            transactions: [], // Sẽ load từ token_transactions
            ai_input: {
              age: customerData.basic_info?.age || 25,
              avg_balance: customerData.hdbank_summary?.average_balance || 0,
              total_flights: customerData.vietjet_summary?.total_flights_last_year || 0,
              is_business_flyer: customerData.vietjet_summary?.is_business_flyer || false,
              total_nights_stayed: customerData.resort_summary?.total_nights_stayed || 0,
              total_resort_spending: customerData.resort_summary?.total_spending || 0
            }
          }
          setUserData(realUserData)
          
          // Lấy mission count từ token transactions thay vì achievements
          const missionResponse = await fetch(`http://127.0.0.1:5000/api/token-transactions/${customerId}`)
          if (missionResponse.ok) {
            const missionData = await missionResponse.json()
            if (missionData.success) {
              // Đếm số mission_reward transactions (missions hoàn thành)
              const missionCount = missionData.transactions.filter((tx: any) => 
                tx.transaction_type === 'mission_reward'
              ).length
              setAchievementsCount(missionCount)
            }
          }
          
          // Lấy recommendations từ AI
          const aiResponse = await fetch(`http://127.0.0.1:5000/customer/${customerId}/insights`)
          if (aiResponse.ok) {
            const aiData = await aiResponse.json()
            setRecommendations(aiData.recommendations || [])
          }
          
        } else {
          // Fallback cho user mới (chưa có customer record)
          const newUserData = {
            customerId: 1001,
            name: user.name,
            memberTier: "Bronze",
            walletAddress: "0x" + '1001'.padStart(40, '0'),
            sovicoTokens: 0, // User mới không có token
            services: {
              vietjet: { flights: 0, miles: 0 },
              hdbank: { avg_balance: 0 },
              resorts: { nights_stayed: 0 }
            },
            transactions: [],
            ai_input: {
              age: 25,
              avg_balance: 0,
              total_flights: 0,
              is_business_flyer: false,
              total_nights_stayed: 0,
              total_resort_spending: 0
            }
          }
          setUserData(newUserData)
          setRecommendations([{
            offer_code: 'WELCOME',
            title: 'Chào mừng thành viên mới!',
            description: 'Hoàn thành hồ sơ để nhận 1000 SVT đầu tiên'
          }])
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Fallback data for new user
        const fallbackData = {
          customerId: 1001,
          name: user.name,
          memberTier: "Bronze", 
          walletAddress: "0x0000000000000000000000000000000000000000",
          sovicoTokens: 0,
          services: {
            vietjet: { flights: 0, miles: 0 },
            hdbank: { avg_balance: 0 },
            resorts: { nights_stayed: 0 }
          },
          transactions: [],
          ai_input: {
            age: 25,
            avg_balance: 0,
            total_flights: 0,
            is_business_flyer: false,
            total_nights_stayed: 0,
            total_resort_spending: 0
          }
        }
        setUserData(fallbackData)
      }
      
      setLoading(false)
    }
    
    fetchData()
  }, [user])

  // Handle VIP simulation
  const handleVIPSimulation = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/simulate_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'vip_upgrade',
          customer_id: userData?.customerId || 1
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`🎉 VIP simulation successful! ${result.achievements_earned} achievements earned, ${result.total_svt_reward} SVT tokens rewarded.`)
        
        // Trigger NFT passport refresh
        setRefreshTrigger(prev => prev + 1)
        
        // Update user data with new SVT tokens
        setUserData(prev => ({
          ...prev,
          sovicoTokens: prev.sovicoTokens + result.total_svt_reward
        }))
      } else {
        alert('❌ VIP simulation failed: ' + result.message)
      }
    } catch (error) {
      console.error('VIP simulation error:', error)
      alert('❌ Error connecting to backend. Make sure Flask server is running.')
    }
  }

  const quickActions = [
    { id: 'wallet', label: 'Ví SVT', icon: '🪙', description: 'Quản lý token và nhiệm vụ' },
    { id: 'marketplace', label: 'Marketplace', icon: '🛍️', description: 'Mua sắm với SVT' },
    { id: 'ai-assistant', label: 'AI Advisor', icon: '🤖', description: 'Tư vấn tài chính thông minh' },
    { id: 'history', label: 'Blockchain', icon: '⛓️', description: 'Lịch sử & NFT' }
  ]

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

  // Render different sections based on activeSection
  if (activeSection === 'wallet') {
    return (
      <div className="text-gray-200 font-sans min-h-screen">
        <div className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm border-b border-gray-700">
          <button 
            onClick={() => setActiveSection('home')}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl font-bold text-white">Ví Sovico Token</h1>
          <div></div>
        </div>
        <div className="p-6">
          <SVTWallet />
        </div>
      </div>
    )
  }

  if (activeSection === 'marketplace') {
    return (
      <div className="text-gray-200 font-sans min-h-screen">
        <div className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm border-b border-gray-700">
          <button 
            onClick={() => setActiveSection('home')}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl font-bold text-white">SVT Marketplace</h1>
          <div></div>
        </div>
        <div className="p-6">
          <SVTMarketplace />
        </div>
      </div>
    )
  }

  if (activeSection === 'ai-assistant') {
    return (
      <div className="text-gray-200 font-sans min-h-screen">
        <div className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm border-b border-gray-700">
          <button 
            onClick={() => setActiveSection('home')}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl font-bold text-white">AI Financial Advisor</h1>
          <div></div>
        </div>
        <div className="h-[calc(100vh-80px)]">
          <AIFinancialAssistant />
        </div>
      </div>
    )
  }

  if (activeSection === 'history') {
    return (
      <div className="text-gray-200 font-sans min-h-screen">
        <div className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm border-b border-gray-700">
          <button 
            onClick={() => setActiveSection('home')}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl font-bold text-white">Blockchain Explorer</h1>
          <div></div>
        </div>
        <div className="p-6 space-y-6">
          {/* NFT Passport Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                🎫 <span className="ml-2">Sovico Passport NFT</span>
              </h2>
              <button
                onClick={handleVIPSimulation}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                👑 Mô phỏng VIP
              </button>
            </div>
            <NFTPassport tokenId={userData?.customerId || 1} refreshTrigger={refreshTrigger} />
          </div>
          
          {/* Transaction History Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              ⛓️ <span className="ml-2">Blockchain Explorer</span>
            </h2>
            <TransactionHistory />
          </div>
        </div>
      </div>
    )
  }

  // Home page
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
          <span className="text-purple-400 font-semibold flex items-center">
            <StarIcon />
            <span className="ml-1">{userData?.memberTier}</span>
          </span>
        </div>
      </div>

      <main className="p-6 space-y-8">
        {/* Enhanced Sovico Token Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-80 font-semibold">SOVICO TOKEN (SVT)</p>
              <p className="text-4xl font-bold mt-2">{userData?.sovicoTokens?.toLocaleString('vi-VN')}</p>
              <p className="text-purple-200 text-sm mt-1">≈ {(userData?.sovicoTokens * 1000)?.toLocaleString('vi-VN')} VND</p>
            </div>
            <div className="text-6xl">🪙</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-purple-400">
            <div className="text-center">
              <div className="text-xl font-bold">{achievementsCount}</div>
              <div className="text-purple-200 text-xs">Nhiệm vụ hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{1 + achievementsCount}</div>
              <div className="text-purple-200 text-xs">NFT sở hữu</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{userData?.memberTier}</div>
              <div className="text-purple-200 text-xs">Cấp độ</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveSection('wallet')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <span>🎯</span>
              <span>Nhiệm vụ</span>
            </button>
            <button 
              onClick={() => setActiveSection('marketplace')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <span>🛍️</span>
              <span>Mua sắm</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">🚀 Hệ sinh thái Sovico</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <div
                key={action.id}
                onClick={() => setActiveSection(action.id as any)}
                className="bg-[#161B22] border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-900/20 transition-all"
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <h3 className="font-semibold text-white text-sm">{action.label}</h3>
                <p className="text-xs text-gray-400 mt-1">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Services Overview */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">💎 Dịch vụ của bạn</h2>
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
          <h2 className="text-xl font-bold mb-4 text-white flex items-center space-x-2">
            <span>🤖</span>
            <span>Tư vấn AI cá nhân</span>
            <button 
              onClick={() => setActiveSection('ai-assistant')}
              className="ml-auto text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg"
            >
              Chat với AI
            </button>
          </h2>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={rec.offer_code || index} {...rec} />
            ))}
          </div>
        </div>

        {/* Recent SVT Activity */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white flex items-center space-x-2">
            <span>⛓️</span>
            <span>Hoạt động SVT gần đây</span>
            <button 
              onClick={() => setActiveSection('history')}
              className="ml-auto text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg"
            >
              Xem tất cả
            </button>
          </h2>
          <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
            <div className="space-y-3">
              {userData?.transactions?.slice(0, 3).map((tx: any, index: number) => (
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
