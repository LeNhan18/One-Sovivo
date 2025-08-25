import React, { useState, useEffect } from 'react';

interface Mission {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  reward: number;
  badge: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  deadline: string;
  category: 'aviation' | 'finance' | 'shopping' | 'travel' | 'combo';
  claimed?: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: string;
  nftTokenId?: string;
}

interface SVTTransaction {
  id: string;
  type: 'earn' | 'spend' | 'transfer';
  amount: number;
  description: string;
  date: string;
  source: string;
  balance: number;
}

const SVTWallet: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'missions' | 'achievements' | 'history'>('wallet');
  const [svtBalance, setSvtBalance] = useState(0);
  const [totalLifetimeEarned, setTotalLifetimeEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [transactions, setTransactions] = useState<SVTTransaction[]>([]);

  // Get customer ID from auth
  useEffect(() => {
    const getCustomerId = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await fetch('http://127.0.0.1:5000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const user = await response.json();
          setCustomerId(user.customer_id || 1001);
        }
      } catch (error) {
        console.error('Error getting customer ID:', error);
        setCustomerId(1001); // fallback
      }
    };
    
    getCustomerId();
  }, []);

  // Fetch real data when customerId is available
  useEffect(() => {
    if (!customerId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch SVT balance
        const tokensResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${customerId}`);
        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          setSvtBalance(tokensData.total_svt || 0);
          
          // Calculate lifetime earned (sum of all positive transactions)
          const lifetime = tokensData.transactions?.filter((t: any) => t.amount > 0)
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          setTotalLifetimeEarned(lifetime);
          
          // Format transactions for display
          const formattedTxs = tokensData.transactions?.map((tx: any) => ({
            id: tx.id.toString(),
            type: tx.amount > 0 ? 'earn' as const : 'spend' as const,
            amount: Math.abs(tx.amount),
            description: tx.description || tx.transaction_type,
            date: new Date(tx.created_at).toLocaleDateString('vi-VN'),
            source: tx.transaction_type,
            balance: tokensData.total_svt
          })) || [];
          setTransactions(formattedTxs);
        }

        // Fetch achievements
        const achievementsResponse = await fetch(`http://127.0.0.1:5000/api/nft/${customerId}/achievements`);
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          const formattedAchievements = achievementsData.achievements?.map((ach: any) => ({
            id: ach.id.toString(),
            name: ach.name,
            description: ach.description,
            icon: ach.badge_image_url || '🏆',
            earnedDate: new Date(ach.unlocked_at).toLocaleDateString('vi-VN')
          })) || [];
          setAchievements(formattedAchievements);
        }

        // For missions, we'll create some dynamic missions based on customer data
        const customerResponse = await fetch(`http://127.0.0.1:5000/customer/${customerId}`);
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          const dynamicMissions = generateDynamicMissions(customerData);
          setMissions(dynamicMissions);
        }

      } catch (error) {
        console.error('Error fetching wallet data:', error);
        // Fallback missions với business logic thực tế
        setMissions([
          {
            id: 'M001',
            title: 'Khám Phá Sovico',
            description: 'Đăng nhập và khám phá các dịch vụ Sovico để nhận thưởng',
            requirements: ['Đăng nhập hệ thống', 'Xem profile NFT'],
            reward: 100,
            badge: '🎯',
            progress: 1,
            maxProgress: 1,
            isCompleted: true,
            deadline: '2025-12-31',
            category: 'combo'
          },
          {
            id: 'M002', 
            title: 'Nhà Đầu Tư Mới',
            description: 'Bắt đầu hành trình đầu tư với gói cơ bản',
            requirements: ['Nạp tối thiểu 1,000,000 VND'],
            reward: 500,
            badge: '�',
            progress: 0,
            maxProgress: 1,
            isCompleted: false,
            deadline: '2025-12-31',
            category: 'finance'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId]);

  // Function to generate dynamic missions based on customer data
  const generateDynamicMissions = (customerData: any): Mission[] => {
    const missions: Mission[] = [];
    const today = new Date();
    const deadline = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 🎯 PROFILE COMPLETION MISSIONS
    const profileComplete = customerData.basic_info?.name && customerData.basic_info?.age && customerData.basic_info?.city;
    if (!profileComplete) {
      missions.push({
        id: 'M_PROFILE',
        title: 'Hoàn Thiện Hồ Sơ',
        description: 'Cập nhật đầy đủ thông tin cá nhân để nhận 500 SVT',
        requirements: ['Điền họ tên', 'Điền tuổi', 'Điền thành phố'],
        reward: 500,
        badge: '👤',
        progress: 0,
        maxProgress: 1,
        isCompleted: false,
        deadline,
        category: 'combo'
      });
    }

    // ✅ DAILY CHECK-IN MISSIONS
    missions.push({
      id: 'M_CHECKIN',
      title: 'Điểm Danh Hàng Ngày',
      description: 'Đăng nhập mỗi ngày để nhận 100 SVT',
      requirements: ['Đăng nhập vào app'],
      reward: 100,
      badge: '📅',
      progress: 1,
      maxProgress: 1,
      isCompleted: true,
      deadline,
      category: 'combo'
    });

    // 💰 FIRST TRANSACTION MISSION
    missions.push({
      id: 'M_FIRST_TRANSACTION',
      title: 'Giao Dịch Đầu Tiên',
      description: 'Thực hiện giao dịch đầu tiên để nhận 300 SVT',
      requirements: ['Mua sắm hoặc chuyển tiền qua Sovico'],
      reward: 300,
      badge: '💳',
      progress: 0,
      maxProgress: 1,
      isCompleted: false,
      deadline,
      category: 'finance'
    });

    // ✈️ FLIGHT MISSIONS
    const flights = customerData.vietjet_summary?.total_flights_last_year || 0;
    if (flights < 10) {
      missions.push({
        id: 'M_FLIGHT',
        title: 'Phi Công Mới',
        description: 'Thực hiện 3 chuyến bay để nâng cấp tài khoản',
        requirements: ['Đặt và hoàn thành 3 chuyến bay Vietjet'],
        reward: 1500,
        badge: '✈️',
        progress: flights % 3,
        maxProgress: 3,
        isCompleted: false,
        deadline,
        category: 'aviation'
      });
    }

    // 💰 BANKING MISSIONS
    const balance = customerData.hdbank_summary?.average_balance || 0;
    if (balance < 50000000) {
      missions.push({
        id: 'M_BANK',
        title: 'Nhà Đầu Tư Thông Minh',
        description: 'Duy trì số dư trung bình 50 triệu trong tháng',
        requirements: ['Gửi tiết kiệm tối thiểu 50,000,000 VND'],
        reward: 2000,
        badge: '💰',
        progress: Math.min(balance / 50000000, 1),
        maxProgress: 1,
        isCompleted: balance >= 50000000,
        deadline,
        category: 'finance'
      });
    }

    // 🏝️ RESORT MISSIONS
    const nights = customerData.resort_summary?.total_nights_stayed || 0;
    if (nights < 5) {
      missions.push({
        id: 'M_RESORT',
        title: 'Người Nghỉ Dưỡng',
        description: 'Trải nghiệm 2 đêm tại resort Sovico',
        requirements: ['Đặt và nghỉ 2 đêm tại resort'],
        reward: 1000,
        badge: '🏝️',
        progress: nights % 2,
        maxProgress: 2,
        isCompleted: false,
        deadline,
        category: 'travel'
      });
    }

    // 🛒 MARKETPLACE MISSIONS
    missions.push({
      id: 'M_MARKETPLACE',
      title: 'Mua Sắm Thông Minh',
      description: 'Mua 3 sản phẩm từ SVT Marketplace',
      requirements: ['Mua 3 items bất kỳ với SVT'],
      reward: 800,
      badge: '🛒',
      progress: 0,
      maxProgress: 3,
      isCompleted: false,
      deadline,
      category: 'shopping'
    });

    // 🤖 AI ASSISTANT MISSIONS
    missions.push({
      id: 'M_AI',
      title: 'Tương Tác AI',
      description: 'Hỏi 5 câu hỏi với AI Financial Advisor',
      requirements: ['Chat với AI Advisor về tài chính'],
      reward: 400,
      badge: '🤖',
      progress: 0,
      maxProgress: 5,
      isCompleted: false,
      deadline,
      category: 'combo'
    });

    // 📱 MOBILE APP MISSIONS
    missions.push({
      id: 'M_MOBILE',
      title: 'Mobile Super User',
      description: 'Cài đặt và sử dụng Sovico Mobile App',
      requirements: ['Download app', 'Đăng nhập mobile'],
      reward: 600,
      badge: '📱',
      progress: 0,
      maxProgress: 1,
      isCompleted: false,
      deadline,
      category: 'combo'
    });

    // 🎁 REFERRAL MISSIONS
    missions.push({
      id: 'M_REFERRAL',
      title: 'Giới Thiệu Bạn Bè',
      description: 'Mời 3 bạn bè tham gia Sovico ecosystem',
      requirements: ['Gửi mã giới thiệu', '3 bạn đăng ký thành công'],
      reward: 2500,
      badge: '🎁',
      progress: 0,
      maxProgress: 3,
      isCompleted: false,
      deadline,
      category: 'combo'
    });

    // 🏆 ACHIEVEMENT HUNTER
    missions.push({
      id: 'M_ACHIEVEMENT',
      title: 'Thợ Săn Thành Tựu',
      description: 'Mở khóa 10 achievements để trở thành VIP',
      requirements: ['Đạt 10 achievements bất kỳ'],
      reward: 3000,
      badge: '🏆',
      progress: 0,
      maxProgress: 10,
      isCompleted: false,
      deadline,
      category: 'combo'
    });

    return missions;
  };

  const handleCompleteMission = async (mission: Mission) => {
    try {
      // Simulate completing the mission
      setMissions(prev => prev.map(m => {
        if (m.id === mission.id) {
          return { 
            ...m, 
            isCompleted: true, 
            progress: m.maxProgress,
            claimed: false 
          };
        }
        return m;
      }));

      // Call API to update SVT balance (optional - for real implementation)
      // await fetch(`http://127.0.0.1:5000/api/missions/${mission.id}/complete`, { method: 'POST' });
      
      alert(`🎉 Hoàn thành nhiệm vụ "${mission.title}"! Nhấn "Nhận thưởng" để claim ${mission.reward} SVT.`);
    } catch (error) {
      console.error('Error completing mission:', error);
      alert('❌ Có lỗi xảy ra khi hoàn thành nhiệm vụ!');
    }
  };

  const claimMissionReward = async (missionId: string) => {
    try {
      const mission = missions.find(m => m.id === missionId);
      if (!mission || !mission.isCompleted || mission.claimed) return;

      // Call API to add SVT tokens to database
      const response = await fetch(`http://127.0.0.1:5000/api/tokens/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          amount: mission.reward,
          transaction_type: 'mission_reward',
          description: `Hoàn thành nhiệm vụ: ${mission.title}`
        })
      });

      if (response.ok) {
        // Update UI
        setMissions(prev => prev.map(m => {
          if (m.id === missionId) {
            return { ...m, claimed: true };
          }
          return m;
        }));
        
        setSvtBalance(current => current + mission.reward);
        alert(`🎉 Nhận thành công ${mission.reward} SVT!`);
      } else {
        throw new Error('Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('❌ Có lỗi xảy ra khi nhận thưởng!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Đang tải dữ liệu ví...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D1117] text-white p-6 rounded-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Ví Sovico Token (SVT)
        </h1>
        <p className="text-gray-400">Quản lý token, nhiệm vụ và thành tựu của bạn</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-purple-200 text-sm">Số dư hiện tại</p>
            <p className="text-4xl font-bold">{svtBalance.toLocaleString('vi-VN')} SVT</p>
            <p className="text-purple-200 text-sm mt-1">
              ≈ {(svtBalance * 1000).toLocaleString('vi-VN')} VND
            </p>
          </div>
          <div className="text-6xl">🪙</div>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-400">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-purple-200 text-sm">Tổng tích lũy</p>
              <p className="text-xl font-bold">{totalLifetimeEarned.toLocaleString('vi-VN')} SVT</p>
            </div>
            <div>
              <p className="text-purple-200 text-sm">Thành tựu</p>
              <p className="text-xl font-bold">{achievements.length} huy hiệu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-[#161B22] rounded-lg p-1">
        {[
          { id: 'wallet', label: 'Tổng quan', icon: '💰' },
          { id: 'missions', label: 'Nhiệm vụ', icon: '🎯' },
          { id: 'achievements', label: 'Thành tựu', icon: '🏆' },
          { id: 'history', label: 'Lịch sử', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Nhiệm vụ hiện tại</h2>
            <span className="text-gray-400">{missions.filter(m => !m.isCompleted).length} nhiệm vụ đang hoạt động</span>
          </div>
          
          {missions.map(mission => (
            <div key={mission.id} className="bg-[#161B22] border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-4">{mission.badge}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{mission.title}</h3>
                    <p className="text-gray-400 text-sm">{mission.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-yellow-600 text-yellow-100 px-3 py-1 rounded-full text-sm font-bold">
                    +{mission.reward} SVT
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Đến {mission.deadline}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Tiến độ</span>
                  <span className="text-white">{mission.progress}/{mission.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(mission.progress / mission.maxProgress) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Yêu cầu:</p>
                <ul className="space-y-1">
                  {mission.requirements.map((req, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-center">
                      <span className="text-blue-400 mr-2">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              
              {mission.isCompleted ? (
                <button
                  onClick={() => claimMissionReward(mission.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  ✅ Nhận thưởng
                </button>
              ) : (
                <button
                  onClick={() => handleCompleteMission(mission)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  🎯 Hoàn thành nhiệm vụ
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Thành tựu đã đạt được</h2>
            <span className="text-gray-400">{achievements.length} huy hiệu</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map(achievement => (
              <div key={achievement.id} className="bg-[#161B22] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-4xl mb-3">{achievement.icon}</div>
                <h3 className="font-bold text-white mb-2">{achievement.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{achievement.description}</p>
                <p className="text-xs text-gray-500">Đạt được: {achievement.earnedDate}</p>
              </div>
            ))}
          </div>
          
          {achievements.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Chưa có thành tựu</h3>
              <p className="text-gray-500">Hoàn thành nhiệm vụ để nhận được huy hiệu đầu tiên!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Lịch sử giao dịch</h2>
            <span className="text-gray-400">{transactions.length} giao dịch</span>
          </div>
          
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="bg-[#161B22] border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    tx.type === 'earn' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                  }`}>
                    {tx.type === 'earn' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{tx.description}</p>
                    <p className="text-sm text-gray-400">{tx.date} • {tx.source}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    tx.type === 'earn' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} SVT
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Chưa có giao dịch</h3>
              <p className="text-gray-500">Bắt đầu sử dụng dịch vụ để tích lũy SVT!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Thống kê nhanh</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nhiệm vụ hoàn thành</span>
                  <span className="text-white font-bold">{missions.filter(m => m.isCompleted).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Thành tựu đạt được</span>
                  <span className="text-white font-bold">{achievements.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Giao dịch thực hiện</span>
                  <span className="text-white font-bold">{transactions.length}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Hoạt động gần đây</h3>
              <div className="space-y-3">
                {transactions.slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-white truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.date}</p>
                    </div>
                    <p className={`text-sm font-bold ${
                      tx.type === 'earn' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SVTWallet;
