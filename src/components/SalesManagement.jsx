import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, ShoppingCart, ListOrdered, Plus, UserPlus, Search, CheckCircle, XCircle, X, Trash2, Edit } from 'lucide-react';

const SalesManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('pos');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);

  // POS states
  const [posCart, setPosCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '' });

  // Modal states for editing
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [customerEditForm, setCustomerEditForm] = useState({ rank: 'Normal', loyalty_points: 0 });
  const [showOrderEditModal, setShowOrderEditModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderEditForm, setOrderEditForm] = useState({ customer_name: '' });

  const fetchApi = useCallback(async (url, options = {}) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'customers') {
      fetchApi('/api/sales/customers').then(data => data && setCustomers(data));
    } else if (activeTab === 'pos') {
      fetchApi('/api/products').then(data => data && setProducts(data.filter(p => p.stock > 0)));
      fetchApi('/api/sales/customers').then(data => data && setCustomers(data));
    } else if (activeTab === 'orders') {
      fetchApi('/api/orders?status=pending').then(data => data && setOnlineOrders(data));
    }
  }, [activeTab, token, fetchApi]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const result = await fetchApi('/api/sales/customers', { method: 'POST', body: JSON.stringify(newCustomerForm) });
    if (result) {
      alert(result.message);
      setShowCustomerModal(false);
      setNewCustomerForm({ name: '', phone: '' });
      fetchApi('/api/sales/customers').then(data => data && setCustomers(data));
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const payload = {
      ...customerEditForm,
      loyalty_points: parseInt(customerEditForm.loyalty_points, 10)
    };
    if (isNaN(payload.loyalty_points)) {
      alert("Điểm tích lũy phải là một con số.");
      return;
    }
    const result = await fetchApi(`/api/sales/customers/${currentCustomer.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    if (result) {
      alert(result.message);
      setShowCustomerEditModal(false);
      fetchApi('/api/sales/customers').then(data => data && setCustomers(data));
    }
  };

  const handleAddToPosCart = (product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleCreateSaleOrder = async () => {
    if (posCart.length === 0) return alert("Vui lòng thêm sản phẩm vào đơn hàng.");
    if (!selectedCustomer) return alert("Vui lòng chọn khách hàng.");

    const orderPayload = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      order_type: 'at-store',
      items: posCart.map(item => ({ product_id: item.id, quantity: item.quantity })),
    };

    const result = await fetchApi('/api/sales/orders', { method: 'POST', body: JSON.stringify(orderPayload) });
    if (result) {
      alert(`${result.message} (ID: ${result.order_id})`);
      setPosCart([]);
      setSelectedCustomer(null);
      // Refresh product stock
      fetchApi('/api/products').then(data => data && setProducts(data.filter(p => p.stock > 0)));
    }
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;
    const result = await fetchApi(`/api/sales/orders/${currentOrder.id}/update`, { method: 'PUT', body: JSON.stringify(orderEditForm) });
    if (result) {
      alert(result.message);
      setShowOrderEditModal(false);
      fetchApi('/api/orders?status=pending').then(data => data && setOnlineOrders(data));
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const result = await fetchApi(`/api/sales/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    if (result) {
      alert(result.message);
      fetchApi('/api/orders?status=pending').then(data => data && setOnlineOrders(data));
    }
  };

    const handleRemoveFromPosCart = (productId) => {
      setPosCart(prev => prev.filter(item => item.id !== productId));
    };

  const totalAmount = posCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = selectedCustomer?.rank === 'VIP' ? totalAmount * 0.95 : totalAmount;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-cyan-400" /> Bán hàng & CSKH</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex gap-4 mb-6 border-b pb-4">
          <button onClick={() => setActiveTab('pos')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${activeTab === 'pos' ? 'bg-cyan-600 text-white' : 'bg-white'}`}>Tạo đơn tại quầy (POS)</button>
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${activeTab === 'orders' ? 'bg-cyan-600 text-white' : 'bg-white'}`}>Duyệt đơn Online</button>
          <button onClick={() => setActiveTab('customers')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${activeTab === 'customers' ? 'bg-cyan-600 text-white' : 'bg-white'}`}>Quản lý Khách hàng</button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

        {activeTab === 'customers' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Danh sách Khách hàng</h2>
              <button onClick={() => setShowCustomerModal(true)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><UserPlus /> Thêm thành viên</button>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th>ID</th>
                  <th>Tên</th>
                  <th>SĐT</th>
                  <th>Hạng</th>
                  <th>Điểm</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} className="border-b">
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>
                      <span className={c.rank === 'VIP' ? 'text-yellow-500 font-bold' : ''}>
                        {c.rank}
                      </span>
                    </td>
                    <td>{c.loyalty_points}</td>
                    <td>
                      <button onClick={() => { setCurrentCustomer(c); setCustomerEditForm({ rank: c.rank, loyalty_points: c.loyalty_points }); setShowCustomerEditModal(true); }} className="text-blue-600 font-bold flex items-center gap-1">
                        <Edit size={16}/> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">Chọn sản phẩm</h2>
              <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {products.map(p => (
                  <div key={p.id} onClick={() => handleAddToPosCart(p)} className="border rounded-lg p-3 cursor-pointer hover:border-cyan-500">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-sm text-gray-600">{p.price.toLocaleString()}đ</p>
                    <p className="text-xs text-gray-400">Tồn: {p.stock}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">Đơn hàng</h2>
              <div className="mb-4">
                <label className="font-semibold">Khách hàng:</label>
                <select onChange={(e) => setSelectedCustomer(customers.find(c => c.id === parseInt(e.target.value)))} className="w-full border p-2 rounded-lg mt-1">
                  <option>-- Chọn khách hàng --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.rank})</option>)}
                </select>
              </div>
              <div className="space-y-2 mb-4 max-h-[30vh] overflow-y-auto">
                {posCart.map(item => (
                  <div key={item.id} className="flex justify-between items-center group pr-2">
                    <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 text-sm"> x{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{(item.price * item.quantity).toLocaleString()}đ</span>
                        <button onClick={() => handleRemoveFromPosCart(item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                    </div>
                </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-semibold"><span>Tổng tiền</span><span>{totalAmount.toLocaleString()}đ</span></div>
                {selectedCustomer?.rank === 'VIP' && <div className="flex justify-between text-yellow-600"><span>Ưu đãi VIP (-5%)</span><span>-{(totalAmount * 0.05).toLocaleString()}đ</span></div>}
                <div className="flex justify-between font-bold text-xl text-cyan-600"><span>Thành tiền</span><span>{finalAmount.toLocaleString()}đ</span></div>
              </div>
              <button onClick={handleCreateSaleOrder} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg mt-4">Tạo đơn hàng</button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
           <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Đơn hàng Online chờ duyệt</h2>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50"><th>ID Đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
              <tbody>
                {onlineOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td><td>{o.customer_name}</td><td>{o.total_amount.toLocaleString()}đ</td><td>{new Date(o.created_at).toLocaleString()}</td>
                    <td className="flex gap-2">
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'confirmed')} className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Xác nhận</button>
                      <button onClick={() => { setCurrentOrder(o); setOrderEditForm({ customer_name: o.customer_name }); setShowOrderEditModal(true); }} className="text-blue-600 font-bold flex items-center gap-1"><Edit size={16}/> Sửa đơn</button>
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')} className="text-red-600 font-bold flex items-center gap-1"><XCircle size={16}/> Hủy đơn</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Thêm khách hàng mới</h2>
              <button onClick={() => setShowCustomerModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              {error && <p className="text-red-500">{error}</p>}
              <div>
                <label>Tên khách hàng</label>
                <input required value={newCustomerForm.name} onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label>Số điện thoại</label>
                <input required value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg">Lưu khách hàng</button>
            </form>
          </div>
        </div>
      )}

      {showCustomerEditModal && currentCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Sửa thông tin: {currentCustomer.name}</h2>
              <button onClick={() => setShowCustomerEditModal(false)}><X /></button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              {error && <p className="text-red-500">{error}</p>}
              <div>
                <label>Hạng thành viên</label>
                <select value={customerEditForm.rank} onChange={e => setCustomerEditForm({...customerEditForm, rank: e.target.value})} className="w-full border p-2 rounded-lg">
                  <option value="Normal">Normal</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label>Điểm tích lũy</label>
                <input type="number" value={customerEditForm.loyalty_points} onChange={e => setCustomerEditForm({...customerEditForm, loyalty_points: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg">Lưu thay đổi</button>
            </form>
          </div>
        </div>
      )}

      {showOrderEditModal && currentOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Sửa đơn hàng: {currentOrder.id}</h2>
              <button onClick={() => setShowOrderEditModal(false)}><X /></button>
            </div>
            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div><label>Tên khách hàng</label><input value={orderEditForm.customer_name} onChange={e => setOrderEditForm({...orderEditForm, customer_name: e.target.value})} className="w-full border p-2 rounded-lg" /></div>
              <p className="text-xs text-gray-400">Lưu ý: Chỉnh sửa SĐT và Địa chỉ cần nâng cấp cơ sở dữ liệu.</p>
              <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg">Lưu thay đổi</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;