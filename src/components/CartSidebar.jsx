import React from 'react';
import { X, Plus, Minus, ArrowRight, Trash2 } from 'lucide-react';

const CartSidebar = ({ isOpen, onClose, onCheckout, cartItems, onUpdateQuantity, onRemoveItem }) => {
  // Hàm tính tổng tiền linh hoạt
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-[70] shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold">Giỏ hàng của bạn ({cartItems.length})</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p>Giỏ hàng đang trống</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-4">
                <img src={item.image} alt={item.name} className="w-24 h-24 rounded-xl object-cover border border-gray-100" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                    <p className="text-gray-500 text-sm mt-1">{item.category}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-600">{(item.price * item.quantity).toLocaleString()}đ</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg">
                        <button onClick={() => onUpdateQuantity(item.id, -1)} className="px-2 py-1 hover:bg-gray-100"><Minus className="w-4 h-4 text-gray-600"/></button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="px-2 py-1 hover:bg-gray-100"><Plus className="w-4 h-4 text-gray-600"/></button>
                      </div>
                      <button onClick={() => onRemoveItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 border-t bg-gray-50">
            <div className="flex justify-between mb-4">
              <span className="font-medium text-gray-600">Tổng cộng:</span>
              <span className="font-black text-xl text-gray-900">{totalPrice.toLocaleString()}đ</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-blue-200">
              Tiến hành thanh toán <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;