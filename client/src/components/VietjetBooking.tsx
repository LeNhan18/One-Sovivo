import React, { useState, useEffect } from 'react'
import ImageIcon from './ImageIcon'

interface VietjetBookingProps {
  customerId: number
  onSuccess?: () => void
  onBack?: () => void
}

interface FlightRoute {
  from: string
  to: string
  fromName: string
  toName: string
  price: number
  duration: string
}

interface BookingHistory {
  flight_id: string
  flight_date: string
  origin: string
  destination: string
  ticket_class: string
  booking_value: number
}

const VietjetBooking: React.FC<VietjetBookingProps> = ({ customerId, onSuccess, onBack }) => {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book')
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    from: 'HAN',
    to: 'SGN',
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: '',
    passengers: 1,
    ticketClass: 'economy',
    tripType: 'one-way'
  })

  const flightRoutes: FlightRoute[] = [
    { from: 'HAN', to: 'SGN', fromName: 'Hà Nội', toName: 'TP.HCM', price: 2500000, duration: '2h 15m' },
    { from: 'SGN', to: 'HAN', fromName: 'TP.HCM', toName: 'Hà Nội', price: 2500000, duration: '2h 20m' },
    { from: 'HAN', to: 'DAD', fromName: 'Hà Nội', toName: 'Đà Nẵng', price: 2200000, duration: '1h 30m' },
    { from: 'DAD', to: 'HAN', fromName: 'Đà Nẵng', toName: 'Hà Nội', price: 2200000, duration: '1h 35m' },
    { from: 'SGN', to: 'DAD', fromName: 'TP.HCM', toName: 'Đà Nẵng', price: 1800000, duration: '1h 25m' },
    { from: 'HAN', to: 'SIN', fromName: 'Hà Nội', toName: 'Singapore', price: 8500000, duration: '3h 45m' },
  ]

  const airports = [
    { code: 'HAN', name: 'Hà Nội (Nội Bài)', city: 'Hà Nội' },
    { code: 'SGN', name: 'TP.HCM (Tân Sơn Nhất)', city: 'TP. Hồ Chí Minh' },
    { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng' },
    { code: 'SIN', name: 'Singapore (Changi)', city: 'Singapore' },
    { code: 'BKK', name: 'Bangkok (Suvarnabhumi)', city: 'Bangkok' },
    { code: 'KUL', name: 'Kuala Lumpur (KLIA)', city: 'Kuala Lumpur' }
  ]

  useEffect(() => {
    fetchBookingHistory()
  }, [customerId])

  const fetchBookingHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://127.0.0.1:5000/api/service/vietjet/history/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setBookingHistory(data.flights || [])
      }
    } catch (error) {
      console.error('Error fetching booking history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookFlight = async () => {
    try {
      setLoading(true)
      
      const selectedRoute = flightRoutes.find(r => r.from === bookingForm.from && r.to === bookingForm.to)
      if (!selectedRoute) {
        alert('Tuyến bay không khả dụng')
        return
      }

      const bookingData = {
        customer_id: customerId,
        origin: bookingForm.from,
        destination: bookingForm.to,
        flight_date: bookingForm.departureDate,
        ticket_class: bookingForm.ticketClass,
        booking_value: selectedRoute.price * (bookingForm.ticketClass === 'business' ? 2.5 : 1),
        passengers: bookingForm.passengers
      }

      const response = await fetch('http://127.0.0.1:5000/api/service/vietjet/book-flight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`🎉 Đặt vé thành công! Mã vé: ${result.flight_id}`)
        fetchBookingHistory() // Refresh history
        onSuccess?.()
      } else {
        alert(`❌ Lỗi đặt vé: ${result.message}`)
      }
    } catch (error) {
      alert('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }

  const selectedRoute = flightRoutes.find(r => r.from === bookingForm.from && r.to === bookingForm.to)
  const totalPrice = selectedRoute ? selectedRoute.price * (bookingForm.ticketClass === 'business' ? 2.5 : 1) * bookingForm.passengers : 0

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/static/images/esg/vietjet.webp" 
          alt="Vietjet Background" 
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
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  ✈️
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Vietjet Air</h1>
                  <p className="text-slate-400">Đặt vé máy bay</p>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('book')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'book' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Đặt vé mới
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'history' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Lịch sử ({bookingHistory.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'book' ? (
          <div className="space-y-6">
            {/* Trip Type */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4">Loại chuyến bay</h3>
              <div className="flex gap-6">
                <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value="one-way"
                    checked={bookingForm.tripType === 'one-way'}
                    onChange={(e) => setBookingForm({...bookingForm, tripType: e.target.value})}
                    className="text-orange-500 w-4 h-4"
                  />
                  <span className="text-lg">Một chiều</span>
                </label>
                <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value="round-trip"
                    checked={bookingForm.tripType === 'round-trip'}
                    onChange={(e) => setBookingForm({...bookingForm, tripType: e.target.value})}
                    className="text-orange-500 w-4 h-4"
                  />
                  <span className="text-lg">Khứ hồi</span>
                </label>
              </div>
            </div>

            {/* Route Selection */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4">Chọn tuyến bay</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Từ</label>
                  <select
                    value={bookingForm.from}
                    onChange={(e) => setBookingForm({...bookingForm, from: e.target.value})}
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                  >
                    {airports.map(airport => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Đến</label>
                  <select
                    value={bookingForm.to}
                    onChange={(e) => setBookingForm({...bookingForm, to: e.target.value})}
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                  >
                    {airports.map(airport => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4">Chọn ngày bay</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Ngày đi</label>
                  <input
                    type="date"
                    value={bookingForm.departureDate}
                    onChange={(e) => setBookingForm({...bookingForm, departureDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                  />
                </div>
                
                {bookingForm.tripType === 'round-trip' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Ngày về</label>
                    <input
                      type="date"
                      value={bookingForm.returnDate}
                      onChange={(e) => setBookingForm({...bookingForm, returnDate: e.target.value})}
                      min={bookingForm.departureDate}
                      className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Passengers & Class */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4">Thông tin hành khách</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Số hành khách</label>
                  <select
                    value={bookingForm.passengers}
                    onChange={(e) => setBookingForm({...bookingForm, passengers: parseInt(e.target.value)})}
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                  >
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <option key={num} value={num}>{num} người</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Hạng vé</label>
                  <select
                    value={bookingForm.ticketClass}
                    onChange={(e) => setBookingForm({...bookingForm, ticketClass: e.target.value})}
                    className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 text-lg"
                  >
                    <option value="economy">Phổ thông</option>
                    <option value="business">Thương gia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Flight Info & Pricing */}
            {selectedRoute && (
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-xl font-bold text-white">
                      {selectedRoute.fromName} → {selectedRoute.toName}
                    </div>
                    <div className="px-3 py-1 bg-orange-500 text-white text-sm rounded-full font-medium">
                      {selectedRoute.duration}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300">Giá từ</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {(selectedRoute.price * (bookingForm.ticketClass === 'business' ? 2.5 : 1)).toLocaleString()} VND
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-orange-500/30 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-semibold text-lg">
                        Tổng tiền ({bookingForm.passengers} hành khách)
                      </div>
                      <div className="text-slate-300">
                        {bookingForm.ticketClass === 'business' ? 'Hạng thương gia' : 'Hạng phổ thông'}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-400">
                      {totalPrice.toLocaleString()} VND
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Book Button */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <button
                onClick={handleBookFlight}
                disabled={loading || !selectedRoute}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-orange-500/25 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-3">
                      <ImageIcon name="Vietjet.jpg" size={20} rounded={4} /> 
                      Đặt vé máy bay
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-6">Lịch sử đặt vé</h3>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-slate-400 text-lg">Đang tải...</p>
                </div>
              ) : bookingHistory.length > 0 ? (
                <div className="space-y-4">
                  {bookingHistory.map((flight, index) => (
                    <div key={flight.flight_id} className="bg-slate-700/60 backdrop-blur-sm rounded-lg p-6 border border-slate-600 hover:border-orange-500/50 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                            <ImageIcon name="Vietjet.jpg" size={28} rounded={6} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg">
                              {flight.origin} → {flight.destination}
                            </div>
                            <div className="text-slate-300 mt-1">
                              Mã vé: {flight.flight_id}
                            </div>
                            <div className="text-slate-400">
                              {new Date(flight.flight_date).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-white text-xl">
                            {flight.booking_value.toLocaleString()} VND
                          </div>
                          <div className="text-slate-300 capitalize">
                            {flight.ticket_class === 'business' ? 'Thương gia' : 'Phổ thông'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">✈️</div>
                  <p className="text-slate-400 text-xl mb-8">Chưa có chuyến bay nào</p>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-orange-500/25 transform hover:scale-105"
                  >
                    Đặt vé ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VietjetBooking
