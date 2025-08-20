import React, { useState } from 'react';
import axios from 'axios';

interface VIPSimulationProps {
  onSimulationComplete?: (result: any) => void;
  customerId?: number;
}

interface SimulationResult {
  success: boolean;
  customer_id: number;
  achievements_earned: number;
  highest_rank: string;
  blockchain_updates: any[];
  total_svt_reward: number;
  message: string;
}

const VIPSimulation: React.FC<VIPSimulationProps> = ({ 
  onSimulationComplete,
  customerId = 1 
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateVIPUpgrade = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`🎭 Starting VIP simulation for customer ${customerId}...`);
      
      const response = await axios.post('http://127.0.0.1:5000/simulate_event', {
        event_type: 'vip_upgrade',
        customer_id: customerId
      });

      if (response.data.success) {
        setResult(response.data);
        console.log('✅ VIP simulation successful:', response.data);
        
        // Notify parent component
        if (onSimulationComplete) {
          onSimulationComplete(response.data);
        }
      } else {
        setError(response.data.message || 'Simulation failed');
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Network error';
      setError(errorMessage);
      console.error('❌ VIP simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const simulateOtherEvent = async (eventType: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/simulate_event', {
        event_type: eventType,
        customer_id: customerId
      });

      if (response.data.success) {
        console.log(`✅ ${eventType} simulation successful:`, response.data);
        
        // Show brief success message
        setResult({
          success: true,
          customer_id: customerId,
          achievements_earned: 1,
          highest_rank: eventType === 'high_roller' ? 'Diamond' : 'Gold',
          blockchain_updates: [{
            achievement: eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            transaction_hash: response.data.transaction_hash
          }],
          total_svt_reward: eventType === 'high_roller' ? 5000 : 1000,
          message: response.data.message
        });

        if (onSimulationComplete) {
          onSimulationComplete(response.data);
        }
      } else {
        setError(response.data.message || 'Simulation failed');
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Network error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">🎭 Customer Achievement Simulation</h3>
        <span className="text-sm text-gray-500">Customer #{customerId}</span>
      </div>

      {/* Simulation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={simulateVIPUpgrade}
          disabled={loading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Simulating...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">👑</span>
              Mô phỏng Khách hàng đạt VIP
            </span>
          )}
        </button>

        <button
          onClick={() => simulateOtherEvent('frequent_flyer')}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200"
        >
          <span className="flex items-center justify-center">
            <span className="mr-2">✈️</span>
            Frequent Flyer
          </span>
        </button>

        <button
          onClick={() => simulateOtherEvent('high_roller')}
          disabled={loading}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200"
        >
          <span className="flex items-center justify-center">
            <span className="mr-2">💎</span>
            High Roller
          </span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <div>
              <h4 className="text-sm font-medium text-red-800">Simulation Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result Display */}
      {result && result.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-green-500 mr-2 mt-0.5">✅</span>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Simulation Successful!
              </h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Customer:</strong> #{result.customer_id}</p>
                <p><strong>Achievements:</strong> {result.achievements_earned} earned</p>
                <p><strong>Highest Rank:</strong> {result.highest_rank}</p>
                <p><strong>SVT Reward:</strong> {result.total_svt_reward.toLocaleString()} tokens</p>
                
                {result.blockchain_updates && result.blockchain_updates.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium mb-1">Blockchain Updates:</p>
                    <div className="space-y-1">
                      {result.blockchain_updates.map((update, index) => (
                        <div key={index} className="bg-green-100 rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{update.achievement}</span>
                            <span className="text-xs text-green-600">
                              {update.transaction_hash ? `TX: ${update.transaction_hash.slice(0, 8)}...` : 'Pending'}
                            </span>
                          </div>
                          {update.svt_reward > 0 && (
                            <div className="text-xs mt-1">
                              +{update.svt_reward.toLocaleString()} SVT
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How it works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• VIP simulation creates a high-value customer profile</li>
          <li>• AI analyzes the profile and detects multiple achievements</li>
          <li>• Blockchain smart contract is updated with new ranks and badges</li>
          <li>• NFT Passport automatically reflects the changes</li>
        </ul>
      </div>
    </div>
  );
};

export default VIPSimulation;
