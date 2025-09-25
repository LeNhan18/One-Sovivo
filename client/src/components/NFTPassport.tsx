import React, { useState, useEffect } from 'react';
import BlockchainExplorer from './BlockchainExplorer';

// QR Code generator function
const generateQRCode = (tokenId: number, metadata: NFTMetadata | null, size: number = 128): string => {
  // Create QR code content with NFT passport information
  const qrContent = JSON.stringify({
    tokenId: tokenId,
    name: metadata?.name || `NFT Passport #${tokenId}`,
    network: 'Sovico Chain',
    type: 'NFT_PASSPORT',
    url: `${window.location.origin}/nft/${tokenId}`
  });
  
  // Using QR Server API for generating QR codes
  const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: qrContent,
    format: 'png',
    bgcolor: '161B22',
    color: 'ffffff',
    qzone: '2'
  });
  return `${baseUrl}?${params.toString()}`;
};


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
  const [showQRCode, setShowQRCode] = useState(false);
  const [showBlockchainExplorer, setShowBlockchainExplorer] = useState(false);

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
    // Calculate rank based on actual SVT balance instead of hardcoded metadata
    if (svtBalance >= 200000) return 'Diamond';
    if (svtBalance >= 50000) return 'Gold';
    if (svtBalance >= 10000) return 'Silver';
    return 'Bronze';
  };

  const getCurrentRankBadge = (): string => {
    const rank = getCurrentRank();
    switch (rank.toLowerCase()) {
      case 'diamond': return '💎 Diamond';
      case 'gold': return '🥇 Gold';
      case 'silver': return '🥈 Silver';
      default: return '🥉 Bronze';
    }

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

      {/* Enhanced NFT Card Header */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🎫</span>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  {metadata?.name}
                </h3>
              </div>
              <p className="text-purple-200 text-sm mb-6 max-w-md leading-relaxed">
                {metadata?.description}
              </p>
              
              {/* Enhanced Rank Badge */}
              <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${getRankColor(getCurrentRank())} text-white font-bold text-sm shadow-lg hover:scale-105 transition-transform duration-300`}>
                <span className="mr-2 text-lg">{getCurrentRankBadge()}</span>
                <span>{getCurrentRank()} Member</span>
                <div className="ml-2 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Enhanced NFT Image */}
            <div className="ml-6 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative w-36 h-44 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-5xl border-2 border-white/20 group-hover:border-white/40 transition-all duration-300 group-hover:scale-105">
                🎫
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-xs">
                ✨
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {metadata?.attributes?.map((attr, index) => (
            <div 
              key={index} 
              className="group relative bg-gradient-to-br from-[#0D1117] to-gray-800/50 border border-gray-600/50 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-2 font-medium">
                  {attr.trait_type}
                </div>
                <div className="text-white font-bold text-lg group-hover:text-purple-200 transition-colors">
                  {attr.trait_type === 'SVT Points' ? svtBalance.toLocaleString('vi-VN') : 
                   attr.trait_type === 'Level' ? getCurrentRank() : attr.value}
                </div>
                <div className="mt-2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className="group relative bg-gradient-to-br from-[#0D1117] via-green-900/20 to-emerald-900/30 border border-green-700/50 rounded-xl p-5 hover:border-green-500/70 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Achievement Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                      {getAchievementIcon(achievement.name)}
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  
                  {/* Achievement Info */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-green-300 text-sm group-hover:text-green-200 transition-colors">
                      {achievement.name}
                    </h5>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-green-700/30">
                      <span className="text-green-500 text-xs font-medium">
                        Mở khóa: {new Date(achievement.unlocked_at).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <div className="text-6xl mb-4 animate-bounce">🎯</div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-xl"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">Chưa có thành tựu</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                Hãy sử dụng các dịch vụ Sovico để mở khóa thành tựu đầu tiên!
              </p>
              <div className="mt-4 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex flex-wrap gap-3">
            <button className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2">
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">📤</span>
              <span>Share NFT</span>
            </button>
            <button className="group bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center space-x-2">
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">🎨</span>
              <span>Customize</span>
            </button>
            <button 
              onClick={() => setShowBlockchainExplorer(true)}
              className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center space-x-2"
            >
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">🔗</span>
              <span>View on Blockchain</span>
            </button>
          </div>
        </div>

        {/* Enhanced QR Code Section */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex justify-center">
            <button
              onClick={() => setShowQRCode(!showQRCode)}
              className="group px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center gap-3"
            >
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">📱</span>
              <span>{showQRCode ? 'Ẩn QR Code' : 'Hiển thị QR Code'}</span>
            </button>
          </div>

          {showQRCode && (
            <div className="mt-6 flex flex-col items-center">
              <div className="relative bg-white p-6 rounded-2xl shadow-2xl border-2 border-purple-200">
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                  ✨
                </div>
                <img
                  src={generateQRCode(tokenId, metadata)}
                  alt="NFT Passport QR Code"
                  className="w-40 h-40 border-2 border-gray-200 rounded-xl"
                />
                <p className="text-sm text-gray-600 mt-3 text-center font-medium">
                  Mã QR cho NFT Passport #{tokenId}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Metadata Footer */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-400 font-medium">Token ID: #{tokenId}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400 font-medium">Network: Sovico Chain</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Explorer Modal */}
      <BlockchainExplorer
        isOpen={showBlockchainExplorer}
        onClose={() => setShowBlockchainExplorer(false)}
        tokenId={tokenId}
        metadata={metadata}
      />
    </div>
  );
};

export default NFTPassport;