import React, { useState, useEffect } from 'react';
import { Package, Search, Clock, CheckCircle, Truck, XCircle, ArrowLeft, PlusCircle, ShoppingBag, AlertTriangle } from 'lucide-react';

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000) + 7 * 3600; // Bù giờ UTC+7

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return Math.floor(seconds) + " giây trước";
};

// Sửa lại định dạng mã đơn hàng
const formatOrderId = (id) => {
    return `ORD-${String(id).padStart(4, '0')}`;
}

const getStatusBadge = (status) => {
  switch(status) {
    case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Chờ xác nhận</span>;
    case 'confirmed': return <span className="bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Đã xác nhận</span>;
    case 'shipping': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Truck className="w-3 h-3"/> Đang giao</span>;
    case 'completed': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Hoàn thành</span>;
    default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Đã hủy</span>;
  }
};

const OrderManagement = ({ onBack }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        console.error("Admin token not found!");
        return;
      }
      // Lấy các đơn hàng đang chờ xử lý
      const response = await fetch('/api/orders?status=pending,confirmed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log("Admin Orders Data:", data); // IN LOG ĐỂ THEO DÕI
      setOrders(data);
    } catch (error) { console.error("Lỗi khi lấy danh sách đơn hàng:", error); }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus, originalStatus) => {
    let reason = null;
    let bodyPayload = { status: newStatus };

    // Admin chủ động hủy đơn 'pending'
    if (newStatus === 'cancelled' && originalStatus === 'pending') {
      reason = prompt("Vui lòng nhập lý do hủy đơn hàng này:");
      if (!reason || !reason.trim()) {
        alert("Phải có lý do mới được hủy đơn!");
        return;
      }
      bodyPayload.reason = reason;
    }
    // Các trường hợp khác (vd: xác nhận đơn 'pending')
    else {
      if (!window.confirm(`Bạn có chắc muốn ${newStatus === 'confirmed' ? 'xác nhận' : 'cập nhật'} đơn hàng này?`)) {
        return;
      }
    }
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      const response = await fetch(`/api/sales/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Cập nhật trạng thái thất bại.');

      alert(data.message);
      await fetchOrders(); // Tải lại danh sách đơn
      setSelectedOrder(null); // Bỏ chọn đơn hàng đã xử lý
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleCreateMockOrder = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      const response = await fetch('/api/sales/orders/mock-online', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Tạo đơn demo thất bại.');
      }

      alert(data.message); // Hiển thị thông báo thành công từ backend
      await fetchOrders();
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng demo:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-blue-400" /> Quản lý đơn hàng</h1>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={handleCreateMockOrder} className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                Tạo đơn Online Demo
            </button>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-blue-600 px-3 py-1.5 rounded-lg font-medium">Ca trực: Sáng</span>
              <span>Admin</span>
            </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        <div className="w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-68px)]">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input type="text" placeholder="Tìm mã đơn, tên khách..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors" />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto" >
            {orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">{formatOrderId(order.id)}</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-sm text-gray-600 font-medium">{order.customer_name}</div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{formatTimeAgo(order.created_at)}</span>
                  <span className="font-bold text-gray-900 text-sm">{order.total_amount.toLocaleString()}đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:flex flex-1 bg-gray-50 p-6 overflow-y-auto h-[calc(100vh-68px)]">
          {selectedOrder ? (
            <div className="w-full max-w-3xl mx-auto space-y-6">
              {/* Card trạng thái */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">Đơn hàng {formatOrderId(selectedOrder.id)}</h2>
                  <p className="text-gray-500 text-sm">Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed', selectedOrder.status)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">Xác nhận đơn</button>
                      <button onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', selectedOrder.status)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors">Hủy</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card thông tin khách hàng (nếu cần) */}

              {/* Card chi tiết sản phẩm */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-4 border-b pb-3 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-gray-500"/> Chi tiết sản phẩm</h3>
                <div className="space-y-4">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                      </div>
                      {/* Có thể thêm giá sản phẩm ở đây nếu cần */}
                    </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Không có chi tiết sản phẩm cho đơn hàng này.</p>
                  )}
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