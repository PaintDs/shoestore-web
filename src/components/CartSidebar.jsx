import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

const CartSidebar = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Giỏ hàng của bạn</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Danh sách sản phẩm */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="font-medium">Chưa có sản phẩm nào trong giỏ</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-xl" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                      <button 
                        onClick={() => {
                          if(window.confirm(`Bạn có chắc muốn xóa "${item.name}" khỏi giỏ hàng?`)) {
                            onRemoveItem(item.id, item.name);
                          }
                        }} 
                        className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {item.size && <p className="text-sm text-gray-500 mt-1 font-medium">Size: {item.size}</p>}
                    <p className="text-blue-600 font-bold mt-1">{item.price.toLocaleString()}đ</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item.stock)}
                        className="px-3 py-1 hover:bg-gray-200 text-gray-600 transition-colors"
                      ><Minus className="w-4 h-4" /></button>
                      
                      {/* Ô input cho phép khách gõ số (INT_CART_04, 05) */}
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => {
                          let val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 1) val = 1;
                          if (val > item.stock) {
                            alert(`Lỗi: Số lượng tối đa có thể mua là ${item.stock} (INT_CART_04)`);
                            val = item.stock;
                          }
                          onUpdateQuantity(item.id, val, item.stock);
                        }}
                        className="w-12 text-center bg-transparent font-bold text-gray-900 border-x border-gray-200 py-1 outline-none no-spinners"
                      />

                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.stock)}
                        className="px-3 py-1 hover:bg-gray-200 text-gray-600 transition-colors"
                      ><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Thanh toán */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-medium">Tổng thanh toán:</span>
              <span className="text-2xl font-black text-gray-900">{totalAmount.toLocaleString()}đ</span>
            </div>
            <button 
              onClick={onCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              Tiến hành thanh toán <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartSidebar;