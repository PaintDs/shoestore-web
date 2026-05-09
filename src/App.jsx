import React, { useState } from 'react';
import { Server } from 'lucide-react'; // <--- Lỗi đã được fix ở đây nhé (Import icon Server)
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import CartSidebar from './components/CartSidebar';
import Checkout from './components/Checkout';
import OrderManagement from './components/OrderManagement';
import InventoryManagement from './components/InventoryManagement';
import AccountingManagement from './components/AccountingManagement';
import ITManagement from './components/ITManagement';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProductDetail from './components/ProductDetail';
import UserProfile from './components/UserProfile';

const products = [
  { id: 1, name: "Air Jordan 1 Retro High", price: 5200000, category: "Jordan", image: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=1887&auto=format&fit=crop" },
  { id: 2, name: "Adidas Ultraboost Light", price: 4500000, category: "Running", image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=2031&auto=format&fit=crop" },
  { id: 3, name: "Nike Pegasus 40", price: 3400000, category: "Running", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" },
  { id: 4, name: "Converse Chuck 70 Classic", price: 1900000, category: "Casual", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1780&auto=format&fit=crop" },
  { id: 5, name: "New Balance 550 White Green", price: 3200000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=2071&auto=format&fit=crop" },
  { id: 6, name: "Nike Air Force 1 '07", price: 2900000, category: "Casual", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1974&auto=format&fit=crop" },
  { id: 7, name: "Puma RS-X3 Puzzle", price: 2800000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1974&auto=format&fit=crop" },
  { id: 8, name: "Vans Old Skool Black", price: 1500000, category: "Skate", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1998&auto=format&fit=crop" },
  { id: 9, name: "Adidas Yeezy Boost 350 V2", price: 7500000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=2012&auto=format&fit=crop" },
  { id: 10, name: "Asics Gel-Kayano 29", price: 4100000, category: "Running", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1964&auto=format&fit=crop" },
  { id: 11, name: "Nike Dunk Low Panda", price: 3500000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=1887&auto=format&fit=crop" },
  { id: 12, name: "Biti's Hunter X 2026", price: 1200000, category: "Running", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" },
  { id: 13, name: "Adidas Stan Smith", price: 2400000, category: "Casual", image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=2031&auto=format&fit=crop" },
  { id: 14, name: "New Balance 2002R Protection", price: 4300000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=2071&auto=format&fit=crop" },
  { id: 15, name: "Balenciaga Triple S", price: 24500000, category: "Luxury", image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=2012&auto=format&fit=crop" },
  { id: 16, name: "Puma Suede Classic", price: 1900000, category: "Casual", image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1974&auto=format&fit=crop" },
  { id: 17, name: "Vans Slip-On Checkerboard", price: 1400000, category: "Skate", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1998&auto=format&fit=crop" },
  { id: 18, name: "Converse Run Star Hike", price: 2800000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1780&auto=format&fit=crop" },
  { id: 19, name: "Saucony Endorphin Pro 3", price: 5600000, category: "Running", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1964&auto=format&fit=crop" },
  { id: 20, name: "Nike Air Max 90", price: 3600000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1974&auto=format&fit=crop" },
  { id: 21, name: "On Running Cloudmonster", price: 4800000, category: "Running", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" },
  { id: 22, name: "Hoka Clifton 9", price: 3900000, category: "Running", image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=2031&auto=format&fit=crop" },
  { id: 23, name: "Nike ZoomX Vaporfly NEXT% 3", price: 6800000, category: "Running", image: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=1887&auto=format&fit=crop" },
  { id: 24, name: "Adidas NMD_R1", price: 3500000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=2012&auto=format&fit=crop" },
  { id: 25, name: "Jordan 4 Retro Military Blue", price: 8500000, category: "Jordan", image: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=2071&auto=format&fit=crop" },
  { id: 26, name: "New Balance 990v6", price: 5500000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1974&auto=format&fit=crop" },
  { id: 27, name: "Reebok Club C 85", price: 2100000, category: "Casual", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1998&auto=format&fit=crop" },
  { id: 28, name: "Fila Disruptor II", price: 1800000, category: "Lifestyle", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1780&auto=format&fit=crop" },
  { id: 29, name: "Asics Gel-Lyte III", price: 3200000, category: "Casual", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1964&auto=format&fit=crop" },
  { id: 30, name: "Nike Blazer Mid '77 Vintage", price: 2900000, category: "Casual", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1974&auto=format&fit=crop" }
];

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentView, setCurrentView] = useState('store'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedPrices, setSelectedPrices] = useState([]);

  // ================= CƠ CHẾ PHÂN QUYỀN (RBAC) =================
  const userRole = currentUser?.role || 'customer';
  
  const hasAccess = (module) => {
    if (userRole === 'admin' || userRole === 'it') return true; 
    if (userRole === 'kho' && (module === 'kho' || module === 'order')) return true;
    if (userRole === 'ketoan' && (module === 'ketoan' || module === 'dashboard')) return true;
    return false;
  };

  const handleSizeClick = (size) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const handlePriceClick = (range) => {
    setSelectedPrices(prev => prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]);
  };

  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.category.toLowerCase().includes(searchQuery.toLowerCase());

    let matchPrice = true;
    if (selectedPrices.length > 0) {
      matchPrice = selectedPrices.some(range => {
        if (range === 'Dưới 1tr') return product.price < 1000000;
        if (range === '1tr - 3tr') return product.price >= 1000000 && product.price <= 3000000;
        if (range === 'Trên 3tr') return product.price > 3000000;
        return false;
      });
    }

    return matchSearch && matchPrice;
  });

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, change) => {
    setCartItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const removeCartItem = (id) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  if (currentView === 'login') return <Login onBack={() => setCurrentView('store')} onLoginSuccess={(user) => { setCurrentUser(user); setCurrentView('store'); }} />;
  if (currentView === 'admin_dashboard') return <Dashboard onBack={() => setCurrentView('store')} />;
  if (currentView === 'admin_orders') return <OrderManagement onBack={() => setCurrentView('store')} />;
  if (currentView === 'admin_inventory') return <InventoryManagement onBack={() => setCurrentView('store')} />;
  if (currentView === 'admin_accounting') return <AccountingManagement onBack={() => setCurrentView('store')} />;
  if (currentView === 'admin_it') return <ITManagement onBack={() => setCurrentView('store')} />;
  if (currentView === 'checkout') return <Checkout onBack={() => setCurrentView('store')} />;
  if (currentView === 'user_profile') return <UserProfile currentUser={currentUser} onBack={() => setCurrentView('store')} onLogout={() => { setCurrentUser(null); setCurrentView('store'); }} />;
  
  if (currentView === 'product_detail' && selectedProduct) {
    return (
      <div className="font-sans antialiased text-gray-900 bg-white">
        <Header currentUser={currentUser} onLoginClick={() => setCurrentView('login')} onLogout={() => setCurrentUser(null)} onUserClick={() => setCurrentView('user_profile')} onCartClick={() => setIsCartOpen(true)} cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} onSearch={setSearchQuery} />
        <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); setCurrentView('checkout'); }} cartItems={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeCartItem} />
        <ProductDetail product={selectedProduct} onBack={() => setCurrentView('store')} onAddToCart={addToCart} />
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-gray-900 bg-white">
      {/* THANH ADMIN ĐƯỢC RÀNG BUỘC THEO QUYỀN (RBAC) */}
      {(userRole === 'admin' || userRole === 'it' || userRole === 'kho' || userRole === 'ketoan') && (
        <div className="bg-slate-900 text-white text-sm py-2 px-4 flex justify-between items-center overflow-x-auto">
          <span className="font-medium text-blue-400 whitespace-nowrap mr-4">
            🔥 Quản trị nội bộ ({userRole.toUpperCase()})
          </span>
          <div className="flex gap-4 min-w-max items-center">
            
            {hasAccess('dashboard') && <button onClick={() => setCurrentView('admin_dashboard')} className="font-bold hover:text-blue-300 transition-colors">Báo cáo (Dashboard)</button>}
            {hasAccess('dashboard') && hasAccess('order') && <span className="text-gray-600">|</span>}

            {hasAccess('order') && <button onClick={() => setCurrentView('admin_orders')} className="font-bold hover:text-blue-300 transition-colors">Quản lý Đơn hàng</button>}
            {hasAccess('order') && hasAccess('kho') && <span className="text-gray-600">|</span>}

            {hasAccess('kho') && <button onClick={() => setCurrentView('admin_inventory')} className="font-bold hover:text-orange-300 transition-colors">Quản lý Kho bãi</button>}
            {hasAccess('kho') && hasAccess('ketoan') && <span className="text-gray-600">|</span>}

            {hasAccess('ketoan') && <button onClick={() => setCurrentView('admin_accounting')} className="font-bold hover:text-green-300 transition-colors">Kế toán & Thu chi</button>}
            {hasAccess('ketoan') && hasAccess('it') && <span className="text-gray-600">|</span>}

            {hasAccess('it') && (
              <button onClick={() => setCurrentView('admin_it')} className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-900/50 px-3 py-1 rounded border border-indigo-500/50 flex items-center gap-1">
                <Server className="w-3 h-3"/> IT System
              </button>
            )}
          </div>
        </div>
      )}

      <Header currentUser={currentUser} onUserClick={() => setCurrentView('user_profile')} onLoginClick={() => setCurrentView('login')} onLogout={() => setCurrentUser(null)} onCartClick={() => setIsCartOpen(true)} cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} onSearch={setSearchQuery} />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); setCurrentView('checkout'); }} cartItems={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeCartItem} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
        <div className="flex flex-col md:flex-row gap-10">
          <aside className="w-full md:w-64 space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-4 border-b pb-2">Kích cỡ</h3>
              <div className="grid grid-cols-3 gap-2">
                {[38, 39, 40, 41, 42, 43].map(size => (
                  <button key={size} onClick={() => handleSizeClick(size)} className={`py-2 border rounded-lg transition-all font-medium text-sm ${selectedSizes.includes(size) ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-blue-600 hover:text-blue-600'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 border-b pb-2">Khoảng giá</h3>
              <div className="space-y-3">
                {["Dưới 1tr", "1tr - 3tr", "Trên 3tr"].map(range => (
                  <label key={range} className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedPrices.includes(range)} onChange={() => handlePriceClick(range)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{range}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
          
          <div className="flex-1">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight">BST GIÀY MỚI</h1>
                <p className="text-gray-500 mt-1">Tìm thấy {filteredProducts.length} sản phẩm phù hợp</p>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-3xl">
                <p className="text-gray-400 text-lg">Không có sản phẩm nào khớp với bộ lọc của bạn.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedPrices([]); }} className="mt-4 text-blue-600 font-bold hover:underline">Xóa bộ lọc</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} {...product} onViewDetail={() => { setSelectedProduct(product); setCurrentView('product_detail'); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;