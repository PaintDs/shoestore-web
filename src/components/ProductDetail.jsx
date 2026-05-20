import React, { useState } from 'react';
import { ArrowLeft, ShoppingCart, AlertCircle, Check } from 'lucide-react';

const ProductDetail = ({ product, onBack, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const sizes = [38, 39, 40, 41, 42, 43];

  const handleAddToCart = () => {
    // Kịch bản INT_CART_02: Sản phẩm hết hàng
    if (product.stock <= 0) {
      setError('Sản phẩm này hiện đang hết hàng không thể thêm vào giỏ!');
      return;
    }
    // Kịch bản TC_KVL_06: Chưa chọn Size
    if (!selectedSize) {
      setError('Vui lòng chọn kích cỡ trước khi thêm vào giỏ hàng!');
      return;
    }
    
    // Kịch bản TC_KVL_07: Thêm thành công
    setError('');
    onAddToCart({ ...product, size: selectedSize }); // Truyền cả size vào giỏ
    
    // Hiển thị thông báo thành công xíu rồi tắt
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 mb-8 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại cửa hàng
      </button>

      <div className="flex flex-col md:flex-row gap-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-full md:w-1/2">
          <img src={product.image} alt={product.name} className="w-full h-[500px] object-cover rounded-2xl shadow-md" />
        </div>
        
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-2 text-sm font-bold text-blue-600 uppercase tracking-wider">{product.category}</div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">{product.name}</h1>
          <p className="text-3xl font-bold text-red-600 mb-8">{product.price.toLocaleString()}đ</p>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Chọn kích cỡ (EU)</h3>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {sizes.map(size => (
                <button 
                  key={size} 
                  onClick={() => { setSelectedSize(size); setError(''); }}
                  className={`py-3 rounded-xl font-bold text-lg transition-all border-2 
                    ${selectedSize === size 
                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Cảnh báo lỗi TC_KVL_06 */}
            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg font-medium animate-pulse">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            )}
          </div>

          <button 
            onClick={handleAddToCart}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
              ${showSuccess 
                ? 'bg-green-500 text-white shadow-lg shadow-green-200' 
                : 'bg-gray-900 hover:bg-gray-800 text-white shadow-xl shadow-gray-200'}`}
          >
            {showSuccess ? <><Check className="w-6 h-6"/> Đã thêm vào giỏ</> : <><ShoppingCart className="w-6 h-6"/> Thêm vào giỏ hàng</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;