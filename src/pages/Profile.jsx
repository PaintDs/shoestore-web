import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, Truck, CheckCircle, XCircle, Star } from 'lucide-react';

// Helper functions (can be moved to a utils file)
const formatOrderId = (id) => `ORD-${String(id).padStart(4, '0')}`;
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const TABS = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const Profile = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserOrders = async (status) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error("Bạn chưa đăng nhập.");
      }
      const response = await fetch(`/api/user/orders?status=${status}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Không thể tải danh sách đơn hàng.');
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrders(activeTab);
  }, [activeTab]);

  const handleCancelOrder = async (orderId) => {
    const reason = prompt("Vui lòng nhập lý do bạn muốn hủy đơn hàng này:");
    if (!reason || !reason.trim()) {
      alert("Bạn cần nhập lý do để hủy đơn.");
      return;
    }

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/user/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Hủy đơn hàng thất bại.');
      }
      alert(data.message);
      // Refresh the list
      fetchUserOrders(activeTab);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const renderOrderCard = (order) => (
    <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-gray-800">Đơn hàng {formatOrderId(order.id)}</h3>
        <span className="text-sm text-gray-500">Ngày đặt: {new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
      </div>
      <div className="p-4">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center justify-between mb-2">
            <p className="text-gray-700">{item.product_name}</p>
            <p className="text-sm text-gray-500">x{item.quantity}</p>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <div className="font-bold text-lg text-red-600">Tổng tiền: {formatCurrency(order.total_amount)}</div>
        <div>
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              Hủy đơn
            </button>
          )}
          {order.status === 'completed' && (
             <button className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-500 transition-colors flex items-center gap-1">
                <Star className="w-4 h-4" /> Đánh giá
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Đơn hàng của tôi</h1>
        
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {loading && <p className="text-center text-gray-500">Đang tải đơn hàng...</p>}
          {error && <p className="text-center text-red-500">Lỗi: {error}</p>}
          {!loading && !error && orders.length > 0 && orders.map(renderOrderCard)}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có đơn hàng</h3>
              <p className="mt-1 text-sm text-gray-500">Bạn chưa có đơn hàng nào trong mục này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;