import React from 'react';
import { ArrowLeft, CreditCard, Truck, ShieldCheck } from 'lucide-react';

const Checkout = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 font-medium mb-6 transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Quay lại cửa hàng
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cột trái: Form thông tin */}
          <div className="flex-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600"/> Thông tin giao hàng</h2>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Họ và tên" className="col-span-2 sm:col-span-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                <input type="text" placeholder="Số điện thoại" className="col-span-2 sm:col-span-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                <input type="text" placeholder="Địa chỉ chi tiết (Số nhà, tên đường...)" className="col-span-2 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600"/> Phương thức thanh toán</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-blue-600 bg-blue-50 rounded-xl cursor-pointer transition-colors">
                  <input type="radio" name="payment" className="w-4 h-4 text-blue-600 focus:ring-blue-500" defaultChecked />
                  <span className="ml-3 font-bold text-blue-900">Thanh toán khi nhận hàng (COD)</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <input type="radio" name="payment" className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-3 font-medium text-gray-700">Chuyển khoản / Ví điện tử</span>
                </label>
              </div>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng */}
          <div className="w-full lg:w-96">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-28">
              <h2 className="text-xl font-bold mb-6">Tóm tắt đơn hàng</h2>
              <div className="space-y-4 text-sm mb-6 border-b border-gray-100 pb-6">
                <div className="flex justify-between"><span className="text-gray-600">Tạm tính (1 sản phẩm)</span><span className="font-medium text-gray-900">5.200.000đ</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phí vận chuyển</span><span className="font-medium text-gray-900">30.000đ</span></div>
                <div className="flex justify-between items-center pt-2">
                  <input type="text" placeholder="Mã giảm giá" className="w-2/3 p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                  <button className="text-blue-600 font-bold text-sm hover:underline">Áp dụng</button>
                </div>
              </div>
              <div className="flex justify-between items-end mb-8">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-2xl font-black text-blue-600">5.230.000đ</span>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                <ShieldCheck className="w-5 h-5" /> Hoàn tất đặt hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;