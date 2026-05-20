import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, PlusCircle, Package, History, Box, Truck, RefreshCw, AlertTriangle } from 'lucide-react'; // useWebSocket
const InventoryManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('inbound'); // 'inbound', 'outbound', 'inventory', 'count', 'returns'
  const [inboundHistory, setInboundHistory] = useState([]);
  const [countHistory, setCountHistory] = useState([]); // State mới cho lịch sử kiểm kê
  const [selectedProductIdCount, setSelectedProductIdCount] = useState(''); // State cho form kiểm kê
  const [actualQty, setActualQty] = useState(''); // State cho số lượng thực tế
  const [countReason, setCountReason] = useState(''); // State cho lý do kiểm kê
  const [pendingOrders, setPendingOrders] = useState([]); // State mới cho đơn hàng chờ xuất
  const [products, setProducts] = useState([]); // To populate product dropdown in inbound form
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(''); // State cho form nhập kho
  // Helper function for order ID formatting
  const formatOrderId = (id) => {
    return `ORD-2026-${id.toString().padStart(3, '0')}`;
  };

  // State for the inbound form
  const [inboundQuantity, setInboundQuantity] = useState('');

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    }
  };

  const fetchInboundHistory = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/warehouse/inbound/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log("=== DATA LỊCH SỬ TỪ BACKEND ===", data); // For debugging as requested
      setInboundHistory(data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử nhập kho:", error);
      alert("Không thể tải lịch sử nhập kho. Vui lòng thử lại.");
    }
  };

  const fetchReturnsHistory = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/warehouse/returns/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        // Nếu response không OK, ném lỗi để block catch xử lý, tránh set state bằng object lỗi
        const errorData = await response.json().catch(() => ({ detail: 'Lỗi không xác định từ server.' }));
        throw new Error(errorData.detail || 'Không thể tải lịch sử hàng hoàn.');
      }
      const data = await response.json();
      setReturnsHistory(data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử hàng hoàn:", error);
      setReturnsHistory([]); // Đảm bảo là mảng rỗng khi có lỗi để tránh crash
    }
  };

  // Hàm mới: Lấy lịch sử kiểm kê
  const fetchCountHistory = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/warehouse/inventory-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Lỗi không xác định từ server.' }));
        throw new Error(errorData.detail || 'Không thể tải lịch sử kiểm kê.');
      }
      const data = await response.json();
      setCountHistory(data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử kiểm kê:", error);
      setCountHistory([]); // Đảm bảo là mảng rỗng khi có lỗi
    }
  };

  // Hàm mới: Lấy danh sách đơn hàng chờ xuất kho
  const fetchPendingOrders = async () => {
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/orders?status=confirmed', { // Lấy các đơn hàng đã được xác nhận
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Lỗi không xác định từ server.' }));
        throw new Error(errorData.detail || 'Không thể tải danh sách đơn hàng chờ xuất.');
      }
      const data = await response.json();
      setPendingOrders(data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách đơn hàng chờ xuất:", error);
      setPendingOrders([]); // Đảm bảo là mảng rỗng khi có lỗi
    }
  };

  useEffect(() => {
    // Nạp dữ liệu lần đầu khi component mount hoặc khi chuyển tab
    fetchProducts(); // Luôn nạp lại sản phẩm vì tồn kho có thể thay đổi
    if (activeTab === 'inbound') {
      fetchInboundHistory();
    } else if (activeTab === 'outbound') {
      fetchPendingOrders();
    } else if (activeTab === 'count') {
      fetchCountHistory();
    } else if (activeTab === 'returns') {
      fetchReturnsHistory();
    }
  }, [activeTab]); // Chỉ phụ thuộc vào sự kiện chuyển activeTab

  // Logic cho nút "Xác nhận xuất kho"
  const handleConfirmOutbound = async (orderId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xác nhận xuất kho cho đơn hàng ${formatOrderId(orderId)}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      const response = await fetch(`/api/warehouse/outbound/order/${orderId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Xác nhận xuất kho thất bại.');
      alert(data.message);
      await fetchPendingOrders(); // Tải lại danh sách đơn hàng chờ xuất
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  // Logic cho việc thực hiện kiểm kê
  const handlePerformInventoryCount = async (e) => {
    e.preventDefault();
    if (!selectedProductIdCount || !actualQty || parseInt(actualQty) < 0) {
      alert("Vui lòng chọn sản phẩm và nhập số lượng thực tế hợp lệ.");
      return;
    }

    const productToCount = products.find(p => p.id.toString() === selectedProductIdCount);
    if (!productToCount) {
      alert("Sản phẩm được chọn không hợp lệ.");
      return;
    }

    // system_qty và difference sẽ được tính ở backend
    const actual_qty_int = parseInt(actualQty);

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      const response = await fetch('/api/warehouse/inventory-count', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: parseInt(selectedProductIdCount),
          actual_qty: actual_qty_int,
          reason: countReason.trim() || 'Không có lý do cụ thể'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Thực hiện kiểm kê thất bại.');
      }

      alert(data.message);
      setSelectedProductIdCount('');
      setActualQty('');
      setCountReason('');
      await fetchProducts(); // Cập nhật lại danh sách sản phẩm để hiển thị tồn kho mới
      await fetchCountHistory(); // Cập nhật lại lịch sử kiểm kê
    } catch (error) {
      console.error("Lỗi khi thực hiện kiểm kê:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  // Hàm mới: Xử lý hàng hoàn (Nhập lại kho)
  const handleProcessReturn = async (item) => {
    if (!window.confirm(`Bạn có chắc chắn muốn nhập lại kho sản phẩm "${item.product_name}" (Số lượng: ${item.quantity})?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      // Payload cho POST /api/warehouse/returns
      // Giả định 'Nhập lại kho' có nghĩa là hàng tốt và cần cộng lại tồn kho
      const payload = {
        product_id: item.product_id,
        quantity: item.quantity,
        reason: 'good' // Lý do 'good' sẽ khiến backend cộng lại tồn kho
      };

      const response = await fetch('/api/warehouse/returns', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Xử lý hàng hoàn thất bại.');
      alert(data.message);
      fetchReturnsHistory(); // Gọi lại hàm lấy lịch sử để cập nhật UI
    } catch (error) {
      console.error("Lỗi khi xử lý hàng hoàn:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleCreateInboundSlip = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !inboundQuantity || inboundQuantity <= 0) {
      alert("Vui lòng chọn sản phẩm và nhập số lượng hợp lệ.");
      return;
    }

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập lại để thực hiện hành động này.");
        return;
      }

      const response = await fetch('/api/warehouse/inbound', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: parseInt(selectedProductId),
          quantity: parseInt(inboundQuantity)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể tạo phiếu nhập kho.');
      }

      alert(data.message);
      setSelectedProductId(''); // Reset state cho form nhập kho
      setInboundQuantity('');
      await fetchInboundHistory(); // Re-fetch history to update the table
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error);
      alert(`Lỗi: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Box className="w-6 h-6 text-orange-400" /> Quản lý Kho</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-orange-600 px-3 py-1.5 rounded-lg font-medium">Ca trực: Kho</span>
          <span>Admin</span>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start h-12">
            <button
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'inbound' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('inbound')}
            >
              <Package className="w-4 h-4 mr-2" /> Nhập kho
            </button>
            <button
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'outbound' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('outbound')}
            >
              <Truck className="w-4 h-4 mr-2" /> Xuất kho
            </button>
            <button
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'inventory' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Box className="w-4 h-4 mr-2" /> Hàng hóa & Vị trí
            </button>
            <button
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'count' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('count')}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Kiểm kê
            </button>
            <button
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'returns' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('returns')}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Hàng hoàn
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'inbound' && (
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" /> Lập phiếu nhập kho
            </h2>

            {/* Form Lập phiếu nhập kho */}
            <form onSubmit={handleCreateInboundSlip} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
                <select
                  id="product"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)} // Sử dụng state chính xác
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name} (Tồn: {product.stock})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Số lượng nhập</label>
                <input
                  type="number"
                  id="quantity"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  value={inboundQuantity}
                  onChange={(e) => setInboundQuantity(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <PlusCircle className="w-5 h-5 mr-2" /> Xác nhận nhập
                </button>
              </div>
            </form>

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-6 h-6 text-orange-500" /> Lịch sử Nhập kho
            </h2>

            {/* Bảng Lịch sử Nhập kho */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng nhập</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày giờ nhập</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(inboundHistory) && inboundHistory.length > 0 ? (
                    inboundHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">WHIN-{item.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name || 'Sản phẩm không tồn tại'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="text-center py-4 text-gray-500">Không có lịch sử nhập kho</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'outbound' && (
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Truck className="w-6 h-6 text-orange-500" /> Đơn hàng chờ xuất kho
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Đơn Hàng</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Tiền</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Tạo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(pendingOrders) && pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatOrderId(order.id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total_amount.toLocaleString()}đ</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleConfirmOutbound(order.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            Xác nhận xuất kho
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-gray-500">Không có đơn hàng chờ xuất kho.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Hàng hóa & Vị trí</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vị trí (Bin)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(products) && products.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input 
                        type="text" 
                        defaultValue={item.bin || ''} 
                        className="border rounded px-2 py-1 w-24 text-sm"
                        placeholder="Chưa gán"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'count' && (
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-orange-500" /> Thực hiện Kiểm kê Kho
            </h2>

            <form onSubmit={handlePerformInventoryCount} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <label htmlFor="productToCount" className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm kiểm kê</label>
                <select
                  id="productToCount"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                  value={selectedProductIdCount}
                  onChange={(e) => setSelectedProductIdCount(e.target.value)}
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {Array.isArray(products) && products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Tồn hệ thống: {product.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="actualQuantity" className="block text-sm font-medium text-gray-700 mb-1">Số lượng thực tế</label>
                <input
                  type="number"
                  id="actualQuantity"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="countReason" className="block text-sm font-medium text-gray-700 mb-1">Lý do chênh lệch (nếu có)</label>
                <textarea
                  id="countReason"
                  rows="2"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  value={countReason}
                  onChange={(e) => setCountReason(e.target.value)}
                  placeholder="Ví dụ: Hàng hỏng, mất mát, nhập sai..."
                ></textarea>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <RefreshCw className="w-5 h-5 mr-2" /> Xác nhận kiểm kê
                </button>
              </div>
            </form>

            <h3 className="text-xl font-bold text-gray-800 mb-4 mt-8 flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" /> Lịch sử Kiểm kê
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Phiếu</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Sản Phẩm</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Hệ Thống</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Thực Tế</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chênh Lệch</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý Do</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Kiểm Kê</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(countHistory) && countHistory.length > 0 ? (
                    countHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">WHIC-{item.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name || 'Sản phẩm không tồn tại'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.system_qty}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.actual_qty}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.difference < 0 ? 'text-red-600' : (item.difference > 0 ? 'text-green-600' : 'text-gray-500')}`}>
                          {item.difference}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reason || 'Không có'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-gray-500">Chưa có lịch sử kiểm kê nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Hàng hoàn</h2>
            {/* Bảng Lịch sử Hàng hoàn */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày hoàn</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(returnsHistory) && returnsHistory.length > 0 ? (
                    returnsHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">WHRT-{item.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name || 'Sản phẩm không tồn tại'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reason || 'Không rõ'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {item.reason !== 'good' && ( // Chỉ hiển thị nút nếu lý do không phải là 'good'
                            <button
                              onClick={() => handleProcessReturn(item)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Nhập lại kho
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="text-center py-4 text-gray-500">Không có lịch sử hàng hoàn</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;