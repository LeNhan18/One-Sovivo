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
  const [svtBalance, setSvtBalance] = useState(15750);
  const [totalLifetimeEarned, setTotalLifetimeEarned] = useState(45230);

  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'M001',
      title: 'Nhà Du hành Thông thái',
      description: 'Thực hiện 1 chuyến bay và gửi tiết kiệm 10 triệu trong tháng này',
      requirements: ['Đặt và hoàn thành 1 chuyến bay Vietjet', 'Gửi tiết kiệm tối thiểu 10,000,000 VND tại HDBank'],
      reward: 2000,
      badge: '🧠✈️',
      progress: 1,
      maxProgress: 2,
      isCompleted: false,
      deadline: '2025-08-31',
      category: 'combo'
    },
    {
      id: 'M002',
      title: 'Khách hàng Platinum',
      description: 'Duy trì số dư trung bình 50 triệu trong 3 tháng',
      requirements: ['Số dư TB ≥ 50,000,000 VND trong 90 ngày'],
      reward: 5000,
      badge: '💎',
      progress: 2,
      maxProgress: 3,
      isCompleted: false,
      deadline: '2025-09-15',
      category: 'finance'
    },
    {
      id: 'M003',
      title: 'Sky Explorer',
      description: 'Bay 5 tuyến khác nhau trong quý này',
      requirements: ['Hoàn thành 5 chuyến bay đến các điểm đến khác nhau'],
      reward: 3500,
      badge: '🌏✈️',
      progress: 3,
      maxProgress: 5,
      isCompleted: false,
      deadline: '2025-09-30',
      category: 'aviation'
    },
    {
      id: 'M004',
      title: 'Tín đồ Mua sắm',
      description: 'Chi tiêu 5 triệu qua HDSaison trong tháng',
      requirements: ['Tổng chi tiêu ≥ 5,000,000 VND qua HDSaison'],
      reward: 1500,
      badge: '🛍️💳',
      progress: 4,
      maxProgress: 5,
      isCompleted: false,
      deadline: '2025-08-31',
      category: 'shopping'
    }
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'A001',
      name: 'First Flight',
      description: 'Hoàn thành chuyến bay đầu tiên',
      icon: '🛫',
      earnedDate: '2025-07-15',
      nftTokenId: 'NFT_FF_001'
    },
    {
      id: 'A002',
      name: 'Savings Champion',
      description: 'Đạt mốc 50 triệu tiết kiệm',
      icon: '🏆💰',
      earnedDate: '2025-07-28',
    },
    {
      id: 'A003',
      name: 'Loyalty Star',
      description: 'Tham gia hệ sinh thái Sovico 6 tháng',
      icon: '⭐',
      earnedDate: '2025-08-01',
    }
  ]);

  const [transactions, setTransactions] = useState<SVTTransaction[]>([
    {
      id: 'T001',
      type: 'earn',
      amount: 2000,
      description: 'Hoàn thành nhiệm vụ "First Flight"',
      date: '2025-08-18',
      source: 'Mission Reward',
      balance: 15750
    },
    {
      id: 'T002',
      type: 'spend',
      amount: -500,
      description: 'Mua voucher ăn uống 100K',
      date: '2025-08-17',
      source: 'SVT Marketplace',
      balance: 13750
    },
    {
      id: 'T003',
      type: 'earn',
      amount: 1200,
      description: 'Giao dịch HDBank (Bonus 12%)',
      date: '2025-08-16',
      source: 'HDBank Transaction',
      balance: 14250
    },
    {
      id: 'T004',
      type: 'earn',
      amount: 800,
      description: 'Check-in Vietjet flight VJ150',
      date: '2025-08-15',
      source: 'Vietjet Reward',
      balance: 13050
    }
  ]);

  const completeMission = (missionId: string) => {
    setMissions(prev => prev.map(mission => {
      if (mission.id === missionId && mission.progress >= mission.maxProgress) {
        setSvtBalance(current => current + mission.reward);
        return { ...mission, isCompleted: true };
      }
      return mission;
    }));
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatSVT = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getProgressPercentage = (progress: number, max: number) => {
    return Math.min((progress / max) * 100, 100);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'aviation': return 'bg-blue-500';
      case 'finance': return 'bg-green-500';
      case 'shopping': return 'bg-purple-500';
      case 'travel': return 'bg-orange-500';
      case 'combo': return 'bg-gradient-to-r from-blue-500 to-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* SVT Balance Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ví Sovico Token</h2>
            <div className="text-3xl font-bold">{formatSVT(svtBalance)} SVT</div>
            <div className="text-purple-200 mt-1">
              Tổng cộng đã kiếm: {formatSVT(totalLifetimeEarned)} SVT
            </div>
          </div>
          <div className="text-6xl">🪙</div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-purple-400">
          <div className="text-center">
            <div className="text-2xl font-bold">{missions.filter(m => m.isCompleted).length}</div>
            <div className="text-purple-200 text-sm">Nhiệm vụ hoàn thành</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{achievements.length}</div>
            <div className="text-purple-200 text-sm">Thành tựu</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{achievements.filter(a => a.nftTokenId).length}</div>
            <div className="text-purple-200 text-sm">NFT sở hữu</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'wallet', label: 'Ví Token', icon: '🪙' },
          { key: 'missions', label: 'Nhiệm vụ', icon: '🎯' },
          { key: 'achievements', label: 'Thành tựu', icon: '🏆' },
          { key: 'history', label: 'Lịch sử', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-purple-600'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Thông tin Ví</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h4 className="font-semibold mb-3">Giá trị quy đổi</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>1 SVT =</span>
                    <span className="font-medium">1,000 VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng giá trị ví:</span>
                    <span className="font-bold text-green-600">{formatVND(svtBalance * 1000)}</span>
                  </div>
                </div>
              </div>
              <div className="card p-4">
                <h4 className="font-semibold mb-3">Cấp độ thành viên</h4>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">💎</div>
                  <div>
                    <div className="font-bold text-purple-600">Platinum</div>
                    <div className="text-sm text-gray-600">15,750 / 20,000 SVT để lên Diamond</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-600 h-2 rounded-full" style={{width: '78.75%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Nhiệm vụ hiện tại</h3>
              <span className="text-sm text-gray-600">
                {missions.filter(m => !m.isCompleted).length} nhiệm vụ đang thực hiện
              </span>
            </div>
            
            <div className="space-y-4">
              {missions.map(mission => (
                <div key={mission.id} className={`card p-4 border-l-4 ${getCategoryColor(mission.category)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl">{mission.badge}</span>
                        <h4 className="font-bold text-lg">{mission.title}</h4>
                        {mission.isCompleted && <span className="badge bg-green-500 text-white">✓ Hoàn thành</span>}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{mission.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <h5 className="font-medium">Yêu cầu:</h5>
                        <ul className="space-y-1">
                          {mission.requirements.map((req, index) => (
                            <li key={index} className="flex items-center space-x-2 text-sm">
                              <span className={index < mission.progress ? "text-green-500" : "text-gray-400"}>
                                {index < mission.progress ? "✅" : "⭕"}
                              </span>
                              <span className={index < mission.progress ? "line-through text-gray-500" : ""}>
                                {req}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tiến độ: {mission.progress}/{mission.maxProgress}</span>
                          <span>Phần thưởng: {formatSVT(mission.reward)} SVT</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getCategoryColor(mission.category)}`}
                            style={{width: `${getProgressPercentage(mission.progress, mission.maxProgress)}%`}}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Hạn: {new Date(mission.deadline).toLocaleDateString('vi-VN')}
                        </span>
                        {mission.progress >= mission.maxProgress && !mission.isCompleted && (
                          <button
                            onClick={() => completeMission(mission.id)}
                            className="btn btn-primary text-sm"
                          >
                            Nhận thưởng
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Thành tựu & NFT</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => (
                <div key={achievement.id} className="card p-4 text-center">
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h4 className="font-bold mb-2">{achievement.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                  <div className="text-xs text-gray-500 mb-2">
                    Đạt được: {new Date(achievement.earnedDate).toLocaleDateString('vi-VN')}
                  </div>
                  {achievement.nftTokenId && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-2 text-xs">
                      <div className="flex items-center justify-center space-x-1">
                        <span>🎨</span>
                        <span>NFT</span>
                      </div>
                      <div className="mt-1 font-mono text-xs opacity-80">
                        {achievement.nftTokenId}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Lịch sử giao dịch SVT</h3>
            <div className="space-y-3">
              {transactions.map(transaction => (
                <div key={transaction.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      transaction.type === 'earn' ? 'bg-green-500' : 
                      transaction.type === 'spend' ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                      {transaction.type === 'earn' ? '+' : transaction.type === 'spend' ? '-' : '↔'}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-gray-600">
                        {transaction.source} • {new Date(transaction.date).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      transaction.type === 'earn' ? 'text-green-600' : 
                      transaction.type === 'spend' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'earn' ? '+' : ''}{formatSVT(transaction.amount)} SVT
                    </div>
                    <div className="text-sm text-gray-600">
                      Số dư: {formatSVT(transaction.balance)} SVT
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SVTWallet;
