import React, { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  source: string;
  date: string;
  balance?: number;
  blockHash: string;
  confirmations: number;
  fee?: number;
}

interface NFTAchievement {
  id: number;
  name: string;
  description: string;
  badge_image_url?: string;
  unlocked_at: string;
}

const TransactionHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'nfts' | 'analytics'>('transactions');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'spend' | 'transfer'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [achievements, setAchievements] = useState<NFTAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [totalSVT, setTotalSVT] = useState(0);

  // Helper functions
  const getSourceFromType = (type: string): string => {
    if (type.includes('hdbank')) return 'HDBank';
    if (type.includes('vietjet')) return 'Vietjet';
    if (type.includes('resort')) return 'Sovico Resort';
    if (type.includes('marketplace')) return 'SVT Marketplace';
    return 'Sovico Platform';
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'earn': return '🔥';
      case 'spend': return '💳';
      case 'transfer': return '🔄';
      default: return '💰';
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'earn': return 'text-green-400';
      case 'spend': return 'text-red-400';
      case 'transfer': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  // Get customer ID from auth
  useEffect(() => {
    const fetchCustomerId = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setCustomerId(1001); // fallback
          return;
        }

        const response = await fetch('http://127.0.0.1:5000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const user = await response.json();
          setCustomerId(user.customer_id || 1001);
        } else {
          setCustomerId(1001);
        }
      } catch (error) {
        console.error('Error fetching customer ID:', error);
        setCustomerId(1001);
      }
    };

    fetchCustomerId();
  }, []);

  // Fetch transactions from database
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!customerId) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/tokens?customer_id=${customerId}`);
        if (response.ok) {
          const data = await response.json();

          // Convert API data to Transaction format
          const convertedTransactions: Transaction[] = data.map((tx: any) => ({
            id: tx.id?.toString() || `TXN_${Date.now()}`,
            type: tx.transaction_type === 'earn' ? 'earn' :
                  tx.transaction_type === 'spend' ? 'spend' : 'transfer',
            amount: parseFloat(tx.amount) || 0,
            description: tx.description || 'SVT Transaction',
            category: tx.transaction_type || 'general',
            source: getSourceFromType(tx.transaction_type || ''),
            date: tx.created_at || new Date().toISOString(),
            balance: parseFloat(tx.balance_after) || 0,
            blockHash: `0x${Math.random().toString(16).substr(2, 12)}...`,
            confirmations: Math.floor(Math.random() * 50) + 1,
            fee: tx.transaction_type === 'spend' ? Math.abs(parseFloat(tx.amount)) * 0.01 : 0
          }));

          setTransactions(convertedTransactions);

          // Calculate total SVT balance
          if (convertedTransactions.length > 0) {
            const latestBalance = convertedTransactions[0]?.balance || 0;
            setTotalSVT(latestBalance);
          }
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [customerId]);

  // Fetch NFT achievements from database
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!customerId) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/nft/achievements?customer_id=${customerId}`);
        if (response.ok) {
          const data = await response.json();
          setAchievements(data);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [customerId]);

  const filteredTransactions = transactions.filter(tx => {
    const typeMatch = filterType === 'all' || tx.type === filterType;

    if (!typeMatch) return false;

    if (filterPeriod === 'all') return true;

    const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return new Date(tx.date) >= cutoff;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔗 Blockchain Explorer
          </h1>
          <p className="text-gray-300">
            Theo dõi giao dịch SVT và NFT achievements của bạn
          </p>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">💰 Tổng SVT Balance</h3>
            <p className="text-3xl font-bold">{formatCurrency(totalSVT)} SVT</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">📊 Tổng Giao Dịch</h3>
            <p className="text-3xl font-bold">{transactions.length}</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">🏆 NFT Achievements</h3>
            <p className="text-3xl font-bold">{achievements.length}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {[
              { key: 'transactions', label: '💳 Giao Dịch', icon: '💳' },
              { key: 'nfts', label: '🏆 NFT Achievements', icon: '🏆' },
              { key: 'analytics', label: '📊 Phân Tích', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as any)}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="90d">90 ngày qua</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả loại</option>
                <option value="earn">Thu nhập</option>
                <option value="spend">Chi tiêu</option>
                <option value="transfer">Chuyển khoản</option>
              </select>
            </div>

            {/* Transaction List */}
            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400 text-lg">Không có giao dịch nào trong khoảng thời gian này</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {getStatusIcon(transaction.type)}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">
                            {transaction.description}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {transaction.source} • {formatDate(transaction.date)}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Block: {transaction.blockHash} • {transaction.confirmations} confirmations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${getStatusColor(transaction.type)}`}>
                          {transaction.type === 'earn' ? '+' : '-'}{formatCurrency(transaction.amount)} SVT
                        </p>
                        <p className="text-gray-400 text-sm">
                          Balance: {formatCurrency(transaction.balance || 0)} SVT
                        </p>
                        {transaction.fee && (
                          <p className="text-gray-500 text-xs">
                            Fee: {formatCurrency(transaction.fee)} SVT
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* NFTs Tab */}
        {activeTab === 'nfts' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.length === 0 ? (
                <div className="col-span-full bg-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400 text-lg">Chưa có NFT achievement nào</p>
                </div>
              ) : (
                achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🏆</div>
                      <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>
                      <p className="text-purple-100 mb-4">{achievement.description}</p>
                      <p className="text-purple-200 text-sm">
                        Unlocked: {formatDate(achievement.unlocked_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-white text-xl font-bold mb-4">📊 Thống Kê Giao Dịch</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tổng thu nhập:</span>
                  <span className="text-green-400 font-bold">
                    +{formatCurrency(transactions.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.amount, 0))} SVT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tổng chi tiêu:</span>
                  <span className="text-red-400 font-bold">
                    -{formatCurrency(transactions.filter(t => t.type === 'spend').reduce((sum, t) => sum + t.amount, 0))} SVT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Số giao dịch tháng này:</span>
                  <span className="text-blue-400 font-bold">
                    {transactions.filter(t => {
                      const date = new Date(t.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-white text-xl font-bold mb-4">🎯 Hoạt Động Gần Đây</h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(tx.type)}</span>
                      <span className="text-gray-300 text-sm">{tx.description.slice(0, 30)}...</span>
                    </div>
                    <span className={`text-sm font-bold ${getStatusColor(tx.type)}`}>
                      {tx.type === 'earn' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
