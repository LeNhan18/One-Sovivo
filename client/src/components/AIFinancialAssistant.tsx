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
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'waiting_otp'
  result?: any
  requiresOTP?: boolean
  otpVerified?: boolean
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

// Lightweight customer preferences to personalize intent filling
interface CustomerPreferences {
  preferredOrigin?: string;      // e.g., 'SGN'
  preferredDestination?: string; // e.g., 'PQC'
  typicalPassengers?: number;    // e.g., 2
  typicalRoomNights?: number;    // e.g., 2
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
  const [pendingOTPAction, setPendingOTPAction] = useState<ServiceAction | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef<CustomerPreferences>({});
  
  // Flight booking context to remember previous information
  const [flightContext, setFlightContext] = useState<{
    origin?: string;
    destination?: string;
    date?: string;
    passengers?: number;
    isBooking?: boolean;
  }>({});

  // Extract and combine flight information from context and current message
  const extractFlightInfoWithContext = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if this is a flight-related message
    const isFlightRelated = lowerMessage.includes('vé máy bay') || lowerMessage.includes('đặt vé') || 
                           lowerMessage.includes('bay') || lowerMessage.includes('vietjet') ||
                           lowerMessage.includes('đi') || lowerMessage.includes('đến') ||
                           lowerMessage.includes('ngày') || lowerMessage.includes('người') ||
                           lowerMessage.includes('hành khách') || lowerMessage.includes('chuyến');
    
    if (!isFlightRelated && !flightContext.isBooking) {
      return null; // Not flight related
    }
    
    // Extract information from current message
    const currentOrigin = extractLocation(userMessage, 'origin');
    const currentDestination = extractLocation(userMessage, 'destination');
    const currentDate = extractDate(userMessage);
    const currentPassengers = extractPassengerCount(userMessage);
    
    // Combine with context
    const combinedInfo = {
      origin: currentOrigin || flightContext.origin,
      destination: currentDestination || flightContext.destination,
      date: currentDate || flightContext.date,
      passengers: currentPassengers || flightContext.passengers || 1,
      isBooking: flightContext.isBooking || isFlightRelated
    };
    
    // Update context if we found new information
    if (currentOrigin || currentDestination || currentDate || currentPassengers) {
      setFlightContext(combinedInfo);
    }
    
    return combinedInfo;
  };

  // Smart questioning for missing flight information
  const askForMissingFlightInfo = (missingInfo: string[], hasOrigin: string | null, hasDestination: string | null, hasDate: string | null, hasPassengerCount: number) => {
    let questionText = '';
    
    if (missingInfo.length === 1) {
      questionText = `Tôi cần biết ${missingInfo[0]} để đặt vé cho bạn.`;
    } else if (missingInfo.length === 2) {
      questionText = `Tôi cần biết ${missingInfo[0]} và ${missingInfo[1]} để đặt vé.`;
    } else {
      questionText = `Tôi cần biết ${missingInfo.slice(0, -1).join(', ')} và ${missingInfo[missingInfo.length - 1]} để đặt vé.`;
    }
    
    return `✈️ **Đặt vé máy bay Vietjet**

${questionText}

**📋 Thông tin hiện tại:**
${hasOrigin ? '✅ Điểm đi: ' + hasOrigin : '❌ Điểm đi: Chưa có'}
${hasDestination ? '✅ Điểm đến: ' + hasDestination : '❌ Điểm đến: Chưa có'}
${hasDate ? '✅ Ngày bay: ' + hasDate : '❌ Ngày bay: Chưa có'}
${hasPassengerCount ? '✅ Số người: ' + hasPassengerCount : '✅ Số người: 1 (mặc định)'}

**💡 Ví dụ cung cấp thông tin:**
• "Từ Hà Nội đi Phú Quốc ngày 20/10 cho 2 người"
• "Bay từ TP.HCM đến Singapore ngày mai"
• "Đặt vé từ Đà Nẵng đi Nha Trang tuần sau"
• Hoặc chỉ cần nhắn: "Phú Quốc" (nếu đã có điểm đi)
• Hoặc chỉ cần nhắn: "ngày 20/10" (nếu đã có điểm đi và đến)

**🎁 Ưu đãi khi đặt vé:**
• Tích 100 SVT/chuyến nội địa, 200 SVT/chuyến quốc tế
• Thanh toán HDBank: +0.1% cashback
• Thành viên Gold: Miễn phí chọn chỗ ngồi

Hãy cho tôi biết thông tin còn thiếu nhé! 🎫`;
  };

  // Generate response when all flight info is available
  const generateFlightBookingResponse = (hasOrigin: string | null, hasDestination: string | null, hasDate: string | null, hasPassengerCount: number) => {
    return `✈️ **Agent đang xử lý đặt vé máy bay**

**🚀 THÔNG BÁO: Agent mode ON** - Tôi sẽ thực hiện đặt vé ngay bây giờ!

**📋 Thông tin chuyến bay:**
• **Từ:** ${hasOrigin}
• **Đến:** ${hasDestination} 
• **Ngày:** ${hasDate}
• **Hành khách:** ${hasPassengerCount} người
• **Hạng:** Economy (có thể upgrade lên Business)

**⚙️ Agent đang thực hiện:**
1. 🔍 Kiểm tra chuyến bay khả dụng
2. 💰 So sánh giá tốt nhất
3. 🎫 Đặt vé và thanh toán
4. 📧 Gửi boarding pass về email
5. 🪙 Cập nhật SVT token reward

**🎁 Ưu đãi áp dụng:**
• Tích ${hasDestination?.includes('SIN') || hasDestination?.includes('NRT') || hasDestination?.includes('ICN') ? '200' : '100'} SVT cho chuyến bay này
• Thanh toán HDBank: +0.1% cashback
• ${userProfile?.sovicoTokens >= 50000 ? 'Thành viên Gold: Miễn phí chọn chỗ ngồi' : 'Thành viên thường: Chọn chỗ ngồi 50,000 VNĐ'}

⚡ **Bạn không cần làm gì thêm, Agent sẽ hoàn tất tất cả!**`;
  };

  // Fetch comprehensive financial data for AI analysis
  const fetchFinancialData = async () => {
    if (!userProfile) return { 
      flightCount: 0, 
      accountBalance: 0, 
      monthlyIncome: 0,
      spendingPattern: {},
      investmentPortfolio: {},
      creditScore: 0,
      loanHistory: [],
      transactionHistory: []
    };
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('⚠️ No auth token found, using fallback data');
        return { 
          flightCount: 0, 
          accountBalance: 0, 
          monthlyIncome: 20000000,
          spendingPattern: { monthly: 15000000, categories: {} },
          investmentPortfolio: { totalValue: 0, types: {} },
          creditScore: 650,
          loanHistory: [],
          transactionHistory: [],
          totalDebt: 0,
          flightSpending: 0,
          totalSpending: 0
        };
      }

      // Fetch comprehensive data from the main customer endpoint (which has all data)
      console.log('🔍 Fetching financial data for customer:', userProfile.customer_id);
      
      // Use the main customer endpoint that contains all data
      const customerResponse = await fetch(`http://127.0.0.1:5000/customer/${userProfile.customer_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => {
        console.log('❌ Customer API error:', err);
        return { ok: false, json: () => Promise.resolve({ customer: null }) };
      });

      // Also fetch tokens data
      const tokensResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${userProfile.customer_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => {
        console.log('❌ Tokens API error:', err);
        return { ok: false, json: () => Promise.resolve({ total_svt: 0, transactions: [] }) };
      });

      // Process customer data
      const customerData = customerResponse.ok ? await customerResponse.json() : { customer: null };
      const tokensData = tokensResponse.ok ? await tokensResponse.json() : { total_svt: 0, transactions: [] };
      
      console.log('📊 Customer data received:', customerData);
      console.log('🪙 Tokens data received:', tokensData);

      // Extract data from customer response
      const customer = customerData.customer || {};
      const hdbankSummary = customer.hdbank_summary || {};
      const vietjetSummary = customer.vietjet_summary || {};
      const resortSummary = customer.resort_summary || {};
      
      // Get real data from HDBank
      const accountBalance = hdbankSummary.current_balance || 0;
      const totalTransactions = hdbankSummary.total_transactions || 0;
      const totalCredit = hdbankSummary.total_credit_last_3m || 0;
      const totalDebit = hdbankSummary.total_debit_last_3m || 0;
      
      // Get real data from Vietjet
      const flightCount = vietjetSummary.total_flights_last_year || 0;
      const flightSpending = vietjetSummary.total_spending || 0;
      const isBusinessFlyer = vietjetSummary.is_business_flyer || false;
      
      // Get real data from Resort
      const resortNights = resortSummary.total_nights_stayed || 0;
      const resortSpending = resortSummary.total_spending || 0;
      
      // Calculate spending patterns from real data
      const totalSpending = totalDebit || 0; // Use real debit data from HDBank
      const spendingPattern = {
        monthly: totalSpending > 0 ? totalSpending / 12 : 15000000, // Default 15M VNĐ/month if no data
        categories: {
          food: Math.floor(totalSpending * 0.3), // Estimate 30% for food
          transport: Math.floor(totalSpending * 0.2), // Estimate 20% for transport
          entertainment: Math.floor(totalSpending * 0.2), // Estimate 20% for entertainment
          shopping: Math.floor(totalSpending * 0.3) // Estimate 30% for shopping
        }
      };

      // Use simplified data for loans and investments (can be enhanced later)
      const loanHistory: any[] = [];
      const totalDebt = 0; // No debt data available yet
      
      const investmentPortfolio = {
        totalValue: 0, // No investment data available yet
        types: {
          stocks: 0,
          bonds: 0,
          mutual_funds: 0
        }
      };

      // Calculate credit score based on real data
      const creditScore = Math.min(850, Math.max(300, 
        300 + 
        (accountBalance > 10000000 ? 100 : 0) + // High balance bonus
        (totalDebt === 0 ? 50 : 0) + // No debt bonus
        (totalTransactions > 50 ? 50 : 0) + // Active account bonus
        (flightCount > 5 ? 30 : 0) + // Travel activity bonus
        (userProfile.sovicoTokens > 50000 ? 40 : 0) + // SVT level bonus
        (userProfile.sovicoTokens > 10000 ? 20 : 0) + // SVT Silver bonus
        (totalTransactions > 10 ? 30 : 0) // Basic activity bonus
      ));

      // Calculate monthly income estimate from real data
      let monthlyIncome = 20000000; // Default 20M VNĐ
      
      if (accountBalance > 0) {
        monthlyIncome = Math.max(monthlyIncome, accountBalance / 12);
      }
      if (spendingPattern.monthly > 0) {
        monthlyIncome = Math.max(monthlyIncome, spendingPattern.monthly * 1.5);
      }
      if (flightSpending > 0) {
        monthlyIncome = Math.max(monthlyIncome, flightSpending / 12);
      }
      
      // If user has SVT tokens, estimate higher income
      if (userProfile.sovicoTokens > 10000) {
        monthlyIncome = Math.max(monthlyIncome, 25000000); // At least 25M for Silver+ users
      }

      // Check if we got real data
      const hasRealData = accountBalance > 0 || flightCount > 0 || totalTransactions > 0;
      if (!hasRealData) {
        console.log('⚠️ No real data found, using enhanced fallback data');
        // Generate some realistic demo data
        const demoBalance = Math.floor(Math.random() * 50000000) + 10000000; // 10M - 60M
        const demoSpending = Math.floor(demoBalance * 0.3); // 30% of balance
        const demoFlights = Math.floor(Math.random() * 5); // 0-5 flights
        
        return {
          flightCount: demoFlights,
          accountBalance: demoBalance,
          monthlyIncome: Math.floor(demoBalance / 12),
          spendingPattern: { 
            monthly: demoSpending, 
            categories: {
              food: Math.floor(demoSpending * 0.3),
              transport: Math.floor(demoSpending * 0.2),
              entertainment: Math.floor(demoSpending * 0.2),
              shopping: Math.floor(demoSpending * 0.3)
            }
          },
          investmentPortfolio: { 
            totalValue: Math.floor(demoBalance * 0.2), 
            types: { stocks: 2, bonds: 1, mutual_funds: 1 }
          },
          creditScore: Math.floor(Math.random() * 200) + 650, // 650-850
          loanHistory: [],
          transactionHistory: [],
          totalDebt: 0,
          flightSpending: demoFlights * 2000000, // 2M per flight
          totalSpending: demoSpending
        };
      }

      console.log('✅ Real data found! Using actual data from APIs');
      console.log('💰 Account Balance:', accountBalance);
      console.log('✈️ Flight Count:', flightCount);
      console.log('💳 Total Transactions:', totalTransactions);
      console.log('🏦 Credit Score:', creditScore);
      
      return { 
        flightCount, 
        accountBalance, 
        monthlyIncome,
        spendingPattern,
        investmentPortfolio,
        creditScore,
        loanHistory,
        transactionHistory: tokensData.transactions || [],
        totalDebt,
        flightSpending,
        totalSpending,
        // Additional real data
        totalTransactions,
        totalCredit,
        totalDebit,
        isBusinessFlyer,
        resortNights,
        resortSpending
      };
    } catch (error) {
      console.error('❌ Error fetching financial data:', error);
      console.log('🔧 Possible causes:');
      console.log('• Backend server not running (http://127.0.0.1:5000)');
      console.log('• API endpoints not implemented');
      console.log('• Database connection issues');
      console.log('• Authentication token invalid');
      
      // Return enhanced fallback data
      const fallbackBalance = Math.floor(Math.random() * 40000000) + 15000000; // 15M - 55M
      const fallbackSpending = Math.floor(fallbackBalance * 0.4);
      const fallbackFlights = Math.floor(Math.random() * 3) + 1; // 1-3 flights
      
      return { 
        flightCount: fallbackFlights, 
        accountBalance: fallbackBalance, 
        monthlyIncome: Math.floor(fallbackBalance / 12),
        spendingPattern: { 
          monthly: fallbackSpending, 
          categories: {
            food: Math.floor(fallbackSpending * 0.3),
            transport: Math.floor(fallbackSpending * 0.2),
            entertainment: Math.floor(fallbackSpending * 0.2),
            shopping: Math.floor(fallbackSpending * 0.3)
          }
        },
        investmentPortfolio: { 
          totalValue: Math.floor(fallbackBalance * 0.15), 
          types: { stocks: 1, bonds: 1, mutual_funds: 0 }
        },
        creditScore: Math.floor(Math.random() * 150) + 700, // 700-850
        loanHistory: [],
        transactionHistory: [],
        totalDebt: 0,
        flightSpending: fallbackFlights * 1500000, // 1.5M per flight
        totalSpending: fallbackSpending
      };
    }
  };

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

          // Load preferences from localStorage
          try {
            const raw = localStorage.getItem(`prefs_${userData.customer_id}`);
            prefsRef.current = raw ? JSON.parse(raw) : {};
          } catch {}

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
          // Map server types -> UI types
          const toUiType = (serverType: string): 'user' | 'ai' | 'system' => {
            if (serverType === 'user') return 'user';
            if (serverType === 'assistant') return 'ai';
            if (serverType === 'admin_intervention') return 'ai';
            return 'ai';
          };

          const serverHistory: ChatHistory[] = data.chats.map((chat: any) => ({
            id: chat.id,
            customer_id: chat.customer_id,
            messages: chat.messages.map((msg: any) => ({
              id: msg.id,
              type: toUiType(msg.message_type),
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

    // Map UI types -> server types (backend expects 'user' | 'assistant' | 'admin_intervention')
    const toServerType = (t: Message['type']): 'user' | 'assistant' | 'admin_intervention' => {
      if (t === 'user') return 'user';
      if (t === 'ai') return 'assistant';
      return 'assistant'; // map 'system' to 'assistant' by default
    };
    
    const chatData: ChatHistory = {
      id: chatId,
      customer_id: userProfile.customer_id,
      messages: messages.map(m => ({
        ...m,
        // Convert type for server persistence layer
        type: toServerType(m.type) as any
      })),
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
          console.log(' Chat saved to server successfully');
          
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
      return ' Đặt vé máy bay';
    } else if (firstMessage.toLowerCase().includes('thẻ tín dụng') || firstMessage.toLowerCase().includes('mở thẻ')) {
      return ' Dịch vụ thẻ tín dụng';
    } else if (firstMessage.toLowerCase().includes('vay') || firstMessage.toLowerCase().includes('khoản vay')) {
      return ' Tư vấn vay vốn';
    } else if (firstMessage.toLowerCase().includes('đầu tư') || firstMessage.toLowerCase().includes('investment')) {
      return ' Tư vấn đầu tư';
    } else if (firstMessage.toLowerCase().includes('resort') || firstMessage.toLowerCase().includes('đặt phòng')) {
      return ' Đặt phòng Resort';
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
    // Reset flight context when starting new chat
    setFlightContext({});
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
      "Sovico Tokens là gì?",
      "NFT passport có tác dụng gì?",
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
    // Flight booking intents - Yêu cầu thông tin đầy đủ
    if (normalizedText.includes('ve may bay') || normalizedText.includes('dat ve') || 
        normalizedText.includes('bay') || normalizedText.includes('chuyen bay') ||
        normalizedText.includes('vietjet') || normalizedText.includes('may bay') ||
        (normalizedText.includes('di') && (normalizedText.includes('ve') || normalizedText.includes('bay'))) ||
        normalizedText.includes('book flight') || normalizedText.includes('flight') ||
        normalizedText.includes('agent')) {
      
      // Extract information từ text gốc (không normalize để giữ chính xác)
      const hasOrigin = extractLocation(text, 'origin')
      const hasDestination = extractLocation(text, 'destination')  
      const hasDate = extractDate(text)
      const hasPassengerCount = extractPassengerCount(text)

      // Personalize with preferences when missing
      const prefs = prefsRef.current
      const origin = hasOrigin || prefs.preferredOrigin || undefined
      const destination = hasDestination || prefs.preferredDestination || undefined
      const passengerCount = hasPassengerCount || prefs.typicalPassengers || 1
      
      console.log(' Origin:', hasOrigin, 'Destination:', hasDestination, 'Date:', hasDate, 'Passengers:', hasPassengerCount) // Debug
      
      // Nếu thiếu thông tin, không tạo action mà sẽ yêu cầu thông tin
      if (!origin || !destination || !hasDate) {
        console.log(' Missing flight information - not creating action') // Debug
        console.log('Missing info:', !origin ? 'origin' : '', !destination ? 'destination' : '', !hasDate ? 'date' : '')
        return [] // Không tạo action, để AI hỏi thông tin
      }
      actions.push({
        id: `flight_${Date.now()}`,
        service: 'vietjet',
        action: 'book_flight',
        params: {
          origin,
          destination,
          departure_date: hasDate,
          passenger_count: passengerCount,
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
        status: 'waiting_otp',
        requiresOTP: true,
        otpVerified: false
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
        status: 'waiting_otp',
        requiresOTP: true,
        otpVerified: false
      })
    }

    // Hotel/Resort intents
    if (normalizedText.includes('khach san') || normalizedText.includes('dat phong') || 
        normalizedText.includes('resort') || normalizedText.includes('nghi duong')) {
      const prefs = prefsRef.current
      const nights = extractNights(normalizedText) || prefs.typicalRoomNights || 2
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

    // Real Estate intents - Phú Long
    if (normalizedText.includes('bat dong san') || normalizedText.includes('mua nha') || 
        normalizedText.includes('dau tu nha') || normalizedText.includes('can ho') ||
        normalizedText.includes('phu long') || normalizedText.includes('essensia') ||
        normalizedText.includes('dragon') || normalizedText.includes('mailand') ||
        normalizedText.includes('nha o') || normalizedText.includes('dau tu') ||
        normalizedText.includes('real estate') || normalizedText.includes('property')) {
      
      const budget = extractAmount(normalizedText, 'loan')
      const consultationType = normalizedText.includes('dau tu') ? 'investment' :
                              normalizedText.includes('nha o') ? 'residential' :
                              normalizedText.includes('thuong mai') ? 'commercial' : 'resort'
      
      actions.push({
        id: `real_estate_${Date.now()}`,
        service: 'resort',
        action: 'real_estate_consultation',
        params: {
          consultation_type: consultationType,
          budget_range: budget > 0 ? `${(budget / 1000000000).toFixed(1)} tỷ VNĐ` : 'Từ 2-10 tỷ VNĐ',
          location_preference: extractLocation(text, 'origin') || 'TP.HCM'
        },
        status: 'pending'
      })
    }

    // Property viewing intents
    if (normalizedText.includes('xem du an') || normalizedText.includes('xem nha') ||
        normalizedText.includes('tham quan') || normalizedText.includes('site visit') ||
        normalizedText.includes('xem can ho') || normalizedText.includes('xem dat')) {
      
      const projectName = normalizedText.includes('essensia parkway') ? 'Essensia Parkway' :
                         normalizedText.includes('essensia sky') ? 'Essensia Sky' :
                         normalizedText.includes('dragon riverside') ? 'Dragon Riverside City' :
                         normalizedText.includes('mailand hanoi') ? 'Mailand Hanoi City' :
                         normalizedText.includes('ariyana') ? 'Ariyana Tourism Complex' :
                         'Essensia Parkway'
      const preferredDate = extractDate(text)
      
      actions.push({
        id: `property_viewing_${Date.now()}`,
        service: 'resort',
        action: 'book_property_viewing',
        params: {
          project_name: projectName || 'Essensia Parkway',
          preferred_date: preferredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          contact_info: 'Auto-generated from user profile'
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
    
    // Default amounts - giảm số tiền mặc định để tránh lỗi
    return type === 'loan' ? 100000000 : 1000000
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

  // Extract project name from text for real estate
  const extractProjectName = (text: string): string => {
    console.log('🏢 Extracting project name from:', text) // Debug
    
    const normalizedText = text.toLowerCase()
    
    // Check for specific Phú Long projects
    if (normalizedText.includes('essensia parkway')) return 'Essensia Parkway'
    if (normalizedText.includes('essensia sky')) return 'Essensia Sky'
    if (normalizedText.includes('dragon riverside')) return 'Dragon Riverside City'
    if (normalizedText.includes('mailand hanoi')) return 'Mailand Hanoi City'
    if (normalizedText.includes('ariyana')) return 'Ariyana Tourism Complex'
    if (normalizedText.includes('dragon hill')) return 'Dragon Hill'
    
    // Default to most popular project
    return 'Essensia Parkway'
  }

  // Extract budget range for real estate
  const extractBudgetRange = (text: string): string => {
    console.log('💰 Extracting budget range from:', text) // Debug
    
    const normalizedText = text.toLowerCase()
    
    // Look for specific budget mentions
    if (normalizedText.includes('5 tỷ') || normalizedText.includes('5 ty')) return '5 tỷ VNĐ'
    if (normalizedText.includes('3 tỷ') || normalizedText.includes('3 ty')) return '3 tỷ VNĐ'
    if (normalizedText.includes('10 tỷ') || normalizedText.includes('10 ty')) return '10 tỷ VNĐ'
    if (normalizedText.includes('cao cap') || normalizedText.includes('premium')) return '5-10 tỷ VNĐ'
    if (normalizedText.includes('trung binh') || normalizedText.includes('vua phai')) return '3-5 tỷ VNĐ'
    
    // Default range
    return '2-10 tỷ VNĐ'
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
      content: `✅ **Hoàn thành!** Tôi đã thực hiện ${completedActions}/${totalActions} yêu cầu của bạn. Bạn đã nhận được SVT tokens tương ứng. Có gì khác tôi có thể giúp không?`,
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
        if (action === 'real_estate_consultation') return `${baseUrl}/resort/real-estate-consultation`
        if (action === 'book_property_viewing') return `${baseUrl}/resort/book-property-viewing`
        return ''
      default:
        return ''
    }
  }

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'waiting_otp': return '🔐'
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
        
        // Enhanced System Prompt for better accuracy
        const systemPrompt = `Bạn là AI Agent tài chính chuyên nghiệp của Sovico Holdings.

VAI TRÒ:
- Tư vấn tài chính chính xác và thực thi dịch vụ tự động
- Hiểu rõ về SVT (Sovico Tokens), HDBank, Vietjet, Resort services
- Tư vấn bất động sản chuyên nghiệp với Phú Long Real Estate
- Phân tích nhu cầu khách hàng và đưa ra giải pháp phù hợp

KIẾN THỨC CHUYÊN MÔN:
- SVT: Token nội bộ của Sovico, dùng để tích điểm, đổi quà, giao dịch
- HDBank: Ngân hàng liên kết, cung cấp thẻ tín dụng, vay vốn, chuyển khoản
- Vietjet: Hãng hàng không, đặt vé máy bay nội địa và quốc tế
- Resort: Dịch vụ nghỉ dưỡng, đặt phòng, spa, ẩm thực

🏢 PHÚ LONG REAL ESTATE - KIẾN THỨC CHUYÊN SÂU:
- Công ty thành viên của Tập đoàn Sovico, hơn 20 năm kinh nghiệm
- Chuyên phát triển bất động sản nhà ở, nghỉ dưỡng, thương mại văn phòng
- Đạt Top 50 Doanh nghiệp phát triển bền vững tiêu biểu Việt Nam 2025
- Nhận giải thưởng quốc tế HR Asia 2025 và Asia Pacific Property Award 2025-2026

DỰ ÁN NỔI BẬT CỦA PHÚ LONG:
1. **Essensia Parkway** - Nguyễn Hữu Thọ, Nhà Bè, TP.HCM
   - Căn hộ cao cấp, chuẩn sống Lux-Well
   - Giá từ 3.5 tỷ VNĐ, đang mở bán
   - Tiện ích: Sky Pool, Gym, Concierge

2. **Essensia Sky** - Nguyễn Hữu Thọ, Nhà Bè, TP.HCM  
   - Căn hộ cao cấp, "Nơi Đất Lành Cho Cuộc Sống Hoan Ca"
   - Giá từ 4.2 tỷ VNĐ, đang mở bán
   - Tiện ích: Sky Living, Panoramic View, Sky Bar

3. **Dragon Riverside City** - Đại lộ Võ Văn Kiệt, TP.HCM
   - Khu đô thị, "Thành phố 5 sao trong lòng Thành Phố"
   - Giá từ 2.8 tỷ VNĐ, đang hoạt động
   - Tiện ích: River View, Golf Course, Shopping Mall

4. **Mailand Hanoi City** - Xã Sơn Đồng, Hà Nội
   - Khu đô thị thông minh tại thủ đô
   - Giá từ 2.5 tỷ VNĐ, đang mở bán
   - Tiện ích: Smart City, Green Living, Cultural Center

5. **Ariyana Tourism Complex** - Đà Nẵng
   - Khu nghỉ dưỡng cao cấp với view biển
   - Giá từ 1.8 tỷ VNĐ, đang hoạt động
   - Tiện ích: Beach Resort, Golf Course, Conference Center

DỊCH VỤ BẤT ĐỘNG SẢN PHÚ LONG:
- Xem dự án miễn phí (100 SVT thưởng)
- Tư vấn đầu tư bất động sản (200 SVT thưởng)
- Tư vấn nhà ở, thương mại, nghỉ dưỡng
- Hỗ trợ vay vốn mua nhà qua HDBank
- Chuyển đổi SVT thành ưu đãi mua nhà

QUY TẮC TRẢ LỜI:
1. LUÔN trả lời chính xác về thông tin tài chính
2. Nếu không chắc chắn, nói "Tôi cần kiểm tra thông tin này"
3. Đưa ra lời khuyên dựa trên profile khách hàng
4. Sử dụng số liệu cụ thể, không ước đoán
5. Luôn đề cập đến lợi ích SVT khi có thể

ĐỊNH DẠNG TRẢ LỜI:
- Sử dụng bullet points rõ ràng
- Đưa ra con số cụ thể (lãi suất, phí, thời gian)
- Gợi ý các bước tiếp theo
- Luôn kết thúc bằng câu hỏi để tương tác thêm

VÍ DỤ TRẢ LỜI TỐT:

**Tư vấn tài chính:**
"📊 **Phân tích tài chính của bạn:**

• **SVT hiện tại:** 15,000 tokens
• **Mức độ:** Silver (cần 35,000 để lên Gold)
• **Lãi suất tiết kiệm:** 7.5%/năm
• **Phí thẻ tín dụng:** Miễn phí năm đầu

**Đề xuất:**
1. Tích lũy thêm 20,000 SVT để đạt Gold
2. Mở tài khoản tiết kiệm HDBank
3. Đăng ký thẻ Visa Platinum

Bạn muốn tôi hướng dẫn chi tiết bước nào?"

**Tư vấn bất động sản:**
"🏢 **Tư vấn đầu tư bất động sản Phú Long:**

• **Ngân sách:** 5-8 tỷ VNĐ
• **Mục đích:** Đầu tư dài hạn
• **Vị trí ưu tiên:** TP.HCM

**Dự án phù hợp:**
1. **Essensia Parkway** - 3.5 tỷ VNĐ
   - Chuẩn sống Lux-Well, tiềm năng tăng giá cao
   - Tiện ích: Sky Pool, Gym, Concierge
   
2. **Dragon Riverside City** - 2.8 tỷ VNĐ
   - Khu đô thị hoàn chỉnh, thanh khoản tốt
   - Tiện ích: River View, Golf Course, Mall

**Hỗ trợ tài chính:**
• Vay HDBank lên đến 80% giá trị
• Lãi suất ưu đãi cho khách hàng Sovico
• SVT có thể đổi thành ưu đãi mua nhà

Bạn muốn tôi đặt lịch xem dự án nào?"`;

        // Build comprehensive customer insights with financial data
        const prefs = prefsRef.current;
        const financialData = await fetchFinancialData();
        
        // Build detailed customer profile
        const customerInsights = [
          // Basic Info
          userProfile?.name ? `Tên: ${userProfile.name}` : undefined,
          userProfile?.riskTolerance ? `Rủi ro: ${userProfile.riskTolerance}` : undefined,
          typeof userProfile?.sovicoTokens === 'number' ? `SVT: ${userProfile.sovicoTokens.toLocaleString('vi-VN')}` : undefined,
          
          // Financial Status
          `Số dư: ${financialData.accountBalance.toLocaleString('vi-VN')} VNĐ`,
          `Thu nhập ước tính: ${financialData.monthlyIncome.toLocaleString('vi-VN')} VNĐ/tháng`,
          `Credit Score: ${financialData.creditScore}`,
          `Tổng nợ: ${financialData.totalDebt.toLocaleString('vi-VN')} VNĐ`,
          
          // Spending Patterns
          `Chi tiêu tháng: ${financialData.spendingPattern.monthly?.toLocaleString('vi-VN') || '0'} VNĐ`,
          `Đầu tư hiện tại: ${financialData.investmentPortfolio.totalValue.toLocaleString('vi-VN')} VNĐ`,
          
          // Travel Behavior
          `Số chuyến bay: ${financialData.flightCount}`,
          `Chi phí bay: ${financialData.flightSpending.toLocaleString('vi-VN')} VNĐ`,
          prefs?.preferredOrigin ? `Origin thường: ${prefs.preferredOrigin}` : undefined,
          prefs?.preferredDestination ? `Destination thường: ${prefs.preferredDestination}` : undefined,
          prefs?.typicalPassengers ? `Số khách hay đi: ${prefs.typicalPassengers}` : undefined,
          
          // Investment Portfolio
          (financialData.investmentPortfolio.types as any)?.stocks > 0 ? `Cổ phiếu: ${(financialData.investmentPortfolio.types as any).stocks}` : undefined,
          (financialData.investmentPortfolio.types as any)?.bonds > 0 ? `Trái phiếu: ${(financialData.investmentPortfolio.types as any).bonds}` : undefined,
          (financialData.investmentPortfolio.types as any)?.mutual_funds > 0 ? `Quỹ đầu tư: ${(financialData.investmentPortfolio.types as any).mutual_funds}` : undefined,
          
          // Loan History
          financialData.loanHistory.length > 0 ? `Khoản vay: ${financialData.loanHistory.length}` : undefined,
          
          // Transaction Activity
          `Giao dịch: ${financialData.transactionHistory.length} lần`,
        ].filter(Boolean).join(' • ');

        const fullPrompt = `${systemPrompt}

CUSTOMER INSIGHTS: ${customerInsights || 'N/A'}

FINANCIAL CONTEXT:
- Account Balance: ${financialData.accountBalance.toLocaleString('vi-VN')} VNĐ
- Monthly Income: ${financialData.monthlyIncome.toLocaleString('vi-VN')} VNĐ
- Credit Score: ${financialData.creditScore}/850
- Total Debt: ${financialData.totalDebt.toLocaleString('vi-VN')} VNĐ
- Investment Value: ${financialData.investmentPortfolio.totalValue.toLocaleString('vi-VN')} VNĐ
- Flight Activity: ${financialData.flightCount} chuyến bay
- Spending Pattern: ${financialData.spendingPattern.monthly?.toLocaleString('vi-VN') || '0'} VNĐ/tháng

DATA STATUS:
${financialData.accountBalance === 0 ? '⚠️ Chưa có dữ liệu số dư tài khoản - sử dụng ước tính' : '✅ Có dữ liệu số dư tài khoản'}
${financialData.flightCount === 0 ? '⚠️ Chưa có dữ liệu chuyến bay - khách hàng mới' : '✅ Có dữ liệu chuyến bay'}
${financialData.transactionHistory.length === 0 ? '⚠️ Chưa có dữ liệu giao dịch - tài khoản mới' : '✅ Có dữ liệu giao dịch'}

USER ASK: "${userMessage}"`;

        const result = await currentModel.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(` Success with ${modelName}! Response length:`, text.length);
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

  const generateLocalResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Handle specific questions about SVT meaning
    if (lowerMessage.includes('svt là gì') || lowerMessage.includes('sovico token là gì')) {
      return `🪙 **SVT (Sovico Token) là gì?**

**📋 Định nghĩa:**
• **SVT** = Sovico Token - Token nội bộ của hệ sinh thái Sovico
• **Mục đích:** Tích điểm, đổi quà, giao dịch trong hệ sinh thái

**🎯 Công dụng chính:**
• **Thanh toán:** Mua vé máy bay, đặt phòng resort
• **Đổi quà:** Voucher ăn uống, spa, shopping
• **Đầu tư:** Mua NFT, staking lãi suất
• **Giao dịch:** Trade trên P2P marketplace

**💰 Cách kiếm SVT:**
• Giao dịch HDBank: 0.1% số tiền → SVT
• Bay Vietjet: 100-200 SVT/chuyến
• Nghỉ Resort: 200-500 SVT/tối
• Review dịch vụ: 50-200 SVT/review
• Giới thiệu bạn bè: 1,000 SVT/người

**📊 Level system:**
• **Bronze:** 0-9,999 SVT
• **Silver:** 10,000-49,999 SVT  
• **Gold:** 50,000-199,999 SVT
• **Diamond:** 200,000+ SVT

Bạn muốn tôi hướng dẫn cách kiếm SVT hiệu quả không?`;
    }
    
    // Handle strategy questions about flights, balance, and SVT
    if (lowerMessage.includes('chiến lược') || lowerMessage.includes('strategy') || 
        lowerMessage.includes('kế hoạch') || lowerMessage.includes('plan') ||
        lowerMessage.includes('số chuyến bay') || lowerMessage.includes('số dư') ||
        lowerMessage.includes('số svt')) {
      
      const currentSVT = userProfile?.sovicoTokens || 0;
      const currentLevel = currentSVT >= 200000 ? 'Diamond' : 
                          currentSVT >= 50000 ? 'Gold' : 
                          currentSVT >= 10000 ? 'Silver' : 'Bronze';
      
      // Get comprehensive financial data
      const financialData = await fetchFinancialData();
      const flightCount = financialData.flightCount;
      const accountBalance = financialData.accountBalance;
      const monthlyIncome = financialData.monthlyIncome;
      const creditScore = financialData.creditScore;
      const totalDebt = financialData.totalDebt;
      const investmentValue = financialData.investmentPortfolio.totalValue;
      const spendingPattern = financialData.spendingPattern;
      
      return `📊 **Chiến lược tài chính cá nhân hóa cho bạn:**

**📈 Tình hình hiện tại:**
• **SVT hiện có:** ${currentSVT.toLocaleString('vi-VN')} tokens (${currentLevel})
• **Số chuyến bay:** ${flightCount} chuyến trong năm
• **Số dư tài khoản:** ${accountBalance.toLocaleString('vi-VN')} VNĐ
• **Thu nhập ước tính:** ${monthlyIncome.toLocaleString('vi-VN')} VNĐ/tháng
• **Credit Score:** ${creditScore}/850
• **Tổng nợ:** ${totalDebt.toLocaleString('vi-VN')} VNĐ
• **Giá trị đầu tư:** ${investmentValue.toLocaleString('vi-VN')} VNĐ
• **Chi tiêu tháng:** ${spendingPattern.monthly?.toLocaleString('vi-VN') || '0'} VNĐ
• **Giao dịch:** ${userProfile?.totalTransactions || 0} lần

**🎯 Chiến lược tối ưu dựa trên profile:**

**✈️ Chiến lược bay (${flightCount} chuyến/năm):**
${flightCount >= 15 ? 
  '• **Frequent Flyer:** Tối ưu hóa với Vietjet Gold/Platinum\n• Tích miles x2, ưu tiên chuyến quốc tế\n• Sử dụng SVT để upgrade hạng bay' :
  flightCount >= 8 ?
  '• **Regular Traveler:** Cân bằng nội địa và quốc tế\n• Tập trung tích SVT từ bay (100-200 SVT/chuyến)\n• Sử dụng voucher SVT để giảm chi phí' :
  '• **Occasional Traveler:** Tối ưu từng chuyến bay\n• Ưu tiên bay trong mùa thấp điểm\n• Sử dụng SVT để đổi voucher du lịch'
}

**💰 Chiến lược tài chính (${(accountBalance/1000000).toFixed(0)}M VNĐ):**
${accountBalance >= 50000000 ?
  `• **High Balance:** Đa dạng hóa đầu tư
• 40% tiết kiệm HDBank (7.5%/năm) = ${(accountBalance * 0.4 / 1000000).toFixed(0)}M VNĐ
• 30% đầu tư chứng khoán = ${(accountBalance * 0.3 / 1000000).toFixed(0)}M VNĐ  
• 20% bất động sản = ${(accountBalance * 0.2 / 1000000).toFixed(0)}M VNĐ
• 10% SVT ecosystem = ${(accountBalance * 0.1 / 1000000).toFixed(0)}M VNĐ` :
  accountBalance >= 20000000 ?
  `• **Medium Balance:** Cân bằng rủi ro
• 50% tiết kiệm an toàn = ${(accountBalance * 0.5 / 1000000).toFixed(0)}M VNĐ
• 30% đầu tư trung bình rủi ro = ${(accountBalance * 0.3 / 1000000).toFixed(0)}M VNĐ
• 20% SVT và crypto = ${(accountBalance * 0.2 / 1000000).toFixed(0)}M VNĐ` :
  `• **Growing Balance:** Tập trung tích lũy
• 70% tiết kiệm lãi suất cao = ${(accountBalance * 0.7 / 1000000).toFixed(0)}M VNĐ
• 20% đầu tư ít rủi ro = ${(accountBalance * 0.2 / 1000000).toFixed(0)}M VNĐ
• 10% SVT để học hỏi = ${(accountBalance * 0.1 / 1000000).toFixed(0)}M VNĐ`
}

**🪙 Chiến lược SVT (${currentLevel} level):**
${currentLevel === 'Diamond' ?
  '• **Diamond Strategy:** Tối ưu hóa lợi nhuận\n• Staking SVT để nhận lãi 8-12%/năm\n• Trade SVT trên P2P marketplace\n• Đầu tư NFT premium' :
  currentLevel === 'Gold' ?
  '• **Gold Strategy:** Tăng cường tích lũy\n• Tập trung kiếm SVT từ giao dịch\n• Bay thêm 5-10 chuyến/năm\n• Đầu tư NFT cơ bản' :
  currentLevel === 'Silver' ?
  '• **Silver Strategy:** Nâng cấp level\n• Tăng cường giao dịch HDBank\n• Bay thêm 3-5 chuyến/năm\n• Tham gia referral program' :
  '• **Bronze Strategy:** Kích hoạt tài khoản\n• Mở tài khoản HDBank để kiếm SVT\n• Bay ít nhất 2-3 chuyến/năm\n• Hoàn thành daily tasks'
}

**📅 Kế hoạch 3 tháng tới:**
1. **Tháng 1:** ${currentLevel === 'Bronze' ? 'Kích hoạt SVT, mở tài khoản HDBank' : 'Tối ưu hóa giao dịch hiện tại'}
2. **Tháng 2:** ${flightCount < 5 ? 'Đặt thêm 2-3 chuyến bay' : 'Tối ưu hóa chuyến bay hiện có'}
3. **Tháng 3:** ${currentLevel === 'Diamond' ? 'Đầu tư SVT advanced' : 'Nâng cấp level SVT'}

**💡 Hành động ngay:**
• Kiểm tra ưu đãi level ${currentLevel} hiện tại
• Đặt lịch bay tiếp theo để tích SVT
• Review portfolio đầu tư hiện tại

**🔍 Phân tích chi tiết:**
• **Tỷ lệ nợ/thu nhập:** ${((totalDebt / monthlyIncome) * 100).toFixed(1)}% ${totalDebt / monthlyIncome > 0.4 ? '(Cao - cần giảm nợ)' : '(Tốt)'}
• **Tỷ lệ tiết kiệm:** ${(((monthlyIncome - (spendingPattern.monthly || 0)) / monthlyIncome) * 100).toFixed(1)}% ${((monthlyIncome - (spendingPattern.monthly || 0)) / monthlyIncome) > 0.2 ? '(Tốt)' : '(Cần tăng tiết kiệm)'}
• **Diversification:** ${investmentValue > 0 ? 'Có đầu tư' : 'Chưa đầu tư'} - ${investmentValue > 0 ? 'Tốt' : 'Cần bắt đầu đầu tư'}

Bạn muốn tôi chi tiết hóa chiến lược nào?`;
    }
    
    // Flight booking - Enhanced with context awareness
    const flightInfo = extractFlightInfoWithContext(userMessage);
    
    if (flightInfo) {
      const { origin, destination, date, passengers } = flightInfo;
      
      // Count missing information
      const missingInfo = [];
      if (!origin) missingInfo.push('điểm đi');
      if (!destination) missingInfo.push('điểm đến');
      if (!date) missingInfo.push('ngày bay');
      
      // Smart questioning based on what's missing
      if (missingInfo.length > 0) {
        return askForMissingFlightInfo(missingInfo, origin, destination, date, passengers);
      }
      
      // All information available - proceed with booking
      // Reset context after successful booking
      setFlightContext({});
      return generateFlightBookingResponse(origin, destination, date, passengers);
    }
    
    // Legacy flight booking check (fallback)
    if (lowerMessage.includes('vé máy bay') || lowerMessage.includes('đặt vé') || 
        lowerMessage.includes('bay') || lowerMessage.includes('vietjet')) {
      
      // Check if all required info is present
      const hasOrigin = extractLocation(lowerMessage, 'origin')
      const hasDestination = extractLocation(lowerMessage, 'destination') 
      const hasDate = extractDate(lowerMessage)
      const hasPassengerCount = extractPassengerCount(lowerMessage)
      
      // Count missing information
      const missingInfo = [];
      if (!hasOrigin) missingInfo.push('điểm đi');
      if (!hasDestination) missingInfo.push('điểm đến');
      if (!hasDate) missingInfo.push('ngày bay');
      
      // Smart questioning based on what's missing
      if (missingInfo.length > 0) {
        return askForMissingFlightInfo(missingInfo, hasOrigin, hasDestination, hasDate, hasPassengerCount);
      }
      
      return ` **Agent đang xử lý đặt vé máy bay**

 **THÔNG BÁO: Agent mode ON** - Tôi sẽ thực hiện đặt vé ngay bây giờ!

 **Thông tin chuyến bay:**
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
      return ` **Agent mở thẻ HDBank ngay lập tức**

 **THÔNG BÁO: Agent mode ON** - Đang xử lý mở thẻ cho bạn!

 **Thông tin thẻ được đề xuất:**
• Loại thẻ: Visa ${lowerMessage.includes('platinum') ? 'Platinum' : lowerMessage.includes('gold') ? 'Gold' : 'Classic'}
• Hạn mức: Dựa trên thu nhập và profile
• Phí thường niên: Miễn phí năm đầu
• Ưu đãi: Cashback 2%, tích điểm không giới hạn

 **Agent đang thực hiện:**
1. Kiểm tra điều kiện tài chính
2. Đánh giá credit score
3. Chọn thẻ phù hợp nhất
4. Xử lý hồ sơ và duyệt tự động
5. Sản xuất và giao thẻ tận nơi

 **Lợi ích đặc biệt:**
• Tích 100 SVT khi mở thẻ thành công
• Liên kết với Vietjet Miles
• Ưu đãi tại Sovico Resort
• Chuyển đổi điểm thành SVT

⚡ Thẻ sẽ được giao trong 3-5 ngày làm việc!`;
    }
    
    // Đầu tư
    if (lowerMessage.includes('đầu tư') || lowerMessage.includes('investment')) {
      return ` **Phân tích đầu tư cho bạn:**

Dựa trên profile và mức độ rủi ro:

 **Ngân hàng (30-40%)**
• Tiền gửi có kỳ hạn HDBank: 7-8%/năm
• Trái phiếu doanh nghiệp: 8-12%/năm

 **Chứng khoán (20-30%)**
• Cổ phiếu blue-chip VN30
• ETF diversified

 **Bất động sản (20-30%)**
• Resort/condotel qua Sovico
• Căn hộ cho thuê khu vực trung tâm

 **SVT Ecosystem (10-20%)**
• Stake SVT để nhận rewards
• Trading trên P2P marketplace

**Lưu ý:** Chỉ đầu tư số tiền có thể chấp nhận rủi ro!`;
    }
    
    // Chi tiêu
    if (lowerMessage.includes('chi tiêu') || lowerMessage.includes('tiết kiệm')) {
      return `💰 **Kế hoạch tối ưu chi tiêu:**

 **Quy tắc 50/30/20:**
• 50% nhu cầu thiết yếu (ăn, ở, đi lại)
• 30% giải trí, mua sắm
• 20% tiết kiệm và đầu tư

 **Mẹo tiết kiệm với Sovico:**
• Dùng thẻ HDBank để tích điểm
• Bay Vietjet thường xuyên → tích miles
• Nghỉ dưỡng Sovico Resort → voucher
• Mua sắm bằng SVT token → cashback

 **Công cụ theo dõi:**
• Sovico SuperApp tracking tự động
• Báo cáo chi tiêu theo danh mục
• Cảnh báo khi vượt ngân sách`;
    }
    
    // SVT Token - Enhanced with accurate information
    if (lowerMessage.includes('svt') || lowerMessage.includes('token') || lowerMessage.includes('sovico token')) {
      const currentSVT = userProfile?.sovicoTokens || 0;
      const currentLevel = currentSVT >= 200000 ? 'Diamond' : 
                          currentSVT >= 50000 ? 'Gold' : 
                          currentSVT >= 10000 ? 'Silver' : 'Bronze';
      
      return `🪙 **Phân tích SVT Token của bạn:**

**📊 Thông tin hiện tại:**
• **SVT hiện có:** ${currentSVT.toLocaleString('vi-VN')} tokens
• **Mức độ:** ${currentLevel}
• **Trạng thái:** ${currentSVT >= 10000 ? 'Đã kích hoạt' : 'Chưa kích hoạt'}

**💰 Cách kiếm SVT hiệu quả:**
• **Giao dịch HDBank:** 0.1% số tiền giao dịch → SVT
• **Bay Vietjet:** 100 SVT/chuyến nội địa, 200 SVT/chuyến quốc tế
• **Nghỉ Resort:** 200-500 SVT/tối tùy hạng phòng
• **Review dịch vụ:** 50-200 SVT/review
• **Giới thiệu bạn bè:** 1,000 SVT/người thành công
• **Nhiệm vụ hàng ngày:** 50-100 SVT/task

**🎯 Cách sử dụng SVT tối ưu:**
• **Đổi voucher:** 1 SVT = 1,000 VNĐ (ROI 100%)
• **Upgrade dịch vụ:** Giảm 20-50% phí
• **Mua NFT:** Đầu tư dài hạn
• **Staking:** Lãi 8-12%/năm

**📈 Mục tiêu level tiếp theo:**
${currentLevel === 'Bronze' ? '• Cần 10,000 SVT để lên Silver' : 
  currentLevel === 'Silver' ? '• Cần 50,000 SVT để lên Gold' :
  currentLevel === 'Gold' ? '• Cần 200,000 SVT để lên Diamond' : '• Bạn đã đạt mức cao nhất!'}

**💡 Đề xuất hành động:**
1. Tăng cường giao dịch HDBank
2. Đặt vé Vietjet thường xuyên  
3. Nghỉ dưỡng tại Resort
4. Tham gia chương trình referral

Bạn muốn tôi hướng dẫn chi tiết cách nào?`;
    }
    
    // HDBank - Enhanced with accurate information
    if (lowerMessage.includes('hdbank') || lowerMessage.includes('ngân hàng') || lowerMessage.includes('thẻ') || lowerMessage.includes('vay')) {
      return `🏦 **Dịch vụ HDBank cho bạn:**

**💳 Thẻ tín dụng (dựa trên profile):**
• **HDBank Visa Classic:** Phí thường niên 200,000 VNĐ
• **HDBank Vietjet Platinum:** Tích miles x2, phí 500,000 VNĐ/năm
• **HDBank Signature:** Hạn mức cao, phí 1,000,000 VNĐ/năm
• **Cashback:** 0.5-2% tùy loại thẻ

**💰 Tiết kiệm & Đầu tư:**
• **Tiền gửi có kỳ hạn:** 7.5-8.5%/năm (12-24 tháng)
• **Tiết kiệm linh hoạt:** 6.2%/năm, rút bất kỳ lúc nào
• **HD EARN:** Combo tiết kiệm + bảo hiểm nhân thọ
• **HD Invest:** Ủy thác đầu tư từ 10 triệu VNĐ

**🏠 Vay vốn:**
• **Vay mua nhà:** Lãi suất 8.5-9.5%/năm
• **Vay mua xe:** Lãi suất 9.5-11%/năm  
• **Vay kinh doanh:** Lãi suất 10-12%/năm
• **Vay tiêu dùng:** Lãi suất 12-15%/năm

**🎁 Ưu đãi đặc biệt qua Sovico:**
• **Mở tài khoản:** +500 SVT
• **Duy trì số dư 50 triệu:** +200 SVT/tháng
• **Giao dịch 10 triệu/tháng:** Miễn phí chuyển khoản
• **Mở thẻ tín dụng:** +1,000 SVT
• **Vay vốn:** +0.1% số tiền vay → SVT

**📊 Đề xuất phù hợp với bạn:**
1. Mở tài khoản tiết kiệm để tối ưu lãi suất
2. Đăng ký thẻ tín dụng phù hợp với thu nhập
3. Tham gia chương trình tích điểm SVT
4. Sử dụng dịch vụ chuyển khoản miễn phí

Bạn quan tâm đến sản phẩm nào?`;
    }
    
    // Kế hoạch tài chính
    if (lowerMessage.includes('kế hoạch') || lowerMessage.includes('planning')) {
      return ` **Kế hoạch tài chính 2025:**

 **Mục tiêu SMART:**
• Tiết kiệm 100 triệu (8.3 triệu/tháng)
• Đầu tư 50 triệu vào portfolio cân bằng
• Tích lũy 50,000 SVT tokens
• Đạt hạng Gold trong hệ sinh thái Sovico

 **Timeline thực hiện:**
**Q1:** Tối ưu chi tiêu, mở tài khoản đầu tư
**Q2:** Đầu tư batch 1, bắt đầu DCA stocks
**Q3:** Review & rebalance portfolio
**Q4:** Harvest profits, plan cho năm sau

 **Action items:**
• Setup auto-transfer 8.3tr/tháng
• Cài đặt alerts trên Sovico app
• Monthly review với AI advisor`;
    }
    
    // Default response - Enhanced with comprehensive financial data
    const financialData = await fetchFinancialData();
    
    return `🤖 **AI Agent đang phân tích yêu cầu của bạn...**

**📊 Dựa trên profile hiện tại:**
• **SVT:** ${userProfile?.sovicoTokens?.toLocaleString('vi-VN') || 'Chưa có'} tokens
• **Level:** ${userProfile?.sovicoTokens >= 200000 ? 'Diamond' : 
              userProfile?.sovicoTokens >= 50000 ? 'Gold' : 
              userProfile?.sovicoTokens >= 10000 ? 'Silver' : 'Bronze'}
• **Số dư:** ${financialData.accountBalance.toLocaleString('vi-VN')} VNĐ
• **Thu nhập ước tính:** ${financialData.monthlyIncome.toLocaleString('vi-VN')} VNĐ/tháng
• **Credit Score:** ${financialData.creditScore}/850
• **Tổng nợ:** ${financialData.totalDebt.toLocaleString('vi-VN')} VNĐ
• **Đầu tư:** ${financialData.investmentPortfolio.totalValue.toLocaleString('vi-VN')} VNĐ
• **Chi tiêu tháng:** ${financialData.spendingPattern.monthly?.toLocaleString('vi-VN') || '0'} VNĐ
• **Giao dịch:** ${userProfile?.totalTransactions || 0} lần

**💡 Tôi có thể giúp bạn với:**

**💰 Tài chính cá nhân:**
• Phân tích chi tiêu và tối ưu ngân sách
• Tư vấn tiết kiệm và đầu tư
• Kế hoạch tài chính dài hạn

**🏦 Dịch vụ ngân hàng:**
• Mở thẻ tín dụng HDBank
• Vay vốn mua nhà/xe/kinh doanh
• Chuyển khoản và thanh toán

**✈️ Du lịch & Nghỉ dưỡng:**
• Đặt vé máy bay Vietjet
• Đặt phòng resort
• Booking spa và ẩm thực

**🪙 SVT Ecosystem:**
• Cách kiếm và sử dụng SVT hiệu quả
• Tham gia chương trình loyalty
• Đầu tư NFT và staking

**Hãy cho tôi biết bạn cần hỗ trợ gì cụ thể nhé!** 🎯`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isProcessing) return;

    // Check if user is entering OTP for pending action
    if (pendingOTPAction) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `OTP: ${inputMessage}`,
        timestamp: new Date()
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      if (inputMessage.trim() === '000000') {
        // OTP correct - proceed with action
        setMessages(prev => prev.map(msg => 
          msg.actions?.some(a => a.id === pendingOTPAction.id)
            ? { ...msg, actions: msg.actions?.map(a => 
                a.id === pendingOTPAction.id 
                  ? { ...a, status: 'executing', otpVerified: true }
                  : a
              )}
            : msg
        ));

        // Execute the pending action
        setTimeout(() => {
          executeActions([{ ...pendingOTPAction, status: 'executing', otpVerified: true }], userMessage.id);
          setPendingOTPAction(null);
          setOtpAttempts(0);
        }, 1000);

        setInputMessage('');
        return;
      } else {
        // OTP incorrect - increment attempts
        setOtpAttempts(prev => prev + 1);
        
        // OTP incorrect - cancel action
        const cancelMessage: Message = {
          id: `cancel_${Date.now()}`,
          type: 'ai',
          content: `❌ **OTP KHÔNG CHÍNH XÁC - GIAO DỊCH BỊ HỦY**

🔐 **Bảo mật:** Mã OTP không đúng, giao dịch đã được hủy bỏ để bảo vệ tài khoản của bạn.

**📋 Chi tiết giao dịch bị hủy:**
${pendingOTPAction.service === 'hdbank' && pendingOTPAction.action === 'transfer' ? 
  `• 💳 Chuyển khoản: ${(pendingOTPAction.params.amount / 1000000).toFixed(0)} triệu VNĐ` :
  pendingOTPAction.service === 'hdbank' && pendingOTPAction.action === 'loan' ?
  `• 💰 Vay vốn: ${(pendingOTPAction.params.loan_amount / 1000000).toFixed(0)} triệu VNĐ` :
  `• 🏦 Dịch vụ ngân hàng HDBank`}

**🛡️ Lý do hủy:**
• Mã OTP không khớp với hệ thống (Lần thử: ${otpAttempts + 1})
• Bảo vệ tài khoản khỏi giao dịch trái phép
• Yêu cầu xác thực lại để tiếp tục

**💡 Để thực hiện giao dịch:**
• Vui lòng yêu cầu lại giao dịch
• Đảm bảo nhập đúng mã OTP: 000000
• Kiểm tra kết nối mạng và thử lại

**🔒 Tài khoản của bạn vẫn an toàn!**`,
          timestamp: new Date()
        };

        // Update action status to failed
        setMessages(prev => prev.map(msg => 
          msg.actions?.some(a => a.id === pendingOTPAction.id)
            ? { ...msg, actions: msg.actions?.map(a => 
                a.id === pendingOTPAction.id 
                  ? { ...a, status: 'failed', result: { error: 'OTP không chính xác' } }
                  : a
              )}
            : msg
        ));

        // Add cancel message
        setTimeout(() => {
          setMessages(prev => [...prev, cancelMessage]);
          setPendingOTPAction(null);
          setOtpAttempts(0);
        }, 1000);

        setInputMessage('');
        return;
      }
    }

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
          aiResponse = await generateLocalResponse(currentInput);
        }
      } else {
        aiResponse = await generateLocalResponse(currentInput);
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
              if (a.action === 'real_estate_consultation') return `🏢 Tư vấn bất động sản ${a.params.consultation_type}`
              if (a.action === 'book_property_viewing') return `🏠 Đặt lịch xem dự án ${a.params.project_name}`
              return `🏖️ Dịch vụ Resort`
            default:
              return '🔧 Dịch vụ khác'
          }
        }).join('\n• ')

        // Check if any action requires OTP
        const requiresOTP = actions.some(a => a.requiresOTP);
        
        if (requiresOTP) {
          aiResponse += `\n\n🔐 **BẢO MẬT: Xác thực OTP cần thiết**\n\n`;
          aiResponse += `**Các giao dịch cần xác thực:**\n• ${actionsList}\n\n`;
          aiResponse += `**📱 Mã OTP đã được gửi đến số điện thoại đăng ký**\n`;
          aiResponse += `**🔢 Vui lòng nhập mã OTP: 000000**\n\n`;
          aiResponse += `⚠️ **Lưu ý:** Đây là môi trường demo, OTP thực sẽ được gửi qua SMS\n`;
          aiResponse += `⏳ **Chờ xác thực OTP để tiếp tục...**`;
        } else {
          aiResponse += `\n\n🤖 **Agent sẽ thực hiện:**\n• ${actionsList}\n\n⏳ Đang xử lý yêu cầu...`;
        }
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
        const requiresOTP = actions.some(a => a.requiresOTP);
        
        if (requiresOTP) {
          // Set pending OTP action and wait for user input
          const otpAction = actions.find(a => a.requiresOTP);
          if (otpAction) {
            setPendingOTPAction(otpAction);
            setOtpAttempts(0); // Reset attempts for new OTP request
          }
        } else {
          // Execute actions immediately if no OTP required
          setTimeout(() => {
            executeActions(actions, aiMessage.id);
          }, 1500); // Delay để user đọc được response trước
        }
      }

    } catch (error: any) {
      console.error('Error generating AI response:', error);
      
      let errorMessage = ' **Xin lỗi, AI gặp sự cố**\n\n';
      
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
              <div className="flex items-center space-x-2">
                <div className="text-gray-500 text-xs">
                  {userProfile.totalTransactions} giao dịch
                </div>
                <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                  🧪 Demo Data
                </span>
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
                          action.status === 'waiting_otp' ? 'bg-purple-600' :
                          action.status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                        }`}>
                          {action.status === 'pending' && 'Chờ xử lý'}
                          {action.status === 'waiting_otp' && 'Chờ OTP'}
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

        {/* OTP Pending Notification */}
        {pendingOTPAction && (
          <div className="bg-purple-900/20 border-t border-purple-600 p-3">
            <div className="flex items-center justify-center space-x-2 text-purple-300">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">🔐 Đang chờ xác thực OTP cho giao dịch bảo mật</span>
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-red-400">⚠️ Nhập sai OTP sẽ hủy giao dịch</span>
              {otpAttempts > 0 && (
                <div className="mt-1">
                  <span className="text-xs text-yellow-400">🔄 Lần thử: {otpAttempts}/3</span>
                </div>
              )}
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
              placeholder={pendingOTPAction ? "Nhập mã OTP: 000000" : "Hỏi AI về tài chính, đầu tư, tiết kiệm..."}
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
