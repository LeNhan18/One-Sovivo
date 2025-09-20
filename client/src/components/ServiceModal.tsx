import React, { useState } from 'react'
import HDBankCard from './HDBankCard'
import VietjetBooking from './VietjetBooking'

interface ServiceModalProps {
  serviceType: 'vietjet' | 'hdbank' | 'resort'
  userData?: any
  onBack?: () => void
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ 
  serviceType, 
  userData,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    // Resort fields
    checkInDate: '',
    nights: '2',
    roomType: 'deluxe',
    spaType: 'massage'
  })


  const handleServiceAction = async (actionType: string) => {
    setIsProcessing(true)
    
    try {
      let apiUrl = ''
      let requestData: any = {
        customer_id: userData?.customerId || 1001
      }
      
      // Xác định API endpoint và data dựa trên service type và action
      if (serviceType === 'resort') {
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
          if (serviceType === 'resort' && actionType === 'book_room') {
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
          <VietjetBooking 
            customerId={userData?.customerId || 1001}
            onSuccess={() => {
              console.log('Vietjet booking completed successfully');
            }}
            onBack={onBack}
          />
        )

      case 'hdbank':
        console.log('🔍 ServiceModal - userData:', userData);
        console.log('🔍 ServiceModal - customerId:', userData?.customerId || 1001);
        return (
          <HDBankCard 
            customerId={userData?.customerId || 1001}
            onSuccess={() => {
              console.log('HDBank service completed successfully');
            }}
            onBack={onBack}
          />
        )

      case 'resort':
        return (
          <div className="min-h-screen relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img 
                src="/static/images/esg/resort.jpg" 
                alt="Resort Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80"></div>
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
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        🏨
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-white">Resort & Spa</h1>
                        <p className="text-slate-400">Đặt phòng và dịch vụ spa</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-6">
                {/* Stats Card */}
                <div className="bg-green-900/40 backdrop-blur-sm border border-green-700 rounded-lg p-6 shadow-xl">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{userData?.services?.resorts?.nights_stayed || 0}</div>
                    <div className="text-green-200 text-lg">Đêm nghỉ năm nay</div>
                  </div>
                </div>

                {/* Resort Forms */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Room Booking Form */}
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">🏨</span>
                      Đặt phòng Resort
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Loại phòng</label>
                        <select 
                          value={formData.roomType}
                          onChange={(e) => setFormData({...formData, roomType: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 text-lg"
                        >
                          <option value="standard">Standard Room</option>
                          <option value="deluxe">Deluxe Room</option>
                          <option value="suite">Suite Room</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Số đêm</label>
                        <select 
                          value={formData.nights}
                          onChange={(e) => setFormData({...formData, nights: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 text-lg"
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
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-green-500/25 transform hover:scale-105 disabled:transform-none"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang đặt...
                          </>
                        ) : (
                          <>
                            <span>🏨</span>
                            <span>Đặt phòng ngay</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Spa Booking Form */}
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">💆</span>
                      Đặt dịch vụ Spa
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Loại dịch vụ</label>
                        <select 
                          value={formData.spaType}
                          onChange={(e) => setFormData({...formData, spaType: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 text-lg"
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
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 disabled:transform-none"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang đặt...
                          </>
                        ) : (
                          <>
                            <span>💆</span>
                            <span>Đặt lịch Spa</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="text-white">Dịch vụ không khả dụng</div>
    }
  }

  return renderServiceContent()
}
