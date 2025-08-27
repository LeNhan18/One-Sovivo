import React, { useState } from 'react';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: 'vietjet' | 'hdbank' | 'resort';
  userData?: any;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ 
  isOpen, 
  onClose, 
  serviceType,
  userData 
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen || !service) return null;

  const handleAction = async (actionType: string, actionData: any = {}) => {
    setLoading(true);
    try {
      await onAction(actionType, { ...actionData, customerId });
      setResult({ success: true, message: 'Thành công!' });
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        setResult(null);
      }, 2000);
    } catch (error) {
      setResult({ success: false, message: 'Có lỗi xảy ra!' });
    } finally {
      setLoading(false);
    }
  };

  const renderServiceContent = () => {
    switch (service.id) {
      case 'vietjet':
        return <VietjetContent onAction={handleAction} loading={loading} result={result} />;
      case 'hdbank':
        return <HDBankContent onAction={handleAction} loading={loading} result={result} />;
      case 'resort':
        return <ResortContent onAction={handleAction} loading={loading} result={result} />;
      case 'ai-advisor':
        return <AIAdvisorContent onAction={handleAction} loading={loading} result={result} />;
      default:
        return <DefaultContent service={service} onAction={handleAction} loading={loading} result={result} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161B22] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${service.color} p-6 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-4xl mr-4">{service.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">{service.name}</h2>
                <p className="text-white/80">{service.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-white">
          {renderServiceContent()}
        </div>
      </div>
    </div>
  );
};

// Vietjet Service Content
const VietjetContent: React.FC<{
  onAction: (type: string, data: any) => void;
  loading: boolean;
  result: any;
}> = ({ onAction, loading, result }) => {
  const [flightData, setFlightData] = useState({
    route: 'HAN-SGN',
    class: 'economy',
    passengers: 1
  });

  const routes = [
    { code: 'HAN-SGN', name: 'Hà Nội → TP.HCM', price: 2500000 },
    { code: 'SGN-DAD', name: 'TP.HCM → Đà Nẵng', price: 1800000 },
    { code: 'HAN-PQC', name: 'Hà Nội → Phú Quốc', price: 3200000 },
    { code: 'SGN-NRT', name: 'TP.HCM → Tokyo', price: 8500000 }
  ];

  const selectedRoute = routes.find(r => r.code === flightData.route);

  if (result) {
    return (
      <div className="text-center py-8">
        <div className={`text-6xl mb-4 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.success ? '✅' : '❌'}
        </div>
        <h3 className="text-xl font-bold mb-2">
          {result.success ? 'Đặt vé thành công!' : 'Đặt vé thất bại!'}
        </h3>
        <p className="text-gray-400 mb-4">{result.message}</p>
        {result.success && result.svtEarned && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <p className="text-green-300">
              🎉 Nhận {result.svtEarned} SVT từ booking này!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">✈️ Đặt vé máy bay</h3>
      
      {/* Route Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Chọn tuyến bay</label>
        <select
          value={flightData.route}
          onChange={(e) => setFlightData({...flightData, route: e.target.value})}
          className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2"
        >
          {routes.map(route => (
            <option key={route.code} value={route.code}>
              {route.name} - {route.price.toLocaleString('vi-VN')} VND
            </option>
          ))}
        </select>
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Hạng vé</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFlightData({...flightData, class: 'economy'})}
            className={`p-3 rounded-lg border ${flightData.class === 'economy' 
              ? 'border-blue-500 bg-blue-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">🛫</div>
            <div>Economy</div>
          </button>
          <button
            onClick={() => setFlightData({...flightData, class: 'business'})}
            className={`p-3 rounded-lg border ${flightData.class === 'business' 
              ? 'border-purple-500 bg-purple-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">💎</div>
            <div>Business</div>
          </button>
        </div>
      </div>

      {/* Passengers */}
      <div>
        <label className="block text-sm font-medium mb-2">Số hành khách</label>
        <input
          type="number"
          min="1"
          max="9"
          value={flightData.passengers}
          onChange={(e) => setFlightData({...flightData, passengers: parseInt(e.target.value)})}
          className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2"
        />
      </div>

      {/* Price Summary */}
      <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
        <h4 className="font-semibold mb-2">💰 Tóm tắt giá</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Vé cơ bản:</span>
            <span>{selectedRoute?.price.toLocaleString('vi-VN')} VND</span>
          </div>
          {flightData.class === 'business' && (
            <div className="flex justify-between">
              <span>Phụ phí Business:</span>
              <span>+{(selectedRoute?.price * 1.5).toLocaleString('vi-VN')} VND</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Số hành khách:</span>
            <span>×{flightData.passengers}</span>
          </div>
          <hr className="border-gray-600" />
          <div className="flex justify-between font-bold">
            <span>Tổng cộng:</span>
            <span>
              {((selectedRoute?.price || 0) * 
                (flightData.class === 'business' ? 2.5 : 1) * 
                flightData.passengers
              ).toLocaleString('vi-VN')} VND
            </span>
          </div>
        </div>
      </div>

      {/* SVT Reward Info */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <h4 className="text-blue-300 font-medium mb-2">🎁 Phần thưởng SVT</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Domestic flights: 100 SVT/booking</li>
          <li>• International flights: 300 SVT/booking</li>
          <li>• Business class: 2x SVT multiplier</li>
          <li>• Tích điểm Vietjet: +500 miles</li>
        </ul>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onAction('book_flight', flightData)}
        disabled={loading}
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-white"
      >
        {loading ? 'Đang đặt vé...' : '✈️ Mô phỏng Đặt vé ngay'}
      </button>
    </div>
  );
};

// HDBank Service Content
const HDBankContent: React.FC<{
  onAction: (type: string, data: any) => void;
  loading: boolean;
  result: any;
}> = ({ onAction, loading, result }) => {
  const [serviceType, setServiceType] = useState('transfer');
  const [amount, setAmount] = useState('');

  if (result) {
    return (
      <div className="text-center py-8">
        <div className={`text-6xl mb-4 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.success ? '✅' : '❌'}
        </div>
        <h3 className="text-xl font-bold mb-2">Giao dịch hoàn tất!</h3>
        <p className="text-gray-400 mb-4">{result.message}</p>
        {result.svtEarned && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <p className="text-green-300">🎉 Nhận {result.svtEarned} SVT!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">🏦 Dịch vụ HDBank</h3>
      
      {/* Service Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Loại giao dịch</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setServiceType('transfer')}
            className={`p-3 rounded-lg border ${serviceType === 'transfer' 
              ? 'border-blue-500 bg-blue-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">💳</div>
            <div>Chuyển khoản</div>
          </button>
          <button
            onClick={() => setServiceType('payment')}
            className={`p-3 rounded-lg border ${serviceType === 'payment' 
              ? 'border-green-500 bg-green-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">🛒</div>
            <div>Thanh toán</div>
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium mb-2">Số tiền (VND)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1,000,000"
          className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2"
        />
      </div>

      {/* SVT Reward Calculation */}
      {amount && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">💰 Phần thưởng SVT</h4>
          <p className="text-blue-200 text-sm">
            Bạn sẽ nhận: {Math.min(Math.floor(parseFloat(amount) * 0.001), 50)} SVT 
            <span className="text-gray-400"> (0.1% số tiền, tối đa 50 SVT)</span>
          </p>
        </div>
      )}

      <button
        onClick={() => onAction('banking_transaction', { type: serviceType, amount: parseFloat(amount) })}
        disabled={loading || !amount}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-white"
      >
        {loading ? 'Đang xử lý...' : '💳 Mô phỏng Giao dịch'}
      </button>
    </div>
  );
};

// Resort Service Content
const ResortContent: React.FC<{
  onAction: (type: string, data: any) => void;
  loading: boolean;
  result: any;
}> = ({ onAction, loading, result }) => {
  const [bookingData, setBookingData] = useState({
    resort: 'phu-quoc',
    nights: 2,
    room_type: 'deluxe'
  });

  const resorts = [
    { id: 'phu-quoc', name: 'Sovico Resort Phú Quốc', price: 3000000 },
    { id: 'da-nang', name: 'Sovico Resort Đà Nẵng', price: 2500000 },
    { id: 'nha-trang', name: 'Sovico Resort Nha Trang', price: 2800000 }
  ];

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4 text-green-400">🏖️</div>
        <h3 className="text-xl font-bold mb-2">Đặt phòng thành công!</h3>
        <p className="text-gray-400 mb-4">{result.message}</p>
        {result.svtEarned && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <p className="text-green-300">🎉 Nhận {result.svtEarned} SVT!</p>
          </div>
        )}
      </div>
    );
  }

  const selectedResort = resorts.find(r => r.id === bookingData.resort);
  const totalPrice = (selectedResort?.price || 0) * bookingData.nights * (bookingData.room_type === 'suite' ? 1.5 : 1);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">🏖️ Đặt phòng Resort</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">Chọn resort</label>
        <select
          value={bookingData.resort}
          onChange={(e) => setBookingData({...bookingData, resort: e.target.value})}
          className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2"
        >
          {resorts.map(resort => (
            <option key={resort.id} value={resort.id}>
              {resort.name} - {resort.price.toLocaleString('vi-VN')} VND/đêm
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Số đêm</label>
        <input
          type="number"
          min="1"
          max="30"
          value={bookingData.nights}
          onChange={(e) => setBookingData({...bookingData, nights: parseInt(e.target.value)})}
          className="w-full bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Loại phòng</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setBookingData({...bookingData, room_type: 'deluxe'})}
            className={`p-3 rounded-lg border ${bookingData.room_type === 'deluxe' 
              ? 'border-blue-500 bg-blue-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">🏨</div>
            <div>Deluxe</div>
          </button>
          <button
            onClick={() => setBookingData({...bookingData, room_type: 'suite'})}
            className={`p-3 rounded-lg border ${bookingData.room_type === 'suite' 
              ? 'border-purple-500 bg-purple-900/30' 
              : 'border-gray-600 bg-[#0D1117]'}`}
          >
            <div className="text-lg">👑</div>
            <div>Suite (+50%)</div>
          </button>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
        <h4 className="font-semibold mb-2">📊 Tóm tắt booking</h4>
        <div className="space-y-1 text-sm">
          <p>Resort: {selectedResort?.name}</p>
          <p>Loại phòng: {bookingData.room_type === 'suite' ? 'Suite' : 'Deluxe'}</p>
          <p>Số đêm: {bookingData.nights}</p>
          <p className="font-bold">Tổng cộng: {totalPrice.toLocaleString('vi-VN')} VND</p>
        </div>
      </div>

      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
        <h4 className="text-green-300 font-medium mb-2">🎁 Phần thưởng</h4>
        <p className="text-green-200 text-sm">
          • {bookingData.nights * 500} SVT (500 SVT/đêm)
          <br />
          • Tích điểm loyalty program
          <br />
          • Complimentary breakfast
        </p>
      </div>

      <button
        onClick={() => onAction('book_resort', bookingData)}
        disabled={loading}
        className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-white"
      >
        {loading ? 'Đang đặt phòng...' : '🏖️ Mô phỏng Đặt phòng'}
      </button>
    </div>
  );
};

// AI Advisor Content
const AIAdvisorContent: React.FC<{
  onAction: (type: string, data: any) => void;
  loading: boolean;
  result: any;
}> = ({ onAction, loading, result }) => {
  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4 text-blue-400">🤖</div>
        <h3 className="text-xl font-bold mb-2">Tư vấn hoàn tất!</h3>
        <p className="text-gray-400">{result.message}</p>
      </div>
    );
  }

  const advisoryTopics = [
    { id: 'investment', name: 'Tư vấn đầu tư', icon: '📈', reward: 50 },
    { id: 'savings', name: 'Kế hoạch tiết kiệm', icon: '💰', reward: 30 },
    { id: 'insurance', name: 'Bảo hiểm phù hợp', icon: '🛡️', reward: 40 },
    { id: 'loans', name: 'Tư vấn vay vốn', icon: '🏦', reward: 45 }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">🤖 AI Financial Advisor</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {advisoryTopics.map(topic => (
          <button
            key={topic.id}
            onClick={() => onAction('ai_consultation', { topic: topic.id })}
            disabled={loading}
            className="p-4 bg-[#0D1117] border border-gray-600 hover:border-blue-500 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">{topic.icon}</div>
            <div className="font-medium">{topic.name}</div>
            <div className="text-sm text-gray-400">+{topic.reward} SVT</div>
          </button>
        ))}
      </div>

      <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
        <h4 className="text-purple-300 font-medium mb-2">💡 AI Advisor Benefits</h4>
        <ul className="text-purple-200 text-sm space-y-1">
          <li>• Phân tích 360° profile tài chính</li>
          <li>• Đề xuất cá nhân hóa dựa trên AI</li>
          <li>• Nhận SVT reward cho mỗi tư vấn</li>
          <li>• Powered by Google Gemini AI</li>
        </ul>
      </div>
    </div>
  );
};

// Default Content for other services
const DefaultContent: React.FC<{
  service: any;
  onAction: (type: string, data: any) => void;
  loading: boolean;
  result: any;
}> = ({ service, onAction, loading, result }) => {
  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">{service.icon}</div>
        <h3 className="text-xl font-bold mb-2">Thao tác hoàn tất!</h3>
        <p className="text-gray-400">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl">{service.icon}</div>
      <h3 className="text-xl font-semibold">{service.name}</h3>
      <p className="text-gray-400">{service.description}</p>
      
      <div className="bg-[#0D1117] border border-gray-600 rounded-lg p-4">
        <p className="text-sm text-gray-400 mb-4">
          Dịch vụ này đang được phát triển. Bạn có thể mô phỏng sử dụng để nhận SVT!
        </p>
        <button
          onClick={() => onAction('simulate_service', { service: service.id })}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium"
        >
          {loading ? 'Đang xử lý...' : '🎮 Mô phỏng sử dụng dịch vụ'}
        </button>
      </div>
    </div>
  );
};

export default ServiceModal;
