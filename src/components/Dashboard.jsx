import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, ShoppingBag, Users, TrendingUp, TrendingDown, Package } from 'lucide-react';

const Dashboard = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0); // Placeholder for now
  const [topProducts, setTopProducts] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');

  const getDefaultDateValue = (type) => {
    const d = new Date();
    if (type === 'day') return d.toISOString().split('T')[0];
    if (type === 'month') return d.toISOString().slice(0, 7);
    if (type === 'year') return d.getFullYear().toString();
    return '';
  };

  useEffect(() => {
    setFilterValue(getDefaultDateValue(filterType));
  }, [filterType]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (filterType !== 'all' && !filterValue) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
        if (!token) {
          setError("Không tìm thấy token. Vui lòng đăng nhập lại.");
          setLoading(false);
          return;
        }
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const params = new URLSearchParams();
        params.append('filter_type', filterType);
        if (filterType !== 'all' && filterValue) {
          params.append('filter_value', filterValue);
        }

        // Fetch Performance Report
        const performanceRes = await fetch(`/api/reports/performance?${params.toString()}`, { headers });
        if (!performanceRes.ok) {
          throw new Error(`Lỗi khi lấy báo cáo hiệu suất: ${performanceRes.statusText}`);
        }
        const performanceData = await performanceRes.json();
        setTotalRevenue(performanceData.total_revenue);
        setTotalOrders(performanceData.total_orders);
        setNewCustomers(performanceData.new_customers ?? 0);

        // Fetch Top Products Report
        const topProductsParams = new URLSearchParams(params);
        topProductsParams.append('limit', '5');
        topProductsParams.append('sort_by', 'quantity');

        const topProductsRes = await fetch(`/api/reports/top-products?${topProductsParams.toString()}`, { headers });
        if (!topProductsRes.ok) {
          throw new Error(`Lỗi khi lấy top sản phẩm: ${topProductsRes.statusText}`);
        }
        const topProductsData = await topProductsRes.json();
        setTopProducts(topProductsData);
      } catch (err) {
        console.error("Lỗi Dashboard:", err);
        setError(err.message || "Không thể tải dữ liệu Dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filterType, filterValue]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-green-400" /> Báo cáo Hiệu suất Kinh doanh</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100 flex items-center gap-4 flex-wrap">
          <label className="font-bold text-gray-700 text-sm">Lọc theo:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="all">Toàn thời gian</option>
            <option value="day">Theo Ngày</option>
            <option value="month">Theo Tháng</option>
            <option value="year">Theo Năm</option>
          </select>
          {filterType === 'day' && (
            <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
          )}
          {filterType === 'month' && (
            <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
          )}
          {filterType === 'year' && (
            <input type="number" placeholder="YYYY" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="border border-gray-300 p-2 rounded-lg w-28 text-sm focus:ring-blue-500 focus:border-blue-500" />
          )}
        </div>

        {loading && (
          <div className="text-center py-10 text-gray-600">Đang tải dữ liệu...</div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Lỗi!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card Doanh thu */}
              <div className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-500">Tổng Doanh thu</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-400 opacity-70" />
              </div>

              {/* Card Đơn hàng */}
              <div className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-500">Tổng Đơn hàng</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{totalOrders}</p>
                </div>
                <ShoppingBag className="w-10 h-10 text-blue-400 opacity-70" />
              </div>

              {/* Card Khách hàng mới */}
              <div className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-500">Khách hàng mới</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{newCustomers}</p>
                </div>
                <Users className="w-10 h-10 text-purple-400 opacity-70" />
              </div>
            </div>

            {/* Top Sản phẩm bán chạy */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-500" /> Top Sản phẩm bán chạy
              </h2>
              {topProducts.length === 0 ? (
                <p className="text-gray-500">Chưa có dữ liệu sản phẩm bán chạy.</p>
              ) : (
                <ul className="space-y-3">
                  {topProducts.map((product, index) => (
                    <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-700">{index + 1}.</span>
                        <Package className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-800">{product.product_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Đã bán: <span className="font-bold">{product.quantity_sold}</span></p>
                        <p className="text-sm text-gray-600">Doanh thu: <span className="font-bold">{formatCurrency(product.total_revenue)}</span></p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;