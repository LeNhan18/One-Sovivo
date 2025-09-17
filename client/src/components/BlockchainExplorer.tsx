import React from 'react';

interface BlockchainExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
  metadata: any;
}

const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({
  isOpen,
  onClose,
  tokenId,
  metadata
}) => {
  if (!isOpen) return null;

  // Generate mock blockchain data
  const generateBlockchainData = () => {
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const blockNumber = Math.floor(Math.random() * 1000000) + 18000000;
    const timestamp = new Date().toISOString();
    const gasUsed = Math.floor(Math.random() * 100000) + 50000;
    
    return {
      txHash,
      blockNumber,
      timestamp,
      gasUsed,
      contractAddress: '0x742d35Cc6638C0532925a3b8D9C9c5353C702F8D',
      network: 'Sovico Chain',
      status: 'Success',
      gasPrice: '20 gwei'
    };
  };

  const blockchainData = generateBlockchainData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2e] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🔗 Sovico Chain Explorer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Overview */}
          <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📊 Transaction Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Transaction Hash:</span>
                <div className="text-blue-400 font-mono break-all">{blockchainData.txHash}</div>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 ml-2 flex items-center gap-1">
                  ✅ {blockchainData.status}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Block Number:</span>
                <div className="text-white">{blockchainData.blockNumber.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Timestamp:</span>
                <div className="text-white">{new Date(blockchainData.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Gas Used:</span>
                <div className="text-white">{blockchainData.gasUsed.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Gas Price:</span>
                <div className="text-white">{blockchainData.gasPrice}</div>
              </div>
            </div>
          </div>

          {/* NFT Details */}
          <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🎫 NFT Passport Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Token ID:</span>
                <div className="text-white font-mono">#{tokenId}</div>
              </div>
              <div>
                <span className="text-gray-400">Token Standard:</span>
                <div className="text-white">ERC-721</div>
              </div>
              <div>
                <span className="text-gray-400">Contract Address:</span>
                <div className="text-blue-400 font-mono break-all">{blockchainData.contractAddress}</div>
              </div>
              <div>
                <span className="text-gray-400">Network:</span>
                <div className="text-white">{blockchainData.network}</div>
              </div>
              <div>
                <span className="text-gray-400">Name:</span>
                <div className="text-white">{metadata?.name || `NFT Passport #${tokenId}`}</div>
              </div>
              <div>
                <span className="text-gray-400">Owner:</span>
                <div className="text-blue-400 font-mono">0x1234...5678</div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📝 Metadata
            </h3>
            <div className="bg-[#161b22] rounded p-3 overflow-x-auto">
              <pre className="text-gray-300 text-xs">
{JSON.stringify({
  name: metadata?.name || `NFT Passport #${tokenId}`,
  description: metadata?.description || "Sovico Passport NFT - Unlock exclusive travel benefits",
  image: "https://sovico.com/nft/passport.png",
  attributes: metadata?.attributes || [
    { "trait_type": "Rank", "value": "Silver" },
    { "trait_type": "Level", "value": 2 },
    { "trait_type": "SVT Balance", "value": 1500 },
    { "trait_type": "Achievements", "value": 4 }
  ],
  external_url: `https://sovico.com/nft/${tokenId}`,
  animation_url: null
}, null, 2)}
              </pre>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📋 Recent Transactions
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-[#161b22] rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span className="text-white">Mint</span>
                </div>
                <div className="text-gray-400">2 days ago</div>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#161b22] rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">🔄</span>
                  <span className="text-white">Update Metadata</span>
                </div>
                <div className="text-gray-400">1 day ago</div>
              </div>
              <div className="flex justify-between items-center p-2 bg-[#161b22] rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">🎁</span>
                  <span className="text-white">Achievement Unlocked</span>
                </div>
                <div className="text-gray-400">6 hours ago</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              🔗 View on Etherscan
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              📤 Share Transaction
            </button>
            <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              📋 Copy Hash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainExplorer;