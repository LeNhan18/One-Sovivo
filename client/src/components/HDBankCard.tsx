import React, { useState, useEffect } from 'react';

interface HDBankCardProps {
  customerId: number;
  onSuccess?: () => void;
}

interface CardInfo {
  has_card: boolean;
  card_id?: string;
  card_name?: string;
  card_number?: string;
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

const BankIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const HDBankCard: React.FC<HDBankCardProps> = ({ customerId, onSuccess }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCard, setOpeningCard] = useState(false);
  const [processingService, setProcessingService] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      console.log('🔍 HDBankCard Debug - Customer ID:', customerId);
      
      // Add cache busting
      const timestamp = new Date().getTime();
      const response = await fetch(`http://127.0.0.1:5000/api/service/hdbank/dashboard/${customerId}?_t=${timestamp}`);
      const data = await response.json();
      
      console.log('🔍 HDBankCard Debug - Dashboard Response:', data);
      
      if (data.success) {
        setDashboardData(data);
      } else {
        console.log('❌ Dashboard failed, checking if need auto-fix...');
        // Check if this might be an existing customer without card record
        if (data.error && (data.error.includes('Customer ID') || data.error.includes('not found'))) {
          console.log('🔧 Attempting auto-fix for missing customer card...');
          await attemptAutoFix();
        } else {
          setMessage(data.message || 'Lỗi tải dữ liệu');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setMessage('Lỗi kết nối server');
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
        // Recheck dashboard after auto-fix
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
        // Refresh dashboard sau khi mở thẻ thành công
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

      // Customize request based on service type
      if (serviceType === 'transfer') {
        requestBody.amount = 5000000; // 5 triệu VND default
        requestBody.transfer_type = 'internal';
      } else if (serviceType === 'loan') {
        requestBody.loan_amount = 50000000; // 50 triệu VND default
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
        // Refresh dashboard to update transaction history
        setTimeout(() => {
          fetchDashboard();
          onSuccess?.();
        }, 2000);
      } else {
        // Nếu lỗi do chưa có thẻ, hiển thị thông báo đặc biệt
        if (result.error_code === 'NO_CARD') {
          setMessage(`⚠️ ${result.message}`);
          // Auto scroll to open card section
          const openCardSection = document.getElementById('open-card-section');
          openCardSection?.scrollIntoView({ behavior: 'smooth' });
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
      <div className="bg-[#161B22] rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BankIcon />
          <h3 className="text-lg font-semibold text-white">HDBank</h3>
        </div>
        <div className="text-gray-400">Đang tải...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="bg-[#161B22] rounded-xl p-6">
        <div className="text-red-400">{message || 'Không thể tải dữ liệu'}</div>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BankIcon />
          <div>
            <h3 className="text-lg font-semibold text-white">HDBank</h3>
            <p className="text-sm text-gray-400">Dịch vụ ngân hàng số</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Khách hàng</p>
          <p className="text-white font-medium">{dashboardData.customer_name}</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-blue-900/30 border border-blue-500/30">
          <p className="text-sm text-blue-300">{message}</p>
        </div>
      )}

      {/* No Card State */}
      {!dashboardData.has_card && dashboardData.action_required && (
        <div id="open-card-section" className="text-center py-8">
          <div className="mb-6">
            <CreditCardIcon />
            <h4 className="text-xl font-semibold text-white mb-2">
              {dashboardData.action_required.title}
            </h4>
            <p className="text-gray-400 mb-4">
              {dashboardData.action_required.description}
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-[#0D1117] rounded-lg p-4 mb-6">
            <h5 className="text-white font-medium mb-3">🎁 Quyền lợi đặc biệt:</h5>
            <div className="space-y-2">
              {dashboardData.action_required.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckIcon />
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open Card Button */}
          <button
            onClick={handleOpenCard}
            disabled={openingCard}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
              openingCard
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
            }`}
          >
            {openingCard ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang mở thẻ...</span>
              </span>
            ) : (
              dashboardData.action_required.button_text
            )}
          </button>
        </div>
      )}

      {/* Has Card State */}
      {dashboardData.has_card && dashboardData.card_info && (
        <div>
          {/* Card Info */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 mb-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{dashboardData.card_info.card_name}</h4>
              <CreditCardIcon />
            </div>
            <p className="text-lg font-mono tracking-wider">
              {dashboardData.card_info.card_number}
            </p>
            <div className="flex justify-between text-sm mt-3">
              <span>Ngày mở: {dashboardData.card_info.opened_date}</span>
              <span>✅ Hoạt động</span>
            </div>
          </div>

          {/* Account Summary */}
          {dashboardData.account_summary && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0D1117] rounded-lg p-3">
                <p className="text-gray-400 text-sm">Số dư hiện tại</p>
                <p className="text-white font-semibold">
                  {dashboardData.account_summary.current_balance.toLocaleString()} VND
                </p>
              </div>
              <div className="bg-[#0D1117] rounded-lg p-3">
                <p className="text-gray-400 text-sm">Giao dịch</p>
                <p className="text-white font-semibold">
                  {dashboardData.account_summary.total_transactions}
                </p>
              </div>
            </div>
          )}

          {/* Available Services */}
          {dashboardData.available_services && dashboardData.available_services.length > 0 && (
            <div>
              <h5 className="text-white font-medium mb-3">Dịch vụ có sẵn:</h5>
              <div className="space-y-3">
                {dashboardData.available_services.map((service, index) => (
                  <button
                    key={index}
                    onClick={() => handleServiceAction(service.type, service.endpoint)}
                    disabled={processingService === service.type}
                    className={`w-full p-4 rounded-lg border border-gray-600 hover:border-blue-500 transition-all text-left ${
                      processingService === service.type
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-[#0D1117] hover:bg-[#1C2128]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div>
                          <h6 className="text-white font-medium">{service.title}</h6>
                          <p className="text-gray-400 text-sm">{service.description}</p>
                        </div>
                      </div>
                      {processingService === service.type && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
  );
};

export default HDBankCard;
