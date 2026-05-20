import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, User, Heart, LogOut } from 'lucide-react';

const Header = ({ onCartClick, onLoginClick, currentUser, onLogout, onProfileClick, cartCount, onSearch }) => {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-black text-gray-900 tracking-tighter">SHOE<span className="text-blue-600">STORE.</span></span>
          </Link>

          {/* Thanh tìm kiếm hoạt động (Search Logic) */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none" 
                placeholder="Tìm tên giày, hãng giày (Nike, Adidas...)" 
                onChange={(e) => onSearch(e.target.value)} // Truyền giá trị gõ vào hàm onSearch
              />
              <Search className="absolute left-4 top-3 text-gray-400 w-4.5 h-4.5" />
            </div>
          </div>

          <div className="flex items-center space-x-5">
            <button className="text-gray-600 hover:text-blue-600 transition-colors relative"><Heart className="w-6 h-6" /></button>
            <button onClick={onCartClick} className="text-gray-600 hover:text-blue-600 transition-colors relative">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            {currentUser ? (
              <div className="flex items-center gap-4">
                <button onClick={onProfileClick} className="font-semibold text-sm text-blue-600 hover:underline">
                  Chào, {currentUser.name}
                </button>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5"/></button>
              </div>
            ) : (
              <button onClick={onLoginClick} className="flex items-center space-x-2 text-gray-900 font-semibold hover:text-blue-600 transition-colors">
                <User className="w-6 h-6" />
                <span className="hidden sm:block text-sm">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;