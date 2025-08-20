import React, { useState } from 'react';

interface Transaction {
  id: string;
  type: 'earn' | 'spend' | 'transfer' | 'bonus';
  amount: number;
  description: string;
  category: string;
  source: string;
  date: string;
  balance: number;
  blockHash: string;
  confirmations: number;
  fee?: number;
}

interface NFTAchievement {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedDate: string;
  milestone: string;
  attributes: {
    flights?: number;
    savings?: number;
    transactions?: number;
    loyalty_months?: number;
  };
  metadata: {
    creator: string;
    collection: string;
    blockchain: string;
  };
}

const TransactionHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'nfts' | 'analytics'>('transactions');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'spend' | 'transfer'>('all');

  const transactions: Transaction[] = [
    {
      id: 'TXN_001',
      type: 'earn',
      amount: 2000,
      description: 'Hoàn thành nhiệm vụ "Nhà Du hành Thông thái"',
      category: 'Mission Reward',
      source: 'Sovico Gamification System',
      date: '2025-08-19T10:30:00Z',
      balance: 15750,
      blockHash: '0x1a2b3c4d5e6f...',
      confirmations: 24,
      fee: 0
    },
    {
      id: 'TXN_002',
      type: 'spend',
      amount: -500,
      description: 'Mua voucher ăn uống 100K',
      category: 'Marketplace Purchase',
      source: 'SVT Marketplace',
      date: '2025-08-18T15:45:00Z',
      balance: 13750,
      blockHash: '0x2b3c4d5e6f7a...',
      confirmations: 48,
      fee: 5
    },
    {
      id: 'TXN_003',
      type: 'bonus',
      amount: 1200,
      description: 'Bonus 12% từ giao dịch HDBank',
      category: 'Transaction Bonus',
      source: 'HDBank Partnership',
      date: '2025-08-17T09:20:00Z',
      balance: 14250,
      blockHash: '0x3c4d5e6f7a8b...',
      confirmations: 72,
      fee: 0
    },
    {
      id: 'TXN_004',
      type: 'earn',
      amount: 800,
      description: 'Check-in chuyến bay VJ150 HAN-SGN',
      category: 'Flight Activity',
      source: 'Vietjet Partnership',
      date: '2025-08-16T06:15:00Z',
      balance: 13050,
      blockHash: '0x4d5e6f7a8b9c...',
      confirmations: 96,
      fee: 0
    },
    {
      id: 'TXN_005',
      type: 'earn',
      amount: 3000,
      description: 'Đạt milestone 100 giao dịch',
      category: 'Milestone Reward',
      source: 'Auto Achievement System',
      date: '2025-08-15T12:00:00Z',
      balance: 12250,
      blockHash: '0x5e6f7a8b9c0d...',
      confirmations: 120,
      fee: 0
    },
    {
      id: 'TXN_006',
      type: 'transfer',
      amount: -1500,
      description: 'Chuyển SVT cho NguyenVanB',
      category: 'P2P Transfer',
      source: 'User Transfer',
      date: '2025-08-14T18:30:00Z',
      balance: 9250,
      blockHash: '0x6f7a8b9c0d1e...',
      confirmations: 144,
      fee: 10
    },
    {
      id: 'TXN_007',
      type: 'spend',
      amount: -2500,
      description: 'Đổi voucher vé máy bay giảm 500K',
      category: 'Marketplace Purchase',
      source: 'SVT Marketplace',
      date: '2025-08-13T14:20:00Z',
      balance: 10750,
      blockHash: '0x7a8b9c0d1e2f...',
      confirmations: 168,
      fee: 15
    },
    {
      id: 'TXN_008',
      type: 'earn',
      amount: 5000,
      description: 'Thưởng khách hàng Platinum tháng 8',
      category: 'VIP Reward',
      source: 'Sovico Loyalty System',
      date: '2025-08-01T00:00:00Z',
      balance: 13250,
      blockHash: '0x8b9c0d1e2f3a...',
      confirmations: 456,
      fee: 0
    }
  ];

  const nftAchievements: NFTAchievement[] = [
    {
      id: 'NFT_001',
      tokenId: 'SVT_NFT_FF_001',
      name: 'First Flight Pioneer',
      description: 'Commemorate your first journey with Vietjet',
      image: '🛫',
      rarity: 'common',
      earnedDate: '2025-07-15T10:30:00Z',
      milestone: 'Complete first flight booking',
      attributes: {
        flights: 1
      },
      metadata: {
        creator: 'Sovico Digital Arts',
        collection: 'Aviation Milestones',
        blockchain: 'BSC (Binance Smart Chain)'
      }
    },
    {
      id: 'NFT_002', 
      tokenId: 'SVT_NFT_SC_002',
      name: 'Savings Champion',
      description: 'Master of financial discipline - reached 50M savings milestone',
      image: '🏆💰',
      rarity: 'rare',
      earnedDate: '2025-07-28T16:45:00Z',
      milestone: 'Accumulate 50,000,000 VND in savings',
      attributes: {
        savings: 50000000
      },
      metadata: {
        creator: 'HDBank Digital',
        collection: 'Financial Achievements',
        blockchain: 'BSC (Binance Smart Chain)'
      }
    },
    {
      id: 'NFT_003',
      tokenId: 'SVT_NFT_LS_003', 
      name: 'Loyalty Star',
      description: 'Shining bright in the Sovico ecosystem for 6 months',
      image: '⭐',
      rarity: 'epic',
      earnedDate: '2025-08-01T12:00:00Z',
      milestone: 'Active in ecosystem for 6 months',
      attributes: {
        loyalty_months: 6,
        transactions: 95
      },
      metadata: {
        creator: 'Sovico Ecosystem',
        collection: 'Loyalty Legends',
        blockchain: 'BSC (Binance Smart Chain)'
      }
    },
    {
      id: 'NFT_004',
      tokenId: 'SVT_NFT_SE_004',
      name: 'Sky Explorer',
      description: 'Legendary traveler who conquered 25 destinations',
      image: '🌏✈️',
      rarity: 'legendary',
      earnedDate: '2025-08-10T08:20:00Z',
      milestone: 'Visit 25 different destinations',
      attributes: {
        flights: 25
      },
      metadata: {
        creator: 'Vietjet Adventures',
        collection: 'Travel Legends',
        blockchain: 'BSC (Binance Smart Chain)'
      }
    }
  ];

  const formatSVT = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300';
      case 'rare': return 'border-blue-300';
      case 'epic': return 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50';
      case 'legendary': return 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50';
      default: return 'border-gray-300';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn': return '📈';
      case 'spend': return '🛒';
      case 'transfer': return '↔️';
      case 'bonus': return '🎁';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn': return 'text-green-600';
      case 'spend': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      case 'bonus': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const now = new Date();
    const txDate = new Date(tx.date);
    let daysDiff = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);

    const periodMatch = filterPeriod === 'all' || 
      (filterPeriod === '7d' && daysDiff <= 7) ||
      (filterPeriod === '30d' && daysDiff <= 30) ||
      (filterPeriod === '90d' && daysDiff <= 90);

    const typeMatch = filterType === 'all' || tx.type === filterType;

    return periodMatch && typeMatch;
  });

  const totalEarned = filteredTransactions
    .filter(tx => tx.type === 'earn' || tx.type === 'bonus')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSpent = filteredTransactions
    .filter(tx => tx.type === 'spend')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy vào clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Blockchain Explorer</h2>
        <p className="text-indigo-100">Lịch sử giao dịch SVT minh bạch và NFT thành tựu</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'transactions', label: 'Giao dịch', icon: '📊' },
          { key: 'nfts', label: 'NFT Collection', icon: '🎨' },
          { key: 'analytics', label: 'Phân tích', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex space-x-2">
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="90d">3 tháng qua</option>
                </select>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="earn">Kiếm được</option>
                  <option value="spend">Chi tiêu</option>
                  <option value="transfer">Chuyển khoản</option>
                  <option value="bonus">Thưởng</option>
                </select>
              </div>

              <div className="flex space-x-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">+{formatSVT(totalEarned)}</div>
                  <div className="text-gray-600">Đã kiếm</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">-{formatSVT(totalSpent)}</div>
                  <div className="text-gray-600">Đã chi</div>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
              {filteredTransactions.map(transaction => (
                <div key={transaction.id} className="card p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{getTransactionIcon(transaction.type)}</div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-600 space-x-2">
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span>{transaction.source}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'spend' || transaction.type === 'transfer' ? '-' : '+'}
                        {formatSVT(transaction.amount)} SVT
                      </div>
                      <div className="text-sm text-gray-600">
                        Số dư: {formatSVT(transaction.balance)} SVT
                      </div>
                      {transaction.fee && transaction.fee > 0 && (
                        <div className="text-xs text-gray-500">
                          Phí: {transaction.fee} SVT
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blockchain Details */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Block Hash:</span>
                        <div className="font-mono bg-gray-100 p-1 rounded mt-1 cursor-pointer hover:bg-gray-200"
                             onClick={() => copyToClipboard(transaction.blockHash)}>
                          {transaction.blockHash}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Confirmations:</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            transaction.confirmations >= 12 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.confirmations} confirmations
                            {transaction.confirmations >= 12 && ' ✓'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">NFT Collection</h3>
              <div className="text-sm text-gray-600">
                {nftAchievements.length} NFT được sở hữu
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nftAchievements.map(nft => (
                <div key={nft.id} className={`card p-4 ${getRarityBorder(nft.rarity)} hover:shadow-lg transition-all`}>
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-2">{nft.image}</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(nft.rarity)}`}>
                      {nft.rarity.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-bold text-lg mb-2 text-center">{nft.name}</h4>
                  <p className="text-sm text-gray-600 mb-3 text-center">{nft.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Milestone:</span>
                      <div className="text-gray-600">{nft.milestone}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Earned:</span>
                      <div className="text-gray-600">{formatDate(nft.earnedDate)}</div>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Attributes:</div>
                    <div className="space-y-1">
                      {Object.entries(nft.attributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="border-t pt-3">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Token ID: <span className="font-mono">{nft.tokenId}</span></div>
                      <div>Collection: {nft.metadata.collection}</div>
                      <div>Creator: {nft.metadata.creator}</div>
                      <div>Blockchain: {nft.metadata.blockchain}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 btn btn-outline text-sm">View Details</button>
                    <button className="flex-1 btn btn-primary text-sm">Share</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Phân tích giao dịch</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-blue-600">{transactions.length}</div>
                <div className="text-sm text-gray-600">Tổng giao dịch</div>
              </div>
              
              <div className="card p-4 text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatSVT(transactions.reduce((sum, tx) => 
                    tx.type === 'earn' || tx.type === 'bonus' ? sum + tx.amount : sum, 0
                  ))}
                </div>
                <div className="text-sm text-gray-600">Tổng kiếm được</div>
              </div>
              
              <div className="card p-4 text-center">
                <div className="text-3xl mb-2">🛒</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatSVT(transactions.reduce((sum, tx) => 
                    tx.type === 'spend' ? sum + Math.abs(tx.amount) : sum, 0
                  ))}
                </div>
                <div className="text-sm text-gray-600">Tổng chi tiêu</div>
              </div>
              
              <div className="card p-4 text-center">
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-2xl font-bold text-purple-600">{nftAchievements.length}</div>
                <div className="text-sm text-gray-600">NFT sở hữu</div>
              </div>
            </div>

            {/* Activity Chart Placeholder */}
            <div className="card p-6">
              <h4 className="font-bold mb-4">Hoạt động SVT theo thời gian</h4>
              <div className="h-40 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-4xl mb-2">📊</div>
                  <div>Biểu đồ hoạt động SVT</div>
                  <div className="text-sm">(Coming Soon)</div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card p-6">
              <h4 className="font-bold mb-4">Phân loại giao dịch</h4>
              <div className="space-y-3">
                {['Mission Reward', 'Marketplace Purchase', 'Transaction Bonus', 'Flight Activity'].map(category => {
                  const categoryTxns = transactions.filter(tx => tx.category === category);
                  const categoryTotal = categoryTxns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
                  const percentage = (categoryTotal / transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)) * 100;
                  
                  return (
                    <div key={category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-gray-600">{formatSVT(categoryTotal)} SVT</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
