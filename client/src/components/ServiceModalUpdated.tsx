import React, { useState } from 'react'
import HDBankCard from './HDBankCard'

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
    
    // HDBank fields - Giữ lại cho compatibility nhưng không dùng nữa
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
        }
      } else if (serviceType === 'resort') {
        if (actionType === 'book_room') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/book-room'
          requestData.nights = parseInt(formData.nights)
          requestData.room_type = formData.roomType
        } else if (actionType === 'book_spa') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/book-spa'
          requestData.spa_type = formData.spaType
        }
      }
      
      if (apiUrl) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })
        
        const result = await response.json()
        
        let message = ''
        if (result.success) {
          if (serviceType === 'vietjet' && actionType === 'book_flight') {
            message = `✈️ ${result.message}\\nChuyến bay: ${result.flight_details?.origin}-${result.flight_details?.destination}\\n🪙 SVT thưởng: ${result.svt_reward}`
          } else if (serviceType === 'resort' && actionType === 'book_room') {
            message = `🏨 ${result.message}\\nLoại phòng: ${result.booking_details?.room_type}\\n🪙 SVT thưởng: ${result.svt_reward}`
          } else if (serviceType === 'resort' && actionType === 'book_spa') {
            message = `💆 ${result.message}\\nDịch vụ: ${result.spa_details?.spa_type}\\n🪙 SVT thưởng: ${result.svt_reward}`
          }
        } else {
          message = `❌ ${result.message}`
        }
        
        alert(message)
      }
      
    } catch (error) {
      console.error('Service action error:', error)
      alert('❌ Lỗi kết nối. Vui lòng thử lại!')
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
              <h3 className="text-2xl font-bold text-white mb-2">Vietjet</h3>
              <p className="text-gray-300">Đặt vé máy bay</p>
            </div>
            
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{userData?.services?.vietjet?.total_flights || 0}</div>
                <div className="text-green-200 text-sm">Chuyến bay năm nay</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Loại chuyến bay</label>
                <select 
                  value={formData.flightType}
                  onChange={(e) => setFormData({...formData, flightType: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                >
                  <option value="domestic">Nội địa (HAN ↔ SGN)</option>
                  <option value="international">Quốc tế (HAN → NRT)</option>
                </select>
              </div>

              <button
                onClick={() => handleServiceAction('book_flight')}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? '⏳ Đang đặt vé...' : '✈️ Đặt vé máy bay'}
              </button>
            </div>
          </div>
        )

      case 'hdbank':
        return (
          <HDBankCard 
            customerId={userData?.customerId || 1001}
            onSuccess={() => {
              // Có thể thêm logic để refresh data hoặc show notification
              console.log('HDBank service completed successfully');
            }}
          />
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
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="standard">Standard Room</option>
                      <option value="deluxe">Deluxe Room</option>
                      <option value="suite">Suite Room</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Số đêm</label>
                    <select 
                      value={formData.nights}
                      onChange={(e) => setFormData({...formData, nights: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="1">1 đêm</option>
                      <option value="2">2 đêm</option>
                      <option value="3">3 đêm</option>
                      <option value="7">1 tuần</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleServiceAction('book_room')}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang đặt...' : '🏨 Đặt phòng ngay'}
                  </button>
                </div>
              </div>

              {/* Spa Booking Form */}
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">💆 Đặt dịch vụ Spa</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Loại dịch vụ</label>
                    <select 
                      value={formData.spaType}
                      onChange={(e) => setFormData({...formData, spaType: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500"
                    >
                      <option value="massage">Massage thư giãn</option>
                      <option value="facial">Chăm sóc da mặt</option>
                      <option value="body">Tắm bùn thải độc</option>
                      <option value="combo">Combo VIP</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleServiceAction('book_spa')}
                    disabled={isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? '⏳ Đang đặt...' : '💆 Đặt lịch Spa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="text-white">Dịch vụ không khả dụng</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1117] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {serviceType === 'vietjet' && '✈️ Vietjet'}
            {serviceType === 'hdbank' && '🏦 HDBank'}
            {serviceType === 'resort' && '🏨 Resort & Spa'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        {renderServiceContent()}
      </div>
    </div>
  )
}
