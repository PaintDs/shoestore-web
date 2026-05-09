import React, { useState } from 'react';
import { User, Package, MapPin, LogOut, ArrowLeft, CheckCircle, Clock, Truck } from 'lucide-react';

const UserProfile = ({ currentUser, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' hoặc 'info'

  // Giả lập dữ liệu lịch sử đơn hàng của khách
  const myOrders = [
    { id: "ORD-2026-001", date: "09/05/2026", total: "5.230.000đ", status: "shipping", items: ["Air Jordan 1 Retro High (Size 42)"] },
    { id: "ORD-2026-089", date: "15/04/2026", total: "3.400.000đ", status: "completed", items: ["Nike Pegasus 40 (Size 41)"] }
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'shipping': return <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><Truck className="w-4 h-4"/> Đang giao hàng</span>;
      case 'completed': return <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><CheckCircle className="w-4 h-4"/> Đã giao thành công</span>;
      default: return <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><Clock className="w-4 h-4"/> Chờ xử lý</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 font-medium mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Tiếp tục mua sắm
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Menu Cá nhân */}
          <div className="w-full md:w-72 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{currentUser?.name || 'Khách hàng'}</h2>
              <p className="text-gray-500 text-sm mt-1">{currentUser?.email || 'email@example.com'}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 p-4 font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}>
                <Package className="w-5 h-5" /> Quản lý đơn hàng
              </button>
              <button onClick={() => setActiveTab('info')} className={`w-full flex items-center gap-3 p-4 font-medium transition-colors ${activeTab === 'info' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}>
                <MapPin className="w-5 h-5" /> Sổ địa chỉ
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 font-medium text-red-500 hover:bg-red-50 transition-colors border-l-4 border-transparent">
                <LogOut className="w-5 h-5" /> Đăng xuất
              </button>
            </div>
          </div>

          {/* Nội dung chính */}
          <div className="flex-1">
            {activeTab === 'orders' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Đơn hàng của tôi</h2>
                <div className="space-y-6">
                  {myOrders.map((order, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                        <div>
                          <p className="font-bold text-gray-900">Mã đơn: <span className="text-blue-600">{order.id}</span></p>
                          <p className="text-sm text-gray-500 mt-1">Ngày đặt: {order.date}</p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-sm font-medium text-gray-700">
                            <span>1 x {item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Tổng tiền:</span>
                        <span className="text-xl font-black text-gray-900">{order.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Địa chỉ nhận hàng</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500 font-medium hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors">
                  + Thêm địa chỉ mới
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;