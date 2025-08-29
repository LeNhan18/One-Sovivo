import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  actions?: ServiceAction[]
}

interface ServiceAction {
  id: string
  service: 'vietjet' | 'hdbank' | 'resort'
  action: string
  params: any
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: any
}

interface AIAgentProps {
  userData?: any
  onServiceAction?: (service: string, action: string, params: any) => Promise<any>
}

export const AIAgent: React.FC<AIAgentProps> = ({ userData, onServiceAction }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Xin chào! Tôi là AI Assistant của Sovico. Hãy nói cho tôi biết bạn muốn làm gì - ví dụ: "Tôi muốn đặt vé máy bay và vay tiền", tôi sẽ tự động xử lý tất cả cho bạn!',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // AI Intent Recognition - Phân tích ý định từ text
  const analyzeIntent = (text: string): ServiceAction[] => {
    const normalizedText = text.toLowerCase()
    const actions: ServiceAction[] = []

    // Flight booking intents
    if (normalizedText.includes('vé máy bay') || normalizedText.includes('đặt vé') || 
        normalizedText.includes('bay') || normalizedText.includes('chuyến bay') ||
        normalizedText.includes('vietjet')) {
      actions.push({
        id: `flight_${Date.now()}`,
        service: 'vietjet',
        action: 'book_flight',
        params: {
          flight_type: normalizedText.includes('quốc tế') || normalizedText.includes('nước ngoài') ? 'international' : 'domestic',
          ticket_class: normalizedText.includes('thương gia') || normalizedText.includes('business') ? 'business' : 'economy'
        },
        status: 'pending'
      })
    }

    // Banking intents
    if (normalizedText.includes('vay') || normalizedText.includes('khoản vay') || 
        normalizedText.includes('vay tiền')) {
      const amount = extractAmount(normalizedText, 'loan')
      actions.push({
        id: `loan_${Date.now()}`,
        service: 'hdbank',
        action: 'loan',
        params: {
          loan_amount: amount,
          loan_type: normalizedText.includes('nhà') ? 'home' : 
                    normalizedText.includes('xe') ? 'car' : 
                    normalizedText.includes('kinh doanh') ? 'business' : 'personal'
        },
        status: 'pending'
      })
    }

    if (normalizedText.includes('chuyển khoản') || normalizedText.includes('chuyển tiền') ||
        normalizedText.includes('gửi tiền')) {
      const amount = extractAmount(normalizedText, 'transfer')
      actions.push({
        id: `transfer_${Date.now()}`,
        service: 'hdbank',
        action: 'transfer',
        params: {
          amount: amount,
          transfer_type: normalizedText.includes('nước ngoài') || normalizedText.includes('quốc tế') ? 'international' : 'internal'
        },
        status: 'pending'
      })
    }

    // Hotel/Resort intents
    if (normalizedText.includes('khách sạn') || normalizedText.includes('đặt phòng') || 
        normalizedText.includes('resort') || normalizedText.includes('nghỉ dưỡng')) {
      const nights = extractNights(normalizedText)
      actions.push({
        id: `hotel_${Date.now()}`,
        service: 'resort',
        action: 'book_room',
        params: {
          nights: nights,
          room_type: normalizedText.includes('cao cấp') || normalizedText.includes('suite') ? 'suite' :
                    normalizedText.includes('deluxe') ? 'deluxe' : 'standard'
        },
        status: 'pending'
      })
    }

    // Spa intents
    if (normalizedText.includes('spa') || normalizedText.includes('massage') || 
        normalizedText.includes('thư giãn')) {
      actions.push({
        id: `spa_${Date.now()}`,
        service: 'resort',
        action: 'spa_booking',
        params: {
          spa_type: normalizedText.includes('cao cấp') ? 'premium_package' :
                   normalizedText.includes('mặt') ? 'facial' :
                   normalizedText.includes('body') ? 'body_treatment' : 'massage'
        },
        status: 'pending'
      })
    }

    return actions
  }

  // Extract amount from text
  const extractAmount = (text: string, type: 'loan' | 'transfer'): number => {
    const numbers = text.match(/\d+/g)
    if (numbers) {
      const amount = parseInt(numbers[0])
      if (text.includes('tỷ')) return amount * 1000000000
      if (text.includes('triệu')) return amount * 1000000
      if (text.includes('nghìn')) return amount * 1000
    }
    
    // Default amounts
    return type === 'loan' ? 500000000 : 5000000
  }

  // Extract nights from text
  const extractNights = (text: string): number => {
    const numbers = text.match(/(\d+)\s*(đêm|ngày)/g)
    if (numbers) {
      const match = numbers[0].match(/\d+/)
      if (match) return parseInt(match[0])
    }
    return 2 // Default 2 nights
  }

  // Execute service actions
  const executeActions = async (actions: ServiceAction[], messageId: string) => {
    setIsProcessing(true)
    
    for (const action of actions) {
      // Update action status to executing
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, actions: msg.actions?.map(a => a.id === action.id ? { ...a, status: 'executing' } : a) }
          : msg
      ))

      try {
        // Call the actual service API
        let result
        if (onServiceAction) {
          result = await onServiceAction(action.service, action.action, {
            customer_id: userData?.customerId || 1001,
            ...action.params
          })
        } else {
          // Fallback API call
          const apiUrl = getApiUrl(action.service, action.action)
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: userData?.customerId || 1001,
              ...action.params
            })
          })
          result = await response.json()
        }

        // Update action status to completed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                actions: msg.actions?.map(a => 
                  a.id === action.id 
                    ? { ...a, status: 'completed', result }
                    : a
                ) 
              }
            : msg
        ))

      } catch (error) {
        // Update action status to failed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                actions: msg.actions?.map(a => 
                  a.id === action.id 
                    ? { ...a, status: 'failed', result: { error: error.message } }
                    : a
                ) 
              }
            : msg
        ))
      }
    }

    setIsProcessing(false)

    // Add completion message
    const completedActions = actions.filter(a => a.status === 'completed').length
    const totalActions = actions.length
    
    const completionMessage: Message = {
      id: `completion_${Date.now()}`,
      type: 'ai',
      content: `✅ Hoàn thành! Tôi đã thực hiện ${completedActions}/${totalActions} yêu cầu của bạn. Bạn đã nhận được SVT tokens tương ứng. Có gì khác tôi có thể giúp không?`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, completionMessage])
  }

  const getApiUrl = (service: string, action: string): string => {
    const baseUrl = 'http://127.0.0.1:5000/api/service'
    switch (service) {
      case 'vietjet':
        return `${baseUrl}/vietjet/book-flight`
      case 'hdbank':
        return action === 'loan' ? `${baseUrl}/hdbank/loan` : `${baseUrl}/hdbank/transfer`
      case 'resort':
        return action === 'spa_booking' ? `${baseUrl}/resort/book-spa` : `${baseUrl}/resort/book-room`
      default:
        return ''
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Analyze user intent
    const actions = analyzeIntent(inputValue.trim())

    if (actions.length === 0) {
      // No specific actions detected, provide helpful response
      const helpMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: '🤔 Tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể nói cụ thể hơn không? Ví dụ:\n\n• "Tôi muốn đặt vé máy bay"\n• "Vay 500 triệu để mua nhà"\n• "Đặt phòng khách sạn 3 đêm"\n• "Đặt vé và vay tiền"',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, helpMessage])
      return
    }

    // Create AI response with detected actions
    const actionsList = actions.map(a => {
      switch (a.service) {
        case 'vietjet':
          return `✈️ Đặt vé máy bay ${a.params.flight_type === 'international' ? 'quốc tế' : 'nội địa'}`
        case 'hdbank':
          return a.action === 'loan' 
            ? `💰 Đăng ký vay ${(a.params.loan_amount / 1000000).toLocaleString()} triệu VND`
            : `💸 Chuyển khoản ${(a.params.amount / 1000000).toLocaleString()} triệu VND`
        case 'resort':
          return a.action === 'spa_booking'
            ? `💆‍♀️ Đặt dịch vụ spa ${a.params.spa_type}`
            : `🏨 Đặt phòng khách sạn ${a.params.nights} đêm`
        default:
          return 'Dịch vụ khác'
      }
    }).join('\n• ')

    const aiMessage: Message = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      content: `🎯 Tôi hiểu rồi! Bạn muốn:\n\n• ${actionsList}\n\n⏳ Đang thực hiện các yêu cầu này cho bạn...`,
      timestamp: new Date(),
      actions: actions
    }

    setMessages(prev => [...prev, aiMessage])

    // Execute the actions
    await executeActions(actions, aiMessage.id)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏸️'
      case 'executing': return '⏳'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '❔'
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
        <h2 className="text-xl font-bold flex items-center">
          🤖 AI Agent - Trung tâm điều phối dịch vụ
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          Nói cho tôi biết bạn muốn gì, tôi sẽ tự động xử lý tất cả!
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'ai'
                  ? 'bg-gray-700 text-gray-100'
                  : 'bg-yellow-600 text-white'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Action status display */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-300">Trạng thái thực hiện:</div>
                  {message.actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between text-xs bg-gray-800 px-2 py-1 rounded">
                      <span>{action.service} - {action.action}</span>
                      <span>{getActionStatusIcon(action.status)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nói cho AI biết bạn muốn làm gì... (VD: 'Tôi muốn đặt vé máy bay và vay 500 triệu')"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isProcessing ? '⏳' : '🚀'}
          </button>
        </div>
        
        {/* Quick suggestions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'Đặt vé máy bay nội địa',
            'Vay 500 triệu mua nhà',
            'Đặt phòng khách sạn 3 đêm',
            'Đặt vé và vay tiền',
            'Chuyển khoản 10 triệu'
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputValue(suggestion)}
              disabled={isProcessing}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
