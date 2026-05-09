import React, { useState } from 'react';
import { Package, Search, Clock, CheckCircle, Truck, XCircle, ArrowLeft } from 'lucide-react';

// Dữ liệu giả lập các đơn hàng
const mockOrders = [
  { id: "ORD-2026-001", customer: "Nguyễn Văn A", total: "5.230.000đ", status: "pending", time: "10 phút trước", items: [{ name: "Air Jordan 1 Retro High", qty: 1, size: 42 }] },
  { id: "ORD-2026-002", customer: "Trần Thị B", total: "4.500.000đ", status: "shipping", time: "2 giờ trước", items: [{ name: "Adidas Ultraboost Light", qty: 1, size: 39 }] },
  { id: "ORD-2026-003", customer: "Lê Văn C", total: "8.600.000đ", status: "completed", time: "1 ngày trước", items: [{ name: "Air Jordan 1 Retro High", qty: 1, size: 41 }, { name: "Nike Pegasus 40", qty: 1, size: 40 }] },
];

const getStatusBadge = (status) => {
  switch(status) {
    case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Chờ xác nhận</span>;
    case 'shipping': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Truck className="w-3 h-3"/> Đang giao</span>;
    case 'completed': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Hoàn thành</span>;
    default: return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Đã hủy</span>;
  }
};

const OrderManagement = ({ onBack }) => {
  // Trạng thái lưu đơn hàng đang được chọn để xem chi tiết
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[0]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header của trang Admin */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-blue-400" /> Quản lý đơn hàng</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-blue-600 px-3 py-1.5 rounded-lg font-medium">Ca trực: Sáng</span>
          <span>Admin</span>
        </div>
      </header>

      {/* Cấu trúc Master-Detail */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL TRÁI: MASTER (Danh sách đơn hàng) */}
        <div className="w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-68px)]">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input type="text" placeholder="Tìm mã đơn, tên khách..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors" />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {mockOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${selectedOrder.id === order.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">{order.id}</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-sm text-gray-600 font-medium">{order.customer}</div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{order.time}</span>
                  <span className="font-bold text-gray-900 text-sm">{order.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL PHẢI: DETAIL (Chi tiết đơn hàng được chọn) */}
        <div className="hidden md:flex flex-1 bg-gray-50 p-6 overflow-y-auto h-[calc(100vh-68px)]">
          {selectedOrder ? (
            <div className="w-full max-w-3xl mx-auto space-y-6">
              {/* Card trạng thái */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">Đơn hàng {selectedOrder.id}</h2>
                  <p className="text-gray-500 text-sm">Đặt lúc: {selectedOrder.time}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">Xác nhận đơn</button>
                  <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors">Hủy</button>
                </div>
              </div>

              {/* Card sản phẩm */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-4 border-b pb-2">Sản phẩm yêu cầu</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">Size: {item.size} | Số lượng: {item.qty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="w-full flex items-center justify-center text-gray-400 font-medium">
              Vui lòng chọn một đơn hàng bên trái để xem chi tiết
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderManagement;