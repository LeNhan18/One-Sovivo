import React, { useState, useEffect } from 'react';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  badge_image_url?: string;
  unlocked_at: string;
}

interface NFTPassportProps {
  tokenId: number;
  refreshTrigger?: number;
}

const NFTPassport: React.FC<NFTPassportProps> = ({ tokenId, refreshTrigger = 0 }) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svtBalance, setSvtBalance] = useState(0);

  useEffect(() => {
    fetchNFTData();
  }, [tokenId, refreshTrigger]);

  const fetchNFTData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch NFT metadata
      const nftResponse = await fetch(`http://127.0.0.1:5000/api/nft/${tokenId}`);
      const nftData = await nftResponse.json();
      
      if (nftData.success) {
        setMetadata(nftData.metadata);
      } else {
        // Fallback metadata if blockchain is offline
        setMetadata({
          name: `Sovico Passport #${tokenId}`,
          description: "Digital identity passport for Sovico ecosystem",
          image: "https://via.placeholder.com/300x400/6366F1/white?text=Sovico+NFT",
          attributes: [
            { trait_type: "Status", value: "Active" },
            { trait_type: "Level", value: "Bronze" },
            { trait_type: "SVT Points", value: 0 }
          ]
        });
      }

      // Fetch achievements
      const achievementsResponse = await fetch(`http://127.0.0.1:5000/api/nft/${tokenId}/achievements`);
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setAchievements(achievementsData.achievements || []);
      }

      // Fetch SVT balance
      const tokensResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${tokenId}`);
      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        setSvtBalance(tokensData.total_svt || 0);
      }

    } catch (err) {
      console.error('Error fetching NFT data:', err);
      setError('Không thể kết nối đến blockchain. Hiển thị dữ liệu offline.');
      
      // Fallback data
      setMetadata({
        name: `Sovico Passport #${tokenId}`,
        description: "Digital identity passport (offline mode)",
        image: "https://via.placeholder.com/300x400/6B7280/white?text=Offline+Mode",
        attributes: [
          { trait_type: "Status", value: "Offline" },
          { trait_type: "Level", value: "Bronze" },
          { trait_type: "SVT Points", value: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (achievementName: string): string => {
    const name = achievementName.toLowerCase();
    if (name.includes('frequent') || name.includes('bay') || name.includes('phi')) return '✈️';
    if (name.includes('high') || name.includes('roller') || name.includes('cao')) return '💎';
    if (name.includes('business') || name.includes('elite') || name.includes('doanh')) return '👔';
    if (name.includes('stay') || name.includes('guest') || name.includes('nghỉ')) return '🏖️';
    if (name.includes('resort') || name.includes('lover')) return '🌴';
    if (name.includes('loyalty') || name.includes('member') || name.includes('thành')) return '🏆';
    if (name.includes('first') || name.includes('đầu')) return '🥇';
    return '🎖️';
  };

  const getRankColor = (rank: string): string => {
    switch (rank?.toLowerCase()) {
      case 'diamond': return 'from-cyan-400 to-blue-600';
      case 'platinum': return 'from-gray-300 to-gray-500';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-400 to-gray-600';
      default: return 'from-orange-400 to-orange-600'; // Bronze
    }
  };

  const getCurrentRank = (): string => {
    const levelAttr = metadata?.attributes?.find(attr => attr.trait_type === 'Level');
    return levelAttr?.value as string || 'Bronze';
  };

  if (loading) {
    return (
      <div className="bg-[#161B22] border border-gray-700 rounded-xl p-6 text-white">
        <div className="animate-pulse">
          <div className="flex items-center justify-center mb-4">
            <div className="w-32 h-40 bg-gray-700 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] border border-gray-700 rounded-xl overflow-hidden text-white">
      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 p-3">
          <div className="flex items-center text-yellow-300 text-sm">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* NFT Card Header */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">{metadata?.name}</h3>
            <p className="text-purple-200 text-sm mb-4 max-w-md">{metadata?.description}</p>
            
            {/* Rank Badge */}
            <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${getRankColor(getCurrentRank())} text-white font-bold text-sm`}>
              <span className="mr-2">👑</span>
              {getCurrentRank()} Member
            </div>
          </div>
          
          {/* NFT Image */}
          <div className="ml-4">
            <div className="w-32 h-40 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-4xl border-2 border-white/20">
              🎫
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {metadata?.attributes?.map((attr, index) => (
            <div key={index} className="bg-[#0D1117] border border-gray-600 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                {attr.trait_type}
              </div>
              <div className="text-white font-bold">
                {attr.trait_type === 'SVT Points' ? svtBalance.toLocaleString('vi-VN') : attr.value}
              </div>
            </div>
          ))}
        </div>

        {/* Achievements Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold flex items-center">
              <span className="mr-2">🏆</span>
              Thành tựu ({achievements.length})
            </h4>
            <button
              onClick={fetchNFTData}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
            >
              <span className="mr-1">🔄</span>
              Refresh
            </button>
          </div>

          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gradient-to-r from-[#0D1117] to-green-900/30 border border-green-700 rounded-lg p-4 flex items-center"
                >
                  <div className="text-2xl mr-3">
                    {getAchievementIcon(achievement.name)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-green-300 text-sm">
                      {achievement.name}
                    </h5>
                    <p className="text-gray-400 text-xs mt-1">
                      {achievement.description}
                    </p>
                    <p className="text-green-500 text-xs mt-1">
                      Mở khóa: {new Date(achievement.unlocked_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-gray-400 text-sm">
                Chưa có thành tựu nào. <br />
                Hãy sử dụng các dịch vụ Sovico để mở khóa!
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              📤 Share NFT
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              🎨 Customize
            </button>
            <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              🔗 View on Blockchain
            </button>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>Token ID: #{tokenId}</span>
            <span>Network: Sovico Chain</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTPassport;
