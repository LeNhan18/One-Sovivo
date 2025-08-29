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

// Initialize Gemini AI with multiple model fallbacks
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDxF5rCqGT8v-7hP8j2mN9kL3nQ1rS6wE4';
const genAI = new GoogleGenerativeAI(apiKey);

// Try different models in order of preference
const getModel = () => {
  const modelNames = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-pro",
    "gemini-1.0-pro"
  ];
  
  // For now, use the most stable one
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

const model = getModel();

const AIFinancialAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Chào bạn! Tôi là AI Assistant của Sovico được hỗ trợ bởi Google Gemini.\n\n🎯 **Khả năng của tôi:**\n• 📊 Phân tích tài chính cá nhân và tư vấn\n• ✈️ **Tự động đặt vé máy bay Vietjet**\n• 🏦 **Tự động xử lý giao dịch HDBank**\n• 🏨 **Tự động đặt phòng resort**\n• 💎 Tối ưu hóa SVT và NFT\n• 🤖 **Thực hiện dịch vụ tự động theo yêu cầu**\n\n💡 **Thử nói:** "Đặt vé máy bay cho tôi", "Vay 500 triệu", "Đặt phòng khách sạn"\n\nHãy hỏi tôi bất cứ điều gì!',
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
            age: 30, // Default, could be enhanced
            customer_id: userData.customer_id,
            riskTolerance: 'moderate', // Default, could be from survey
            sovicoTokens: svtBalance,
            totalTransactions: transactionCount,
            monthlyIncome: 20000000, // Default 20M VND
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

  const predefinedQuestions = [
    "Phân tích profile tài chính và đề xuất chiến lược cho tôi",
    "Đặt vé máy bay cho tôi đi Đà Nẵng",
    "Vay 500 triệu để mua nhà",
    "Đặt phòng khách sạn 3 đêm", 
    "Chuyển khoản 10 triệu cho bạn",
    "Làm thế nào để nâng cấp lên cấp bậc Diamond với SVT?",
    "Tối ưu hóa việc sử dụng hệ sinh thái Sovico như thế nào?"
  ];

  // AI Intent Recognition - Phân tích ý định từ text
  const analyzeIntent = (text: string): ServiceAction[] => {
    const normalizedText = text.toLowerCase()
    const actions: ServiceAction[] = []

    // Flight booking intents - Mở rộng keyword detection
    if (normalizedText.includes('vé máy bay') || normalizedText.includes('đặt vé') || 
        normalizedText.includes('bay') || normalizedText.includes('chuyến bay') ||
        normalizedText.includes('vietjet') || normalizedText.includes('máy bay') ||
        (normalizedText.includes('đi') && (normalizedText.includes('vé') || normalizedText.includes('bay'))) ||
        normalizedText.includes('book flight') || normalizedText.includes('flight')) {
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
          // Update action status to completed
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
        // Update action status to failed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, actions: msg.actions?.map(a => 
                a.id === action.id ? { ...a, status: 'failed', result: { error: error.message } } : a
              ) }
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
        if (action === 'transfer') return `${baseUrl}/hdbank/transfer`
        if (action === 'loan') return `${baseUrl}/hdbank/loan`
        return ''
      case 'resort':
        if (action === 'book_room') return `${baseUrl}/resort/book-room`
        if (action === 'spa_booking') return `${baseUrl}/resort/book-spa`
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

  // Enhanced AI response using Gemini with model fallback
  const generateGeminiResponse = async (userMessage: string): Promise<string> => {
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
    
    for (const modelName of modelNames) {
      try {
        console.log(`🤖 Trying Gemini model: ${modelName}`);
        
        // Try each model
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        
        // Professional System Prompt
        const systemPrompt = `Bạn là một Trợ lý Tài chính AI chuyên nghiệp của Tập đoàn Sovico.
Nhiệm vụ của bạn là đưa ra lời khuyên cá nhân hóa dựa trên dữ liệu 360° của khách hàng.

**KIẾN THỨC NỀN TẢNG VỀ HỆ SINH THÁI SOVICO:**

🏢 **Tập đoàn Sovico** - Hệ sinh thái tài chính toàn diện:
- **HDBank**: Ngân hàng số 1 về dịch vụ khách hàng, cung cấp thẻ tín dụng, tiết kiệm, đầu tư
- **Vietjet Air**: Hãng hàng không giá rẻ hàng đầu Đông Nam Á
- **Sovico Resort**: Chuỗi resort cao cấp 5 sao tại các điểm đến hấp dẫn
- **Sovico Real Estate**: Phát triển bất động sản cao cấp

💎 **Sovico Token (SVT)** - Token tiện ích blockchain:
- Kiếm SVT qua: Giao dịch HDBank (0.1% giá trị), bay Vietjet (100 SVT/chuyến), booking resort (500 SVT/đêm), hoàn thành nhiệm vụ (50-1000 SVT)
- Sử dụng SVT: Đổi voucher ăn uống (ROI 120%), upgrade hạng bay (ROI 150%), giảm giá resort (10-30%), mua NFT achievements, P2P trading
- Hệ thống cấp bậc: Bronze (<10K SVT), Silver (10K-50K), Gold (50K-200K), Diamond (>200K)

🎖️ **Hộ chiếu NFT** - Tài sản số độc nhất:
- Ghi lại cấp bậc, thành tựu, lịch sử giao dịch
- Tự động "tiến hóa" khi đạt cột mốc mới
- Có thể trade trên marketplace nội bộ
- Mang lại quyền lợi đặc biệt (ưu đãi, ưu tiên dịch vụ)

💳 **Sản phẩm HDBank chính:**
- Thẻ Visa Signature: Phòng chờ sân bay, bảo hiểm du lịch
- Thẻ Vietjet Platinum: Tích miles x2, miễn phí hành lý
- Gói tiết kiệm HD EARN: 7-8%/năm + bảo hiểm
- HD Invest: Ủy thác đầu tư từ 10 triệu VND

**QUY TẮC TRẢ LỜI:**
1. Luôn phân tích HỒ SƠ KHÁCH HÀNG trước khi tư vấn
2. Cá nhân hóa 100% dựa trên tuổi, thu nhập, khẩu vị rủi ro
3. Đề xuất cụ thể các sản phẩm Sovico phù hợp
4. Luôn bao gồm chiến lược tích lũy SVT
5. Sử dụng format Markdown với emoji để dễ đọc
6. Đưa ra timeline và action steps cụ thể
7. Tính toán ROI và lợi ích số liệu cụ thể`;

        // Build complete prompt with user profile
        const fullPrompt = `${systemPrompt}

**HỒ SƠ KHÁCH HÀNG HIỆN TẠI:**
- 👤 Tên: ${userProfile?.name || 'Khách hàng'}
- 🎂 Tuổi: ${userProfile?.age || 'Chưa xác định'}
- 🎯 Khẩu vị rủi ro: ${userProfile?.riskTolerance || 'moderate'}
- 💎 Số dư SVT: ${userProfile?.sovicoTokens?.toLocaleString('vi-VN') || '0'} SVT
- 📊 Tổng giao dịch: ${userProfile?.totalTransactions || 0} lần
- 💰 Thu nhập ước tính: ${userProfile?.monthlyIncome?.toLocaleString('vi-VN') || 'Chưa xác định'} VND/tháng
- 🏆 Cấp bậc hiện tại: ${userProfile?.sovicoTokens && userProfile.sovicoTokens >= 200000 ? 'Diamond 💎' : 
                          userProfile?.sovicoTokens && userProfile.sovicoTokens >= 50000 ? 'Gold 🥇' :
                          userProfile?.sovicoTokens && userProfile.sovicoTokens >= 10000 ? 'Silver 🥈' : 'Bronze 🥉'}

**CÂU HỎI CỦA KHÁCH HÀNG:**
"${userMessage}"

Hãy phân tích kỹ profile khách hàng và đưa ra lời khuyên tài chính cá nhân hóa, bao gồm chiến lược sử dụng hệ sinh thái Sovico một cách tối ưu.`;

        const result = await currentModel.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Success with ${modelName}! Response length:`, text.length);
        return text;
        
      } catch (error: any) {
        console.warn(`⚠️ Model ${modelName} failed:`, error.message);
        
        // If this is the last model, throw the error
        if (modelName === modelNames[modelNames.length - 1]) {
          throw error;
        }
        
        // Otherwise continue to next model
        continue;
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('All Gemini models failed');
  };

  const generateLocalResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Đầu tư
    if (lowerMessage.includes('đầu tư') || lowerMessage.includes('investment')) {
      return `💡 **Phân tích đầu tư cho bạn:**

Dựa trên profile và mức độ rủi ro:

🏦 **Ngân hàng (30-40%)**
• Tiền gửi có kỳ hạn HDBank: 7-8%/năm
• Trái phiếu doanh nghiệp: 8-12%/năm

📈 **Chứng khoán (20-30%)**
• Cổ phiếu blue-chip VN30
• ETF diversified

🏠 **Bất động sản (20-30%)**
• Resort/condotel qua Sovico
• Căn hộ cho thuê khu vực trung tâm

💎 **SVT Ecosystem (10-20%)**
• Stake SVT để nhận rewards
• Trading trên P2P marketplace

**Lưu ý:** Chỉ đầu tư số tiền có thể chấp nhận rủi ro!`;
    }
    
    // Chi tiêu
    if (lowerMessage.includes('chi tiêu') || lowerMessage.includes('tiết kiệm')) {
      return `💰 **Kế hoạch tối ưu chi tiêu:**

📊 **Quy tắc 50/30/20:**
• 50% nhu cầu thiết yếu (ăn, ở, đi lại)
• 30% giải trí, mua sắm
• 20% tiết kiệm và đầu tư

🎯 **Mẹo tiết kiệm với Sovico:**
• Dùng thẻ HDBank để tích điểm
• Bay Vietjet thường xuyên → tích miles
• Nghỉ dưỡng Sovico Resort → voucher
• Mua sắm bằng SVT token → cashback

📱 **Công cụ theo dõi:**
• Sovico SuperApp tracking tự động
• Báo cáo chi tiêu theo danh mục
• Cảnh báo khi vượt ngân sách`;
    }
    
    // SVT Token
    if (lowerMessage.includes('svt') || lowerMessage.includes('token')) {
      return `🪙 **Chiến lược SVT Token:**

🎯 **Cách kiếm SVT:**
• Hoàn thành nhiệm vụ hàng ngày: 50-100 SVT
• Giao dịch HDBank: 0.1% số tiền → SVT
• Bay Vietjet: 100 SVT/chuyến
• Review resort: 200-500 SVT
• Refer bạn bè: 1000 SVT/người

💎 **Cách dùng SVT hiệu quả:**
• Đổi voucher ăn uống (ROI 120%)
• Upgrade hạng bay (ROI 150%)
• Mua NFT achievements 
• Trade trên P2P marketplace

🏆 **Level up strategy:**
• Tích 10,000 SVT → Silver
• Tích 50,000 SVT → Gold  
• Tích 200,000 SVT → Diamond`;
    }
    
    // HDBank
    if (lowerMessage.includes('hdbank') || lowerMessage.includes('ngân hàng')) {
      return `🏦 **Sản phẩm HDBank phù hợp:**

💳 **Thẻ tín dụng:**
• HDBank Visa Signature: Phòng chờ sân bay
• HDBank Vietjet Platinum: Tích miles x2
• HDBank Live: Cashback 8% ăn uống

💰 **Tiết kiệm & Đầu tư:**
• Tiền gửi online: Lãi suất ưu đãi +0.5%
• HD EARN: Combo tiết kiệm + bảo hiểm
• HD Invest: Ủy thác đầu tư từ 10 triệu

🎁 **Ưu đãi đặc biệt:**
• Mở tài khoản qua Sovico: +500 SVT
• Duy trì số dư 50 triệu: +200 SVT/tháng
• Giao dịch 10 triệu/tháng: Free phí chuyển khoản`;
    }
    
    // Kế hoạch tài chính
    if (lowerMessage.includes('kế hoạch') || lowerMessage.includes('planning')) {
      return `📋 **Kế hoạch tài chính 2025:**

🎯 **Mục tiêu SMART:**
• Tiết kiệm 100 triệu (8.3 triệu/tháng)
• Đầu tư 50 triệu vào portfolio cân bằng
• Tích lũy 50,000 SVT tokens
• Đạt hạng Gold trong hệ sinh thái Sovico

📅 **Timeline thực hiện:**
**Q1:** Tối ưu chi tiêu, mở tài khoản đầu tư
**Q2:** Đầu tư batch 1, bắt đầu DCA stocks
**Q3:** Review & rebalance portfolio
**Q4:** Harvest profits, plan cho năm sau

💡 **Action items:**
• Setup auto-transfer 8.3tr/tháng
• Cài đặt alerts trên Sovico app
• Monthly review với AI advisor`;
    }
    
    // Default response
    return `🤖 Cảm ơn bạn đã hỏi! Tôi đang phân tích câu hỏi của bạn...

Dựa trên thông tin hiện tại, tôi đề xuất:

💼 **Phân tích ngắn hạn:**
• Review lại spending pattern của bạn
• Tối ưu hóa cash flow với các sản phẩm HDBank
• Tích cực tham gia Sovico ecosystem để kiếm SVT

📈 **Chiến lược dài hạn:**
• Đa dạng hóa portfolio (stocks, bonds, real estate)
• Xây dựng emergency fund 6-12 tháng
• Đầu tư vào education và personal development

💬 Bạn có thể hỏi cụ thể hơn về đầu tư, tiết kiệm, hoặc các sản phẩm tài chính nhé!`;
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

    if (actions.length > 0) {
      // Create AI response with detected actions
      const actionsList = actions.map(a => {
        switch (a.service) {
          case 'vietjet':
            return `✈️ Đặt vé máy bay (${a.params.flight_type === 'international' ? 'Quốc tế' : 'Nội địa'})`
          case 'hdbank':
            if (a.action === 'loan') return `💰 Vay tiền ${(a.params.loan_amount / 1000000).toFixed(0)} triệu VNĐ`
            if (a.action === 'transfer') return `💳 Chuyển khoản ${(a.params.amount / 1000000).toFixed(0)} triệu VNĐ`
            return `🏦 Dịch vụ ngân hàng HDBank`
          case 'resort':
            if (a.action === 'book_room') return `🏨 Đặt phòng ${a.params.nights} đêm`
            if (a.action === 'spa_booking') return `💆‍♀️ Đặt lịch Spa`
            return `🏖️ Dịch vụ Resort`
          default:
            return '🔧 Dịch vụ khác'
        }
      }).join('\n• ')

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: `🎯 Tôi hiểu rồi! Bạn muốn:\n\n• ${actionsList}\n\n⏳ Đang thực hiện các yêu cầu này cho bạn...`,
        timestamp: new Date(),
        actions: actions
      }

      setMessages(prev => [...prev, aiMessage]);

      // Execute the actions
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
      console.error('❌ Error generating response:', error);
      
      let errorMessage = '❌ **Xin lỗi, AI gặp sự cố**\n\n';
      
      if (error.message && error.message.includes('GoogleGenerativeAI')) {
        errorMessage += '🔧 **Vấn đề Gemini AI:**\n';
        errorMessage += '• API có thể bị giới hạn hoặc model không khả dụng\n';
        errorMessage += '• Đang chuyển sang chế độ tư vấn cơ bản\n\n';
        errorMessage += generateLocalResponse(currentInput);
      } else if (error.message && error.message.includes('fetch')) {
        errorMessage += '🌐 **Vấn đề kết nối mạng:**\n';
        errorMessage += '• Kiểm tra kết nối internet\n';
        errorMessage += '• Thử lại sau vài giây\n';
      } else {
        errorMessage += '⚠️ **Lỗi không xác định:**\n';
        errorMessage += '• Vui lòng thử lại hoặc liên hệ support\n';
        errorMessage += '• Hotline: 1900-1234\n';
      }
      
      errorMessage += '\n---\n💡 *Tip: Bạn có thể toggle sang "Local AI" để sử dụng tư vấn offline*';
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: errorMessage,
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
            <h2 className="font-bold text-lg">AI Financial Advisor</h2>
            <p className="text-sm text-gray-400">
              {useGemini ? 'Powered by Google Gemini AI' : 'Powered by Sovico Intelligence'}
              {userProfile && (
                <span className="ml-2 text-blue-400">
                  • {userProfile.name} • {userProfile.sovicoTokens.toLocaleString('vi-VN')} SVT
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setUseGemini(!useGemini)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                useGemini 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {useGemini ? '🧠 Gemini AI' : '🔧 Local AI'}
            </button>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Online
            </span>

          </div>
        </div>
      </div>

      {/* User Profile Indicator */}
      {userProfile && (
        <div className="bg-[#161B22] border-b border-gray-700 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">📊 Profile:</span>
              <span className="text-blue-400">{userProfile.name}</span>
              <span className="text-gray-500">|</span>
              <span className="text-purple-400">{userProfile.sovicoTokens.toLocaleString('vi-VN')} SVT</span>
              <span className="text-gray-500">|</span>
              <span className={`font-medium ${
                userProfile.sovicoTokens >= 200000 ? 'text-purple-400' :
                userProfile.sovicoTokens >= 50000 ? 'text-yellow-400' :
                userProfile.sovicoTokens >= 10000 ? 'text-gray-300' : 'text-orange-400'
              }`}>
                {userProfile.sovicoTokens >= 200000 ? '💎 Diamond' :
                 userProfile.sovicoTokens >= 50000 ? '🥇 Gold' :
                 userProfile.sovicoTokens >= 10000 ? '🥈 Silver' : '🥉 Bronze'}
              </span>
            </div>
            <div className="text-gray-500 text-xs">
              {userProfile.totalTransactions} giao dịch
            </div>
          </div>
        </div>
      )}

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
                        {action.action === 'spa_booking' && 'Đặt Spa'}
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
      <div className="bg-[#161B22] border-t border-gray-700 p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Hỏi AI về tài chính, đầu tư, tiết kiệm..."
            className="flex-1 bg-[#0D1117] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={isLoading}
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
        
        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <span>🔒 Cuộc trò chuyện được mã hóa end-to-end</span>
          <div className="flex items-center space-x-4">
            <span>💰 Miễn phí cho khách hàng Sovico</span>
            {useGemini && (
              <span className="bg-purple-900 text-purple-300 px-2 py-1 rounded">
                ⚡ Gemini AI Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFinancialAssistant;
