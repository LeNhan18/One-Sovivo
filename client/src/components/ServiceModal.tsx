import React, { useState } from 'react'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  serviceType: 'vietjet' | 'hdbank' | 'resort'
  userData?: any
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ 
  isOpen, 
  onClose, 
  serviceType, 
  userData 
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    // Vietjet fields
    flightType: 'domestic',
    departureDate: '',
    origin: 'HAN',
    destination: 'SGN',
    ticketClass: 'economy',
    
    // HDBank fields
    transferAmount: '5000000',
    transferType: 'internal',
    loanAmount: '500000000',
    loanType: 'personal',
    
    // Resort fields
    checkInDate: '',
    nights: '2',
    roomType: 'deluxe',
    spaType: 'massage'
  })

  if (!isOpen) return null

  const handleServiceAction = async (actionType: string) => {
    setIsProcessing(true)
    
    try {
      let apiUrl = ''
      let requestData: any = {
        customer_id: userData?.customerId || 1001
      }
      
      // Xác định API endpoint và data dựa trên service type và action
      if (serviceType === 'vietjet') {
        if (actionType === 'book_flight') {
          apiUrl = 'http://127.0.0.1:5000/api/service/vietjet/book-flight'
          requestData.flight_type = formData.flightType
          requestData.origin = formData.origin
          requestData.destination = formData.destination
          requestData.ticket_class = formData.ticketClass
          requestData.departure_date = formData.departureDate
        }
      } else if (serviceType === 'hdbank') {
        if (actionType === 'transfer') {
          apiUrl = 'http://127.0.0.1:5000/api/service/hdbank/transfer'
          requestData.amount = parseInt(formData.transferAmount)
          requestData.transfer_type = formData.transferType
        } else if (actionType === 'loan') {
          apiUrl = 'http://127.0.0.1:5000/api/service/hdbank/loan'
          requestData.loan_amount = parseInt(formData.loanAmount)
          requestData.loan_type = formData.loanType
        }
      } else if (serviceType === 'resort') {
        if (actionType === 'book_room') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/book-room'
          requestData.nights = parseInt(formData.nights)
          requestData.room_type = formData.roomType
          requestData.check_in_date = formData.checkInDate
        } else if (actionType === 'spa_booking') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/book-spa'
          requestData.spa_type = formData.spaType
        }
      }
      
      // Gọi API thực tế
      if (apiUrl) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        })
        
        const result = await response.json()
        
        if (result.success) {
          alert(`✅ ${result.message}\n🪙 Nhận được ${result.svt_reward} SVT tokens!\n📝 ID: ${result.booking_id || result.transaction_id || result.loan_id || result.flight_id}`)
          
          // Auto close modal after success
          setTimeout(() => {
            onClose()
            // Có thể trigger refresh data ở đây
            window.location.reload()
          }, 2000)
        } else {
          alert(`❌ ${result.message}`)
        }
      } else {
        // Fallback cho các action chưa implement
        let message = ''
        let svtReward = 0
        
        if (serviceType === 'vietjet' && actionType === 'check_miles') {
          message = '🎯 Bạn có ' + (userData?.services?.vietjet?.miles || 0) + ' dặm tích lũy'
          svtReward = 100
        } else if (serviceType === 'hdbank' && actionType === 'check_balance') {
          message = '💰 Số dư: ' + Math.round((userData?.services?.hdbank?.avg_balance || 0) / 1_000_000).toLocaleString('vi-VN') + ' triệu VND'
          svtReward = 200
        }
        
        if (message) {
          alert(`${message}\n🪙 Nhận được ${svtReward} SVT tokens!`)
          setTimeout(() => {
            onClose()
          }, 1000)
        }
      }
      
    } catch (error) {
      console.error('Service action error:', error)
      alert('❌ Có lỗi xảy ra khi kết nối với server. Vui lòng kiểm tra Flask server có đang chạy không.')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderServiceContent = () => {
    switch (serviceType) {
      case 'vietjet':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Vietjet Air</h3>
              <p className="text-gray-300">Đặt vé và quản lý chuyến bay</p>
            </div>
            
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{userData?.services?.vietjet?.flights || 0}</div>
                  <div className="text-red-200 text-sm">Chuyến bay năm nay</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{userData?.services?.vietjet?.miles || 0}</div>
                  <div className="text-red-200 text-sm">Dặm tích lũy</div>
                </div>
              </div>
            </div>

            {/* Flight Booking Form */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Loại chuyến bay</label>
                  <select 
                    value={formData.flightType}
                    onChange={(e) => setFormData({...formData, flightType: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500"
                  >
                    <option value="domestic">Nội địa</option>
                    <option value="international">Quốc tế</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Hạng vé</label>
                  <select 
                    value={formData.ticketClass}
                    onChange={(e) => setFormData({...formData, ticketClass: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500"
                  >
                    <option value="economy">Phổ thông</option>
                    <option value="business">Thương gia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Điểm đi</label>
                  <select 
                    value={formData.origin}
                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500"
                  >
                    <option value="HAN">Hà Nội (HAN)</option>
                    <option value="SGN">TP.HCM (SGN)</option>
                    <option value="DAD">Đà Nẵng (DAD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Điểm đến</label>
                  <select 
                    value={formData.destination}
                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500"
                  >
                    <option value="SGN">TP.HCM (SGN)</option>
                    <option value="HAN">Hà Nội (HAN)</option>
                    <option value="DAD">Đà Nẵng (DAD)</option>
                    <option value="NRT">Tokyo (NRT)</option>
                    <option value="ICN">Seoul (ICN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ngày khởi hành</label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500"
                />
              </div>

              <button
                onClick={() => handleServiceAction('book_flight')}
                disabled={isProcessing || !formData.departureDate}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? '⏳ Đang đặt vé...' : '✈️ Đặt vé máy bay'}
              </button>
              
              <button
                onClick={() => handleServiceAction('check_miles')}
                disabled={isProcessing}
                className="w-full bg-red-700 hover:bg-red-800 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? '⏳ Đang xử lý...' : '🎯 Kiểm tra dặm tích lũy'}
              </button>
            </div>
          </div>
        )

      case 'hdbank':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-2xl font-bold text-white mb-2">HDBank</h3>
              <p className="text-gray-300">Dịch vụ ngân hàng số</p>
            </div>
            
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {Math.round((userData?.services?.hdbank?.avg_balance || 0) / 1_000_000).toLocaleString('vi-VN')} triệu
                </div>
                <div className="text-blue-200 text-sm">Số dư trung bình</div>
              </div>
            </div>

            {/* Banking Forms */}
            <div className="space-y-4">
              {/* Transfer Form */}
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">💸 Chuyển khoản</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Số tiền (VND)</label>
                    <select 
                      value={formData.transferAmount}
                      onChange={(e) => setFormData({...formData, transferAmount: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="1000000">1,000,000 VND</option>
                      <option value="5000000">5,000,000 VND</option>
                      <option value="10000000">10,000,000 VND</option>
                      <option value="50000000">50,000,000 VND</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Loại chuyển khoản</label>
                    <select 
                      value={formData.transferType}
                      onChange={(e) => setFormData({...formData, transferType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="internal">Nội bộ HDBank</option>
                      <option value="interbank">Liên ngân hàng</option>
                      <option value="international">Quốc tế</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleServiceAction('transfer')}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang chuyển...' : '� Thực hiện chuyển khoản'}
                  </button>
                </div>
              </div>

              {/* Loan Form */}
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">�💰 Đăng ký vay</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Số tiền vay (VND)</label>
                    <select 
                      value={formData.loanAmount}
                      onChange={(e) => setFormData({...formData, loanAmount: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="100000000">100,000,000 VND</option>
                      <option value="500000000">500,000,000 VND</option>
                      <option value="1000000000">1,000,000,000 VND</option>
                      <option value="2000000000">2,000,000,000 VND</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Loại vay</label>
                    <select 
                      value={formData.loanType}
                      onChange={(e) => setFormData({...formData, loanType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="personal">Vay cá nhân</option>
                      <option value="home">Vay mua nhà</option>
                      <option value="car">Vay mua xe</option>
                      <option value="business">Vay kinh doanh</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleServiceAction('loan')}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '� Đăng ký khoản vay'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleServiceAction('check_balance')}
                disabled={isProcessing}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? '⏳ Đang xử lý...' : '💰 Kiểm tra số dư'}
              </button>
            </div>
          </div>
        )

      case 'resort':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🏨</div>
              <h3 className="text-2xl font-bold text-white mb-2">Resort & Spa</h3>
              <p className="text-gray-300">Đặt phòng và dịch vụ spa</p>
            </div>
            
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{userData?.services?.resorts?.nights_stayed || 0}</div>
                <div className="text-green-200 text-sm">Đêm nghỉ năm nay</div>
              </div>
            </div>

            {/* Resort Forms */}
            <div className="space-y-4">
              {/* Room Booking Form */}
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">🏨 Đặt phòng Resort</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Loại phòng</label>
                    <select 
                      value={formData.roomType}
                      onChange={(e) => setFormData({...formData, roomType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500"
                    >
                      <option value="standard">Standard (2,000,000/đêm)</option>
                      <option value="deluxe">Deluxe (3,500,000/đêm)</option>
                      <option value="suite">Suite (6,000,000/đêm)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Số đêm</label>
                      <select 
                        value={formData.nights}
                        onChange={(e) => setFormData({...formData, nights: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500"
                      >
                        <option value="1">1 đêm</option>
                        <option value="2">2 đêm</option>
                        <option value="3">3 đêm</option>
                        <option value="7">7 đêm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Ngày nhận phòng</label>
                      <input
                        type="date"
                        value={formData.checkInDate}
                        onChange={(e) => setFormData({...formData, checkInDate: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleServiceAction('book_room')}
                    disabled={isProcessing || !formData.checkInDate}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang đặt phòng...' : '🏨 Đặt phòng Resort'}
                  </button>
                </div>
              </div>

              {/* Spa Booking Form */}
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">💆‍♀️ Đặt dịch vụ Spa</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Loại dịch vụ</label>
                    <select 
                      value={formData.spaType}
                      onChange={(e) => setFormData({...formData, spaType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500"
                    >
                      <option value="massage">Massage (1,500,000)</option>
                      <option value="facial">Facial (1,200,000)</option>
                      <option value="body_treatment">Body Treatment (2,000,000)</option>
                      <option value="premium_package">Premium Package (3,500,000)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleServiceAction('spa_booking')}
                    disabled={isProcessing}
                    className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang đặt spa...' : '💆‍♀️ Đặt dịch vụ Spa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center text-white">
            <p>Dịch vụ không khả dụng</p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1117] border border-gray-700 rounded-xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#0D1117] z-10">
          <h2 className="text-xl font-bold text-white">Dịch vụ Sovico</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderServiceContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/30 sticky bottom-0 bg-[#0D1117]">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <span>🪙</span>
            <span>Nhận SVT token cho mỗi giao dịch</span>
          </div>
        </div>
      </div>
    </div>
  )
}
