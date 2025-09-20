import React, { useState, useEffect } from 'react';

interface HDBankCardProps {
  customerId: number;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface CardInfo {
  has_card: boolean;
  card_id?: string;
  card_name?: string;
  card_number?: string;
  card_type?: string;
  credit_limit?: number;
  opened_date?: string;
}

interface ActionRequired {
  type: string;
  title: string;
  description: string;
  benefits: string[];
  button_text: string;
  endpoint: string;
}

interface DashboardData {
  success: boolean;
  customer_id: number;
  customer_name: string;
  has_card: boolean;
  card_info?: CardInfo;
  action_required?: ActionRequired;
  available_services?: Array<{
    type: string;
    title: string;
    description: string;
    endpoint: string;
    icon: string;
  }>;
  account_summary?: {
    total_transactions: number;
    total_spent: number;
    total_received: number;
    current_balance: number;
  };
}

// Modern Bank Icon Component
const BankIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const HDBankCard: React.FC<HDBankCardProps> = ({ customerId, onSuccess, onBack }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [openingCard, setOpeningCard] = useState(false);
  const [processingService, setProcessingService] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      console.log('🔍 HDBankCard Debug - Customer ID:', customerId);
      
      const response = await fetch(`http://127.0.0.1:5000/api/service/hdbank/dashboard/${customerId}?_t=${Date.now()}`);
      const data = await response.json();
      
      console.log('🔍 HDBankCard Debug - Dashboard Response:', data);
      
      if (response.ok && data.success) {
        setDashboardData(data);
        setMessage('');
      } else {
        console.error('❌ Dashboard fetch failed:', data);
        setMessage(data.message || 'Không thể tải dữ liệu dashboard');
        
        // Auto-fix for existing customers
        if (data.message && data.message.includes('chưa có thẻ')) {
          attemptAutoFix();
        }
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setMessage('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const attemptAutoFix = async () => {
    try {
      console.log('🔧 Auto-fixing customer card for ID:', customerId);
      const response = await fetch(`http://127.0.0.1:5000/api/fix/auto-create-card/${customerId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Auto-fix successful, rechecking dashboard...');
        setMessage('🔧 Đã tự động tạo thẻ cho tài khoản hiện có. Đang tải lại...');
        setTimeout(() => {
          fetchDashboard();
        }, 1500);
      } else {
        console.log('❌ Auto-fix failed:', data.message);
        setMessage(data.message || 'Cần mở thẻ mới để sử dụng dịch vụ');
      }
    } catch (err) {
      console.error('❌ Auto-fix error:', err);
      setMessage('Cần mở thẻ mới để sử dụng dịch vụ');
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [customerId]);

  const handleOpenCard = async () => {
    try {
      setOpeningCard(true);
      setMessage('');

      const response = await fetch('http://127.0.0.1:5000/api/service/hdbank/open-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          card_type: 'classic'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`🎉 ${result.message}`);
        setTimeout(() => {
          fetchDashboard();
          onSuccess?.();
        }, 2000);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error opening card:', error);
      setMessage('❌ Lỗi mở thẻ');
    } finally {
      setOpeningCard(false);
    }
  };

  const handleServiceAction = async (serviceType: string, endpoint: string) => {
    try {
      setProcessingService(serviceType);
      setMessage('');

      let requestBody: any = {
        customer_id: customerId
      };

      if (serviceType === 'transfer') {
        requestBody.amount = 5000000;
        requestBody.transfer_type = 'internal';
      } else if (serviceType === 'loan') {
        requestBody.loan_amount = 50000000;
        requestBody.loan_type = 'personal';
      }

      const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        setTimeout(() => {
          fetchDashboard();
          onSuccess?.();
        }, 2000);
      } else {
        if (result.error_code === 'NO_CARD') {
          setMessage(`⚠️ ${result.message}`);
        } else {
          setMessage(`❌ ${result.message}`);
        }
      }
    } catch (error) {
      console.error(`Error with ${serviceType}:`, error);
      setMessage(`❌ Lỗi ${serviceType === 'transfer' ? 'chuyển khoản' : 'đăng ký vay'}`);
    } finally {
      setProcessingService(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0B1426] via-[#1A2332] to-[#161B22] rounded-2xl border border-blue-500/20 shadow-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BankIcon />
          <h3 className="text-lg font-semibold text-white">HDBank</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="bg-gradient-to-br from-[#0B1426] via-[#1A2332] to-[#161B22] rounded-2xl border border-red-500/20 shadow-2xl p-6">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">⚠️ Lỗi kết nối</div>
          <div className="text-gray-400">{message || 'Không thể tải dữ liệu'}</div>
          <button 
            onClick={fetchDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/static/images/esg/hdbank.jpg" 
          alt="HDBank Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/75 to-slate-900/85"></div>
      </div>
      
      {/* Page Header */}
      <div className="relative z-10 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  🏦
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">HDBank</h1>
                  <p className="text-slate-400">Digital Banking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-[#0B1426]/90 via-[#1A2332]/90 to-[#161B22]/90 backdrop-blur-sm rounded-2xl border border-blue-500/20 shadow-2xl overflow-hidden">
      {/* Modern Header with HDBank Branding */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-300 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* HDBank Logo Container */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <img 
                src="./Image/hdbank.jpg" 
                alt="HDBank" 
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  // Fallback to icon if image not found
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <BankIcon className="hidden w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center">
                HDBank
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                  Digital Banking
                </span>
              </h3>
              <p className="text-blue-100 text-sm opacity-90">
                {dashboardData.customer_name} • ID: {dashboardData.customer_id}
              </p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${dashboardData.has_card ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`}></div>
            <span className="text-white text-sm font-medium">
              {dashboardData.has_card ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
            </span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="m-6 p-4 rounded-xl bg-blue-900/30 border border-blue-500/30 backdrop-blur-sm">
          <p className="text-sm text-blue-300">{message}</p>
        </div>
      )}

      {/* Card Opening Section - Modern Design */}
      {!dashboardData.has_card && dashboardData.action_required && (
        <div className="p-6">
          {/* Main Card Preview */}
          <div className="relative mb-8">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl transform perspective-1000 hover:rotate-y-5 transition-transform duration-500">
              {/* Card Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white/30 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border border-white/20 rounded-lg"></div>
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">HDBank Classic</h4>
                    <p className="text-blue-100 text-sm opacity-90">Miễn phí thường niên</p>
                  </div>
                  <div className="w-12 h-8 bg-white/20 rounded backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white font-bold text-xs">VISA</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="text-white/80 text-sm mb-1">Card Number</div>
                  <div className="font-mono text-white text-lg tracking-wider">•••• •••• •••• {String(dashboardData.customer_id).slice(-4)}</div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-white/80 text-xs mb-1">Cardholder</div>
                    <div className="text-white font-medium text-sm uppercase">{dashboardData.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-white/80 text-xs mb-1">Valid Thru</div>
                    <div className="text-white font-mono text-sm">12/28</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {dashboardData.action_required.benefits.map((benefit, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50/5 to-indigo-50/5 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm hover:border-blue-400/40 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <span className="text-gray-300 text-sm flex-1">{benefit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleOpenCard}
            disabled={openingCard}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
              openingCard
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {openingCard ? (
              <span className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang xử lý...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>🎯</span>
                <span>{dashboardData.action_required.button_text}</span>
              </span>
            )}
          </button>
          
          {/* Trust Indicators */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-gray-400 text-xs">
            <span className="flex items-center space-x-1">
              <span>🔒</span>
              <span>Bảo mật 256-bit</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Duyệt tức thì</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>🏆</span>
              <span>Ngân hàng #1</span>
            </span>
          </div>
        </div>
      )}

      {/* Has Card State - Already activated */}
      {dashboardData.has_card && dashboardData.card_info && (
        <div className="p-6">
          {/* Success Card Display */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg">{dashboardData.card_info.card_name}</h4>
                <p className="text-green-100 text-sm opacity-90">Đã kích hoạt thành công</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <p className="text-xl font-mono tracking-wider mb-2">
              {dashboardData.card_info.card_number}
            </p>
            <div className="flex justify-between text-sm">
              <span>Ngày mở: {dashboardData.card_info.opened_date}</span>
              {dashboardData.card_info.credit_limit && (
                <span>Hạn mức: {(dashboardData.card_info.credit_limit / 1000000).toFixed(0)}M VND</span>
              )}
            </div>
          </div>

          {/* Account Summary */}
          {dashboardData.account_summary && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50/5 to-indigo-50/5 border border-blue-500/20 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Số dư hiện tại</div>
                <div className="text-white font-bold text-lg">
                  {dashboardData.account_summary.current_balance.toLocaleString()} VND
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50/5 to-pink-50/5 border border-purple-500/20 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Giao dịch</div>
                <div className="text-white font-bold text-lg">
                  {dashboardData.account_summary.total_transactions}
                </div>
              </div>
            </div>
          )}

          {/* Available Services */}
          {dashboardData.available_services && dashboardData.available_services.length > 0 && (
            <div>
              <h5 className="text-white font-medium mb-4 flex items-center">
                <span className="mr-2">🚀</span>
                Dịch vụ khả dụng
              </h5>
              <div className="space-y-3">
                {dashboardData.available_services.map((service, index) => (
                  <button
                    key={index}
                    onClick={() => handleServiceAction(service.type, service.endpoint)}
                    disabled={processingService === service.type}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      processingService === service.type
                        ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-indigo-500/30 text-white hover:border-indigo-400 hover:from-indigo-600/30 hover:to-purple-600/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div>
                          <h6 className="font-medium">{service.title}</h6>
                          <p className="text-sm text-gray-400">{service.description}</p>
                        </div>
                      </div>
                      {processingService === service.type && (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default HDBankCard;
