import React, { useState, useEffect } from 'react';

// =============================================================================
// ICONS (Sử dụng SVG nội tuyến)
// =============================================================================
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>;
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-400"><path d="M2 21l2.1-2.1c.6-.6.6-1.5 0-2.1L2.8 15.5c-.6-.6-.6-1.5 0-2.1L15.5 2.8c.6-.6 1.5-.6 2.1 0l1.3 1.3c.6.6.6 1.5 0 2.1L7.1 18.9c-.6.6-1.5.6-2.1 0L2 21Z"/></svg>;
const BankIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-400"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>;
const BrainIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-blue-400"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 9.5 7v0A2.5 2.5 0 0 1 7 4.5v0A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v0A2.5 2.5 0 0 1 14.5 7v0A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 14.5 2Z"/><path d="M12 7.5c2.5 0 5 .5 5 2.5s-2.5 2.5-5 2.5-5-1-5-2.5 2.5-2.5 5-2.5Z"/><path d="M4.5 10A2.5 2.5 0 0 1 7 12.5v0A2.5 2.5 0 0 1 4.5 15v0A2.5 2.5 0 0 1 2 12.5v0A2.5 2.5 0 0 1 4.5 10Z"/><path d="M19.5 10A2.5 2.5 0 0 1 22 12.5v0A2.5 2.5 0 0 1 19.5 15v0A2.5 2.5 0 0 1 17 12.5v0A2.5 2.5 0 0 1 19.5 10Z"/><path d="M7 15.5c2.5 0 5 .5 5 2.5s-2.5 2.5-5 2.5-5-1-5-2.5 2.5-2.5 5-2.5Z"/><path d="M17 15.5c2.5 0 5 .5 5 2.5s-2.5 2.5-5 2.5-5-1-5-2.5 2.5-2.5 5-2.5Z"/></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-purple-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;

// =============================================================================
// MÀN HÌNH ĐĂNG NHẬP (Login Screen)
// =============================================================================
const LoginScreen = ({ onLogin }) => {
    return (
        <div className="bg-[#0D1117] min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161B22] border border-gray-700 rounded-lg p-8">
                <div className="text-center mb-8">
                    <BrainIcon />
                    <h1 className="text-2xl font-bold text-white mt-2">One-Sovico</h1>
                    <p className="text-gray-400">Trải nghiệm hệ sinh thái trong tay bạn</p>
                </div>
                <div className="space-y-4">
                    <input type="email" placeholder="Email (demo: user@sovico.vn)" className="w-full bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" placeholder="Mật khẩu (demo: 123456)" className="w-full bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => onLogin(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200">
                        Đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MÀN HÌNH CHÍNH CỦA KHÁCH HÀNG (Customer Dashboard)
// =============================================================================
const CustomerDashboard = ({ onLogout }) => {
    const [userData, setUserData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = 'http://127.0.0.1:5000';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            try {
                // Lấy thông tin user hiện tại từ token
                const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                
                if (!userResponse.ok) {
                    throw new Error('Không thể lấy thông tin user');
                }
                
                const user = await userResponse.json();
                const customerId = user.customer_id || 1001;
                
                // Lấy dữ liệu customer thực từ backend
                const customerResponse = await fetch(`${API_BASE_URL}/customer/${customerId}`);
                if (!customerResponse.ok) {
                    throw new Error('Không thể lấy dữ liệu khách hàng');
                }
                
                const customerData = await customerResponse.json();
                
                // Lấy SVT tokens thực
                const tokensResponse = await fetch(`${API_BASE_URL}/api/tokens/${customerId}`);
                const tokensData = tokensResponse.ok ? await tokensResponse.json() : { total_svt: 0 };
                
                // Lấy NFT metadata
                const nftResponse = await fetch(`${API_BASE_URL}/api/nft/${customerId}`);
                const nftData = nftResponse.ok ? await nftResponse.json() : null;
                
                const realUserData = {
                    name: customerData.basic_info?.name || user.name,
                    memberTier: nftData?.metadata?.attributes?.find(attr => attr.trait_type === 'Level')?.value || "Bronze",
                    walletAddress: "0x" + customerId.toString().padStart(40, '0'),
                    sovicoTokens: tokensData.total_svt || 0,
                    services: {
                        vietjet: {
                            flights: customerData.vietjet_summary?.total_flights_last_year || 0,
                            miles: (customerData.vietjet_summary?.total_flights_last_year || 0) * 1500
                        },
                        hdbank: {
                            avg_balance: customerData.hdbank_summary?.average_balance || 0
                        },
                        resorts: {
                            nights_stayed: customerData.resort_summary?.total_nights_stayed || 0
                        }
                    },
                    transactions: tokensData.recent_transactions || [],
                    ai_input: {
                        age: customerData.basic_info?.age || 25,
                        avg_balance: customerData.hdbank_summary?.average_balance || 0,
                        total_flights: customerData.vietjet_summary?.total_flights_last_year || 0,
                        is_business_flyer: customerData.vietjet_summary?.is_business_flyer || false,
                        total_nights_stayed: customerData.resort_summary?.total_nights_stayed || 0,
                        total_resort_spending: customerData.resort_summary?.total_spending || 0
                    }
                };
                setUserData(realUserData);
                
                // Lấy AI recommendations từ backend
                const aiResponse = await fetch(`${API_BASE_URL}/customer/${customerId}/insights`);
                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    setRecommendations(aiData.recommendations || []);
                } else {
                    // Fallback nếu AI service không hoạt động
                    setRecommendations([{
                        offer_code: 'WELCOME',
                        title: 'Chào mừng!',
                        description: 'Khám phá các dịch vụ Sovico để tích lũy SVT'
                    }]);
                }
                
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu:", error);
                
                // Fallback data nếu có lỗi
                const fallbackData = {
                    name: "Khách hàng",
                    memberTier: "Bronze",
                    walletAddress: "0x0000000000000000000000000000000000000000",
                    sovicoTokens: 0,
                    services: {
                        vietjet: { flights: 0, miles: 0 },
                        hdbank: { avg_balance: 0 },
                        resorts: { nights_stayed: 0 }
                    },
                    transactions: [],
                    ai_input: {
                        age: 25,
                        avg_balance: 0,
                        total_flights: 0,
                        is_business_flyer: false,
                        total_nights_stayed: 0,
                        total_resort_spending: 0
                    }
                };
                setUserData(fallbackData);
                setRecommendations([{
                    offer_code: 'ERROR',
                    title: 'Không thể tải dữ liệu',
                    description: 'Vui lòng kiểm tra kết nối mạng và thử lại'
                }]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="bg-[#0D1117] min-h-screen flex items-center justify-center text-white">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="bg-[#0D1117] min-h-screen text-gray-200 font-sans">
            <header className="p-4 flex justify-between items-center bg-[#161B22]/80 backdrop-blur-sm sticky top-0 border-b border-gray-700">
                <div className="flex items-center">
                    <UserCircleIcon />
                    <div className="ml-3">
                        <p className="font-bold text-white">{userData.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{userData.walletAddress}</p>
                    </div>
                </div>
                <button onClick={() => onLogout(false)} className="text-sm bg-gray-700 hover:bg-red-600 px-3 py-1 rounded-md">Đăng xuất</button>
            </header>

            <main className="p-6 space-y-8">
                {/* --- Sovico Token Card --- */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white text-center shadow-lg">
                    <p className="text-sm opacity-80 font-semibold">SOVICO TOKEN (SVT)</p>
                    <p className="text-4xl font-bold mt-2">{userData.sovicoTokens.toLocaleString('vi-VN')}</p>
                    <button className="mt-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-semibold">Sử dụng Token</button>
                </div>

                {/* --- Tổng quan dịch vụ --- */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Dịch vụ của bạn</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ServiceCard icon={<PlaneIcon />} title="Vietjet Air" value={userData.services.vietjet.flights} unit="chuyến bay" />
                        <ServiceCard icon={<BankIcon />} title="HDBank" value={userData.services.hdbank.avg_balance} unit="đ" isCurrency />
                        <ServiceCard icon={<BuildingIcon />} title="Resorts" value={userData.services.resorts.nights_stayed} unit="đêm nghỉ" />
                    </div>
                </div>
                
                {/* --- Đề xuất từ AI --- */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Ưu đãi AI đề xuất</h2>
                    <div className="space-y-4">
                        {recommendations.map(rec => (
                            <RecommendationCard key={rec.offer_code} title={rec.title} description={rec.description} />
                        ))}
                    </div>
                </div>

                {/* --- Lịch sử giao dịch Blockchain --- */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Lịch sử Giao dịch Token</h2>
                    <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
                        <div className="space-y-3">
                            {userData.transactions.map(tx => (
                                <TransactionRow key={tx.txHash} tx={tx} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

type ServiceCardProps = {
    icon: React.ReactNode;
    title: string;
    value: number;
    unit: string;
    isCurrency?: boolean;
};

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, value, unit, isCurrency = false }) => (
    <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 flex items-center">
        {icon}
        <div className="ml-4">
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-lg font-bold text-white">
                {isCurrency ? Math.round(value / 1_000_000).toLocaleString('vi-VN') : value}
                <span className="text-sm font-normal text-gray-400 ml-1">{isCurrency ? "triệu" : unit}</span>
            </p>
        </div>
    </div>
);

const RecommendationCard = ({ title, description }) => (
    <div className="bg-gradient-to-r from-[#161B22] to-blue-900/30 border border-blue-700 rounded-lg p-5 flex justify-between items-center">
        <div>
            <h3 className="font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-300 mt-1">{description}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md text-sm whitespace-nowrap">
            Khám phá
        </button>
    </div>
);

const TransactionRow = ({ tx }) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800">
        <div className="flex items-center">
            <CubeIcon />
            <div>
                <p className="font-mono text-sm text-white">{tx.type}</p>
                <p className="font-mono text-xs text-gray-500">{tx.txHash}</p>
            </div>
        </div>
        <div>
            <p className={`font-mono text-sm font-bold ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{tx.amount}</p>
            <p className="text-xs text-gray-500 text-right">{tx.time}</p>
        </div>
    </div>
);

// =============================================================================
// COMPONENT APP CHÍNH
// =============================================================================
export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    if (!isLoggedIn) {
        return <LoginScreen onLogin={setIsLoggedIn} />;
    }

    return <CustomerDashboard onLogout={setIsLoggedIn} />;
}
