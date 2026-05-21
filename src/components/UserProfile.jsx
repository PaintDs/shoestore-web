import React, { useState, useEffect } from 'react';
import { User, Package, MapPin, LogOut, ArrowLeft, CheckCircle, Clock, Truck, Star, Send, RotateCcw } from 'lucide-react';

const UserProfile = ({ currentUser, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orderTab, setOrderTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState(null);

  // State for feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentProductToReview, setCurrentProductToReview] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });

  const fetchUserOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const statusQuery = orderTab !== 'all' ? `?status=${orderTab}` : '';
      const response = await fetch(`/api/user/orders${statusQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Không thể tải lịch sử đơn hàng.');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, [currentUser, orderTab]);

  const handleViewOrderDetail = async (orderId) => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/user/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Không tải được chi tiết đơn.');
      setSelectedOrder(await response.json());
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) {
      alert('INT_ORDER_03: Vui lòng nhập lý do hủy đơn.');
      return;
    }
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/user/orders/${orderToCancel.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Hủy đơn thất bại.');
      alert(data.message);
      setOrderToCancel(null);
      setCancelReason('');
      fetchUserOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmReceived = async (orderId) => {
    if (!window.confirm('Xác nhận bạn đã nhận được hàng cho đơn hàng này?')) return;
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/sales/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Xác nhận nhận hàng thất bại.');
      alert(data.message);
      fetchUserOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRequestReturn = async (orderId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gửi yêu cầu hoàn trả cho đơn hàng ORD-${String(orderId).padStart(4, '0')}? Nhân viên sẽ liên hệ với bạn để xác nhận.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/user/orders/${orderId}/request-return`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Gửi yêu cầu hoàn hàng thất bại.');
        }

        alert(data.message);
        // Tải lại danh sách đơn hàng để cập nhật trạng thái mới
        fetchUserOrders();
    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    }
  };

  const handleOpenFeedbackModal = (product) => {
    setCurrentProductToReview(product);
    setFeedbackForm({ rating: 5, comment: '' });
    setShowFeedbackModal(true);
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!currentProductToReview) return;

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const payload = {
        product_id: currentProductToReview.product_id,
        customer_name: currentUser?.name || 'Khách hàng thấu đáo',
        rating: parseInt(feedbackForm.rating, 10),
        comment: feedbackForm.comment
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Gửi phản hồi thất bại.');

      alert('Cảm ơn bạn đã đánh giá!');
      setShowFeedbackModal(false);
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'shipping': return <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><Truck className="w-4 h-4"/> Đang giao hàng</span>;
      case 'completed': return <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><CheckCircle className="w-4 h-4"/> Đã giao thành công</span>;
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><Clock className="w-4 h-4"/> Chờ xác nhận</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1">Đã hủy</span>;
      case 'pending_return': return <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><RotateCcw className="w-4 h-4"/> Chờ xử lý hoàn</span>;
      case 'returned_received': return <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1"><CheckCircle className="w-4 h-4"/> Đã nhận hàng hoàn</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-bold flex items-center w-fit gap-1">{status}</span>;
    }
  };

  const ORDER_TABS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'completed', label: 'Đã giao' },
    { id: 'cancelled', label: 'Đã hủy' },
    { id: 'returns', label: 'Đổi/Trả' },
  ];

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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Đơn hàng của tôi</h2>
                <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
                  {ORDER_TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold ${orderTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-6">
                  {loading ? (
                    <p className="text-center text-gray-500">Đang tải lịch sử đơn hàng...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-center text-gray-500">Bạn chưa có đơn hàng nào.</p>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                          <div>
                            <p className="font-bold text-gray-900">
                              Mã đơn:{' '}
                              <button type="button" onClick={() => handleViewOrderDetail(order.id)} className="text-blue-600 hover:underline">
                                ORD-{String(order.id).padStart(4, '0')}
                              </button>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Ngày đặt: {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="space-y-3">
                          {order.items && order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">{item.quantity} x {item.product_name}</span>
                              {order.status === 'completed' && (
                                <button onClick={() => handleOpenFeedbackModal(item)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full transition-colors">Đánh giá</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center flex-wrap gap-2">
                          <span className="text-gray-500 font-medium">Tổng tiền:</span>
                          <span className="text-xl font-black text-gray-900">{order.total_amount.toLocaleString('vi-VN')}đ</span>
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setOrderToCancel(order)}
                              className="text-sm text-red-600 font-bold hover:underline"
                            >
                              Hủy đơn hàng
                            </button>
                          )}
                          {order.status === 'shipping' && (
                            <button
                              type="button"
                              onClick={() => handleConfirmReceived(order.id)}
                              className="text-sm text-green-600 bg-green-100 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200"
                            >
                              Đã nhận được hàng
                            </button>
                          )}
                          {order.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleRequestReturn(order.id)}
                              className="text-sm text-red-600 bg-red-100 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200 flex items-center gap-1"
                            >
                              <RotateCcw size={14}/>
                              Yêu cầu hoàn hàng
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Chi tiết đơn ORD-{String(selectedOrder.id).padStart(4, '0')}</h2>
            <p className="text-sm text-gray-500 mb-2">Trạng thái: {selectedOrder.status}</p>
            <ul className="space-y-2 mb-4">
              {selectedOrder.items?.map((item, i) => (
                <li key={i} className="text-sm border-b pb-2">{item.quantity} x {item.product_name}</li>
              ))}
            </ul>
            <p className="font-bold">Tổng: {selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</p>
            <button type="button" onClick={() => setSelectedOrder(null)} className="mt-4 w-full py-2 border rounded-xl font-bold">Đóng</button>
          </div>
        </div>
      )}

      {orderToCancel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Hủy đơn ORD-{String(orderToCancel.id).padStart(4, '0')}</h2>
            <textarea
              rows={3}
              className="w-full border p-3 rounded-xl mb-4"
              placeholder="Nhập lý do hủy (bắt buộc)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setOrderToCancel(null); setCancelReason(''); }} className="flex-1 py-2 border rounded-xl font-bold">Không</button>
              <button type="button" onClick={handleCancelOrder} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Đánh giá sản phẩm</h2>
            <p className="font-medium text-gray-800 mb-4">{currentProductToReview?.product_name}</p>
            <form onSubmit={handleSendFeedback}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Bạn cảm thấy thế nào về sản phẩm?</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-8 h-8 cursor-pointer transition-colors ${feedbackForm.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Bình luận của bạn:</label>
                <textarea
                  rows="4"
                  className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500"
                  value={feedbackForm.comment}
                  onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                  placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2">
                  <Send className="w-4 h-4" /> Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
