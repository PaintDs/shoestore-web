import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Server } from 'lucide-react';
import Header from '../components/Header.jsx';
import CartSidebar from '../components/CartSidebar.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { roleHasAccess, clearAuthTokens } from '../lib/auth.js';
import { fetchCurrentUser } from '../lib/api.js';

export default function AppLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearAuthTokens();
  }, []);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
      else clearAuthTokens();
    });
  }, []);

  useEffect(() => {
    fetch('/api/products?status=active')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setProducts)
      .catch((err) => console.error('Lỗi khi kết nối Backend:', err));
  }, []);

  const userRole = currentUser?.role || 'guest';
  const hasAccess = (module) => roleHasAccess(userRole, module);

  const filteredProducts = (Array.isArray(products) ? products : []).filter((product) => {
    const safeSearchQuery = (searchQuery || '').toLowerCase();
    const safeName = (product.name || '').toLowerCase();
    const safeCategory = (product.category || '').toLowerCase();
    return safeName.includes(safeSearchQuery) || safeCategory.includes(safeSearchQuery);
  });

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('Rất tiếc, sản phẩm này hiện đã hết hàng!');
      return;
    }
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
          return prevItems;
        }
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, newQuantity, stock) => {
    if (Number.isNaN(newQuantity) || newQuantity < 1) newQuantity = 1;
    if (newQuantity > stock) {
      alert(`Lỗi: Sản phẩm này chỉ còn tối đa ${stock} đôi trong kho!`);
      newQuantity = stock;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );
  };

  const removeCartItem = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi giỏ hàng?`)) {
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
    }
  };

  const clearCart = () => setCartItems([]);

  return (
    <div className="font-sans antialiased text-gray-900 bg-white">
      {userRole !== 'guest' && userRole !== 'customer' && (
        <div className="bg-slate-900 text-white text-sm py-2 px-4 flex justify-between items-center overflow-x-auto">
          <span className="font-medium text-blue-400 whitespace-nowrap mr-4">
            🔥 Quản trị nội bộ ({userRole.toUpperCase()})
          </span>
          <div className="flex gap-4 min-w-max items-center">
            {hasAccess('dashboard') && (
              <Link to="/admin/dashboard" className="font-bold hover:text-blue-300 transition-colors">
                Báo cáo (Dashboard)
              </Link>
            )}
            {hasAccess('dashboard') && hasAccess('orders') && <span className="text-gray-600">|</span>}
            {hasAccess('sales') && (
              <Link to="/admin/sales" className="font-bold hover:text-cyan-300 transition-colors">
                Bán hàng & CSKH
              </Link>
            )}
            {hasAccess('sales') && hasAccess('orders') && <span className="text-gray-600">|</span>}
            {hasAccess('orders') && (
              <Link to="/admin/orders" className="font-bold hover:text-blue-300 transition-colors">
                Duyệt Đơn Online
              </Link>
            )}
            {hasAccess('orders') && hasAccess('inventory') && <span className="text-gray-600">|</span>}
            {hasAccess('inventory') && (
              <Link to="/admin/inventory" className="font-bold hover:text-orange-300 transition-colors">
                Quản lý Kho
              </Link>
            )}
            {hasAccess('inventory') && hasAccess('accounting') && <span className="text-gray-600">|</span>}
            {hasAccess('accounting') && (
              <Link to="/admin/accounting" className="font-bold hover:text-green-300 transition-colors">
                Kế toán & Thu chi
              </Link>
            )}
            {hasAccess('accounting') && hasAccess('product_management') && (
              <span className="text-gray-600">|</span>
            )}
            {hasAccess('product_management') && (
              <Link to="/admin/products" className="font-bold hover:text-purple-300 transition-colors">
                Quản lý Sản phẩm
              </Link>
            )}
            {hasAccess('product_management') && hasAccess('promotion_management') && (
              <span className="text-gray-600">|</span>
            )}
            {hasAccess('promotion_management') && (
              <Link to="/admin/promotions" className="font-bold hover:text-pink-300 transition-colors">
                Quản lý Khuyến mãi
              </Link>
            )}
            {hasAccess('promotion_management') && hasAccess('feedback_management') && (
              <span className="text-gray-600">|</span>
            )}
            {hasAccess('feedback_management') && (
              <Link to="/admin/feedback" className="font-bold hover:text-cyan-300 transition-colors">
                Phản hồi khách hàng
              </Link>
            )}
            {hasAccess('feedback_management') && hasAccess('salary') && (
              <span className="text-gray-600">|</span>
            )}
            {hasAccess('salary') && (
              <Link to="/admin/salary" className="font-bold hover:text-yellow-300 transition-colors">
                Quản lý Lương
              </Link>
            )}
            {hasAccess('salary') && hasAccess('it') && <span className="text-gray-600">|</span>}
            {hasAccess('it') && (
              <Link
                to="/admin/it"
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-900/50 px-3 py-1 rounded border border-indigo-500/50 flex items-center gap-1"
              >
                <Server className="w-3 h-3" /> IT System
              </Link>
            )}
          </div>
        </div>
      )}

      <Header
        currentUser={currentUser}
        onLogout={logout}
        onLoginClick={() => navigate('/login')}
        onCartClick={() => setIsCartOpen(true)}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onProfileClick={() => navigate('/profile')}
        onSearch={setSearchQuery}
      />
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          if (!currentUser) {
            alert('Bạn cần Đăng nhập / Đăng ký để tiến hành thanh toán!');
            setIsCartOpen(false);
            navigate('/login');
          } else {
            setIsCartOpen(false);
            navigate('/checkout');
          }
        }}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeCartItem}
      />
      <Outlet
        context={{
          products: filteredProducts,
          addToCart,
          currentUser,
          logout,
          cartItems,
          clearCart,
          hasAccess,
        }}
      />
      <ChatWidget currentUser={currentUser} />
    </div>
  );
}
