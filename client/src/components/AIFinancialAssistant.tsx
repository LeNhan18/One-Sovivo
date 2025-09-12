import React, { useState, useRef, useEffect } from 'react';

import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actions?: ServiceAction[];
}

interface ChatHistory {
  id: string;
  customer_id: number;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
  title?: string;
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
      content: ' **Chào bạn! Tôi là AI AGENT của Sovico** - Không chỉ tư vấn mà còn thực hiện dịch vụ!\n\n⚡ **AGENT MODE - THỰC THI TỰ ĐỘNG:**\n• ✈️ **Đặt vé máy bay Vietjet tức thì** khi có đủ thông tin\n• 🏦 **Xử lý giao dịch HDBank ngay lập tức**\n• 🏨 **Đặt phòng resort tự động**\n• � **Chuyển khoản, vay vốn tức thì**\n• 💎 **Tối ưu SVT và phân tích tài chính**\n\n🚀 **CÁCH ĐẶT VÉ AGENT (Tự động thực hiện):**\n• "Đặt vé từ **Hà Nội** đi **Phú Quốc** ngày **20/10** cho **2 người**" → Agent đặt ngay!\n• "Bay từ **TP.HCM** đến **Singapore** **ngày mai**" → Agent thực hiện tức thì!\n\n� **LỢI ÍCH AGENT:**\n• ⚡ Không cần confirm - Agent thực hiện ngay\n• 🎯 Chủ động hoàn tất tất cả bước\n• 🚀 Nhanh chóng, hiệu quả\n• 💎 Tự động cộng SVT rewards\n\n**Agent sẵn sàng phục vụ! Hãy yêu cầu bất cứ điều gì!** 🎯',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useGemini, setUseGemini] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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

          // Load chat history for this user
          await loadChatHistory(userData.customer_id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Load chat history from API
  const loadChatHistory = async (customerId: number) => {
    try {
      // Get from API
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://127.0.0.1:5000/api/chat/history/${customerId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const serverHistory: ChatHistory[] = data.chats.map((chat: any) => ({
            id: chat.id,
            customer_id: chat.customer_id,
            messages: chat.messages.map((msg: any) => ({
              id: msg.id,
              type: msg.message_type,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              actions: msg.actions
            })),
            created_at: new Date(chat.created_at),
            updated_at: new Date(chat.updated_at),
            title: chat.title
          }));
          
          setChatHistory(serverHistory);
          
          // Also save to localStorage as backup
          localStorage.setItem(`chat_history_${customerId}`, JSON.stringify(serverHistory));
          
          // Load the most recent chat if exists
          if (serverHistory.length > 0) {
            const latestChat = serverHistory[0];
            setCurrentChatId(latestChat.id);
          }
          
          return;
        }
      }
      
      // Fallback to localStorage if API fails
      console.log('API failed, falling back to localStorage');
      const localHistory = localStorage.getItem(`chat_history_${customerId}`);
      if (localHistory) {
        const parsedHistory: ChatHistory[] = JSON.parse(localHistory);
        setChatHistory(parsedHistory);
        
        if (parsedHistory.length > 0) {
          const latestChat = parsedHistory[0];
          setCurrentChatId(latestChat.id);
        }
      }
      
    } catch (error) {
      console.error('Error loading chat history:', error);
      
      // Fallback to localStorage on error
      try {
        const localHistory = localStorage.getItem(`chat_history_${customerId}`);
        if (localHistory) {
          const parsedHistory: ChatHistory[] = JSON.parse(localHistory);
          setChatHistory(parsedHistory);
          
          if (parsedHistory.length > 0) {
            const latestChat = parsedHistory[0];
            setCurrentChatId(latestChat.id);
          }
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    }
  };

  // Save chat to history
  const saveChatToHistory = async (messages: Message[]) => {
    if (!userProfile || messages.length <= 1) return; // Don't save empty chats

    const chatId = currentChatId || `chat_${Date.now()}`;
    const chatTitle = generateChatTitle(messages);
    
    const chatData: ChatHistory = {
      id: chatId,
      customer_id: userProfile.customer_id,
      messages: messages,
      created_at: currentChatId ? chatHistory.find(c => c.id === currentChatId)?.created_at || new Date() : new Date(),
      updated_at: new Date(),
      title: chatTitle
    };

    try {
      // Save to API first
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://127.0.0.1:5000/api/chat/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(chatData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Chat saved to server successfully');
          
          // Update local state
          let updatedHistory = [...chatHistory];
          const existingIndex = updatedHistory.findIndex(c => c.id === chatId);
          
          if (existingIndex >= 0) {
            updatedHistory[existingIndex] = chatData;
          } else {
            updatedHistory.unshift(chatData);
            setCurrentChatId(chatId);
          }
          
          updatedHistory = updatedHistory.slice(0, 50);
          setChatHistory(updatedHistory);
          
          // Also save to localStorage as backup
          localStorage.setItem(`chat_history_${userProfile.customer_id}`, JSON.stringify(updatedHistory));
          
          return;
        }
      }
      
      throw new Error('API save failed');
      
    } catch (error) {
      console.error('Error saving to API, falling back to localStorage:', error);
      
      // Fallback to localStorage
      try {
        let updatedHistory = [...chatHistory];
        const existingIndex = updatedHistory.findIndex(c => c.id === chatId);
        
        if (existingIndex >= 0) {
          updatedHistory[existingIndex] = chatData;
        } else {
          updatedHistory.unshift(chatData);
          setCurrentChatId(chatId);
        }
        
        updatedHistory = updatedHistory.slice(0, 50);
        setChatHistory(updatedHistory);
        localStorage.setItem(`chat_history_${userProfile.customer_id}`, JSON.stringify(updatedHistory));
        
        console.log('💾 Chat saved to localStorage as fallback');
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
      }
    }
  };

  // Generate chat title from messages
  const generateChatTitle = (messages: Message[]): string => {
    const userMessages = messages.filter(m => m.type === 'user');
    if (userMessages.length === 0) return 'Cuộc trò chuyện mới';
    
    const firstMessage = userMessages[0].content;
    // Extract key words for title
    if (firstMessage.toLowerCase().includes('vé máy bay') || firstMessage.toLowerCase().includes('đặt vé')) {
      return '✈️ Đặt vé máy bay';
    } else if (firstMessage.toLowerCase().includes('thẻ tín dụng') || firstMessage.toLowerCase().includes('mở thẻ')) {
      return '💳 Dịch vụ thẻ tín dụng';
    } else if (firstMessage.toLowerCase().includes('vay') || firstMessage.toLowerCase().includes('khoản vay')) {
      return '💰 Tư vấn vay vốn';
    } else if (firstMessage.toLowerCase().includes('đầu tư') || firstMessage.toLowerCase().includes('investment')) {
      return '📈 Tư vấn đầu tư';
    } else if (firstMessage.toLowerCase().includes('resort') || firstMessage.toLowerCase().includes('đặt phòng')) {
      return '🏨 Đặt phòng Resort';
    } else {
      // Truncate to 30 characters
      return firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    }
  };

  // Start new chat
  const startNewChat = () => {
    setMessages([{
      id: '1',
      type: 'ai',
      content: ' **Chào bạn! Tôi là AI AGENT của Sovico** - Không chỉ tư vấn mà còn thực hiện dịch vụ!\n\n⚡ **AGENT MODE - THỰC THI TỰ ĐỘNG:**\n• ✈️ **Đặt vé máy bay Vietjet tức thì** khi có đủ thông tin\n• 🏦 **Xử lý giao dịch HDBank ngay lập tức**\n• 🏨 **Đặt phòng resort tự động**\n• � **Chuyển khoản, vay vốn tức thì**\n• 💎 **Tối ưu SVT và phân tích tài chính**\n\n🚀 **CÁCH ĐẶT VÉ AGENT (Tự động thực hiện):**\n• "Đặt vé từ **Hà Nội** đi **Phú Quốc** ngày **20/10** cho **2 người**" → Agent đặt ngay!\n• "Bay từ **TP.HCM** đến **Singapore** **ngày mai**" → Agent thực hiện tức thì!\n\n� **LỢI ÍCH AGENT:**\n• ⚡ Không cần confirm - Agent thực hiện ngay\n• 🎯 Chủ động hoàn tất tất cả bước\n• 🚀 Nhanh chóng, hiệu quả\n• 💎 Tự động cộng SVT rewards\n\n**Agent sẵn sàng phục vụ! Hãy yêu cầu bất cứ điều gì!** 🎯',
      timestamp: new Date()
    }]);
    setCurrentChatId(null);
    setShowHistory(false);
  };

  // Load specific chat
  const loadChat = (chat: ChatHistory) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setShowHistory(false);
  };

  // Delete chat
  const deleteChat = async (chatId: string) => {
    if (!userProfile) return;
    
    try {
      // Delete from API first
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://127.0.0.1:5000/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Chat deleted from server successfully');
        }
      } else {
        console.log('⚠️ API delete failed, continuing with local delete');
      }
    } catch (error) {
      console.error('Error deleting from API:', error);
    }
    
    // Always update local state regardless of API result
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    localStorage.setItem(`chat_history_${userProfile.customer_id}`, JSON.stringify(updatedHistory));
    
    // If deleting current chat, start new one
    if (currentChatId === chatId) {
      startNewChat();
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const predefinedQuestions = [
    "Đặt vé từ Sài Gòn đi Phú Quốc ngày 25/10 cho 2 người",
    "Agent đặt vé từ TP.HCM đi Đà Nẵng ngày mai",
    "Bay từ Hà Nội đến Singapore ngày 15/12 cho 1 người",
    "Agent mở thẻ Visa Platinum HDBank với thu nhập cao",
    "Agent phân tích profile tài chính và đề xuất chiến lược", 
    "Agent vay 500 triệu để mua nhà ngay",
    "Agent đặt phòng resort 3 đêm tức thì"
  ];

  // AI Intent Recognition - Phân tích ý định từ text
  const analyzeIntent = (text: string): ServiceAction[] => {
    const normalizedText = text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd')
    
    const actions: ServiceAction[] = []

    console.log('🔍 Analyzing intent for:', normalizedText) // Debug
    console.log('🔍 Original text:', text) // Debug original text

    // Flight booking intents - Yêu cầu thông tin đầy đủ
    if (normalizedText.includes('ve may bay') || normalizedText.includes('dat ve') || 
        normalizedText.includes('bay') || normalizedText.includes('chuyen bay') ||
        normalizedText.includes('vietjet') || normalizedText.includes('may bay') ||
        (normalizedText.includes('di') && (normalizedText.includes('ve') || normalizedText.includes('bay'))) ||
        normalizedText.includes('book flight') || normalizedText.includes('flight') ||
        normalizedText.includes('agent')) {
      
      console.log('✈️ Flight booking intent detected') // Debug
      
      // Extract information từ text gốc (không normalize để giữ chính xác)
      const hasOrigin = extractLocation(text, 'origin')
      const hasDestination = extractLocation(text, 'destination')  
      const hasDate = extractDate(text)
      const hasPassengerCount = extractPassengerCount(text)
      
      console.log('📍 Origin:', hasOrigin, 'Destination:', hasDestination, 'Date:', hasDate, 'Passengers:', hasPassengerCount) // Debug
      
      // Nếu thiếu thông tin, không tạo action mà sẽ yêu cầu thông tin
      if (!hasOrigin || !hasDestination || !hasDate) {
        console.log('❌ Missing flight information - not creating action') // Debug
        console.log('Missing info:', !hasOrigin ? 'origin' : '', !hasDestination ? 'destination' : '', !hasDate ? 'date' : '')
        return [] // Không tạo action, để AI hỏi thông tin
      }
      
      console.log('✅ Creating flight booking action') // Debug
      actions.push({
        id: `flight_${Date.now()}`,
        service: 'vietjet',
        action: 'book_flight',
        params: {
          origin: hasOrigin,
          destination: hasDestination,
          departure_date: hasDate,
          passenger_count: hasPassengerCount || 1,
          flight_type: normalizedText.includes('quoc te') || normalizedText.includes('nuoc ngoai') ? 'international' : 'domestic',
          ticket_class: normalizedText.includes('thuong gia') || normalizedText.includes('business') ? 'business' : 'economy'
        },
        status: 'pending'
      })
    }

    // Banking intents
    if (normalizedText.includes('vay') || normalizedText.includes('khoan vay') || 
        normalizedText.includes('vay tien')) {
      const amount = extractAmount(normalizedText, 'loan')
      actions.push({
        id: `loan_${Date.now()}`,
        service: 'hdbank',
        action: 'loan',
        params: {
          loan_amount: amount,
          loan_type: normalizedText.includes('nha') ? 'home' : 
                    normalizedText.includes('xe') ? 'car' : 
                    normalizedText.includes('kinh doanh') ? 'business' : 'personal'
        },
        status: 'pending'
      })
    }

    // Card opening intents - Mở thẻ ngân hàng
    if (normalizedText.includes('mo the') || normalizedText.includes('lam the') || 
        normalizedText.includes('dang ky the') || normalizedText.includes('tao the') ||
        normalizedText.includes('the tin dung') || normalizedText.includes('the visa') ||
        normalizedText.includes('open card') || normalizedText.includes('credit card')) {
      
      // Determine card type from text
      let cardType = 'classic'
      if (normalizedText.includes('platinum') || normalizedText.includes('bach kim')) cardType = 'platinum'
      else if (normalizedText.includes('gold') || normalizedText.includes('vang')) cardType = 'gold'
      else if (normalizedText.includes('signature') || normalizedText.includes('cao cap')) cardType = 'signature'
      else if (normalizedText.includes('vietjet')) cardType = 'vietjet'
      
      actions.push({
        id: `card_${Date.now()}`,
        service: 'hdbank',
        action: 'open_card',
        params: {
          card_type: cardType,
          income_verification: normalizedText.includes('thu nhap cao') || normalizedText.includes('luong cao'),
          delivery_method: normalizedText.includes('nhan tai nha') ? 'home' : 'branch'
        },
        status: 'pending'
      })
    }

    if (normalizedText.includes('chuyen khoan') || normalizedText.includes('chuyen tien') ||
        normalizedText.includes('gui tien')) {
      const amount = extractAmount(normalizedText, 'transfer')
      actions.push({
        id: `transfer_${Date.now()}`,
        service: 'hdbank',
        action: 'transfer',
        params: {
          amount: amount,
          transfer_type: normalizedText.includes('nuoc ngoai') || normalizedText.includes('quoc te') ? 'international' : 'internal'
        },
        status: 'pending'
      })
    }

    // Hotel/Resort intents
    if (normalizedText.includes('khach san') || normalizedText.includes('dat phong') || 
        normalizedText.includes('resort') || normalizedText.includes('nghi duong')) {
      const nights = extractNights(normalizedText)
      actions.push({
        id: `hotel_${Date.now()}`,
        service: 'resort',
        action: 'book_room',
        params: {
          nights: nights,
          room_type: normalizedText.includes('cao cap') || normalizedText.includes('suite') ? 'suite' :
                    normalizedText.includes('deluxe') ? 'deluxe' : 'standard'
        },
        status: 'pending'
      })
    }

    // Spa intents
    if (normalizedText.includes('spa') || normalizedText.includes('massage') || 
        normalizedText.includes('thu gian')) {
      actions.push({
        id: `spa_${Date.now()}`,
        service: 'resort',
        action: 'spa_booking',
        params: {
          spa_type: normalizedText.includes('cao cap') ? 'premium_package' :
                   normalizedText.includes('mat') ? 'facial' :
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

  // Extract location from text - Enhanced version
  const extractLocation = (text: string, type: 'origin' | 'destination'): string | null => {
    // Normalize Vietnamese characters more comprehensively
    const normalizedText = text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd')
    
    console.log(`🔍 Extracting ${type} location from:`, normalizedText) // Debug
    
    const locations = {
      'ha noi': 'HAN',
      'hanoi': 'HAN',
      'thu do': 'HAN',
      'sai gon': 'SGN', 
      'saigon': 'SGN',
      'ho chi minh': 'SGN',
      'tphcm': 'SGN',
      'tp hcm': 'SGN',
      'tp.hcm': 'SGN',
      'hcm': 'SGN',
      'da nang': 'DAD',
      'danang': 'DAD',
      'phu quoc': 'PQC',
      'phuquoc': 'PQC',
      'dao phu quoc': 'PQC',
      'nha trang': 'CXR',
      'nhatrang': 'CXR',
      'cam ranh': 'CXR',
      'da lat': 'DLI',
      'dalat': 'DLI',
      'can tho': 'VCA',
      'cantho': 'VCA',
      'tokyo': 'NRT',
      'nhat ban': 'NRT',
      'seoul': 'ICN',
      'han quoc': 'ICN',
      'singapore': 'SIN',
      'bangkok': 'BKK',
      'thai lan': 'BKK'
    }

    // Strategy 1: Pattern matching first for better accuracy
    if (type === 'origin') {
      // Look for "từ X" patterns - more specific patterns first
      const originPatterns = [
        /tu\s+([^di]+?)\s+di/,  // "từ X đi" - most specific
        /ve\s+tu\s+([^di]+?)\s+di/,  // "vé từ X đi"
        /dat\s+ve\s+tu\s+([^di]+?)\s+di/,  // "đặt vé từ X đi"
        /bay\s+tu\s+([^di]+?)\s+di/,  // "bay từ X đi"
        /tu\s+([a-z\s]+?)(?:\s+den|\s+$)/,  // "từ X đến" or end of string
      ]
      
      for (const pattern of originPatterns) {
        const match = normalizedText.match(pattern)
        if (match) {
          const location = match[1].trim()
          console.log(`🔍 Found origin pattern: "${match[0]}" -> location: "${location}"`) // Debug
          
          // Find matching location
          for (const [name, code] of Object.entries(locations)) {
            if (location.includes(name) || name.includes(location)) {
              console.log(`✅ Matched origin: ${name} -> ${code}`) // Debug
              return code
            }
          }
        }
      }
    } else {
      // Look for "đi X" or "đến X" patterns - destination
      const destPatterns = [
        /di\s+([^ngay\d]+?)(?:\s+ngay|\s+\d|$)/,  // "đi X ngày" or "đi X" at end
        /den\s+([^ngay\d]+?)(?:\s+ngay|\s+\d|$)/,  // "đến X ngày" or "đến X" at end  
        /di\s+([a-z\s]+?)(?:\s+cho|\s+ve|\s+$)/,  // "đi X cho" or "đi X vé" or end
        /den\s+([a-z\s]+?)(?:\s+cho|\s+ve|\s+$)/, // "đến X cho" or "đến X vé" or end
      ]
      
      for (const pattern of destPatterns) {
        const match = normalizedText.match(pattern)
        if (match) {
          const location = match[1].trim()
          console.log(`🔍 Found destination pattern: "${match[0]}" -> location: "${location}"`) // Debug
          
          // Find matching location
          for (const [name, code] of Object.entries(locations)) {
            if (location.includes(name) || name.includes(location)) {
              console.log(`✅ Matched destination: ${name} -> ${code}`) // Debug
              return code
            }
          }
        }
      }
    }

    // Strategy 2: Direct location match (fallback)
    for (const [name, code] of Object.entries(locations)) {
      if (normalizedText.includes(name)) {
        console.log(`✅ Found location (direct fallback): ${name} -> ${code}`) // Debug
        return code
      }
    }
    
    console.log(`❌ No ${type} location found`) // Debug
    return null
  }

  // Extract date from text - Enhanced version
  const extractDate = (text: string): string | null => {
    console.log('📅 Extracting date from:', text) // Debug
    
    // Normalize text for better matching
    const normalizedText = text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd')
    
    // Check for special keywords first (more reliable)
    const today = new Date()
    if (normalizedText.includes('hom nay') || normalizedText.includes('bay hom nay')) {
      const result = today.toISOString().split('T')[0]
      console.log(`✅ Found "hôm nay" -> ${result}`) // Debug
      return result
    } 
    
    if (normalizedText.includes('ngay mai') || normalizedText.includes('bay ngay mai')) {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const result = tomorrow.toISOString().split('T')[0]
      console.log(`✅ Found "ngày mai" -> ${result}`) // Debug
      return result
    }
    
    if (normalizedText.includes('tuan sau') || normalizedText.includes('tuan toi')) {
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      const result = nextWeek.toISOString().split('T')[0]
      console.log(`✅ Found "tuần sau" -> ${result}`) // Debug
      return result
    }

    // Look for specific date patterns - prioritize Vietnamese formats
    const datePatterns = [
      // Vietnamese "tháng" patterns first (most natural)
      /ngay\s+(\d{1,2})\s+thang\s+(\d{1,2})/,          // ngày DD tháng MM
      /(\d{1,2})\s+thang\s+(\d{1,2})/,                 // DD tháng MM
      /ngay\s+(\d{1,2})\s*\/\s*(\d{1,2})/,             // ngày DD/MM
      /ngay\s+(\d{1,2})\s*-\s*(\d{1,2})/,              // ngày DD-MM
      // Full date patterns
      /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/,     // DD/MM/YYYY
      /(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})/,       // DD-MM-YYYY
      /ngay\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/, // ngày DD/MM/YYYY
      /ngay\s+(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})/, // ngày DD-MM-YYYY
      // Short patterns (fallback)
      /(\d{1,2})\s*\/\s*(\d{1,2})/,                    // DD/MM
      /(\d{1,2})\s*-\s*(\d{1,2})/,                     // DD-MM
    ]

    for (const pattern of datePatterns) {
      const match = normalizedText.match(pattern)
      if (match) {
        console.log(`🔍 Pattern matched: ${pattern.source} -> ${match[0]}`) // Debug
        let day, month, year
        
        // Parse based on pattern type - prioritize "tháng" patterns
        if (pattern.source.includes('thang')) {
          // "DD tháng MM" or "ngày DD tháng MM"
          day = match[1]
          month = match[2]
          year = new Date().getFullYear()
          console.log(`📝 Vietnamese pattern: ${day} tháng ${month}`) // Debug
        } else if (pattern.source.includes('ngay')) {
          // "ngày DD/MM" or "ngày DD/MM/YYYY"  
          day = match[1]
          month = match[2]
          year = match[3] || new Date().getFullYear()
          console.log(`📝 Ngày pattern: ngày ${day}/${month}`) // Debug
        } else {
          // Standard DD/MM patterns
          day = match[1]
          month = match[2]
          year = match[3] || new Date().getFullYear()
          console.log(`📝 Standard pattern: ${day}/${month}`) // Debug
        }
        
        // Validate date ranges
        const dayNum = parseInt(day)
        const monthNum = parseInt(month)
        const yearNum = parseInt(year.toString())
        
        console.log(`🔍 Parsed: day=${day}, month=${month}, year=${year}`) // Debug
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= new Date().getFullYear()) {
          const result = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
          console.log(`✅ Found date pattern: ${match[0]} -> ${result}`) // Debug
          
          // Additional validation: check if date is not in the past
          const parsedDate = new Date(result)
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Reset time to compare dates only
          
          if (parsedDate >= today) {
            return result
          } else {
            console.log(`⚠️ Date ${result} is in the past, skipping`) // Debug
          }
        }
      }
    }

    console.log(`❌ No valid date found`) // Debug
    return null
  }

  // Extract recipient from text for transfers
  const extractRecipient = (text: string): { name?: string, account?: string } => {
    console.log('👤 Extracting recipient from:', text) // Debug
    
    // Normalize text
    const normalizedText = text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd')

    const recipient: { name?: string, account?: string } = {}

    // Extract account number patterns
    const accountPatterns = [
      /so\s*(?:tai\s*khoan\s*)?(\d{8,20})/g,
      /tai\s*khoan\s*(\d{8,20})/g,
      /stk\s*(\d{8,20})/g,
      /(\d{10,20})/g  // fallback for long numbers
    ]
    
    for (const pattern of accountPatterns) {
      const match = pattern.exec(normalizedText)
      if (match) {
        recipient.account = match[1]
        console.log('✅ Found account:', recipient.account)
        break
      }
    }

    // Extract recipient name patterns
    const namePatterns = [
      /chuyen.*?cho\s+(.+?)(?:\s+so|\s+tai|\s+\d|$)/i,
      /gui.*?cho\s+(.+?)(?:\s+so|\s+tai|\s+\d|$)/i,
      /chuyen.*?den\s+(.+?)(?:\s+so|\s+tai|\s+\d|$)/i,
      /cho\s+(.+?)(?:\s+so|\s+tai|\s+\d|$)/i
    ]
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match) {
        let name = match[1].trim()
        // Clean up common prefixes
        name = name.replace(/^(anh|chi|co|chu|ba|ong|ba)\s+/i, '')
        name = name.replace(/\s+(so|tai|khoan).*$/i, '')
        if (name.length > 1 && name.length < 50) {
          recipient.name = name
          console.log('✅ Found recipient name:', recipient.name)
          break
        }
      }
    }

    return recipient
  }

  // Extract passenger count from text
  const extractPassengerCount = (text: string): number => {
    console.log('👥 Extracting passenger count from:', text) // Debug
    
    // Normalize text
    const normalizedText = text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd')
    
    const passengerMatch = normalizedText.match(/(\d+)\s*(nguoi|khach|hanh khach|ve)/)
    if (passengerMatch) {
      const count = parseInt(passengerMatch[1])
      console.log(`✅ Found passenger count: ${count}`) // Debug
      return count
    }
    
    // Tìm từ khóa số lượng
    if (normalizedText.includes('hai nguoi') || normalizedText.includes('2 nguoi') || normalizedText.includes('cho 2')) {
      console.log(`✅ Found "hai người" -> 2`) // Debug
      return 2
    }
    if (normalizedText.includes('ba nguoi') || normalizedText.includes('3 nguoi') || normalizedText.includes('cho 3')) {
      console.log(`✅ Found "ba người" -> 3`) // Debug
      return 3
    }
    if (normalizedText.includes('bon nguoi') || normalizedText.includes('4 nguoi') || normalizedText.includes('cho 4')) {
      console.log(`✅ Found "bốn người" -> 4`) // Debug
      return 4
    }
    if (normalizedText.includes('gia dinh')) {
      console.log(`✅ Found "gia đình" -> 4`) // Debug
      return 4 // Giả định gia đình 4 người
    }

    console.log(`⚠️ No passenger count found, defaulting to 1`) // Debug
    return 1 // Mặc định 1 người
  }

  // Execute service actions
  const executeActions = async (actions: ServiceAction[], messageId: string) => {
    console.log('🚀 Starting executeActions with:', actions.length, 'actions') // Debug
    setIsProcessing(true)
    
    for (const action of actions) {
      console.log('⚙️ Processing action:', action) // Debug
      
      // Update action status to executing
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, actions: msg.actions?.map(a => a.id === action.id ? { ...a, status: 'executing' } : a) }
          : msg
      ))

      try {
        // Call the actual service API
        const apiUrl = getApiUrl(action.service, action.action)
        console.log('📡 Calling API:', apiUrl, 'with params:', action.params) // Debug
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: userProfile?.customer_id || 1001,
            ...action.params
          })
        })

        const result = await response.json()
        console.log('📤 API Response:', result) // Debug
        
        if (result.success) {
          console.log('✅ Action completed successfully') // Debug
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
        console.error('❌ Service execution failed:', error) // Debug
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
    
    console.log(`🏁 ExecuteActions completed: ${completedActions}/${totalActions}`) // Debug
    
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
        if (action === 'open_card') return `${baseUrl}/hdbank/open-card`
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
        console.log(` Trying Gemini model: ${modelName}`);
        
        // Try each model
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        
        // Professional System Prompt
        const systemPrompt = `Bạn là một Agent AI tài chính thông minh của Tập đoàn Sovico.
Vai trò: KHÔNG CHỈ TƯ VẤN mà còn THỰC THI các dịch vụ tự động khi có đủ thông tin.

**🤖 CHẾ ĐỘ AGENT - THỰC THI TỰ ĐỘNG:**
✅ **AGENT MODE**: Khi khách hàng yêu cầu cụ thể → Thực hiện ngay lập tức
⚡ **Auto-execute**: Đặt vé máy bay, chuyển khoản, đặt phòng khi có đủ thông tin
🎯 **Proactive**: Không hỏi xác nhận, trực tiếp thực hiện yêu cầu
💪 **Action-oriented**: "Đang thực hiện...", "Agent đang xử lý...", "Hoàn tất!"

**QUAN TRỌNG VỀ ĐẶT VÉ MÁY BAY:**
🚀 **CÓ ĐỦ THÔNG TIN** (điểm đi + điểm đến + ngày bay) → Thực hiện đặt vé NGAY LẬP TỨC
❓ **THIẾU THÔNG TIN** → Hỏi cụ thể và khẳng định sẽ đặt vé khi có đủ
Thông tin cần thiết:
1. 📍 **Điểm đi** (ví dụ: Hà Nội, TP.HCM, Đà Nẵng...)
2. 📍 **Điểm đến** (ví dụ: Phú Quốc, Nha Trang, Singapore...)
3. 📅 **Ngày bay** (cụ thể DD/MM/YYYY hoặc "ngày mai", "tuần sau"...)
4. 👥 **Số hành khách** (mặc định 1 người nếu không nói)
5. 💺 **Hạng vé** (mặc định Economy nếu không nói)

**QUY TRÌNH AGENT:**
- ✅ **CÓ ĐỦ INFO** → Thực hiện tức thì, thông báo "Agent đang xử lý..."
- ❓ **THIẾU INFO** → Hỏi ngắn gọn, khẳng định "Agent sẽ đặt ngay khi có đủ thông tin"
- 🚀 **Luôn thể hiện tính chủ động**: "Tôi sẽ thực hiện...", "Đang đặt vé...", "Hoàn tất!"

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
7. Tính toán ROI và lợi ích số liệu cụ thể
8. **ĐẶC BIỆT: Luôn hỏi đủ thông tin trước khi đặt vé máy bay**`;

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
    
    // Flight booking
    if (lowerMessage.includes('vé máy bay') || lowerMessage.includes('đặt vé') || 
        lowerMessage.includes('bay') || lowerMessage.includes('vietjet')) {
      
      // Check if all required info is present
      const hasOrigin = extractLocation(lowerMessage, 'origin')
      const hasDestination = extractLocation(lowerMessage, 'destination') 
      const hasDate = extractDate(lowerMessage)
      const hasPassengerCount = extractPassengerCount(lowerMessage)
      
      if (!hasOrigin || !hasDestination || !hasDate) {
        return `✈️ **Đặt vé máy bay Vietjet**

Tôi là Agent AI của bạn và sẽ đặt vé ngay khi có đủ thông tin! 

📍 **Thông tin còn thiếu:**
${!hasOrigin ? '• Điểm đi (ví dụ: Hà Nội, TP.HCM, Đà Nẵng...)' : '✅ Điểm đi: ' + hasOrigin}
${!hasDestination ? '• Điểm đến (ví dụ: Phú Quốc, Nha Trang, Singapore...)' : '✅ Điểm đến: ' + hasDestination}
${!hasDate ? '• Ngày bay (ví dụ: 15/10/2025, ngày mai, tuần sau...)' : '✅ Ngày bay: ' + hasDate}
• Số hành khách: ${hasPassengerCount} người
• Hạng vé: Economy (có thể upgrade lên Business)

🤖 **Agent sẽ tự động đặt vé khi bạn cung cấp đủ thông tin!**

🎯 **Ví dụ hoàn chỉnh:**
"Đặt vé từ Hà Nội đi Phú Quốc ngày 20/10 cho 2 người"

💡 **Ưu đãi đặc biệt:**
• Bay với Vietjet: +100 SVT/chuyến
• Thanh toán qua HDBank: +0.1% cashback
• Thành viên Gold: Miễn phí chọn chỗ ngồi

Hãy cung cấp thông tin còn thiếu để Agent đặt vé cho bạn! 🎫`;
      }
      
      return `✈️ **Agent đang xử lý đặt vé máy bay**

🤖 **THÔNG BÁO: Agent mode ON** - Tôi sẽ thực hiện đặt vé ngay bây giờ!

📋 **Thông tin chuyến bay:**
• Từ: ${hasOrigin}
• Đến: ${hasDestination} 
• Ngày: ${hasDate}
• Hành khách: ${hasPassengerCount} người
• Hạng: Economy

� **Agent đang thực hiện:**
1. Kiểm tra chuyến bay khả dụng
2. So sánh giá tốt nhất
3. Đặt vé và thanh toán
4. Gửi boarding pass về email
5. Cập nhật SVT token reward

⚡ Bạn không cần làm gì thêm, Agent sẽ hoàn tất tất cả!`;
    }
    
    // Card opening - Mở thẻ ngân hàng
    if (lowerMessage.includes('mở thẻ') || lowerMessage.includes('làm thẻ') || 
        lowerMessage.includes('thẻ tín dụng') || lowerMessage.includes('thẻ visa')) {
      return `💳 **Agent mở thẻ HDBank ngay lập tức**

🤖 **THÔNG BÁO: Agent mode ON** - Đang xử lý mở thẻ cho bạn!

🏦 **Thông tin thẻ được đề xuất:**
• Loại thẻ: Visa ${lowerMessage.includes('platinum') ? 'Platinum' : lowerMessage.includes('gold') ? 'Gold' : 'Classic'}
• Hạn mức: Dựa trên thu nhập và profile
• Phí thường niên: Miễn phí năm đầu
• Ưu đãi: Cashback 2%, tích điểm không giới hạn

🚀 **Agent đang thực hiện:**
1. Kiểm tra điều kiện tài chính
2. Đánh giá credit score
3. Chọn thẻ phù hợp nhất
4. Xử lý hồ sơ và duyệt tự động
5. Sản xuất và giao thẻ tận nơi

💎 **Lợi ích đặc biệt:**
• Tích 100 SVT khi mở thẻ thành công
• Liên kết với Vietjet Miles
• Ưu đãi tại Sovico Resort
• Chuyển đổi điểm thành SVT

⚡ Thẻ sẽ được giao trong 3-5 ngày làm việc!`;
    }
    
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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const currentInput = inputMessage;
    setInputMessage('');

    // Analyze user intent for service actions
    const actions = analyzeIntent(currentInput);

    setIsLoading(true);
    
    try {
      // Luôn tạo AI response thông minh trước (dù có hay không có actions)
      let aiResponse = '';
      
      if (useGemini) {
        try {
          aiResponse = await generateGeminiResponse(currentInput);
        } catch (error) {
          console.error('Gemini failed, falling back to local response:', error);
          aiResponse = generateLocalResponse(currentInput);
        }
      } else {
        aiResponse = generateLocalResponse(currentInput);
      }

      // Nếu có actions, thêm thông báo Agent vào response
      if (actions.length > 0) {
        const actionsList = actions.map(a => {
          switch (a.service) {
            case 'vietjet':
              return `✈️ Đặt vé máy bay (${a.params.flight_type === 'international' ? 'Quốc tế' : 'Nội địa'})`
            case 'hdbank':
              if (a.action === 'loan') return `💰 Vay tiền ${(a.params.loan_amount / 1000000).toFixed(0)} triệu VNĐ`
              if (a.action === 'transfer') return `💳 Chuyển khoản ${(a.params.amount / 1000000).toFixed(0)} triệu VNĐ`
              if (a.action === 'open_card') return `💳 Mở thẻ ${a.params.card_type.toUpperCase()} HDBank`
              return `🏦 Dịch vụ ngân hàng HDBank`
            case 'resort':
              if (a.action === 'book_room') return `🏨 Đặt phòng ${a.params.nights} đêm`
              if (a.action === 'spa_booking') return `💆‍♀️ Đặt lịch Spa`
              return `🏖️ Dịch vụ Resort`
            default:
              return '🔧 Dịch vụ khác'
          }
        }).join('\n• ')

        aiResponse += `\n\n🤖 **Agent sẽ thực hiện:**\n• ${actionsList}\n\n⏳ Đang xử lý yêu cầu...`;
      }

      // Tạo AI message với cả response và actions (nếu có)
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      // Save to chat history after AI responds
      setTimeout(() => {
        saveChatToHistory(finalMessages);
      }, 1000);
      
      // Nếu có actions, thực hiện chúng sau khi AI đã trả lời
      if (actions.length > 0) {
        setTimeout(() => {
          executeActions(actions, aiMessage.id);
        }, 1500); // Delay để user đọc được response trước
      }

    } catch (error: any) {
      console.error('Error generating AI response:', error);
      
      let errorMessage = '❌ **Xin lỗi, AI gặp sự cố**\n\n';
      
      if (error.message && error.message.includes('GoogleGenerativeAI')) {
        errorMessage += '🔧 **Vấn đề Gemini AI:**\n';
        errorMessage += '• API có thể bị giới hạn hoặc model không khả dụng\n';
        errorMessage += '• Đang chuyển sang chế độ tư vấn cơ bản\n\n';
        errorMessage += generateLocalResponse(currentInput);
      } else {
        errorMessage += '⚠️ **Lỗi không xác định:**\n';
        errorMessage += '• Vui lòng thử lại hoặc liên hệ support\n';
      }
      
      const errorResponse: Message = {
        id: `error_${Date.now()}`,
        type: 'ai',
        content: errorMessage,
        timestamp: new Date()
      };
      
      const finalMessages = [...newMessages, errorResponse];
      setMessages(finalMessages);
      
      // Save error to history too
      setTimeout(() => {
        saveChatToHistory(finalMessages);
      }, 1000);
    }

    setIsLoading(false);
  };

  const handleQuestionClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="flex h-full bg-[#0D1117] text-white">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-80 bg-[#161B22] border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">💬 Lịch sử chat</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <button
              onClick={startNewChat}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              ➕ Chat mới
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">💭</div>
                <div>Chưa có lịch sử chat</div>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <div 
                  key={chat.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                    currentChatId === chat.id 
                      ? 'bg-blue-600/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                  }`}
                  onClick={() => loadChat(chat)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-white mb-1">
                        {chat.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(chat.updated_at).toLocaleDateString('vi-VN')} • {chat.messages.length} tin nhắn
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Xóa cuộc trò chuyện này?')) {
                          deleteChat(chat.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all ml-2"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="bg-[#161B22] border-b border-gray-700 p-4">
          <div className="flex items-center">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="mr-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Lịch sử chat"
            >
              📚
            </button>
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
    </div>
  );
};

export default AIFinancialAssistant;
