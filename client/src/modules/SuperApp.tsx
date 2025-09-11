import React, { useState, useEffect, useRef } from 'react'
import { AuthUser } from '../services/auth'
import SVTWallet from '../components/SVTWallet'
import SVTMarketplace from '../components/SVTMarketplace'
import AIFinancialAssistant from '../components/AIFinancialAssistant'
import TransactionHistory from '../components/TransactionHistory'
import NFTPassport from '../components/NFTPassport'
import { ServiceModal } from '../components/ServiceModal'
import { AIAgent } from '../components/AIAgent'
import ImageIcon from '../components/ImageIcon'

type Props = {
  user: AuthUser
  onLogout?: () => void
  onDashboard?: () => void
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

export const SuperApp: React.FC<Props> = ({ user, onLogout, onDashboard }) => {
  const [activeSection, setActiveSection] = useState<'home' | 'wallet' | 'marketplace' | 'ai-assistant' | 'history'>('home')
  const [userData, setUserData] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [achievementsCount, setAchievementsCount] = useState(0)

  // Welcome Screen state
  const [showWelcome, setShowWelcome] = useState(true)
  const welcomeRef = useRef<HTMLDivElement>(null)

  // Modal states - Tự thao tác (Buffet style)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [currentService, setCurrentService] = useState<'vietjet' | 'hdbank' | 'resort' | null>(null)

  // AI Agent states - Được phục vụ (Waiter style)
  const [showAIAgent, setShowAIAgent] = useState(false)

  // Parallax and scroll effects for Welcome Screen
  useEffect(() => {
    if (!showWelcome) return

    const handleScroll = () => {
      if (!welcomeRef.current) return

      const scrollY = welcomeRef.current.scrollTop
      const windowHeight = window.innerHeight
      const scrollPercent = Math.min(scrollY / windowHeight, 1)

      // Parallax effect for background
      const bgElements = document.querySelectorAll('.parallax-bg')
      bgElements.forEach((el) => {
        ;(el as HTMLElement).style.transform = `translateY(${scrollY * 0.5}px)`
      })

      // Auto scroll to next section if user scrolls enough
      if (scrollPercent > 0.3) {
        document.getElementById('app-preview')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }

    const welcomeDiv = welcomeRef.current
    if (welcomeDiv) {
      welcomeDiv.addEventListener('scroll', handleScroll, { passive: true })
      return () => welcomeDiv.removeEventListener('scroll', handleScroll)
    }
  }, [showWelcome])

 useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        // Lấy dữ liệu thực từ backend sử dụng customer_id của user
        const customerId = user.customer_id || 1001; // Sử dụng customer_id từ user, fallback 1001
        console.log('🔍 SuperApp Debug - User:', user);
        console.log('🔍 SuperApp Debug - Customer ID:', customerId);

        const response = await fetch(`http://127.0.0.1:5000/customer/${customerId}`)
        console.log('🔍 SuperApp Debug - API Response Status:', response.status);
        if (response.ok) {
          const customerData = await response.json()
          console.log('🔍 SuperApp Debug - Customer Data:', customerData);
          console.log('🔍 SuperApp Debug - Vietjet Summary:', customerData.customer?.vietjet_summary);
          console.log('🔍 SuperApp Debug - HDBank Summary:', customerData.customer?.hdbank_summary);
          console.log('🔍 SuperApp Debug - Resort Summary:', customerData.customer?.resort_summary);

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
            customerId: customerData.customer?.customer_id || customerId,
            name: customerData.customer?.basic_info?.name || user.name,
            memberTier: calculateTier(tokensInfo.total_svt || 0),
            walletAddress: "0x" + customerId.toString().padStart(40, '0'),
            sovicoTokens: tokensInfo.total_svt || 0, // SVT thực từ DB
            services: {
              vietjet: {
                flights: customerData.customer?.vietjet_summary?.total_flights_last_year || 0,
                miles: (customerData.customer?.vietjet_summary?.total_flights_last_year || 0) * 1500
              },
              hdbank: {
                avg_balance: customerData.customer?.hdbank_summary?.average_balance || 0
              },
              resorts: {
                nights_stayed: customerData.customer?.resort_summary?.total_nights_stayed || 0
              }
            },
            transactions: [], // Sẽ load từ token_transactions
            ai_input: {
              age: customerData.customer?.basic_info?.age || 25,
              avg_balance: customerData.customer?.hdbank_summary?.average_balance || 0,
              total_flights: customerData.customer?.vietjet_summary?.total_flights_last_year || 0,
              is_business_flyer: customerData.customer?.vietjet_summary?.is_business_flyer || false,
              total_nights_stayed: customerData.customer?.resort_summary?.total_nights_stayed || 0,
              total_resort_spending: customerData.customer?.resort_summary?.total_spending || 0
            }
          }
          console.log('🔍 SuperApp Debug - Final User Data:', realUserData);
          setUserData(realUserData)

          // Lấy transaction data cho trang chính
          const transactionResponse = await fetch(`http://127.0.0.1:5000/api/token-transactions/${customerId}`)
          if (transactionResponse.ok) {
            const transactionData = await transactionResponse.json()
            if (transactionData.success) {
              // Chuyển đổi dữ liệu transaction cho trang chính
              const recentTransactions = transactionData.transactions.slice(0, 5).map((tx: any) => ({
                txHash: tx.tx_hash || `0x${Math.random().toString(16).substr(2, 12)}...`,
                type: tx.transaction_type || 'general',
                amount: tx.amount > 0 ? `+${tx.amount} SVT` : `${tx.amount} SVT`,
                time: new Date(tx.created_at).toLocaleDateString('vi-VN')
              }))

              // Cập nhật userData với transactions
              setUserData(prev => ({
                ...prev,
                transactions: recentTransactions
              }))
            }
          }

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
    { 
      id: 'wallet', 
      label: 'Wallet SVT', 
      description: 'Quản lí ví SVT',
      bgImage: './Image/vÍ.jpg',
    },
    { 
      id: 'marketplace', 
      label: 'Marketplace', 
      description: 'Trao đổi',
      bgImage: './Image/CUAHANG.jpg',
    },
    { 
      id: 'ai-assistant', 
      label: 'AI Advisor', 
      description: 'Tư vấn đầu tư thông minh',
      bgImage: './Image/AI.jpg',
    },
    { 
      id: 'history', 
      label: 'Blockchain', 
      description: 'Lịch sử giao dịch',
      bgImage: './Image/blockchain.webp',
      icon: '⛓️'
    }
  ]

  // Service modal handlers
  const openServiceModal = (serviceType: 'vietjet' | 'hdbank' | 'resort') => {
    setCurrentService(serviceType)
    setIsServiceModalOpen(true)
  }

  const closeServiceModal = () => {
    setIsServiceModalOpen(false)
    setCurrentService(null)
  }

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

  // Welcome Screen với hình ảnh Việt Nam đẹp
  if (showWelcome) {
    return (
      <div ref={welcomeRef} className="fixed inset-0 z-50 overflow-y-auto scroll-smooth">
        {/* Welcome Hero Section */}
        <div className="min-h-screen relative flex flex-col" id="welcome-hero">
          {/* Background Image - Thành phố Việt Nam */}
          <div className="absolute inset-0 parallax-bg">
            <img
              src="./Image/VietNam.jpg"
              alt="Việt Nam Beautiful City"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to VietNam2 if VietNam.jpg fails
                e.currentTarget.src = "./Image/VietNam2.jpg";
                e.currentTarget.onerror = () => {
                  // Final fallback to solid gradient
                  e.currentTarget.style.display = 'none';
                };
              }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-slate-900/60 to-blue-950/80"></div>

            {/* Animated Particles */}
            <div className="absolute inset-0">
              <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute top-40 right-20 w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-1000"></div>
              <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-pulse delay-500"></div>
              <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-700"></div>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 z-10">
            {/* Logo và Brand */}
            <div className="mb-8 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-slate-700 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20">
                <img
                  src="./Image/sovico.jpg"
                  alt="Sovico Group"
                  className="w-16 h-16 object-cover rounded-2xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden w-16 h-16 bg-gradient-to-br from-blue-600 to-slate-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                  🏢
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl">
                <span className="bg-gradient-to-r from-blue-400 via-white to-yellow-400 bg-clip-text text-transparent">
                  One-Sovico
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-200 font-light tracking-wide drop-shadow-lg">
                Super App
              </p>
            </div>

            {/* Welcome Message */}
            <div className="max-w-2xl mx-auto mb-12 animate-slide-up">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 drop-shadow-lg">
                Chào mừng {user.name} đến với hệ sinh thái Sovico
              </h2>
              <p className="text-lg md:text-xl text-blue-100 leading-relaxed drop-shadow-md">
                Khám phá thế giới đầu tư thông minh và dịch vụ tài chính hiện đại.
                Nơi công nghệ blockchain gặp gỡ trải nghiệm người dùng tuyệt vời.
              </p>
            </div>

            {/* Enter Button */}
            <button
              onClick={() => setShowWelcome(false)}
              className="group relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-500 transform hover:scale-110 shadow-2xl border-2 border-blue-400/30 hover:border-blue-300/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative flex items-center space-x-3">
                <ImageIcon name="unnamed.png" size={18} />
                <span>Khám phá ngay</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>
        </div>

        {/* Second Section - Preview của App */}
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative flex items-center justify-center"
             id="app-preview">
          <div className="absolute inset-0 opacity-10">
            <img
              src="./Image/VietNam3.jpg"
              alt="Vietnam Tech"
              className="w-full h-full object-cover parallax-bg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div className="relative text-center px-6 max-w-4xl mx-auto animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 animate-fade-in">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Tương lai tài chính trong tầm tay
              </span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-blue-900/40 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:bg-blue-900/60 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl animate-float">
                <div className="text-4xl mb-4 animate-bounce"><ImageIcon name="sovico.jpg" size={32} rounded={8} /></div>
                <h3 className="text-xl font-bold text-white mb-2">Sovico Token</h3>
                <p className="text-blue-200">Đồng tiền số của hệ sinh thái Sovico Group</p>
              </div>

              <div className="bg-purple-900/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:bg-purple-900/60 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl animate-float delay-200">
                <div className="text-4xl mb-4 animate-bounce delay-200"><ImageIcon name="AI.jpg" size={32} rounded={8} /></div>
                <h3 className="text-xl font-bold text-white mb-2">AI Thông minh</h3>
                <p className="text-purple-200">Trợ lý AI cá nhân cho mọi giao dịch</p>
              </div>

              <div className="bg-green-900/40 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30 hover:bg-green-900/60 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl animate-float delay-500">
                <div className="text-4xl mb-4 animate-bounce delay-500"><ImageIcon name="blockchain.webp" size={32} rounded={8} /></div>
                <h3 className="text-xl font-bold text-white mb-2">Blockchain</h3>
                <p className="text-green-200">Bảo mật tuyệt đối với công nghệ blockchain</p>
              </div>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-16 py-5 rounded-2xl font-black text-xl transition-all duration-300 transform hover:scale-110 shadow-2xl hover:shadow-yellow-500/25 animate-glow"
            >
              <span className="flex items-center space-x-3">
                <ImageIcon name="unnamed.png" size={18} />
                <span>Bắt đầu trải nghiệm</span>
                <span className="group-hover:translate-x-2 transition-transform">→</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Home page
  return (
    <div className="text-gray-200 font-sans min-h-screen bg-gradient-to-br from-[#0C1B2E] via-[#1A2B42] to-[#0F1A2E] relative overflow-hidden">
      {/* Corporate Hero Background inspired by Sovico Group */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-15">
          <img
            src="./Image/dragon-hill-sovico-holdings-min.jpg"
            alt="Sovico Holdings"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-slate-900/85 to-blue-900/90"></div>

        {/* Corporate Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-y-12"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-l from-transparent via-blue-300/10 to-transparent transform skew-y-6"></div>
        </div>

        {/* Investment Theme Elements */}
        <div className="absolute top-20 right-16 w-48 h-48 opacity-20">
          <img
            src="./Image/inves1.jpg"
            alt="Investment"
            className="w-full h-full object-cover rounded-full blur-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="absolute bottom-32 left-16 w-40 h-40 opacity-15">
          <img
            src="./Image/VietNam2.jpg"
            alt="Vietnam Development"
            className="w-full h-full object-cover rounded-2xl blur-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Corporate Header with Sovico Branding */}
      <div className="relative z-10">
        {/* Professional Header Background */}
        <div className="relative p-6 bg-gradient-to-r from-slate-900/80 via-blue-900/70 to-slate-800/80 backdrop-blur-xl border-b border-blue-500/20">
          {/* Sovico Group Brand Integration */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-5">
              {/* Corporate User Profile */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-slate-700 rounded-lg flex items-center justify-center text-white shadow-xl border border-blue-400/30">
                  <UserCircleIcon />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="font-bold text-xl text-white mb-1">{userData?.name}</p>
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-blue-300 font-mono bg-blue-900/30 px-3 py-1 rounded-md border border-blue-500/30">
                    {userData?.walletAddress?.slice(0, 6)}...{userData?.walletAddress?.slice(-4)}
                  </p>
                  <span className="text-xs bg-slate-700 text-blue-300 px-2 py-1 rounded-md">
                    Sovico Ecosystem
                  </span>
                </div>
              </div>
            </div>

            {/* Right side with Tier Badge and Logout Button */}
            <div className="flex items-center space-x-4">
              {/* Professional Tier Badge */}
              <div className="bg-gradient-to-r from-slate-800/60 to-blue-800/60 backdrop-blur-sm border border-blue-400/30 rounded-lg px-6 py-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <div className="text-yellow-400">
                      <StarIcon />
                    </div>
                    <span className="text-white font-bold text-lg">{userData?.memberTier}</span>
                  </div>
                  <span className="text-xs text-blue-300 font-medium">Investment Tier</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="group relative bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500/90 hover:to-red-600/90 backdrop-blur-sm border border-red-400/40 rounded-lg px-6 py-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-white group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">Đăng xuất</div>
                    <div className="text-red-200 text-xs">Logout</div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="p-6 space-y-8 relative z-10">
        {/* Corporate Sovico Token Card */}
        <div className="relative group">
          {/* Professional Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-slate-600 to-blue-800 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/90 to-slate-700/95 rounded-xl p-8 text-white shadow-2xl transform hover:scale-[1.01] transition-all duration-300 overflow-hidden border border-blue-500/30">
            {/* Sovico Corporate Background */}
            <div className="absolute inset-0 opacity-25">
              <img 
                src="./Image/dragon-hill-sovico-holdings-min.jpg" 
                alt="Sovico Holdings" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-blue-900/80 to-slate-800/85"></div>
            </div>
            
            {/* Corporate Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-6 right-6 w-24 h-24 border-2 border-blue-400/40 rounded-lg"></div>
              <div className="absolute bottom-6 left-6 w-20 h-20 border border-slate-400/30 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"></div>
            </div>
            
            <div className="relative">
              {/* Sovico Branding Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-400/50 bg-slate-800">
                      <img 
                        src="./Image/sovico.jpg" 
                        alt="Sovico Group" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full bg-gradient-to-br from-blue-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                        SVT
                      </div>
                    </div>
                    <div>
                      <p className="text-sm opacity-90 font-bold tracking-wider text-blue-300">SOVICO TOKEN (SVT)</p>
                      <p className="text-xs text-slate-400">Powered by Sovico Group</p>
                    </div>
                  </div>
                  <p className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-blue-100 to-slate-200 bg-clip-text text-transparent">
                    {userData?.sovicoTokens?.toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="text-6xl opacity-70">🏢</div>
              </div>
              
              {/* Investment Portfolio Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 pt-6 border-t border-blue-400/20">
                <div className="text-center bg-slate-800/60 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                  <div className="text-xl font-black text-green-400">{achievementsCount}</div>
                  <div className="text-blue-200 text-xs font-medium">Investments Completed</div>
                </div>
                <div className="text-center bg-slate-800/60 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                  <div className="text-xl font-black text-blue-400">{1 + achievementsCount}</div>
                  <div className="text-blue-200 text-xs font-medium">Portfolio Assets</div>
                </div>
                <div className="text-center bg-slate-800/60 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                  <div className="text-xl font-black text-yellow-400">{userData?.memberTier === 'Diamond' ? '💎' : userData?.memberTier === 'Gold' ? '🥇' : userData?.memberTier === 'Silver' ? '🥈' : '🥉'}</div>
                  <div className="text-blue-200 text-xs font-medium">Investor Level</div>
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* Sovico Group Investment Ecosystem */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center space-x-3">
            <span className="text-3xl">🏢</span>
            <span className="bg-gradient-to-r from-blue-400 to-slate-300 bg-clip-text text-transparent">
              Hệ sinh thái Sovico Group
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <div
                key={action.id}
                onClick={() => setActiveSection(action.id as any)}
                className="group relative bg-gradient-to-br from-slate-800/60 to-blue-900/50 backdrop-blur-sm border border-slate-600/50 rounded-xl overflow-hidden cursor-pointer hover:border-blue-400/60 hover:from-slate-700/70 hover:to-blue-800/60 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity">
                  <img 
                    src={action.bgImage} 
                    alt={action.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-slate-900/30"></div>
                </div>
                
                {/* Corporate Glow Effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/10 to-slate-600/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                
                <div className="relative text-center p-6 h-full flex flex-col justify-center">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">
                    {action.icon}
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2 drop-shadow-md">{action.label}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed drop-shadow-sm">{action.description}</p>
                  
                  {/* Hover Effect Indicator */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto rounded-full"></div>
                  </div>
                </div>
                
                {/* Professional Shine Effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-blue-300/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Corner Accent */}
                <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-br from-blue-400/50 to-cyan-400/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Services Overview with Brand Integration */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span className="text-3xl"></span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Dịch vụ của bạn
              </span>
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAIAgent(true)}
                className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">�</span>
                <span>AI Agent</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModernServiceCard 
              icon={<PlaneIcon />} 
              title="Vietjet Air" 
              value={userData?.services?.vietjet?.flights} 
              unit="chuyến bay"
              color="from-red-500 to-orange-500"
              bgImage="./Image/Vietjet.jpg"
              onClick={() => openServiceModal('vietjet')}
              subtitle=" Tự thao tác"
            />
            <ModernServiceCard 
              icon={<BankIcon />} 
              title="HDBank" 
              value={userData?.services?.hdbank?.avg_balance} 
              unit="đ" 
              isCurrency 
              color="from-blue-500 to-cyan-500"
              bgImage="./Image/hdbank.jpg"
              onClick={() => openServiceModal('hdbank')}
              subtitle=" Tự thao tác"
            />
            <ModernServiceCard 
              icon={<BuildingIcon />} 
              title="Resort & Spa" 
              value={userData?.services?.resorts?.nights_stayed} 
              unit="đêm nghỉ"
              color="from-green-500 to-emerald-500"
              bgImage="./Image/resort.jpg"
              onClick={() => openServiceModal('resort')}
              subtitle=" Tự thao tác"
            />
          </div>
          
          {/* AI Agent CTA Banner with Investment Background */}
          <div className="mt-8 relative overflow-hidden">
            <div className="absolute inset-0">
              <img 
                src="./Image/inves1.jpg" 
                alt="Investment" 
                className="w-full h-full object-cover opacity-40"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-blue-900/70 to-indigo-900/80"></div>
            </div>

          </div>
        </div>
        
        {/* Enhanced AI Recommendations */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center space-x-3">
            <span className="text-3xl">🤖</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Tư vấn AI cá nhân
            </span>
            <button 
              onClick={() => setActiveSection('ai-assistant')}
              className="ml-auto text-sm bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
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

      {/* Service Modal - Tự thao tác (Buffet style) */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={closeServiceModal}
        serviceType={currentService!}
        userData={userData}
      />

      {/* AI Agent Modal - Được phục vụ (Waiter style) */}
      {showAIAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
            {/* AI Agent Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>🤵</span>
                <span>AI Agent - Trợ lý cá nhân</span>
              </h2>
              <button
                onClick={() => setShowAIAgent(false)}
                className="text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* AI Agent Content */}
            <div className="flex-1 overflow-hidden">
              <AIAgent 
                userData={userData}
                onServiceAction={async (service, action, params) => {
                  // Handle service actions through API
                  const apiUrls = {
                    vietjet: {
                      book_flight: 'http://127.0.0.1:5000/api/service/vietjet/book-flight'
                    },
                    hdbank: {
                      transfer: 'http://127.0.0.1:5000/api/service/hdbank/transfer',
                      loan: 'http://127.0.0.1:5000/api/service/hdbank/loan'
                    },
                    resort: {
                      book_room: 'http://127.0.0.1:5000/api/service/resort/book-room',
                      spa_booking: 'http://127.0.0.1:5000/api/service/resort/book-spa'
                    }
                  }

                  const apiUrl = apiUrls[service]?.[action]
                  if (!apiUrl) throw new Error('API không hỗ trợ')

                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                  })

                  const result = await response.json()
                  if (!result.success) throw new Error(result.message)
                  
                  return result
                }}
              />
            </div>
          </div>
        </div>
      )}
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
  onClick?: () => void
  subtitle?: string
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, value, unit, isCurrency = false, color = "text-gray-400", onClick, subtitle }) => (
  <div 
    className="bg-[#161B22] border border-gray-700 rounded-lg p-4 flex items-center cursor-pointer hover:border-blue-500 hover:bg-blue-900/20 transition-all relative"
    onClick={onClick}
  >
    <div className={color}>{icon}</div>
    <div className="ml-4 flex-1">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{title}</p>
        {subtitle && (
          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
            {subtitle}
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-white">
        {isCurrency ? Math.round(value / 1_000_000).toLocaleString('vi-VN') : value}
        <span className="text-sm font-normal text-gray-400 ml-1">{isCurrency ? "triệu" : unit}</span>
      </p>
    </div>
  </div>
)

// Modern Service Card with Brand Integration
type ModernServiceCardProps = {
  icon: React.ReactNode
  title: string
  value: number
  unit: string
  isCurrency?: boolean
  color: string
  bgImage?: string
  onClick?: () => void
  subtitle?: string
}

const ModernServiceCard: React.FC<ModernServiceCardProps> = ({ 
  icon, title, value, unit, isCurrency = false, color, bgImage, onClick, subtitle 
}) => (
  <div 
    className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden cursor-pointer hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
    onClick={onClick}
  >
    {/* Background Image with Overlay */}
    {bgImage && (
      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
        <img 
          src={bgImage} 
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
      </div>
    )}
    
    {/* Glow Effect */}
    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${color} opacity-0 group-hover:opacity-20 transition-opacity blur-xl`}></div>
    
    <div className="relative p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`text-white bg-gradient-to-r ${color} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {subtitle && (
          <span className="text-xs bg-blue-600/80 backdrop-blur-sm text-white px-3 py-1 rounded-full border border-blue-400/30">
            {subtitle}
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-black text-white">
            {isCurrency ? Math.round(value / 1_000_000).toLocaleString('vi-VN') : value}
          </span>
          <span className="text-gray-400 text-sm font-medium">
            {isCurrency ? "triệu VND" : unit}
          </span>
        </div>
      </div>
      
      {/* Action Indicator */}
      <div className="mt-4 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Xem chi tiết</span>
        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
)

type RecommendationCardProps = {
  title: string
  description: string
  offer_code?: string
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ title, description }) => (
  <div className="group relative bg-gradient-to-r from-gray-800/60 to-blue-900/40 backdrop-blur-sm border border-blue-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-400/50 hover:shadow-xl transform hover:scale-[1.02]">
    {/* Vietnam Background */}
    <div className="absolute inset-0 opacity-20">
      <img 
        src="./Image/VietNam.jpg" 
        alt="Vietnam" 
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-purple-900/60"></div>
    </div>
    
    {/* Glow Effect */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
    
    <div className="relative p-6 flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
            🤖
          </div>
          <h3 className="font-bold text-white text-lg drop-shadow-md">{title}</h3>
        </div>
        <p className="text-gray-200 leading-relaxed drop-shadow-sm">{description}</p>
      </div>
      <button className="ml-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border border-white/20">
        Khám phá
      </button>
    </div>
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
