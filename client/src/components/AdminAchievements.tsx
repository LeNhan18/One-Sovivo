import React, { useState, useEffect } from 'react';

interface Achievement {
  id: number;
  name: string;
  description: string;
  badge_image_url: string;
  created_at: string;
  criteria?: {
    flights_required?: number;
    balance_required?: number;
    resort_nights_required?: number;
    svt_balance_required?: number;
  };
}

interface Customer {
  customer_id: number;
  name: string;
  age?: number;
  gender?: string;
  city?: string;
  persona_type?: string;
  member_since?: string;
  stats?: {
    flight_count?: number;
    avg_balance?: number;
    resort_nights?: number;
    total_transactions?: number;
    achievement_count?: number;
  };
}

interface CustomerAchievement {
  id: number;
  achievement_id: number;
  achievement_name: string;
  badge_image_url: string;
  earned_at: string;
  svt_reward: number;
}

interface AdminAchievementsProps {
  onBackToDashboard?: () => void;
}

const AdminAchievements: React.FC<AdminAchievementsProps> = ({ onBackToDashboard }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAchievements, setCustomerAchievements] = useState<CustomerAchievement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'bulk' | 'create'>('search');

  // State for new achievement creation
  const [newAchievement, setNewAchievement] = useState({
    name: '',
    description: '',
    badge_image_url: ''
  });

  // Load achievements on component mount
  useEffect(() => {
    fetchAchievements();
  }, []);

  // Check if customer meets achievement criteria
  const checkAchievementEligibility = (achievement: Achievement, customer: Customer): boolean => {
    if (!achievement.criteria) return true; // No criteria means always eligible
    
    const { criteria } = achievement;
    const stats = customer.stats || {};
    
    // Check flight requirement
    if (criteria.flights_required && (stats.flight_count || 0) < criteria.flights_required) {
      return false;
    }
    
    // Check balance requirement
    if (criteria.balance_required && (stats.avg_balance || 0) < criteria.balance_required) {
      return false;
    }
    
    // Check resort nights requirement
    if (criteria.resort_nights_required && (stats.resort_nights || 0) < criteria.resort_nights_required) {
      return false;
    }
    
    // Check SVT balance requirement (not implemented in backend yet)
    if (criteria.svt_balance_required) {
      return false; // Always false since we don't have SVT balance data yet
    }
    
    return true;
  };

  // Get detailed eligibility reason
  const getEligibilityReason = (achievementName: string, customer: Customer): string => {
    const name = achievementName.toLowerCase();
    const stats = customer.stats || {};
    
    // Phi công achievements
    if (name.includes('phi công vàng')) {
      const current = stats.flight_count || 0;
      if (current >= 20) return `Đủ điều kiện: ${current}/20 chuyến bay`;
      return `Thiếu ${20 - current} chuyến bay (hiện tại: ${current}/20)`;
    }
    if (name.includes('phi công bạc')) {
      const current = stats.flight_count || 0;
      if (current >= 10) return `Đủ điều kiện: ${current}/10 chuyến bay`;
      return `Thiếu ${10 - current} chuyến bay (hiện tại: ${current}/10)`;
    }
    if (name.includes('phi công đồng')) {
      const current = stats.flight_count || 0;
      if (current >= 5) return `Đủ điều kiện: ${current}/5 chuyến bay`;
      return `Thiếu ${5 - current} chuyến bay (hiện tại: ${current}/5)`;
    }
    
    // VIP achievement
    if (name.includes('khách hàng vip') || name.includes('vip')) {
      const current = stats.avg_balance || 0;
      if (current >= 100_000_000) return `Đủ điều kiện: ${current.toLocaleString()} VNĐ`;
      return `Thiếu ${(100_000_000 - current).toLocaleString()} VNĐ (hiện tại: ${current.toLocaleString()}/100,000,000 VNĐ)`;
    }
    
    // Du lịch achievement
    if (name.includes('người du lịch') || name.includes('du lịch')) {
      const current = stats.resort_nights || 0;
      if (current >= 10) return `Đủ điều kiện: ${current}/10 đêm nghỉ dưỡng`;
      return `Thiếu ${10 - current} đêm nghỉ dưỡng (hiện tại: ${current}/10)`;
    }
    
    // SVT achievements
    if (name.includes('svt')) {
      return 'Đủ điều kiện (achievement đặc biệt)';
    }
    
    // Default
    return 'Đủ điều kiện (achievement đặc biệt)';
  };

  // Check eligibility using backend rules (name-based)
  const checkEligibilityByName = (achievementName: string, customer: Customer): boolean => {
    const name = achievementName.toLowerCase();
    const stats = customer.stats || {};
    
    // Phi công achievements
    if (name.includes('phi công vàng')) {
      return (stats.flight_count || 0) >= 20;
    }
    if (name.includes('phi công bạc')) {
      return (stats.flight_count || 0) >= 10;
    }
    if (name.includes('phi công đồng')) {
      return (stats.flight_count || 0) >= 5;
    }
    
    // VIP achievement
    if (name.includes('khách hàng vip') || name.includes('vip')) {
      return (stats.avg_balance || 0) >= 100_000_000;
    }
    
    // Du lịch achievement
    if (name.includes('người du lịch') || name.includes('du lịch')) {
      return (stats.resort_nights || 0) >= 10;
    }
    
    // SVT achievements (always true for now)
    if (name.includes('svt')) {
      return true;
    }
    
    // Default: allow other achievements
    return true;
  };

  const getAchievementRequirements = (achievement: Achievement): string => {
    if (!achievement.criteria) return '';
    
    const requirements = [];
    const { criteria } = achievement;
    
    if (criteria.flights_required) {
      requirements.push(`≥${criteria.flights_required} chuyến bay`);
    }
    if (criteria.balance_required) {
      requirements.push(`≥${criteria.balance_required.toLocaleString()} VND`);
    }
    if (criteria.resort_nights_required) {
      requirements.push(`≥${criteria.resort_nights_required} đêm resort`);
    }
    if (criteria.svt_balance_required) {
      requirements.push(`≥${criteria.svt_balance_required} SVT`);
    }
    
    return requirements.join(', ');
  };

  const fetchAchievements = async () => {
    try {
      console.log('Fetching achievements...');
      const response = await fetch('/admin/achievements/list');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Achievements data:', data);
        setAchievements(data.achievements || []);
      } else {
        console.error('Failed to fetch achievements:', response.status);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setMessage('❌ Không thể kết nối đến server');
    }
  };

  const searchCustomers = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      console.log('Searching customers with term:', searchTerm);
      const response = await fetch(`/admin/customers/search?q=${encodeURIComponent(searchTerm)}`);
      console.log('Search response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Search results:', data);
        setCustomers(data.customers || []);
      } else {
        console.error('Search failed:', response.status);
        setMessage('❌ Tìm kiếm thất bại');
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setMessage('❌ Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    
    try {
      const response = await fetch(`/admin/customer/${customer.customer_id}/achievements`);
      if (response.ok) {
        const data = await response.json();
        setCustomerAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching customer achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignAchievement = async (achievementId: number) => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      const response = await fetch('/admin/assign-achievement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id,
          achievement_id: achievementId
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        // Refresh customer achievements
        selectCustomer(selectedCustomer);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const autoAssignAchievements = async () => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      const response = await fetch('/admin/auto-assign-achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        // Refresh customer achievements
        selectCustomer(selectedCustomer);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const createAchievement = async () => {
    if (!newAchievement.name.trim() || !newAchievement.description.trim()) {
      setMessage('❌ Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/admin/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAchievement)
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setNewAchievement({ name: '', description: '', badge_image_url: '' });
        fetchAchievements(); // Refresh achievements list
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏆 Admin Achievement Management</h1>
            <p className="text-purple-100">
              Quản lý và gán huy hiệu cho khách hàng
            </p>
          </div>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              ← Quay lại Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm">{message}</p>
          <button
            onClick={() => setMessage('')}
            className="text-gray-400 hover:text-gray-600 text-xs mt-2"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'search', label: '🔍 Tìm & Gán', icon: '🔍' },
              { key: 'bulk', label: '📊 Phân tích hàng loạt', icon: '📊' },
              { key: 'create', label: '➕ Tạo achievement mới', icon: '➕' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search & Assign Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Customer Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm khách hàng:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập tên hoặc ID khách hàng..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                  />
                  <button
                    onClick={searchCustomers}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? '...' : 'Tìm'}
                  </button>
                </div>
              </div>

              {/* Customer Results */}
              {customers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Kết quả tìm kiếm:</h3>
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div
                        key={customer.customer_id}
                        onClick={() => selectCustomer(customer)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCustomer?.customer_id === customer.customer_id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{customer.name}</h4>
                            <p className="text-sm text-gray-600">ID: {customer.customer_id}</p>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {customer.stats?.flight_count !== undefined && (
                              <div>✈️ {customer.stats.flight_count} chuyến bay</div>
                            )}
                            {customer.stats?.avg_balance !== undefined && (
                              <div>💰 {customer.stats.avg_balance?.toLocaleString()} VND</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Customer Details */}
              {selectedCustomer && (
                <div className="border-t pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">👤 {selectedCustomer.name}</h3>
                      <p className="text-sm text-gray-600">Customer ID: {selectedCustomer.customer_id}</p>
                    </div>
                    <button
                      onClick={autoAssignAchievements}
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      🤖 Tự động phân tích & gán
                    </button>
                  </div>

                  {/* Current Achievements */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">Huy hiệu hiện tại:</h4>
                    {customerAchievements.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customerAchievements.map((ca) => (
                          <div key={ca.id} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              🏆
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-green-800">{ca.achievement_name}</h5>
                              <p className="text-xs text-green-600">
                                {new Date(ca.earned_at).toLocaleDateString()} • +{ca.svt_reward} SVT
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Chưa có huy hiệu nào</p>
                    )}
                  </div>

                  {/* Available Achievements to Assign */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Gán huy hiệu mới:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {achievements
                        .filter(ach => !customerAchievements.some(ca => ca.achievement_id === ach.id))
                        .map((achievement) => {
                          const isEligible = checkEligibilityByName(achievement.name, selectedCustomer);
                          const eligibilityReason = getEligibilityReason(achievement.name, selectedCustomer);
                          const requirements = getAchievementRequirements(achievement);
                          
                          return (
                            <div 
                              key={achievement.id} 
                              className={`flex flex-col p-3 border rounded-lg ${
                                isEligible 
                                  ? 'border-green-200 bg-green-50' 
                                  : 'border-red-200 bg-red-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isEligible ? 'bg-green-100' : 'bg-red-100'
                                  }`}>
                                    {isEligible ? '✅' : '❌'}
                                  </div>
                                  <div>
                                    <h5 className="font-medium">{achievement.name}</h5>
                                    <p className="text-xs text-gray-600">{achievement.description}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => assignAchievement(achievement.id)}
                                  disabled={loading || !isEligible}
                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                    isEligible
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  } disabled:opacity-50`}
                                >
                                  {isEligible ? 'Gán' : 'Chưa đủ điều kiện'}
                                </button>
                              </div>
                              
                              {requirements && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">Yêu cầu:</span> {requirements}
                                </div>
                              )}
                              
                              <div className={`text-xs mt-1 ${isEligible ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="font-medium">Trạng thái:</span> {eligibilityReason}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Analysis Tab */}
          {activeTab === 'bulk' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Đang phát triển</h3>
              <p className="text-gray-600">Tính năng phân tích và gán hàng loạt sẽ sớm có mặt</p>
            </div>
          )}

          {/* Create Achievement Tab */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên huy hiệu:
                </label>
                <input
                  type="text"
                  value={newAchievement.name}
                  onChange={(e) => setNewAchievement(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ví dụ: Phi công Vàng"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả:
                </label>
                <textarea
                  value={newAchievement.description}
                  onChange={(e) => setNewAchievement(prev => ({...prev, description: e.target.value}))}
                  placeholder="Ví dụ: Bay hơn 20 chuyến bay trong năm"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL hình ảnh huy hiệu:
                </label>
                <input
                  type="text"
                  value={newAchievement.badge_image_url}
                  onChange={(e) => setNewAchievement(prev => ({...prev, badge_image_url: e.target.value}))}
                  placeholder="/static/badges/pilot_gold.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={createAchievement}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : '➕ Tạo Achievement'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Achievements List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Danh sách Achievements hiện có</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  🏆
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{achievement.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    ID: {achievement.id} • {new Date(achievement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {achievements.length === 0 && (
          <p className="text-gray-500 text-center py-8">Chưa có achievements nào được tạo</p>
        )}
      </div>
    </div>
  );
};

export default AdminAchievements;
