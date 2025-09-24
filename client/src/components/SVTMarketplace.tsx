import React, { useState, useEffect } from 'react';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'voucher' | 'experience' | 'product' | 'service';
  provider: 'vietjet' | 'hdbank' | 'hdsaison' | 'sovico';
  image: string;
  availability: number;
  rating: number;
  isExclusive: boolean;
  validUntil: string;
}

interface ExchangeItem {
  id: string;
  name: string;
  description: string;
  offerPrice: number;
  originalPrice: number;
  sellerName: string;
  sellerRating: number;
  condition: 'new' | 'like-new' | 'good';
  category: string;
  image: string;
  postedDate: string;
}

const SVTMarketplace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'exchange' | 'my-items'>('marketplace');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userSVT, setUserSVT] = useState(0);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  // Get customer ID and SVT balance
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const userResponse = await fetch('http://127.0.0.1:5000/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userResponse.ok) {
          const user = await userResponse.json();
          const cId = user.customer_id || 1001;
          setCustomerId(cId);
          
          // Get SVT balance
          const tokensResponse = await fetch(`http://127.0.0.1:5000/api/tokens/${cId}`);
          if (tokensResponse.ok) {
            const tokensData = await tokensResponse.json();
            setUserSVT(tokensData.total_svt || 0);
          }
        }
      } catch (error) {
        console.error('Error initializing marketplace:', error);
        setCustomerId(1001);
      }
    };
    
    initializeData();
  }, []);

  // Fetch marketplace data
  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      // Fetch marketplace items from database
      const itemsResponse = await fetch('http://127.0.0.1:5000/api/marketplace/items');
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        const formattedItems = itemsData.items.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          price: item.price_svt,
          category: 'voucher' as const, // Default category
          provider: (item.partner_brand?.toLowerCase() || 'sovico') as any,
          image: getItemIcon(item.partner_brand, item.name, item.image_url), // Sử dụng ảnh từ cơ sở dữ liệu
          availability: item.quantity,
          rating: 4.8, // Default rating
          isExclusive: item.quantity < 50,
          validUntil: '2025-12-31'
        }));
        setMarketplaceItems(formattedItems);
      }

      // Fetch P2P listings
      const p2pResponse = await fetch('http://127.0.0.1:5000/api/p2p/listings');
      if (p2pResponse.ok) {
        const p2pData = await p2pResponse.json();
        const formattedP2P = p2pData.listings.map((listing: any) => ({
          id: listing.id.toString(),
          name: listing.item_name,
          description: listing.description || 'Sản phẩm từ người dùng khác',
          offerPrice: listing.price_svt,
          originalPrice: Math.floor(listing.price_svt * 1.2), // Estimate original price
          sellerName: listing.seller.name,
          sellerRating: 4.5, // Default rating
          condition: 'good' as const,
          category: 'Khác',
          image: listing.image_url || '📦', // Sử dụng ảnh từ cơ sở dữ liệu nếu có
          postedDate: new Date(listing.created_at).toLocaleDateString('vi-VN')
        }));
        setExchangeItems(formattedP2P);
      }

    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      setMarketplaceItems([
        {
          id: 'fallback1',
          name: 'Kết nối lại với server',
          description: 'Vui lòng kiểm tra kết nối mạng',
          price: 0,
          category: 'service',
          provider: 'sovico',
          image: '🔗',
          availability: 0,
          rating: 0,
          isExclusive: false,
          validUntil: '2025-12-31'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // useEffect to fetch data on component mount
  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const getItemIcon = (partner: string, itemName: string, imageUrl?: string): string => {
    if (imageUrl) return imageUrl; // Ưu tiên sử dụng ảnh từ cơ sở dữ liệu
    if (itemName.toLowerCase().includes('voucher') && itemName.toLowerCase().includes('ăn')) return '🍽️';
    if (itemName.toLowerCase().includes('vé') || itemName.toLowerCase().includes('bay')) return '✈️';
    if (itemName.toLowerCase().includes('lãi suất') || partner?.toLowerCase() === 'hdbank') return '💰';
    if (itemName.toLowerCase().includes('cashback') || partner?.toLowerCase() === 'hdsaison') return '💳';
    if (itemName.toLowerCase().includes('resort') || itemName.toLowerCase().includes('phòng')) return '🏖️';
    return '🎁';
  };

  const handlePurchase = async (item: MarketplaceItem) => {
    if (!customerId) {
      alert('Vui lòng đăng nhập để mua hàng');
      return;
    }

    if (userSVT < item.price) {
      setNotification({
        type: 'error',
        message: `Không đủ SVT! Bạn cần ${item.price} SVT nhưng chỉ có ${userSVT} SVT`
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://127.0.0.1:5000/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: parseInt(item.id),
          quantity: 1
        })
      });

      const result = await response.json();
      console.log('Purchase response:', result);
      
      if (response.ok && result.success) {
        console.log(`✅ Purchase successful: ${item.name}`);
        setNotification({
          type: 'success',
          message: `🎉 Mua thành công ${item.name}! Còn lại ${result.remaining_svt} SVT`
        });
        setUserSVT(result.remaining_svt);
        
        // Update item availability
        setMarketplaceItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, availability: Math.max(0, i.availability - 1) } : i
        ));
        
        // Optionally refresh the marketplace data
        await fetchMarketplaceData();
        
        // Auto hide notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        console.error('Purchase failed:', result);
        setNotification({
          type: 'error',
          message: `❌ Lỗi: ${result.error || 'Không thể mua hàng'}`
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setNotification({
        type: 'error',
        message: '❌ Lỗi kết nối. Vui lòng thử lại sau.'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const filteredItems = marketplaceItems.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Đang tải marketplace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D1117] text-white p-6 rounded-lg max-w-7xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notification.type === 'success' 
            ? 'bg-green-600 border border-green-500' 
            : 'bg-red-600 border border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-white font-medium">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            SVT Marketplace
          </h1>
          <p className="text-gray-400">Mua sắm với Sovico Token</p>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-lg">
          <p className="text-purple-200 text-sm">Số dư của bạn</p>
8          <p className="text-2xl font-bold">{(userSVT || 0).toLocaleString('vi-VN')} SVT</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-[#161B22] rounded-lg p-1">
        {[
          { id: 'marketplace', label: 'Cửa hàng', icon: '🛍️' },
          { id: 'exchange', label: 'P2P Exchange', icon: '🔄' },
          { id: 'my-items', label: 'Của tôi', icon: '📦' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'voucher', label: 'Voucher' },
              { id: 'experience', label: 'Trải nghiệm' },
              { id: 'service', label: 'Dịch vụ' },
              { id: 'product', label: 'Sản phẩm' }
            ].map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#161B22] text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-[#161B22] border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 transition-colors">
                <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2">{item.name}</h3>
                  <p className="text-gray-400 mb-4">{item.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-yellow-400 font-medium">⭐ {item.rating.toFixed(1)}</span>
                    <span className="text-gray-400">Còn {item.availability} sản phẩm</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 text-sm">Nhà cung cấp: <span className="text-blue-400 font-medium">{item.provider.toUpperCase()}</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-500 font-bold flex items-center">
                      {item.price.toLocaleString('vi-VN')} <span className="ml-1">SVT</span>
                    </span>
                    <button
                      disabled={item.availability === 0 || userSVT < item.price}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        item.availability === 0
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : userSVT < item.price
                          ? 'bg-red-900 text-red-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {item.availability === 0
                        ? '❌ Hết hàng'
                        : userSVT < item.price
                        ? '💰 Không đủ SVT'
                        : '🛒 Mua ngay'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Không có sản phẩm</h3>
              <p className="text-gray-500">Thử thay đổi bộ lọc hoặc quay lại sau!</p>
            </div>
          )}
        </div>
      )}

      {/* P2P Exchange Tab */}
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Sàn giao dịch P2P</h2>
            <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium">
              + Đăng tin bán
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exchangeItems.map(item => (
              <div key={item.id} className="bg-[#161B22] border border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-3xl">{item.image}</div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">{item.offerPrice} SVT</div>
                    <div className="text-sm text-gray-500 line-through">{item.originalPrice} SVT</div>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Người bán</p>
                    <p className="text-white font-medium">{item.sellerName}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-400 ml-1">{item.sellerRating}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.condition === 'new' ? 'bg-green-900 text-green-400' :
                      item.condition === 'like-new' ? 'bg-blue-900 text-blue-400' :
                      'bg-yellow-900 text-yellow-400'
                    }`}>
                      {item.condition === 'new' ? 'Mới' : item.condition === 'like-new' ? 'Như mới' : 'Tốt'}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mb-4">Đăng ngày: {item.postedDate}</p>
                
                <button
                  disabled={userSVT < item.offerPrice}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    userSVT < item.offerPrice
                      ? 'bg-red-900 text-red-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {userSVT < item.offerPrice ? '💰 Không đủ SVT' : '💬 Liên hệ mua'}
                </button>
              </div>
            ))}
          </div>

          {exchangeItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Chưa có tin đăng</h3>
              <p className="text-gray-500">Hãy là người đầu tiên đăng tin bán trên sàn P2P!</p>
            </div>
          )}
        </div>
      )}

      {/* My Items Tab */}
      {activeTab === 'my-items' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">Kho đồ của tôi</h3>
          <p className="text-gray-500">Chức năng đang được phát triển</p>
        </div>
      )}
    </div>
  );
};

export default SVTMarketplace;
