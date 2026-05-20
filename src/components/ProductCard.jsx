import React from 'react';
import { ShoppingCart, Eye } from 'lucide-react';

// Nhận thêm prop onViewDetail
const ProductCard = ({ id, name, price, image, category, stock, onViewDetail, onAddToCart }) => {
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer" onClick={onViewDetail}>
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        <img 
          src={image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop"} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
          {/* Nút thêm giỏ hàng (ngăn sự kiện click lan ra ngoài thẻ card) */}
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToCart?.({ id, name, price, image, category, stock }); }} 
            className="p-3 bg-white rounded-full hover:bg-blue-600 hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
          <button className="p-3 bg-white rounded-full hover:bg-blue-600 hover:text-white transition-colors">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{category}</span>
        <h3 className="text-gray-900 font-bold mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-gray-900">{price.toLocaleString()}đ</span>
          <span className="text-xs text-gray-400 font-medium italic">Còn hàng</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;