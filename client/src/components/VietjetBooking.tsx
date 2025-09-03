import React, { useState, useEffect } from 'react'

interface VietjetBookingProps {
  customerId: number
  onSuccess?: () => void
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

const VietjetBooking: React.FC<VietjetBookingProps> = ({ customerId, onSuccess }) => {
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
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
            ✈️
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Vietjet Air</h2>
            <p className="text-slate-400">Đặt vé máy bay</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'book' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Đặt vé mới
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'history' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Lịch sử ({bookingHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'book' ? (
        <div className="space-y-6">
          {/* Trip Type */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="tripType"
                value="one-way"
                checked={bookingForm.tripType === 'one-way'}
                onChange={(e) => setBookingForm({...bookingForm, tripType: e.target.value})}
                className="text-orange-500"
              />
              Một chiều
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="tripType"
                value="round-trip"
                checked={bookingForm.tripType === 'round-trip'}
                onChange={(e) => setBookingForm({...bookingForm, tripType: e.target.value})}
                className="text-orange-500"
              />
              Khứ hồi
            </label>
          </div>

          {/* Route Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Từ</label>
              <select
                value={bookingForm.from}
                onChange={(e) => setBookingForm({...bookingForm, from: e.target.value})}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              >
                {airports.map(airport => (
                  <option key={airport.code} value={airport.code}>
                    {airport.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Đến</label>
              <select
                value={bookingForm.to}
                onChange={(e) => setBookingForm({...bookingForm, to: e.target.value})}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              >
                {airports.map(airport => (
                  <option key={airport.code} value={airport.code}>
                    {airport.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ngày đi</label>
              <input
                type="date"
                value={bookingForm.departureDate}
                onChange={(e) => setBookingForm({...bookingForm, departureDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            {bookingForm.tripType === 'round-trip' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ngày về</label>
                <input
                  type="date"
                  value={bookingForm.returnDate}
                  onChange={(e) => setBookingForm({...bookingForm, returnDate: e.target.value})}
                  min={bookingForm.departureDate}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          {/* Passengers & Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Số hành khách</label>
              <select
                value={bookingForm.passengers}
                onChange={(e) => setBookingForm({...bookingForm, passengers: parseInt(e.target.value)})}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              >
                {[1,2,3,4,5,6,7,8,9].map(num => (
                  <option key={num} value={num}>{num} người</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Hạng vé</label>
              <select
                value={bookingForm.ticketClass}
                onChange={(e) => setBookingForm({...bookingForm, ticketClass: e.target.value})}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="economy">Phổ thông</option>
                <option value="business">Thương gia</option>
              </select>
            </div>
          </div>

          {/* Flight Info & Pricing */}
          {selectedRoute && (
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-white">
                    {selectedRoute.fromName} → {selectedRoute.toName}
                  </div>
                  <div className="px-2 py-1 bg-orange-500 text-white text-sm rounded">
                    {selectedRoute.duration}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300">Giá từ</div>
                  <div className="text-xl font-bold text-orange-400">
                    {(selectedRoute.price * (bookingForm.ticketClass === 'business' ? 2.5 : 1)).toLocaleString()} VND
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-600 pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">
                      Tổng tiền ({bookingForm.passengers} hành khách)
                    </div>
                    <div className="text-sm text-slate-400">
                      {bookingForm.ticketClass === 'business' ? 'Hạng thương gia' : 'Hạng phổ thông'}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {totalPrice.toLocaleString()} VND
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <button
            onClick={handleBookFlight}
            disabled={loading || !selectedRoute}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                ✈️ Đặt vé máy bay
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Lịch sử đặt vé</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Đang tải...</p>
            </div>
          ) : bookingHistory.length > 0 ? (
            <div className="space-y-3">
              {bookingHistory.map((flight, index) => (
                <div key={flight.flight_id} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                        ✈️
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {flight.origin} → {flight.destination}
                        </div>
                        <div className="text-sm text-slate-400">
                          Mã vé: {flight.flight_id}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(flight.flight_date).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {flight.booking_value.toLocaleString()} VND
                      </div>
                      <div className="text-sm text-slate-400 capitalize">
                        {flight.ticket_class === 'business' ? 'Thương gia' : 'Phổ thông'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✈️</div>
              <p className="text-slate-400">Chưa có chuyến bay nào</p>
              <button
                onClick={() => setActiveTab('book')}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Đặt vé ngay
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VietjetBooking
