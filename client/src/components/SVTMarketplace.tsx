import React, { useState } from 'react';

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
  const [userSVT, setUserSVT] = useState(15750);

  const marketplaceItems: MarketplaceItem[] = [
    {
      id: 'MP001',
      name: 'Voucher ăn uống 100K',
      description: 'Voucher giảm giá 100,000 VND cho các nhà hàng đối tác',
      price: 500,
      originalPrice: 600,
      category: 'voucher',
      provider: 'sovico',
      image: '🍽️',
      availability: 50,
      rating: 4.8,
      isExclusive: false,
      validUntil: '2025-12-31'
    },
    {
      id: 'MP002',
      name: 'Vé máy bay giảm 500K',
      description: 'Giảm 500,000 VND cho chuyến bay nội địa Vietjet',
      price: 2500,
      originalPrice: 3000,
      category: 'voucher',
      provider: 'vietjet',
      image: '✈️',
      availability: 20,
      rating: 4.9,
      isExclusive: true,
      validUntil: '2025-10-31'
    },
    {
      id: 'MP003',
      name: 'Lãi suất tiết kiệm ưu đãi',
      description: 'Tăng 0.5% lãi suất tiết kiệm trong 6 tháng',
      price: 1000,
      category: 'service',
      provider: 'hdbank',
      image: '💰',
      availability: 100,
      rating: 4.7,
      isExclusive: false,
      validUntil: '2025-09-30'
    },
    {
      id: 'MP004',
      name: 'Cashback 20% HDSaison',
      description: 'Cashback 20% cho 5 giao dịch tiếp theo (tối đa 200K)',
      price: 800,
      category: 'service',
      provider: 'hdsaison',
      image: '💳',
      availability: 75,
      rating: 4.6,
      isExclusive: false,
      validUntil: '2025-09-15'
    },
    {
      id: 'MP005',
      name: 'Resort Phú Quốc 2N1Đ',
      description: 'Gói nghỉ dưỡng 2 ngày 1 đêm tại resort 5 sao Phú Quốc',
      price: 8000,
      originalPrice: 10000,
      category: 'experience',
      provider: 'sovico',
      image: '🏖️',
      availability: 5,
      rating: 5.0,
      isExclusive: true,
      validUntil: '2025-12-31'
    },
    {
      id: 'MP006',
      name: 'iPhone 15 Pro Max',
      description: 'iPhone 15 Pro Max 256GB - Hàng chính hãng',
      price: 35000,
      originalPrice: 40000,
      category: 'product',
      provider: 'sovico',
      image: '📱',
      availability: 3,
      rating: 4.9,
      isExclusive: true,
      validUntil: '2025-09-30'
    }
  ];

  const exchangeItems: ExchangeItem[] = [
    {
      id: 'EX001',
      name: 'Voucher Spa 500K',
      description: 'Voucher massage và spa cao cấp, chưa sử dụng',
      offerPrice: 1200,
      originalPrice: 2500,
      sellerName: 'NguyenVanA',
      sellerRating: 4.8,
      condition: 'new',
      category: 'voucher',
      image: '💆',
      postedDate: '2025-08-18'
    },
    {
      id: 'EX002',
      name: 'Tai nghe AirPods Pro',
      description: 'AirPods Pro Gen 2, đã dùng 3 tháng, còn bảo hành',
      offerPrice: 8000,
      originalPrice: 12000,
      sellerName: 'TranThiB',
      sellerRating: 4.9,
      condition: 'like-new',
      category: 'product',
      image: '🎧',
      postedDate: '2025-08-17'
    },
    {
      id: 'EX003',
      name: 'Voucher Golf 1M',
      description: 'Voucher chơi golf tại sân golf cao cấp, hạn 6 tháng',
      offerPrice: 3500,
      originalPrice: 5000,
      sellerName: 'LeVanC',
      sellerRating: 4.7,
      condition: 'new',
      category: 'voucher',
      image: '⛳',
      postedDate: '2025-08-16'
    }
  ];

  const [myItems, setMyItems] = useState([
    {
      id: 'MY001',
      name: 'Voucher ăn uống 50K',
      type: 'owned',
      expiryDate: '2025-09-30',
      image: '🍕'
    },
    {
      id: 'MY002',
      name: 'Cashback 15% HDSaison',
      type: 'active',
      expiryDate: '2025-09-15',
      image: '💳'
    }
  ]);

  const formatSVT = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'vietjet': return 'bg-orange-500';
      case 'hdbank': return 'bg-blue-500';
      case 'hdsaison': return 'bg-purple-500';
      case 'sovico': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'text-green-600';
      case 'like-new': return 'text-blue-600';
      case 'good': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const purchaseItem = (item: MarketplaceItem) => {
    if (userSVT >= item.price) {
      setUserSVT(prev => prev - item.price);
      setMyItems(prev => [...prev, {
        id: `MY${Date.now()}`,
        name: item.name,
        type: 'owned',
        expiryDate: item.validUntil,
        image: item.image
      }]);
      alert(`Đã mua thành công ${item.name}! Còn lại ${formatSVT(userSVT - item.price)} SVT`);
    } else {
      alert('Không đủ SVT để mua item này!');
    }
  };

  const filteredMarketplace = selectedCategory === 'all' 
    ? marketplaceItems 
    : marketplaceItems.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Sàn Giao dịch SVT</h2>
            <p className="text-green-100">Mua sắm và trao đổi với Sovico Token</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{formatSVT(userSVT)} SVT</div>
            <div className="text-green-200 text-sm">Số dư hiện tại</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'marketplace', label: 'Cửa hàng', icon: '🛍️' },
          { key: 'exchange', label: 'Trao đổi P2P', icon: '🤝' },
          { key: 'my-items', label: 'Của tôi', icon: '📦' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-green-600'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[
                { key: 'all', label: 'Tất cả', icon: '🔍' },
                { key: 'voucher', label: 'Voucher', icon: '🎫' },
                { key: 'experience', label: 'Trải nghiệm', icon: '🌟' },
                { key: 'product', label: 'Sản phẩm', icon: '📦' },
                { key: 'service', label: 'Dịch vụ', icon: '⚡' }
              ].map(category => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    selectedCategory === category.key
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              ))}
            </div>

            {/* Marketplace Items */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarketplace.map(item => (
                <div key={item.id} className="card p-4 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-4xl">{item.image}</div>
                    <div className="flex flex-col items-end space-y-1">
                      {item.isExclusive && (
                        <span className="badge bg-yellow-500 text-white text-xs">Độc quyền</span>
                      )}
                      <span className={`badge text-white text-xs ${getProviderColor(item.provider)}`}>
                        {item.provider.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold mb-2">{item.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>{i < Math.floor(item.rating) ? '⭐' : '☆'}</span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">({item.rating})</span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-green-600">
                          {formatSVT(item.price)} SVT
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            {formatSVT(item.originalPrice)} SVT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        Còn lại: {item.availability} items
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Hạn: {new Date(item.validUntil).toLocaleDateString('vi-VN')}
                  </div>

                  <button
                    onClick={() => purchaseItem(item)}
                    disabled={userSVT < item.price || item.availability === 0}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                      userSVT >= item.price && item.availability > 0
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {userSVT >= item.price ? 'Mua ngay' : 'Không đủ SVT'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'exchange' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Trao đổi Peer-to-Peer</h3>
              <button className="btn btn-primary">+ Đăng bán</button>
            </div>

            <div className="space-y-4">
              {exchangeItems.map(item => (
                <div key={item.id} className="card p-4 flex items-center space-x-4">
                  <div className="text-5xl">{item.image}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold mb-1">{item.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`font-medium ${getConditionColor(item.condition)}`}>
                            {item.condition === 'new' ? 'Mới' : 
                             item.condition === 'like-new' ? 'Như mới' : 'Tốt'}
                          </span>
                          <span className="text-gray-600">
                            Đăng: {new Date(item.postedDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatSVT(item.offerPrice)} SVT
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          {formatSVT(item.originalPrice)} SVT
                        </div>
                        <div className="text-xs text-green-600">
                          Tiết kiệm {Math.round((1 - item.offerPrice/item.originalPrice) * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item.sellerName}</span>
                        <div className="flex text-yellow-400 text-xs">
                          {[...Array(5)].map((_, i) => (
                            <span key={i}>{i < Math.floor(item.sellerRating) ? '⭐' : '☆'}</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">({item.sellerRating})</span>
                      </div>

                      <div className="flex space-x-2">
                        <button className="btn btn-outline text-sm">Nhắn tin</button>
                        <button 
                          className="btn btn-primary text-sm"
                          disabled={userSVT < item.offerPrice}
                        >
                          Mua ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'my-items' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Vật phẩm của tôi</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myItems.map(item => (
                <div key={item.id} className="card p-4">
                  <div className="text-4xl mb-3">{item.image}</div>
                  <h4 className="font-bold mb-2">{item.name}</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`badge ${
                      item.type === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {item.type === 'active' ? 'Đang dùng' : 'Đã mua'}
                    </span>
                    <span className="text-gray-600">
                      HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button className="flex-1 btn btn-outline text-sm">Sử dụng</button>
                    <button className="flex-1 btn btn-primary text-sm">Trao đổi</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SVTMarketplace;
