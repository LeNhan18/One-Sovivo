import React, { useState, useEffect } from 'react';

interface Chat {
  id: string;
  customer_id: string;
  customer_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  needs_intervention: boolean;
  last_message_at: string;
  message_count: number;
}

interface Message {
  id: string;
  message_type: 'user' | 'assistant' | 'admin_intervention';
  content: string;
  timestamp: string;
  is_intervention: boolean;
  admin_id?: string;
  sentiment_score?: number;
  sentiment_label?: string;
  sentiment_confidence?: number;
  satisfaction_score?: number;
  satisfaction_level?: string;
}

interface ChatDetail {
  id: string;
  customer_name: string;
  customer_age: number;
  customer_job: string;
  customer_city: string;
  persona_type: string;
  title: string;
  messages: Message[];
  sentiment_summary?: {
    avg_score: number;
    label: string;
    user_message_count: number;
    satisfaction_summary?: {
      average_satisfaction: number;
      sentiment_distribution: any;
      high_satisfaction_rate: number;
      low_satisfaction_rate: number;
    };
  };
}

const AdminChatMonitor: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [interventionMessage, setInterventionMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<any>(null);

  // Load chat list
  const loadChats = async () => {
    try {
      const response = await fetch(`/api/admin/chats?status=${statusFilter}`);
      const data = await response.json();
      if (data.success) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load chat detail
  const loadChatDetail = async (chatId: string) => {
    try {
      const response = await fetch(`/api/admin/chat/${chatId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedChat(data.chat);
      }
    } catch (error) {
      console.error('Error loading chat detail:', error);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/chat/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Send intervention
  const sendIntervention = async () => {
    if (!selectedChat || !interventionMessage.trim()) return;

    try {
      const response = await fetch(`/api/admin/chat/${selectedChat.id}/intervene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: interventionMessage,
          admin_id: 'admin_user' // You can replace with actual admin ID
        }),
      });

      const data = await response.json();
      if (data.success) {
        setInterventionMessage('');
        // Reload chat detail
        loadChatDetail(selectedChat.id);
        // Reload chat list to update intervention status
        loadChats();
        alert('Đã can thiệp thành công!');
      } else {
        alert('Lỗi can thiệp: ' + data.message);
      }
    } catch (error) {
      console.error('Error sending intervention:', error);
      alert('Lỗi kết nối');
    }
  };

  // Flag for intervention
  const flagForIntervention = async (chatId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/chat/${chatId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      if (data.success) {
        loadChats();
        alert('Đã đánh dấu cần can thiệp!');
      }
    } catch (error) {
      console.error('Error flagging chat:', error);
    }
  };

  useEffect(() => {
    loadChats();
    loadStats();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadChats();
      if (selectedChat) {
        loadChatDetail(selectedChat.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getMessageTypeColor = (type: string, isIntervention: boolean) => {
    if (isIntervention) return 'bg-purple-100 border-purple-300';
    if (type === 'user') return 'bg-blue-100 border-blue-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSatisfactionColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl text-blue-600">💬</span>
              <h1 className="text-2xl font-bold text-gray-900">
                Giám Sát Chat AI
              </h1>
            </div>
            
            {/* Stats */}
            {stats && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg">
                  <span className="text-blue-600 text-lg">👥</span>
                  <span className="text-sm font-bold text-blue-800">{stats.overview.total_chats} cuộc chat</span>
                </div>
                <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-lg">
                  <span className="text-orange-600 text-lg">⚠️</span>
                  <span className="text-sm font-bold text-orange-800">{stats.overview.needs_intervention} cần can thiệp</span>
                </div>
                <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                  <span className="text-green-600 text-lg">🕐</span>
                  <span className="text-sm font-bold text-green-800">{stats.overview.today_chats} hôm nay</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chat List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Danh Sách Chat</h2>
                  <button
                    onClick={loadChats}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Làm mới
                  </button>
                </div>
                
                {/* Filter */}
                <div className="flex space-x-2">
                  {[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'needs_intervention', label: 'Cần can thiệp' },
                    { value: 'active', label: 'Đang hoạt động' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusFilter === filter.value
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Đang tải...</div>
                ) : chats.length === 0 ? (
                  <div className="p-4 text-center text-black-500">Không có chat nào</div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChatDetail(chat.id)}
                      className={`p-4 border-b cursor-pointer hover:bg-black-50 ${
                        selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-black">{chat.customer_name || 'Khách hàng'}</div>
                          {chat.needs_intervention && (
                            <span className="text-orange-500">⚠️</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {chat.message_count} tin
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-800 truncate mb-2">
                        {chat.title || 'Cuộc chat'}
                      </p>
                      
                      <div className="text-sm font-semibold text-gray-600 bg-blue-50 px-2 py-1 rounded">
                        {formatTime(chat.updated_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat Detail */}
          <div className="lg:col-span-2">
            {selectedChat ? (
              <div className="bg-white rounded-lg shadow">
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Chat với {selectedChat.customer_name}
                      </h2>
                      <div className="text-base font-semibold text-gray-700 mt-2">
                        <span className="bg-gray-100 px-3 py-1 rounded-lg mr-2">{selectedChat.customer_age} tuổi</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-lg mr-2">{selectedChat.customer_job}</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-lg mr-2">{selectedChat.customer_city}</span>
                        {selectedChat.persona_type && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-bold">
                            {selectedChat.persona_type}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const reason = prompt('Lý do cần can thiệp:');
                          if (reason) flagForIntervention(selectedChat.id, reason);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                      >
                        <span>🚩</span>
                        <span>Đánh dấu</span>
                      </button>
                      
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/sentiment/analyze-chat/${selectedChat.id}`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              }
                            });
                            const data = await response.json();
                            if (data.success) {
                              // Reload chat detail to show updated sentiment
                              loadChatDetail(selectedChat.id);
                              alert('Đã phân tích sentiment thành công!');
                            } else {
                              alert('Lỗi phân tích sentiment: ' + data.message);
                            }
                          } catch (error) {
                            console.error('Error analyzing sentiment:', error);
                            alert('Lỗi kết nối');
                          }
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <span>🧠</span>
                        <span>Phân tích AI</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-3">
                  {selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border ${getMessageTypeColor(
                        message.message_type,
                        message.is_intervention
                      )}`}
                    >
                        {/* Sentiment Analysis Display */}
                        {message.sentiment_label && (
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(message.sentiment_label)}`}>
                              {message.sentiment_label === 'positive' ? '😊' : message.sentiment_label === 'negative' ? '😞' : '😐'} {message.sentiment_label}
                            </div>
                            {message.sentiment_confidence && (
                              <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                {Math.round(message.sentiment_confidence * 100)}% confidence
                              </span>
                            )}
                            {message.satisfaction_level && (
                              <div className={`px-3 py-2 rounded-full text-sm font-bold ${getSatisfactionColor(message.satisfaction_level)}`}>
                                {message.satisfaction_level === 'high' ? '⭐' : message.satisfaction_level === 'medium' ? '⭐' : '⭐'} Satisfaction: {message.satisfaction_level}
                              </div>
                            )}
                          </div>
                        )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-gray-800 bg-gray-200 px-2 py-1 rounded">
                            {message.is_intervention
                              ? `Chuyên viên (${message.admin_id})`
                              : message.message_type === 'user'
                              ? 'Khách hàng'
                              : 'AI'}
                          </span>
                          {message.is_intervention && (
                            <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-xs">
                              Can thiệp
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="text-gray-900 font-medium text-base leading-relaxed">{message.content}</div>
                    </div>
                  ))}
                </div>
                {/* Chat-level sentiment and satisfaction summary */}
                {selectedChat.sentiment_summary && (
                  <div className="p-4 border-t bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sentiment Summary */}
                      <div className="bg-white p-3 rounded-lg border">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                          <span className="mr-2">📊</span>
                          Phân Tích Cảm Xúc
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-base font-semibold text-gray-700">Cảm xúc chủ đạo:</span>
                            <span className={`px-3 py-2 rounded-full text-sm font-bold ${getSentimentColor(selectedChat.sentiment_summary.label)}`}>
                              {selectedChat.sentiment_summary.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-base font-semibold text-gray-700">Điểm trung bình:</span>
                            <span className="text-lg font-bold text-blue-600 bg-blue-100 px-3 py-2 rounded">
                              {selectedChat.sentiment_summary.avg_score.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-gray-700">Số tin nhắn:</span>
                            <span className="text-lg font-bold text-green-600 bg-green-100 px-3 py-2 rounded">
                              {selectedChat.sentiment_summary.user_message_count}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Satisfaction Summary */}
                      {selectedChat.sentiment_summary.satisfaction_summary && (
                        <div className="bg-white p-3 rounded-lg border">
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                            <span className="mr-2">⭐</span>
                            Mức Độ Hài Lòng
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-base font-semibold text-gray-700">Hài lòng cao:</span>
                              <span className="text-lg font-bold text-green-600 bg-green-100 px-3 py-2 rounded">
                                {Math.round(selectedChat.sentiment_summary.satisfaction_summary.high_satisfaction_rate * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-base font-semibold text-gray-700">Hài lòng thấp:</span>
                              <span className="text-lg font-bold text-red-600 bg-red-100 px-3 py-2 rounded">
                                {Math.round(selectedChat.sentiment_summary.satisfaction_summary.low_satisfaction_rate * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-gray-700">Trung bình:</span>
                              <span className="text-lg font-bold text-blue-600 bg-blue-100 px-3 py-2 rounded">
                                {selectedChat.sentiment_summary.satisfaction_summary.average_satisfaction.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Intervention Input */}
                <div className="p-4 border-t bg-black-50">
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <textarea
                        value={interventionMessage}
                        onChange={(e) => setInterventionMessage(e.target.value)}
                        placeholder="Nhập tin nhắn can thiệp..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={sendIntervention}
                      disabled={!interventionMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <span>📤</span>
                      <span>Can thiệp</span>
                    </button>
                  </div>
                  <p className="text-xs text-black-500 mt-2">
                    Tin nhắn can thiệp sẽ được gửi cho khách hàng và AI sẽ ngừng trả lời tự động.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <span className="text-6xl text-gray-400 block mb-4">👁️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chọn cuộc chat để xem chi tiết
                </h3>
                <p className="text-black-600">
                  Chọn một cuộc chat từ danh sách bên trái để theo dõi và can thiệp khi cần.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatMonitor;