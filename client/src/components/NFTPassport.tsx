import React, { useState, useEffect } from 'react';

// Type definitions for NFT metadata
interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
}

interface NFTPassportProps {
  tokenId: number;
  refreshTrigger?: number;
}

const NFTPassport: React.FC<NFTPassportProps> = ({ tokenId, refreshTrigger = 0 }) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch NFT data from backend API
  const fetchNFTData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/nft/${tokenId}`);
      const data = await response.json();
      
      if (data.success) {
        setMetadata(data.metadata);
      } else {
        setError(data.error || 'Failed to load NFT data');
        // Set fallback data
        setMetadata(data.metadata || {
          name: `Sovico Passport #${tokenId}`,
          description: 'Digital identity passport (offline mode)',
          image: 'https://via.placeholder.com/300x400/6B7280/white?text=Offline+Mode',
          attributes: [
            { trait_type: 'Status', value: 'Offline' },
            { trait_type: 'Level', value: 'Bronze' },
            { trait_type: 'SVT Points', value: 0 }
          ]
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch NFT data';
      setError(errorMessage);
      
      // Set fallback data for offline mode
      setMetadata({
        name: `Sovico Passport #${tokenId}`,
        description: 'Digital identity passport (offline mode)', 
        image: 'https://via.placeholder.com/300x400/6B7280/white?text=Offline+Mode',
        attributes: [
          { trait_type: 'Status', value: 'Offline' },
          { trait_type: 'Level', value: 'Bronze' },
          { trait_type: 'SVT Points', value: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchNFTData();
  }, [tokenId, refreshTrigger]);

  // Helper function to get level color
  const getLevelColor = (level: string | number): string => {
    const levelStr = String(level).toLowerCase();
    switch (levelStr) {
      case 'diamond':
        return 'text-purple-400 bg-purple-100';
      case 'platinum':
        return 'text-gray-600 bg-gray-100';
      case 'gold':
        return 'text-yellow-500 bg-yellow-100';
      case 'silver':
        return 'text-gray-500 bg-gray-100';
      case 'bronze':
      default:
        return 'text-orange-500 bg-orange-100';
    }
  };

  // Helper function to get badge emoji
  const getBadgeEmoji = (traitType: string): string => {
    switch (traitType.toLowerCase()) {
      case 'level':
        return '🏆';
      case 'svt points':
        return '💎';
      case 'achievements':
        return '🏅';
      case 'member since':
        return '📅';
      case 'status':
        return '⚡';
      case 'rank':
        return '👑';
      default:
        return '🔖';
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchNFTData();
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            NFT Passport Not Found
          </h3>
          <p className="text-gray-600 mb-4">
            {error || `No passport found for token ID ${tokenId}`}
          </p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <h2 className="text-lg font-bold">🆔 Sovico Passport</h2>
        <button
          onClick={handleRefresh}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200"
          title="Refresh NFT data"
        >
          🔄
        </button>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 m-4 rounded">
          <p className="text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* NFT Image */}
      <div className="p-6">
        <div className="relative">
          <img
            src={metadata.image}
            alt={metadata.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400/4F46E5/white?text=Sovico+Passport';
            }}
          />
          {/* Overlay badge for token ID */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            #{tokenId}
          </div>
        </div>

        {/* NFT Name and Description */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{metadata.name}</h3>
          <p className="text-gray-600 text-sm">{metadata.description}</p>
        </div>

        {/* Attributes Grid */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">📊 Passport Details</h4>
          {metadata.attributes.map((attr, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getBadgeEmoji(attr.trait_type)}</span>
                <span className="font-medium text-gray-700">{attr.trait_type}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                attr.trait_type.toLowerCase() === 'level' 
                  ? getLevelColor(attr.value)
                  : 'text-blue-600 bg-blue-100'
              }`}>
                {attr.value}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            🚀 Powered by Sovico Blockchain Technology
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFTPassport;
