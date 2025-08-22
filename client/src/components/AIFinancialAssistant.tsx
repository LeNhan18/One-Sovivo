import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
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
      content: '👋 Chào bạn! Tôi là AI Financial Advisor của Sovico được hỗ trợ bởi Google Gemini.\n\n🎯 **Khả năng của tôi:**\n• 📊 Phân tích tài chính cá nhân 360°\n• 💎 Tư vấn tối ưu hóa SVT và NFT\n• � Đề xuất sản phẩm HDBank phù hợp\n• ✈️ Chiến lược tích điểm Vietjet\n• �️ Lập kế hoạch nghỉ dưỡng thông minh\n• � Dự báo và phân tích thị trường\n\n💡 Tôi sẽ phân tích profile của bạn để đưa ra lời khuyên cá nhân hóa. Hãy hỏi tôi bất cứ điều gì!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            name: userData.name || 'Khách hàng',
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
    "Làm thế nào để nâng cấp lên cấp bậc Diamond với SVT?",
    "Tôi nên đầu tư vào đâu với profile hiện tại?",
    "Tối ưu hóa việc sử dụng hệ sinh thái Sovico như thế nào?",
    "Lập kế hoạch tài chính 5 năm dựa trên thu nhập của tôi"
  ];

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
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
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
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
