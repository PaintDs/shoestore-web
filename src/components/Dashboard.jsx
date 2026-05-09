import React from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Users, ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Dashboard = ({ onBack }) => {
  // Dữ liệu giả lập cho biểu đồ (chiều cao cột tính theo %)
  const chartData = [
    { day: 'T2', value: 40 }, { day: 'T3', value: 65 }, { day: 'T4', value: 45 },
    { day: 'T5', value: 80 }, { day: 'T6', value: 55 }, { day: 'T7', value: 95 }, { day: 'CN', value: 100 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-400" /> Báo cáo Doanh thu</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-purple-600 px-3 py-1.5 rounded-lg font-medium">Cửa hàng trưởng</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Hàng 1: Thẻ Thống kê Tổng quan (KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
                <p className="text-2xl font-black text-gray-900 mt-2">128.500.000đ</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><DollarSign className="w-6 h-6" /></div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-bold mr-2">+12.5%</span><span className="text-gray-400">so với tuần trước</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Đơn hàng thành công</p>
                <p className="text-2xl font-black text-gray-900 mt-2">342</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><ShoppingBag className="w-6 h-6" /></div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-bold mr-2">+5.2%</span><span className="text-gray-400">so với tuần trước</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Khách hàng mới</p>
                <p className="text-2xl font-black text-gray-900 mt-2">89</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600"><Users className="w-6 h-6" /></div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-500 font-bold mr-2">-1.5%</span><span className="text-gray-400">so với tuần trước</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Tỷ lệ chuyển đổi</p>
                <p className="text-2xl font-black text-gray-900 mt-2">3.8%</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600"><TrendingUp className="w-6 h-6" /></div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-bold mr-2">+0.4%</span><span className="text-gray-400">so với tuần trước</span>
            </div>
          </div>
        </div>

        {/* Hàng 2: Biểu đồ & Top Sản phẩm */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Biểu đồ CSS thuần */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Doanh thu 7 ngày qua</h3>
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-4 border-t border-gray-100">
              {chartData.map((data, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="w-full relative flex justify-center h-48 items-end">
                    <div 
                      className="w-full max-w-[40px] bg-blue-100 group-hover:bg-blue-600 rounded-t-lg transition-all duration-300 relative"
                      style={{ height: `${data.value}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded transition-opacity">
                        {data.value}tr
                      </span>
                    </div>
                  </div>
                  <span className="mt-4 text-sm font-medium text-gray-500">{data.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danh sách Top bán chạy */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Sản phẩm bán chạy</h3>
            <div className="space-y-5">
              {[
                { name: "Air Jordan 1 Retro", sales: 124, img: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=100&auto=format&fit=crop" },
                { name: "Nike Pegasus 40", sales: 98, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop" },
                { name: "Adidas Ultraboost", sales: 76, img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=100&auto=format&fit=crop" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <img src={item.img} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{item.sales} lượt mua</p>
                  </div>
                  <div className="font-black text-blue-600">#{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;