import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AIFinancialAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Chào bạn! Tôi là AI Financial Advisor của Sovico. Tôi có thể giúp bạn:\n\n• 📊 Phân tích chi tiêu và đầu tư\n• 🎯 Đề xuất sản phẩm tài chính phù hợp\n• 💰 Tối ưu hóa portfolio\n• 🏆 Chiến lược tích lũy SVT token\n\nBạn có câu hỏi gì về tài chính không?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const predefinedQuestions = [
    "Tôi nên đầu tư vào đâu với 100 triệu VND?",
    "Làm thế nào để tối ưu hóa chi tiêu hàng tháng?",
    "Chiến lược tích lũy SVT token hiệu quả?",
    "Sản phẩm HDBank nào phù hợp với tôi?",
    "Lập kế hoạch tài chính cho năm 2025"
  ];

  const generateAIResponse = (userMessage: string): string => {
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
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(inputMessage),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
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
          <div>
            <h2 className="font-bold text-lg">AI Financial Advisor</h2>
            <p className="text-sm text-gray-400">Powered by Sovico Intelligence</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Online
            </span>
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
          <span>💰 Miễn phí cho khách hàng Sovico</span>
        </div>
      </div>
    </div>
  );
};

export default AIFinancialAssistant;
