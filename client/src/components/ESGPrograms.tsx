import React, { useState, useEffect } from 'react'

interface ESGProgram {
  id: number
  name: string
  description: string
  category: 'environment' | 'social' | 'governance'
  target_amount: number
  current_amount: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'cancelled'
  image_url: string
  progress_percentage: number
  created_at: string
}

interface ESGContribution {
  id: number
  program_id: number
  user_id: number
  amount: number
  svt_amount: number
  contribution_date: string
  status: string
  program_name: string
  program_category: string
  transaction_hash: string
}

interface ESGStats {
  category_stats: Array<{
    category: string
    program_count: number
    total_target: number
    total_raised: number
  }>
  overall_stats: {
    total_programs: number
    total_contributors: number
    total_contributions: number
    total_svt_distributed: number
  }
}

const ESGPrograms: React.FC = () => {
  const [programs, setPrograms] = useState<ESGProgram[]>([])
  const [myContributions, setMyContributions] = useState<ESGContribution[]>([])
  const [stats, setStats] = useState<ESGStats | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('programs')
  const [loading, setLoading] = useState(true)
  const [contributionAmount, setContributionAmount] = useState('')
  const [useSVT, setUseSVT] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<ESGProgram | null>(null)
  const [contributionLoading, setContributionLoading] = useState(false)
  const [showContributionModal, setShowContributionModal] = useState(false)

  const categoryConfig = {
    environment: { 
      label: 'Môi trường', 
      icon: '🌱', 
      color: 'text-emerald-700', 
      bgColor: 'bg-gradient-to-br from-emerald-50 to-green-100',
      borderColor: 'border-emerald-300',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
      symbols: ['♻️', '🌳', '🌿', '💚', '🌍', '🌺', '🍃']
    },
    social: { 
      label: 'Xã hội', 
      icon: '🤝', 
      color: 'text-blue-700', 
      bgColor: 'bg-gradient-to-br from-blue-50 to-sky-100',
      borderColor: 'border-blue-300',
      badgeColor: 'bg-blue-100 text-blue-800',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      symbols: ['❤️', '👥', '🏠', '💫', '✨', '🌟', '💎']
    },
    governance: { 
      label: 'Quản trị', 
      icon: '⚖️', 
      color: 'text-purple-700', 
      bgColor: 'bg-gradient-to-br from-purple-50 to-violet-100',
      borderColor: 'border-purple-300',
      badgeColor: 'bg-purple-100 text-purple-800',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      symbols: ['🏛️', '📊', '🔍', '🎯', '⭐', '🔮', '👑']
    }
  }

  useEffect(() => {
    fetchESGData()
  }, [selectedCategory])

  const fetchESGData = async () => {
    try {
      setLoading(true)
      
      // Fetch programs
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
      const programsResponse = await fetch(`/api/esg/programs?status=active${categoryParam}`)
      const programsData = await programsResponse.json()
      
      if (programsData.success) {
        setPrograms(programsData.programs)
      }

      // Fetch user contributions (requires auth)
      const token = localStorage.getItem('auth_token')
      if (token) {
        const contributionsResponse = await fetch('/api/esg/my-contributions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const contributionsData = await contributionsResponse.json()
        
        if (contributionsData.success) {
          setMyContributions(contributionsData.contributions)
        }
      }

      // Fetch stats
      const statsResponse = await fetch('/api/esg/stats')
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setStats(statsData.stats)
      }

    } catch (error) {
      console.error('Error fetching ESG data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContribution = async () => {
    if (!selectedProgram || !contributionAmount) return

    try {
      setContributionLoading(true)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('Vui lòng đăng nhập để đóng góp')
        return
      }

      const response = await fetch('/api/esg/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          program_id: selectedProgram.id,
          amount: parseFloat(contributionAmount),
          use_svt: useSVT
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Đóng góp thành công! Bạn nhận được ${data.svt_reward} SVT token.`)
        
        // Reset form
        setContributionAmount('')
        setUseSVT(false)
        setSelectedProgram(null)
        setShowContributionModal(false)
        
        // Refresh data
        fetchESGData()
      } else {
        alert(data.message || 'Có lỗi xảy ra khi đóng góp')
      }

    } catch (error) {
      console.error('Error making contribution:', error)
      alert('Có lỗi xảy ra khi đóng góp')
    } finally {
      setContributionLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-bounce">🌱</div>
          <div className="absolute top-20 right-20 text-4xl animate-pulse">🌍</div>
          <div className="absolute bottom-20 left-20 text-5xl animate-bounce delay-300">♻️</div>
          <div className="absolute bottom-10 right-10 text-3xl animate-pulse delay-500">🌿</div>
          <div className="absolute top-1/2 left-1/4 text-4xl animate-spin slow">💚</div>
          <div className="absolute top-1/3 right-1/3 text-5xl animate-bounce delay-700">🌳</div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl animate-pulse">🌍</span>
              </div>
            </div>
            <p className="mt-6 text-xl text-emerald-700 font-medium">Đang tải dữ liệu ESG...</p>
            <p className="mt-2 text-emerald-600">Khám phá các chương trình phát triển bền vững</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Floating Environmental Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-float">🌱</div>
        <div className="absolute top-32 right-16 text-3xl opacity-15 animate-float-delayed">🌍</div>
        <div className="absolute top-64 left-1/4 text-5xl opacity-10 animate-float-slow">♻️</div>
        <div className="absolute bottom-32 right-1/4 text-4xl opacity-20 animate-float">🌿</div>
        <div className="absolute bottom-16 left-16 text-6xl opacity-10 animate-float-delayed">🌳</div>
        <div className="absolute top-1/2 right-20 text-3xl opacity-15 animate-float-slow">💚</div>
        <div className="absolute top-20 left-1/3 text-2xl opacity-25 animate-float">🍃</div>
        <div className="absolute bottom-40 left-1/2 text-4xl opacity-15 animate-float-delayed">🌺</div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Enhanced Header with Nature Theme */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <span className="text-6xl mr-3">🌍</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
                ESG Programs
              </h1>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-emerald-600">🌱</span>
                <span className="text-sm font-medium text-emerald-700">Environment • Social • Governance</span>
                <span className="text-emerald-600">🤝</span>
              </div>
            </div>
          </div>
          <p className="text-lg text-emerald-700 max-w-2xl mx-auto leading-relaxed">
            Tham gia các chương trình phát triển bền vững và tạo nên tác động tích cực cho tương lai 🌟
          </p>
        </div>

        {/* Enhanced Stats Cards with Nature Design */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-emerald-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Tổng chương trình</p>
                  <p className="text-3xl font-bold text-emerald-800">
                    {stats.overall_stats?.total_programs || 0}
                  </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <span className="text-3xl">🎯</span>
                </div>
              </div>
              <div className="mt-3 flex items-center text-emerald-600 text-sm">
                <span className="mr-1">📈</span>
                <span>Đang hoạt động</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Người đóng góp</p>
                  <p className="text-3xl font-bold text-blue-800">
                    {stats.overall_stats?.total_contributors || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-3xl">👥</span>
                </div>
              </div>
              <div className="mt-3 flex items-center text-blue-600 text-sm">
                <span className="mr-1">🤝</span>
                <span>Cộng đồng tham gia</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-rose-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600 mb-1">Tổng đóng góp</p>
                  <p className="text-3xl font-bold text-rose-800">
                    {formatCurrency(stats.overall_stats?.total_contributions || 0)}
                  </p>
                </div>
                <div className="bg-rose-100 p-3 rounded-full">
                  <span className="text-3xl">❤️</span>
                </div>
              </div>
              <div className="mt-3 flex items-center text-rose-600 text-sm">
                <span className="mr-1">💰</span>
                <span>Hỗ trợ tài chính</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-yellow-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">SVT đã trao</p>
                  <p className="text-3xl font-bold text-yellow-800">
                    {(stats.overall_stats?.total_svt_distributed || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <span className="text-3xl">🪙</span>
                </div>
              </div>
              <div className="mt-3 flex items-center text-yellow-600 text-sm">
                <span className="mr-1">🏆</span>
                <span>Token thưởng</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Tabs with Nature Theme */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-emerald-100">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('programs')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'programs'
                    ? 'bg-emerald-600 text-white shadow-lg transform scale-105'
                    : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <span className="text-lg">🌱</span>
                Chương trình ESG
              </button>
              <button
                onClick={() => setActiveTab('contributions')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'contributions'
                    ? 'bg-emerald-600 text-white shadow-lg transform scale-105'
                    : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <span className="text-lg">💚</span>
                Đóng góp của tôi
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'programs' && (
          <div className="space-y-8">
            {/* Enhanced Category Filter */}
            <div className="flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-emerald-100">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-700 font-medium flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    Lọc theo danh mục:
                  </span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border-2 border-emerald-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/90 text-emerald-800 font-medium"
                  >
                    <option value="all">🌟 Tất cả danh mục</option>
                    <option value="environment">🌱 Môi trường</option>
                    <option value="social">🤝 Xã hội</option>
                    <option value="governance">⚖️ Quản trị</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Enhanced Programs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {programs.map((program) => {
                const config = categoryConfig[program.category]
                const randomSymbol = config.symbols[Math.floor(Math.random() * config.symbols.length)]

                return (
                  <div key={program.id} className="group bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/50">
                    {/* Enhanced Image/Header */}
                    <div className={`relative h-56 ${config.bgColor} overflow-hidden`}>
                      {/* Floating Symbols */}
                      <div className="absolute inset-0 opacity-20">
                        {config.symbols.map((symbol, index) => (
                          <div
                            key={index}
                            className={`absolute text-2xl animate-float-${index % 3}`}
                            style={{
                              top: `${(index * 23) % 80}%`,
                              left: `${(index * 37) % 85}%`,
                              animationDelay: `${index * 0.5}s`
                            }}
                          >
                            {symbol}
                          </div>
                        ))}
                      </div>

                      {program.image_url && (
                        <img 
                          src={program.image_url} 
                          alt={program.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm ${config.badgeColor} border border-white/30 shadow-lg`}>
                          <span className="mr-2 text-lg">{config.icon}</span>
                          {config.label}
                        </span>
                      </div>

                      {/* Random Symbol Corner */}
                      <div className="absolute top-4 right-4 text-3xl opacity-80 animate-pulse">
                        {randomSymbol}
                      </div>
                    </div>

                    {/* Enhanced Content */}
                    <div className="p-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-emerald-700 transition-colors">
                        {program.name}
                      </h3>
                      
                      <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                        {program.description}
                      </p>

                      {/* Enhanced Progress */}
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-600 flex items-center gap-1">
                            <span>📊</span>
                            Tiến độ
                          </span>
                          <span className="font-bold text-emerald-700">
                            {program.progress_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg relative"
                              style={{ width: `${Math.min(100, program.progress_percentage)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span className="font-medium">{formatCurrency(program.current_amount)}</span>
                          <span className="font-medium">{formatCurrency(program.target_amount)}</span>
                        </div>
                      </div>

                      {/* Enhanced Dates */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-gray-50 rounded-xl p-3">
                        <span className="text-lg">📅</span>
                        <span className="font-medium">
                          {formatDate(program.start_date)} - {formatDate(program.end_date)}
                        </span>
                      </div>

                      {/* Enhanced Contribute Button */}
                      <button
                        onClick={() => {
                          setSelectedProgram(program)
                          setShowContributionModal(true)
                        }}
                        className={`w-full ${config.buttonColor} text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95`}
                      >
                        <span className="text-xl">🎁</span>
                        <span>Đóng góp ngay</span>
                        <span className="text-lg">✨</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="space-y-6">
            {myContributions.length > 0 ? (
              <div className="space-y-6">
                {myContributions.map((contribution) => {
                  const config = categoryConfig[contribution.program_category as keyof typeof categoryConfig]
                  
                  return (
                    <div key={contribution.id} className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-emerald-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${config.bgColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <span className="text-3xl">{config.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {contribution.program_name}
                            </h3>
                            <div className="flex items-center gap-3 text-gray-600">
                              <span className="flex items-center gap-1">
                                <span>📅</span>
                                {formatDate(contribution.contribution_date)}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badgeColor}`}>
                                {config.label}
                              </span>
                            </div>
                            {contribution.transaction_hash && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                <span>🔗</span>
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                  {contribution.transaction_hash.substring(0, 16)}...
                                </span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(contribution.transaction_hash)}
                                  className="text-blue-500 hover:text-blue-700 text-xs"
                                  title="Copy transaction hash"
                                >
                                  📋
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800 mb-2">
                            {formatCurrency(contribution.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200">
                            <span className="text-lg">🏆</span>
                            <span className="font-bold text-yellow-700">+{contribution.svt_amount} SVT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-16 text-center border border-emerald-100">
                <div className="relative inline-block mb-8">
                  <div className="text-8xl opacity-60 animate-bounce">🎁</div>
                  <div className="absolute -top-2 -right-2 text-3xl animate-spin slow">✨</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Chưa có đóng góp nào
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Hãy tham gia đóng góp cho các chương trình ESG để tạo tác động tích cực cho tương lai! 🌟
                </p>
                <button
                  onClick={() => setActiveTab('programs')}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 px-8 rounded-2xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3 mx-auto"
                >
                  <span className="text-xl">🌱</span>
                  Khám phá chương trình
                  <span className="text-lg">→</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Contribution Modal */}
        {showContributionModal && selectedProgram && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-emerald-100 transform animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Đóng góp cho {selectedProgram.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${categoryConfig[selectedProgram.category].badgeColor}`}>
                      {categoryConfig[selectedProgram.category].icon} {categoryConfig[selectedProgram.category].label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowContributionModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    💰 Số tiền đóng góp (VND)
                  </label>
                  <input
                    type="number"
                    placeholder="Nhập số tiền bạn muốn đóng góp"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="w-full border-2 border-emerald-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-medium"
                  />
                </div>

                {/* SVT Option */}
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="use-svt"
                      checked={useSVT}
                      onChange={(e) => setUseSVT(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="use-svt" className="text-sm font-medium text-emerald-800">
                      🪙 Sử dụng SVT token để thanh toán (1 VND = 0.1 SVT)
                    </label>
                  </div>
                </div>

                {/* Reward Preview */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎁</div>
                    <p className="text-lg font-bold text-yellow-800 mb-2">
                      Phần thưởng của bạn
                    </p>
                    <p className="text-2xl font-bold text-yellow-700">
                      +{contributionAmount ? (parseFloat(contributionAmount) * 0.1).toLocaleString() : '0'} SVT
                    </p>
                    <p className="text-sm text-yellow-600 mt-2">
                      ✨ Cảm ơn bạn đã đóng góp cho tương lai bền vững!
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleContribution}
                  disabled={!contributionAmount || contributionLoading}
                  className={`w-full ${categoryConfig[selectedProgram.category].buttonColor} text-white py-4 px-6 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3`}
                >
                  {contributionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <span className="text-xl">💚</span>
                      Xác nhận đóng góp
                      <span className="text-lg">✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(5deg); }
          66% { transform: translateY(5px) rotate(-5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(-5deg); }
          66% { transform: translateY(8px) rotate(5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-float-0 { animation: float 5s ease-in-out infinite; }
        .animate-float-1 { animation: float-delayed 6s ease-in-out infinite; }
        .animate-float-2 { animation: float-slow 7s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .slow { animation-duration: 3s; }
      `}</style>
    </div>
  )
}

export default ESGPrograms