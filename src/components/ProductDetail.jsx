import React, { useState } from 'react';
import { ArrowLeft, Star, ShoppingCart, Heart, Truck, ShieldCheck, Undo } from 'lucide-react';

const ProductDetail = ({ product, onBack, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState(42);
  const [activeImage, setActiveImage] = useState(product?.image);

  // Giả lập thư viện ảnh cho sản phẩm
  const gallery = [
    product?.image,
    "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1925&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1974&auto=format&fit=crop"
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Nút quay lại */}
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 font-medium mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Quay lại BST Giày Mới
        </button>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cột trái: Thư viện Ảnh */}
          <div className="w-full lg:w-1/2 flex flex-col-reverse sm:flex-row gap-4">
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible w-full sm:w-20 shrink-0">
              {gallery.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(img)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-blue-600' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="w-full aspect-[4/5] sm:aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              <img src={activeImage} alt={product?.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Cột phải: Thông tin sản phẩm */}
          <div className="w-full lg:w-1/2">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{product?.category || 'Sneaker'}</span>
            <h1 className="text-4xl font-black text-gray-900 mt-2 mb-4 leading-tight">{product?.name || 'Tên sản phẩm'}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center text-yellow-400">
                <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current text-gray-300" />
              </div>
              <span className="text-gray-500 font-medium text-sm">(124 Đánh giá)</span>
            </div>

            <div className="text-3xl font-black text-gray-900 mb-8">{product?.price?.toLocaleString() || '0'}đ</div>

            {/* Chọn Size */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Chọn Kích cỡ (VN)</h3>
                <button className="text-blue-600 text-sm font-medium hover:underline">Hướng dẫn chọn size</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {[38, 39, 40, 41, 42, 43].map(size => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${selectedSize === size ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex gap-4 mb-10">
              <button 
                onClick={() => onAddToCart(product)} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1"
              >
                <ShoppingCart className="w-5 h-5" /> Thêm vào giỏ hàng
              </button>
              <button className="p-4 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Heart className="w-6 h-6" />
              </button>
            </div>

            {/* Chính sách */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-8">
              <div className="flex items-center gap-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-600"><Truck className="w-5 h-5" /></div><span className="font-medium text-sm text-gray-700">Miễn phí giao hàng</span></div>
              <div className="flex items-center gap-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-600"><Undo className="w-5 h-5" /></div><span className="font-medium text-sm text-gray-700">Đổi trả trong 30 ngày</span></div>
              <div className="flex items-center gap-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-600"><ShieldCheck className="w-5 h-5" /></div><span className="font-medium text-sm text-gray-700">Bảo hành chính hãng 1 năm</span></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;