import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actions?: ServiceAction[];
}

interface ServiceAction {
  id: string
  service: 'vietjet' | 'hdbank' | 'resort'
  action: string
  params: any
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: any
}

interface UserProfile {
  name: string;
  age: number;
  customer_id: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  sovicoTokens: number;
  totalTransactions: number;
  monthlyIncome?: number;
  investmentGoals?: string[];
}

// Initialize Gemini AI
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDxF5rCqGT8v-7hP8j2mN9kL3nQ1rS6wE4';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const AIFinancialAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Chào bạn! Tôi là AI Assistant của Sovico được hỗ trợ bởi Google Gemini.\n\n🎯 **Khả năng của tôi:**\n• 📊 Phân tích tài chính cá nhân và tư vấn\n• ✈️ **Tự động đặt vé máy bay Vietjet**\n• 🏦 **Tự động xử lý giao dịch HDBank**\n• 🏨 **Tự động đặt phòng resort**\n• 💎 Tối ưu hóa SVT và NFT\n• 🤖 **Thực hiện dịch vụ tự động theo yêu cầu**\n\n💡 **Thử nói:** "Đặt vé máy bay từ Hà Nội đi Đà Nẵng ngày 15/9 cho 2 người"\n\nHãy hỏi tôi bất cứ điều gì!',
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useGemini, setUseGemini] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('http://127.0.0.1:5000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Get SVT balance from correct endpoint
          const svtResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${userData.customer_id}`);
          let svtBalance = 0;
          let transactionCount = 0;
          
          if (svtResponse.ok) {
            const svtData = await svtResponse.json();
            svtBalance = svtData.total_svt || 0;
            transactionCount = svtData.transactions?.length || 0;
          }

          setUserProfile({
            name: userData.customer_name || 'Khách hàng',
            age: 30,
            customer_id: userData.customer_id,
            riskTolerance: 'moderate',
            sovicoTokens: svtBalance,
            totalTransactions: transactionCount,
            monthlyIncome: 20000000,
            investmentGoals: ['Tiết kiệm', 'Đầu tư an toàn']
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI Intent Recognition - Phân tích ý định từ text
  const analyzeIntent = (text: string): ServiceAction[] => {
    const normalizedText = text.toLowerCase()
    const actions: ServiceAction[] = []

    // Flight booking intents - Kiểm tra thông tin đầy đủ
    if (normalizedText.includes('vé máy bay') || normalizedText.includes('đặt vé') || 
        normalizedText.includes('bay') || normalizedText.includes('chuyến bay') ||
        normalizedText.includes('vietjet') || normalizedText.includes('máy bay') ||
        (normalizedText.includes('đi') && (normalizedText.includes('vé') || normalizedText.includes('bay'))) ||
        normalizedText.includes('book flight') || normalizedText.includes('flight')) {
      
      // Kiểm tra xem có đủ thông tin chuyến bay không
      const hasOrigin = /từ|from|khởi hành/.test(normalizedText) || /hà nội|tp\.?hcm|đà nẵng|phú quốc|nha trang/.test(normalizedText)
      const hasDestination = /đến|đi/.test(normalizedText) && /hà nội|tp\.?hcm|đà nẵng|phú quốc|nha trang/.test(normalizedText)
      const hasDate = /ngày|tháng|\/|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}/.test(normalizedText)
      
      // Nếu không đủ thông tin, không tạo action
      if (!hasOrigin || !hasDestination || !hasDate) {
        return [] // Trả về empty để AI hỏi thông tin
      }

      actions.push({
        id: `flight_${Date.now()}`,
        service: 'vietjet',
        action: 'book_flight',
        params: {
          flight_type: normalizedText.includes('quốc tế') || normalizedText.includes('nước ngoài') ? 'international' : 'domestic',
          ticket_class: normalizedText.includes('thương gia') || normalizedText.includes('business') ? 'business' : 'economy',
          origin: extractLocation(normalizedText, 'from'),
          destination: extractLocation(normalizedText, 'to'),
          departure_date: extractDate(normalizedText),
          passengers: extractPassengerCount(normalizedText)
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

    return actions
  }

  // Helper functions
  const extractLocation = (text: string, type: 'from' | 'to'): string => {
    const locationMap: { [key: string]: string } = {
      'hà nội': 'HAN',
      'tp.hcm': 'SGN', 
      'hồ chí minh': 'SGN',
      'sài gòn': 'SGN',
      'đà nẵng': 'DAD',
      'phú quốc': 'PQC',
      'nha trang': 'CXR',
      'đà lạt': 'DLI',
      'cần thơ': 'VCA'
    }

    for (const [city, code] of Object.entries(locationMap)) {
      if (text.includes(city)) {
        return code
      }
    }
    
    return type === 'from' ? 'HAN' : 'SGN' // Default
  }

  const extractDate = (text: string): string => {
    const datePattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/
    const match = text.match(datePattern)
    
    if (match) {
      const day = match[1].padStart(2, '0')
      const month = match[2].padStart(2, '0') 
      const year = match[3] || '2025'
      return `${year}-${month}-${day}`
    }
    
    // Default: ngày mai
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const extractPassengerCount = (text: string): number => {
    const numbers = text.match(/(\d+)\s*(người|khách|hành khách)/g)
    if (numbers) {
      const match = numbers[0].match(/\d+/)
      if (match) return parseInt(match[0])
    }
    return 1
  }

  const extractAmount = (text: string, type: 'loan' | 'transfer'): number => {
    const numbers = text.match(/\d+/g)
    if (numbers) {
      const amount = parseInt(numbers[0])
      if (text.includes('tỷ')) return amount * 1000000000
      if (text.includes('triệu')) return amount * 1000000
      if (text.includes('nghìn')) return amount * 1000
    }
    
    return type === 'loan' ? 500000000 : 5000000
  }

  const extractNights = (text: string): number => {
    const numbers = text.match(/(\d+)\s*(đêm|ngày)/g)
    if (numbers) {
      const match = numbers[0].match(/\d+/)
      if (match) return parseInt(match[0])
    }
    return 2
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
        const apiUrl = getApiUrl(action.service, action.action)
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: userProfile?.customer_id || 1001,
            ...action.params
          })
        })

        const result = await response.json()
        
        if (result.success) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, actions: msg.actions?.map(a => 
                  a.id === action.id ? { ...a, status: 'completed', result } : a
                ) }
              : msg
          ))
        } else {
          throw new Error(result.message || 'Service failed')
        }

      } catch (error) {
        console.error('Service execution failed:', error)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, actions: msg.actions?.map(a => 
                a.id === action.id ? { ...a, status: 'failed', result: { error: (error as Error).message } } : a
              ) }
            : msg
        ))
      }
    }

    setIsProcessing(false)

    const completionMessage: Message = {
      id: `completion_${Date.now()}`,
      type: 'ai',
      content: `✅ Hoàn thành! Tôi đã thực hiện các yêu cầu của bạn. Bạn đã nhận được SVT tokens tương ứng. Có gì khác tôi có thể giúp không?`,
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
        if (action === 'transfer') return `${baseUrl}/hdbank/transfer`
        if (action === 'loan') return `${baseUrl}/hdbank/loan`
        return ''
      case 'resort':
        if (action === 'book_room') return `${baseUrl}/resort/book-room`
        return ''
      default:
        return ''
    }
  }

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'executing': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '❔'
    }
  }

  const predefinedQuestions = [
    "Đặt vé từ Hà Nội đi Đà Nẵng ngày 30/8 cho 2 người",
    "Phân tích profile tài chính và đề xuất chiến lược cho tôi",
    "Vay 500 triệu để mua nhà", 
    "Đặt phòng resort 3 đêm ở Phú Quốc",
    "Chuyển khoản 10 triệu cho bạn",
    "Làm thế nào để nâng cấp lên cấp bậc Diamond với SVT?"
  ];

  // Generate AI response
  const generateGeminiResponse = async (userMessage: string): Promise<string> => {
    try {
      const systemPrompt = `Bạn là một Trợ lý Tài chính AI chuyên nghiệp của Tập đoàn Sovico được hỗ trợ bởi Google Gemini.
Nhiệm vụ của bạn là đưa ra lời khuyên cá nhân hóa dựa trên dữ liệu 360° của khách hàng.

**KIẾN THỨC NỀN TẢNG VỀ HỆ SINH THÁI SOVICO:**

🏢 **Tập đoàn Sovico** - Hệ sinh thái tài chính toàn diện:
- **HDBank**: Ngân hàng số 1 về dịch vụ khách hàng, cung cấp thẻ tín dụng, tiết kiệm, đầu tư
- **Vietjet Air**: Hãng hàng không giá rẻ hàng đầu Đông Nam Á
- **Sovico Resort**: Chuỗi resort cao cấp 5 sao tại các điểm đến hấp dẫn
- **Sovico Real Estate**: Phát triển bất động sản cao cấp

💎 **HỆ THỐNG SVT (SOVICO TOKEN):**
- **Bronze** (0-9,999 SVT): Khách hàng mới, ưu đãi cơ bản
- **Silver** (10,000-49,999 SVT): Ưu đãi nâng cao, tích điểm x1.5
- **Gold** (50,000-199,999 SVT): Ưu đãi cao cấp, tích điểm x2, dịch vụ VIP
- **Diamond** (200,000+ SVT): Ưu đãi tối đa, tích điểm x3, butler service

🎯 **CHIẾN LƯỢC TƯ VẤN:**
1. **Phân tích 360°**: Dựa trên dữ liệu thực từ tất cả dịch vụ Sovico
2. **Cá nhân hóa**: Đề xuất phù hợp với profile và mục tiêu cá nhân
3. **Tối ưu hóa SVT**: Hướng dẫn cách tích lũy và sử dụng SVT hiệu quả
4. **Cross-selling thông minh**: Giới thiệu dịch vụ bổ trợ hợp lý

📊 **THÔNG TIN KHÁCH HÀNG HIỆN TẠI:**
- 👤 Tên: ${userProfile?.name || 'Khách hàng'}
- 🆔 ID: ${userProfile?.customer_id || 'Chưa xác định'}
- 💎 SVT Balance: ${(userProfile?.sovicoTokens || 0).toLocaleString('vi-VN')} SVT
- 🏆 Cấp bậc: ${userProfile?.sovicoTokens && userProfile.sovicoTokens >= 200000 ? 'Diamond 💎' :
                userProfile?.sovicoTokens && userProfile.sovicoTokens >= 50000 ? 'Gold 🥇' :
                userProfile?.sovicoTokens && userProfile.sovicoTokens >= 10000 ? 'Silver 🥈' : 'Bronze 🥉'}
- 📈 Tổng giao dịch: ${userProfile?.totalTransactions || 0} lần
- 🎯 Khẩu vị rủi ro: ${userProfile?.riskTolerance || 'Moderate'}
- 💰 Thu nhập ước tính: ${(userProfile?.monthlyIncome || 0).toLocaleString('vi-VN')} VNĐ/tháng

🔍 **HƯỚNG DẪN TƯ VẤN:**
- Luôn bắt đầu với phân tích tình hình hiện tại
- Đưa ra 2-3 đề xuất cụ thể với số liệu rõ ràng
- Giải thích lợi ích của từng đề xuất
- Kết thúc với call-to-action rõ ràng
- Sử dụng emoji để dễ đọc và thu hút
- Luôn đề cập đến cơ hội tích lũy SVT

💡 **LƯU Ý QUAN TRỌNG:**
- Tôi có khả năng tự động thực hiện dịch vụ khi khách hàng yêu cầu
- Khi khách hàng muốn đặt vé, vay tiền, đặt phòng... tôi sẽ xử lý tự động
- Luôn tư vấn dựa trên lợi ích tối đa cho khách hàng
- Giữ tone thân thiện, chuyên nghiệp và đáng tin cậy

Hãy đưa ra lời khuyên tài chính cá nhân hóa và chuyên nghiệp dựa trên thông tin trên.`;

      const result = await model.generateContent(systemPrompt + "\n\nCâu hỏi: " + userMessage);
      return result.response.text();
    } catch (error) {
      throw error;
    }
  };

  const generateLocalResponse = (userMessage: string): string => {
    return "🤖 Tôi là AI Assistant cơ bản. Vui lòng bật Gemini AI để có trải nghiệm tốt hơn!";
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');

    // Analyze user intent for service actions
    const actions = analyzeIntent(currentInput);

    // Kiểm tra xem có phải intent đặt vé nhưng thiếu thông tin không
    if ((currentInput.toLowerCase().includes('vé máy bay') || 
         currentInput.toLowerCase().includes('đặt vé') || 
         currentInput.toLowerCase().includes('bay')) && actions.length === 0) {
      
      const missingInfo = []
      const normalizedText = currentInput.toLowerCase()
      
      const hasOrigin = /từ|from|khởi hành/.test(normalizedText) || /hà nội|tp\.?hcm|đà nẵng|phú quốc|nha trang/.test(normalizedText)
      const hasDestination = /đến|đi/.test(normalizedText) && /hà nội|tp\.?hcm|đà nẵng|phú quốc|nha trang/.test(normalizedText)
      const hasDate = /ngày|tháng|\/|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}/.test(normalizedText)
      
      if (!hasOrigin) missingInfo.push("📍 **Điểm khởi hành** (VD: từ Hà Nội)")
      if (!hasDestination) missingInfo.push("📍 **Điểm đến** (VD: đến Đà Nẵng)")  
      if (!hasDate) missingInfo.push("📅 **Ngày bay** (VD: ngày 15/9/2025)")
      
      const askForInfoMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai', 
        content: `✈️ **Tôi sẽ giúp bạn đặt vé máy bay!** \n\nTuy nhiên tôi cần thêm một số thông tin:\n\n${missingInfo.join('\n')}\n\n💡 **Ví dụ:** "Đặt vé từ Hà Nội đi Đà Nẵng ngày 15/9/2025 cho 2 người"\n\n🎯 Vui lòng cung cấp đầy đủ thông tin để tôi có thể đặt vé ngay cho bạn!`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, askForInfoMessage]);
      return;
    }

    if (actions.length > 0) {
      // Create AI response with detected actions
      const actionsList = actions.map(a => {
        switch (a.service) {
          case 'vietjet':
            return `✈️ Đặt vé máy bay:\n   📍 ${a.params.origin} → ${a.params.destination}\n   📅 ${a.params.departure_date}\n   👥 ${a.params.passengers} hành khách\n   🎫 Hạng ${a.params.ticket_class === 'business' ? 'Thương gia' : 'Phổ thông'}`
          case 'hdbank':
            if (a.action === 'loan') return `💰 Vay tiền ${(a.params.loan_amount / 1000000).toFixed(0)} triệu VNĐ`
            if (a.action === 'transfer') return `💳 Chuyển khoản ${(a.params.amount / 1000000).toFixed(0)} triệu VNĐ`
            return `🏦 Dịch vụ ngân hàng HDBank`
          case 'resort':
            if (a.action === 'book_room') return `🏨 Đặt phòng ${a.params.nights} đêm`
            return `🏖️ Dịch vụ Resort`
          default:
            return '🔧 Dịch vụ khác'
        }
      }).join('\n\n• ')

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: `🎯 Tôi hiểu rồi! Bạn muốn:\n\n• ${actionsList}\n\n⏳ Đang thực hiện các yêu cầu này cho bạn...`,
        timestamp: new Date(),
        actions: actions
      }

      setMessages(prev => [...prev, aiMessage]);
      await executeActions(actions, aiMessage.id);
      return;
    }

    // No specific actions detected, use normal AI chat
    setIsLoading(true);

    try {
      let aiResponseContent;
      if (useGemini) {
        aiResponseContent = await generateGeminiResponse(currentInput);
      } else {
        aiResponseContent = generateLocalResponse(currentInput);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: ${error.message}\n\n🔄 Vui lòng thử lại hoặc hỏi tôi một câu hỏi khác.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="flex flex-col h-full bg-[#0D1117] text-white">
      {/* Header */}
      <div className="bg-[#161B22] border-b border-gray-700 p-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-lg">🤖</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">AI Assistant</h2>
            <p className="text-sm text-gray-400">
              Powered by Google Gemini AI
              {userProfile && (
                <span className="ml-2 text-blue-400">
                  • {userProfile.name} • {(userProfile.sovicoTokens || 0).toLocaleString('vi-VN')} SVT
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useGemini}
                onChange={(e) => setUseGemini(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-300">
                {useGemini ? 'Gemini AI' : 'Local AI'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#161B22] border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-line text-sm">
                {message.content}
              </div>
              
              {/* Display service actions if available */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-purple-400">🔧 Tiến trình thực hiện:</div>
                  {message.actions.map((action) => (
                    <div key={action.id} className="flex items-center space-x-2 p-2 bg-gray-800 rounded text-xs">
                      <span>{getActionStatusIcon(action.status)}</span>
                      <span className="flex-1">
                        {action.service === 'vietjet' && '✈️ Vietjet Air'}
                        {action.service === 'hdbank' && '🏦 HDBank'}
                        {action.service === 'resort' && '🏨 Resort'}
                        {' - '}
                        {action.action === 'book_flight' && 'Đặt vé máy bay'}
                        {action.action === 'loan' && 'Vay tiền'}
                        {action.action === 'transfer' && 'Chuyển khoản'}
                        {action.action === 'book_room' && 'Đặt phòng'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        action.status === 'completed' ? 'bg-green-600' :
                        action.status === 'executing' ? 'bg-yellow-600' :
                        action.status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                      }`}>
                        {action.status === 'pending' && 'Chờ xử lý'}
                        {action.status === 'executing' && 'Đang thực hiện'}
                        {action.status === 'completed' && 'Hoàn thành'}
                        {action.status === 'failed' && 'Thất bại'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString('vi-VN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
      
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-400">AI đang suy nghĩ...</span>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-[#161B22] border border-purple-600 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-purple-400">🤖 Đang thực hiện dịch vụ...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-3">💡 Câu hỏi gợi ý:</p>
          <div className="grid grid-cols-1 gap-2">
            {predefinedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuestionClick(question)}
                className="text-left p-3 bg-[#161B22] hover:bg-[#1F2937] rounded-lg text-sm border border-gray-700 hover:border-blue-500 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Hỏi tôi về tài chính hoặc yêu cầu dịch vụ..."
            className="flex-1 bg-[#161B22] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isProcessing ? (
              <div className="w-5 h-5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              '📤'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIFinancialAssistant;
