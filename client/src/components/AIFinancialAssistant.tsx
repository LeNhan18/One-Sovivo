import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface UserProfile {
  name: string;
  age: number;
  income: number;
  savings: number;
  riskTolerance: 'low' | 'medium' | 'high';
  goals: string[];
  currentInvestments: any[];
}

const AIFinancialAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Xin chào! Tôi là AI Financial Advisor của Sovico. Tôi sẽ giúp bạn đưa ra các lời khuyên tài chính dựa trên profile 360° của bạn. Hãy hỏi tôi bất cứ điều gì về đầu tư, tiết kiệm, hoặc quản lý tài chính!',
      timestamp: new Date(),
      suggestions: [
        'Tôi có 50 triệu, nên làm gì để tiền sinh lời?',
        'Phân tích chi tiêu của tôi trong 3 tháng qua',
        'Tư vấn đầu tư phù hợp với độ tuổi của tôi',
        'Lập kế hoạch tài chính cho việc mua nhà'
      ]
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userProfile: UserProfile = {
    name: 'Nguyễn Văn A',
    age: 28,
    income: 25000000, // 25 triệu/tháng
    savings: 150000000, // 150 triệu
    riskTolerance: 'medium',
    goals: ['Mua nhà', 'Đầu tư dài hạn', 'Du lịch'],
    currentInvestments: [
      { type: 'Tiết kiệm HDBank', amount: 80000000, rate: 6.5 },
      { type: 'Cổ phiếu', amount: 30000000, return: 12 },
      { type: 'Vàng', amount: 40000000, return: 8 }
    ]
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('50 triệu') || input.includes('50tr') || input.includes('tiền sinh lời')) {
      return `Dựa trên profile của bạn, với 50 triệu VND, tôi khuyên bạn nên:

📊 **Phân bố đầu tư được đề xuất:**
• 30% (15tr) - Tiết kiệm có kỳ hạn HDBank (6.5%/năm) - An toàn, thanh khoản cao
• 40% (20tr) - Quỹ đầu tư cân bằng - Tăng trưởng ổn định 8-10%/năm
• 20% (10tr) - Cổ phiếu blue-chip - Tiềm năng tăng trưởng 12-15%/năm
• 10% (5tr) - Dự phòng khẩn cấp - Gửi tiết kiệm không kỳ hạn

💡 **Lý do lựa chọn:**
- Tuổi 28, thời gian đầu tư dài hạn (30+ năm)
- Thu nhập ổn định 25tr/tháng
- Mức độ rủi ro trung bình phù hợp

🎯 **Dự kiến lợi nhuận:** 8-12%/năm trung bình
**Giá trị sau 5 năm:** ~75-85 triệu VND

Bạn có muốn tôi hướng dẫn cụ thể cách thực hiện không?`;
    }

    if (input.includes('chi tiêu') || input.includes('phân tích')) {
      return `📊 **Phân tích chi tiêu 3 tháng qua của bạn:**

**HDBank (Tài khoản chính):**
• Tổng chi: 18.5 triệu VND
• Chi tiêu trung bình: 6.17tr/tháng
• Xu hướng: Giảm 8% so với quý trước ✅

**HDSaison (Thẻ tín dụng):**
• Tổng chi: 12.3 triệu VND  
• Categories lớn nhất:
  - Ăn uống & giải trí: 5.2tr (42%)
  - Mua sắm: 3.8tr (31%)
  - Di chuyển: 2.1tr (17%)
  - Khác: 1.2tr (10%)

**Vietjet (Du lịch):**
• 3 chuyến bay - 8.5 triệu VND
• Tăng 40% so với quý trước

💰 **Đánh giá tài chính:**
• Tỷ lệ tiết kiệm: 68% (Xuất sắc! 📈)
• Chi tiêu/Thu nhập: 32% (Lý tưởng < 50%)
• Dư nợ thẻ tín dụng: 0 VND ✅

🎯 **Khuyến nghị:**
1. Duy trì tỷ lệ tiết kiệm hiện tại
2. Cân nhắc tăng đầu tư từ phần tiết kiệm dư thừa
3. Có thể tăng chi tiêu giải trí 10-15% để cân bằng cuộc sống`;
    }

    if (input.includes('đầu tư') && input.includes('tuổi')) {
      return `🎯 **Tư vấn đầu tư theo độ tuổi 28:**

**Ưu thế của bạn:**
• Thời gian đầu tư dài (37 năm đến nghỉ hưu)
• Thu nhập ổn định và tăng trưởng
• Khả năng chấp nhận rủi ro cao

📈 **Danh mục đầu tư được đề xuất:**

**Giai đoạn 28-35 tuổi (Hiện tại):**
• 60% Cổ phiếu (VN30, ETF quốc tế)
• 25% Trái phiếu & Tiết kiệm
• 10% Bất động sản (REITs)
• 5% Vàng/Crypto (phòng ngừa lạm phát)

**Mục tiêu lợi nhuận:** 10-12%/năm

**Giai đoạn 35-45 tuổi:**
• Giảm dần tỷ trọng cổ phiếu xuống 45%
• Tăng trái phiếu lên 35%

**Sau 45 tuổi:**
• Chuyển sang đầu tư bảo toàn: 70% trái phiếu, 30% cổ phiếu

🚀 **Chiến lược DCA (Dollar Cost Averaging):**
• Đầu tư đều đặn 8-10tr/tháng
• Tự động hóa qua HDBank Auto-Invest
• Tái đầu tư cổ tức

💡 **Với 150 triệu hiện tại + 10tr/tháng:**
**Sau 20 năm:** ~1.2 tỷ VND
**Sau 30 năm:** ~2.8 tỷ VND`;
    }

    if (input.includes('mua nhà') || input.includes('bất động sản')) {
      return `🏠 **Kế hoạch tài chính mua nhà:**

**Phân tích khả năng tài chính:**
• Thu nhập: 25tr/tháng
• Tiết kiệm hiện tại: 150tr
• Khả năng tiết kiệm: 17tr/tháng

🎯 **Mục tiêu BĐS phù hợp:**
• Giá trị: 2.5 - 3.5 tỷ VND
• Vị trí: Quận 7, Thủ Đức, Bình Thạnh
• Loại: Căn hộ 2-3PN

💰 **Kế hoạch tài chính:**

**Bước 1: Chuẩn bị vốn (12-18 tháng)**
• Vốn tự có cần: 30% = 750tr - 1.05 tỷ
• Hiện có: 150tr
• Cần tiết kiệm thêm: 600-900tr
• Thời gian: 15-18 tháng (với 17tr/tháng)

**Bước 2: Vay ngân hàng**
• Vay 70% = 1.75 - 2.45 tỷ
• Lãi suất: 8-9%/năm
• Thời hạn: 20-25 năm
• Trả góp/tháng: 15-20tr (60-80% thu nhập)

📊 **Timeline được đề xuất:**
• **6 tháng tới:** Tích lũy 150tr + 100tr = 250tr
• **12 tháng:** Đạt 400tr, bắt đầu tìm hiểu thị trường
• **18 tháng:** Đạt 550-600tr, sẵn sàng mua

💡 **Chiến lược tối ưu:**
1. Gửi tiết kiệm có kỳ hạn để tích lũy nhanh
2. Đăng ký tư vấn ưu đãi lãi suất tại HDBank (khách hàng VIP)
3. Xem xét mua trong giai đoạn thị trường điều chỉnh

⚠️ **Lưu ý:** Sau khi mua nhà, thu nhập khả dụng còn ~5-10tr/tháng. Cần điều chỉnh lối sống phù hợp.`;
    }

    // Default responses
    const defaultResponses = [
      `Dựa trên dữ liệu 360° của bạn, tôi thấy bạn có profile tài chính khá tốt. Bạn có thể cụ thể hơn về vấn đề muốn tư vấn không?`,
      
      `Với thu nhập 25 triệu/tháng và tiết kiệm 150 triệu hiện tại, bạn đang có nền tảng tài chính vững chắc. Hãy cho tôi biết mục tiêu cụ thể để tôi tư vấn phù hợp nhất.`,
      
      `Tôi có thể giúp bạn về: đầu tư, tiết kiệm, mua nhà, quản lý chi tiêu, hoặc lập kế hoạch tài chính. Bạn quan tâm lĩnh vực nào nhất?`
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: getAIResponse(inputMessage),
        timestamp: new Date(),
        suggestions: [
          'Tôi muốn biết thêm chi tiết',
          'Có lựa chọn nào khác không?',
          'Rủi ro của phương án này?',
          'Tư vấn khác'
        ]
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Financial Advisor</h3>
            <p className="text-blue-100 text-sm">Tư vấn tài chính thông minh 24/7</p>
          </div>
          <div className="ml-auto">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">{formatVND(userProfile.income)}</div>
            <div className="text-xs text-gray-600">Thu nhập/tháng</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{formatVND(userProfile.savings)}</div>
            <div className="text-xs text-gray-600">Tổng tiết kiệm</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">{userProfile.age} tuổi</div>
            <div className="text-xs text-gray-600">Độ tuổi</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {userProfile.riskTolerance === 'low' ? 'Thấp' : 
               userProfile.riskTolerance === 'medium' ? 'Trung bình' : 'Cao'}
            </div>
            <div className="text-xs text-gray-600">Khẩu vị rủi ro</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl' 
                : 'bg-white text-gray-800 rounded-r-2xl rounded-tl-2xl shadow-sm border'
            } p-4`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('vi-VN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              
              {message.suggestions && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-gray-600">Gợi ý câu hỏi:</div>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-1 rounded-full transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-r-2xl rounded-tl-2xl shadow-sm border p-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Hỏi tôi về đầu tư, tiết kiệm, hoặc quản lý tài chính..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              inputMessage.trim() && !isTyping
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Gửi
          </button>
        </div>
        
        <div className="flex space-x-2 mt-2">
          {['💰 Đầu tư', '🏠 Mua nhà', '📊 Phân tích', '🎯 Mục tiêu'].map(quickAction => (
            <button
              key={quickAction}
              onClick={() => handleSuggestionClick(quickAction.split(' ')[1])}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-all"
            >
              {quickAction}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIFinancialAssistant;
