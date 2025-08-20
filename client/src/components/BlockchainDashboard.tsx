import React, { useState } from 'react';
import NFTPassport from './NFTPassport';
import VIPSimulation from './VIPSimulation';

interface BlockchainDashboardProps {
  customerId?: number;
}

const BlockchainDashboard: React.FC<BlockchainDashboardProps> = ({ 
  customerId = 1 
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastSimulation, setLastSimulation] = useState<any>(null);

  // Handle simulation completion
  const handleSimulationComplete = (result: any) => {
    console.log('🎉 Simulation completed:', result);
    setLastSimulation(result);
    
    // Trigger NFT Passport refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success notification
    if (result.success) {
      // You can add toast notification here
      console.log(`✅ Customer ${result.customer_id} achieved ${result.achievements_earned} new achievements!`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">🔗 Blockchain Achievement System</h1>
        <p className="text-blue-100">
          Simulate customer achievements and watch the NFT Passport update in real-time
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Simulation Controls */}
        <div className="space-y-6">
          <VIPSimulation 
            customerId={customerId}
            onSimulationComplete={handleSimulationComplete}
          />
          
          {/* Last Simulation Info */}
          {lastSimulation && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                📊 Last Simulation Result
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                <p><strong>Event:</strong> {lastSimulation.message}</p>
                {lastSimulation.total_svt_reward > 0 && (
                  <p><strong>SVT Earned:</strong> {lastSimulation.total_svt_reward.toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: NFT Passport Display */}
        <div className="space-y-6">
          <NFTPassport 
            tokenId={customerId} 
            refreshTrigger={refreshTrigger}
          />
          
          {/* Blockchain Status */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              🔗 Blockchain Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="text-green-600 font-medium">Development</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contract:</span>
                <span className="text-blue-600 font-mono text-xs">0x5FbD...0aa3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="text-gray-800">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          🎯 How to Use the Blockchain Achievement System
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">1️⃣</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Choose Simulation</h3>
            <p className="text-sm text-gray-600">
              Click "Mô phỏng Khách hàng đạt VIP" or other achievement buttons to simulate customer behaviors.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">2️⃣</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Watch Updates</h3>
            <p className="text-sm text-gray-600">
              The AI analyzes the simulated profile, triggers achievements, and updates the blockchain smart contract.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">3️⃣</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">View NFT Passport</h3>
            <p className="text-sm text-gray-600">
              The NFT Passport automatically refreshes to show new ranks, badges, and updated metadata.
            </p>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-500 mr-2 mt-0.5">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Prerequisites</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Ganache blockchain running on localhost:7545</li>
                <li>• SovicoPassport smart contract deployed</li>
                <li>• Flask backend with blockchain integration enabled</li>
                <li>• At least one NFT minted for the customer ID</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainDashboard;
