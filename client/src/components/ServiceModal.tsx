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
        } else if (actionType === 'book_property_viewing') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/book-property-viewing'
          requestData.project_name = formData.roomType
          requestData.preferred_date = formData.checkInDate
          requestData.contact_info = userData?.phone || 'N/A'
        } else if (actionType === 'real_estate_consultation') {
          apiUrl = 'http://127.0.0.1:5000/api/service/resort/real-estate-consultation'
          requestData.consultation_type = formData.spaType
          requestData.budget_range = 'Từ 2-10 tỷ VNĐ'
          requestData.location_preference = 'TP.HCM'
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
          } else if (serviceType === 'resort' && actionType === 'book_property_viewing') {
            message = `🏢 ${result.message}\\nDự án: ${result.viewing_details?.project}\\n🪙 SVT thưởng: ${result.svt_reward}`
          } else if (serviceType === 'resort' && actionType === 'real_estate_consultation') {
            message = `💬 ${result.message}\\nLoại tư vấn: ${result.consultation_details?.type}\\n🪙 SVT thưởng: ${result.svt_reward}`
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
                src="/Image/phulong.jpg" 
                alt="Phú Long Real Estate - Dragon Hill Project" 
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
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src="/Image/phu-long.jpg" 
                          alt="Phú Long Logo" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-white">Phú Long Real Estate</h1>
                        <p className="text-slate-300">Kiến tạo chuẩn sống Lux-Well</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-6">
                {/* Hero Section with Project Showcase */}
                <div className="bg-gradient-to-r from-blue-900/60 to-teal-900/60 backdrop-blur-sm border border-blue-500/30 rounded-xl p-8 shadow-2xl">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Dự án nổi bật</h2>
                    <p className="text-blue-200 text-lg">Khám phá các dự án bất động sản cao cấp của Phú Long</p>
                  </div>
                  
                  {/* Project Gallery */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden border border-white/20">
                      <img 
                        src="/Image/phulong.jpg" 
                        alt="Dragon Hill Project" 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-white font-semibold">Dragon Hill</h3>
                        <p className="text-blue-200 text-sm">Khu đô thị cao cấp</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden border border-white/20">
                      <img 
                        src="/Image/phulong2.jpg" 
                        alt="Luxury Complex" 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-white font-semibold">Essensia Parkway</h3>
                        <p className="text-blue-200 text-sm">Căn hộ cao cấp</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden border border-white/20">
                      <div className="h-32 bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🏢</div>
                          <div className="text-white font-semibold">+5 Dự án</div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-white font-semibold">Khám phá thêm</h3>
                        <p className="text-blue-200 text-sm">Xem tất cả dự án</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resort Forms */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Real Estate Projects Form */}
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">🏢</span>
                      Xem dự án bất động sản
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Dự án</label>
                        <select 
                          value={formData.roomType}
                          onChange={(e) => setFormData({...formData, roomType: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 text-lg"
                        >
                          <option value="essensia_parkway">Essensia Parkway</option>
                          <option value="essensia_sky">Essensia Sky</option>
                          <option value="dragon_riverside">Dragon Riverside City</option>
                          <option value="mailand_hanoi">Mailand Hanoi City</option>
                          <option value="ariyana">Ariyana Tourism Complex</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Ngày xem dự án</label>
                        <input 
                          type="date"
                          value={formData.checkInDate}
                          onChange={(e) => setFormData({...formData, checkInDate: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 text-lg"
                        />
                      </div>
                      <button
                        onClick={() => handleServiceAction('book_property_viewing')}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-teal-500/25 transform hover:scale-105 disabled:transform-none"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang đặt lịch...
                          </>
                        ) : (
                          <>
                            <span>🏢</span>
                            <span>Đặt lịch xem dự án</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Real Estate Consultation Form */}
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="mr-2">💬</span>
                      Tư vấn bất động sản
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Loại tư vấn</label>
                        <select 
                          value={formData.spaType}
                          onChange={(e) => setFormData({...formData, spaType: e.target.value})}
                          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 text-lg"
                        >
                          <option value="investment">Đầu tư bất động sản</option>
                          <option value="residential">Nhà ở</option>
                          <option value="commercial">Thương mại</option>
                          <option value="resort">Nghỉ dưỡng</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleServiceAction('real_estate_consultation')}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-yellow-500/25 transform hover:scale-105 disabled:transform-none"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang đặt lịch...
                          </>
                        ) : (
                          <>
                            <span>💬</span>
                            <span>Đặt tư vấn</span>
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
