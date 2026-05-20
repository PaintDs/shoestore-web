import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, useNavigate, Link, useOutletContext, useParams } from 'react-router-dom';
import { Server } from 'lucide-react';
import Header from './components/Header.jsx';
import ProductCard from './components/ProductCard.jsx';
import CartSidebar from './components/CartSidebar.jsx';
import Checkout from './components/Checkout.jsx';
import OrderManagement from './components/OrderManagement.jsx';
import SalesManagement from './components/SalesManagement.jsx';
import WarehouseManagement from './components/InventoryManagement.jsx';
import AccountingManagement from './components/AccountingManagement.jsx';
import ProductManagement from './components/ProductManagement.jsx'; // Assuming this component exists or will be created
import PromotionManagement from './components/PromotionManagement.jsx'; // Assuming this component exists or will be created
import FeedbackManagement from './components/FeedbackManagement.jsx'; // Assuming this component exists or will be created
import SalaryManagement from './components/SalaryManagement.jsx'; // Assuming this component exists or will be created
import ITManagement from './components/ITManagement.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import UserProfile from './components/UserProfile.jsx';

// Component Layout chính, chứa các thành phần chung như Header, Sidebar
const AppLayout = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]); // Khởi tạo mảng rỗng

  // Phục hồi cơ chế Đăng nhập bằng useState và LocalStorage
  useEffect(() => {
    const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
    if (token) {
      fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(user => setCurrentUser(user))
      .catch(() => logout());
    }
  }, []);

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('shoestore_token');
    sessionStorage.removeItem('token');
  };

  const clearCart = () => setCartItems([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Gọi API thật từ Backend FastAPI
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data); // Cập nhật dữ liệu thật vào State
      } catch (error) {
        console.error("Lỗi khi kết nối Backend:", error);
      }
    };
    
    fetchProducts();
  }, []);

  // ================= CƠ CHẾ PHÂN QUYỀN (RBAC) =================
  const userRole = currentUser?.role || 'guest';

  const hasAccess = (module) => {
    if (userRole === 'admin') return true; // Admin có toàn quyền
    if (userRole === 'it') {
      // IT chỉ có quyền truy cập module 'it'
      return module === 'it';
    }
    if (userRole === 'kho') {
      return ['inventory', 'orders', 'product_management'].includes(module);
    }
    if (userRole === 'sale') {
      return ['sales', 'orders'].includes(module);
    }
    if (userRole === 'ketoan') {
      return ['accounting', 'dashboard', 'salary'].includes(module);
    }
    return false;
  };

  // ================= BỘ LỌC SẢN PHẨM (ĐÃ BỌC THÉP CHỐNG CRASH) =================
  const filteredProducts = (Array.isArray(products) ? products : []).filter(product => {
    // Ép kiểu an toàn: Nếu bị null/undefined thì tự động chuyển thành chuỗi rỗng ''
    const safeSearchQuery = (searchQuery || '').toLowerCase();
    const safeName = (product.name || '').toLowerCase();
    const safeCategory = (product.category || '').toLowerCase();

    // Tìm kiếm theo tên hoặc danh mục
    return safeName.includes(safeSearchQuery) || safeCategory.includes(safeSearchQuery);
  });

  // ================= LOGIC GIỎ HÀNG (ĐÃ BỌC THÉP THEO TEST DESIGN) =================

  // Bắt INT_CART_01 & INT_CART_02 (Thêm vào giỏ & Check hết hàng)
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("Rất tiếc, sản phẩm này hiện đã hết hàng!");
      return;
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        // Chặn nếu thêm vượt quá số lượng tồn kho
        if (existingItem.quantity >= product.stock) {
          alert(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
          return prevItems;
        }
        return prevItems.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  // Bắt INT_CART_03, 04, 05 (Cập nhật số lượng, check tồn kho, chặn số âm/chữ cái)
  const updateQuantity = (id, newQuantity, stock) => {
    // Nếu người dùng nhập chữ cái hoặc số <= 0, ta ép về 1 (INT_CART_05)
    if (isNaN(newQuantity) || newQuantity < 1) {
      newQuantity = 1;
    }
    // Nếu người dùng nhập quá số lượng tồn (INT_CART_04)
    if (newQuantity > stock) {
      alert(`Lỗi: Sản phẩm này chỉ còn tối đa ${stock} đôi trong kho!`);
      newQuantity = stock;
    }

    setCartItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  // Bắt INT_CART_06 (Xác nhận trước khi xóa)
  const removeCartItem = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi giỏ hàng?`)) {
      setCartItems(prevItems => prevItems.filter(item => item.id !== id));
    }
  };

  const navigate = useNavigate();

  return (
    <div className="font-sans antialiased text-gray-900 bg-white">
      {/* THANH ADMIN ĐƯỢC RÀNG BUỘC THEO QUYỀN (RBAC) */}
      {userRole !== 'guest' && userRole !== 'customer' && (
        <div className="bg-slate-900 text-white text-sm py-2 px-4 flex justify-between items-center overflow-x-auto">
          <span className="font-medium text-blue-400 whitespace-nowrap mr-4">
            🔥 Quản trị nội bộ ({userRole.toUpperCase()})
          </span>
          <div className="flex gap-4 min-w-max items-center">
            {hasAccess('dashboard') && <Link to="/admin/dashboard" className="font-bold hover:text-blue-300 transition-colors">Báo cáo (Dashboard)</Link>}
            {hasAccess('dashboard') && hasAccess('orders') && <span className="text-gray-600">|</span>}
            
            {hasAccess('sales') && <Link to="/admin/sales" className="font-bold hover:text-cyan-300 transition-colors">Bán hàng & CSKH</Link>}
            {hasAccess('sales') && hasAccess('orders') && <span className="text-gray-600">|</span>}

            {hasAccess('orders') && <Link to="/admin/orders" className="font-bold hover:text-blue-300 transition-colors">Duyệt Đơn Online</Link>}
            {hasAccess('orders') && hasAccess('inventory') && <span className="text-gray-600">|</span>}

            {hasAccess('inventory') && <Link to="/admin/inventory" className="font-bold hover:text-orange-300 transition-colors">Quản lý Kho</Link>}
            {hasAccess('inventory') && hasAccess('accounting') && <span className="text-gray-600">|</span>}

            {hasAccess('accounting') && <Link to="/admin/accounting" className="font-bold hover:text-green-300 transition-colors">Kế toán & Thu chi</Link>}
            {hasAccess('accounting') && hasAccess('product_management') && <span className="text-gray-600">|</span>}

            {/* Thêm các mục menu mới */}
            {hasAccess('product_management') && <Link to="/admin/products" className="font-bold hover:text-purple-300 transition-colors">Quản lý Sản phẩm</Link>}
            {hasAccess('product_management') && hasAccess('promotion_management') && <span className="text-gray-600">|</span>}

            {hasAccess('promotion_management') && <Link to="/admin/promotions" className="font-bold hover:text-pink-300 transition-colors">Quản lý Khuyến mãi</Link>}
            {hasAccess('promotion_management') && hasAccess('feedback_management') && <span className="text-gray-600">|</span>}

            {hasAccess('feedback_management') && <Link to="/admin/feedback" className="font-bold hover:text-cyan-300 transition-colors">Phản hồi khách hàng</Link>}
            {hasAccess('feedback_management') && hasAccess('salary') && <span className="text-gray-600">|</span>}

            {hasAccess('salary') && <Link to="/admin/salary" className="font-bold hover:text-yellow-300 transition-colors">Quản lý Lương</Link>}
            {hasAccess('salary') && hasAccess('it') && <span className="text-gray-600">|</span>}

            {hasAccess('it') && (
              <Link to="/admin/it" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-900/50 px-3 py-1 rounded border border-indigo-500/50 flex items-center gap-1">
                <Server className="w-3 h-3"/> IT System
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
            alert("Bạn cần Đăng nhập / Đăng ký để tiến hành thanh toán!");
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
      {/* Outlet sẽ render component tương ứng với route hiện tại */}
      <Outlet context={{ products: filteredProducts, addToCart, setSelectedProduct, currentUser, logout, cartItems, clearCart }} />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: "products/:productId", element: <ProductDetailPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "profile", element: <UserProfilePage /> },
      // Admin Routes
      { path: "admin/dashboard", element: <DashboardPage /> },
      { path: "admin/sales", element: <SalesManagementPage /> },
      { path: "admin/orders", element: <OrderManagementPage /> },
      { path: "admin/inventory", element: <InventoryManagementPage /> },
      { path: "admin/accounting", element: <AccountingManagementPage /> },
      { path: "admin/products", element: <ProductManagementPage /> },
      { path: "admin/promotions", element: <PromotionManagementPage /> },
      { path: "admin/feedback", element: <FeedbackManagementPage /> },
      { path: "admin/salary", element: <SalaryManagementPage /> },
      { path: "admin/it", element: <ITManagementPage /> },
    ]
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

// Các component trang được tách ra để router quản lý
function LoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = async (accessToken) => {
    localStorage.setItem('shoestore_token', accessToken);

    // Sau khi có token, gọi API /users/me để lấy thông tin user
    const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.ok) {
        const user = await response.json();
        // Điều hướng theo vai trò
        switch (user.role) {
            case 'admin': navigate('/admin/dashboard'); break;
            case 'kho': navigate('/admin/inventory'); break;
            case 'sale': navigate('/admin/sales'); break;
            case 'ketoan': navigate('/admin/accounting'); break;
            case 'it': navigate('/admin/it'); break;
            default: navigate('/');
        }
    }
  };
  return <Login onLoginSuccess={handleLoginSuccess} onBack={() => navigate('/')} />;
}

function ProductListPage() {
  const { products, setSelectedProduct } = useOutletContext();
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedPrices, setSelectedPrices] = useState([]);
  const navigate = useNavigate();

  const handleSizeClick = (size) => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  const handlePriceClick = (range) => setSelectedPrices(prev => prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]);

  const priceFilteredProducts = products.filter(product => {
    if (selectedPrices.length === 0) return true;
    return selectedPrices.some(range => {
      if (range === 'Dưới 1tr') return product.price < 1000000;
      if (range === '1tr - 3tr') return product.price >= 1000000 && product.price <= 3000000;
      if (range === 'Trên 3tr') return product.price > 3000000;
      return false;
    });
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="w-full md:w-64 space-y-8">
          {/* ... JSX cho bộ lọc size và giá ... */}
        </aside>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight">BST GIÀY MỚI</h1>
              <p className="text-gray-500 mt-1">Tìm thấy {priceFilteredProducts.length} sản phẩm phù hợp</p>
            </div>
          </div>
          {priceFilteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl">
              <p className="text-gray-400 text-lg">Không có sản phẩm nào khớp.</p>
              <button onClick={() => { setSelectedPrices([]); }} className="mt-4 text-blue-600 font-bold hover:underline">Xóa bộ lọc</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {priceFilteredProducts.map(product => (
                <ProductCard key={product.id} {...product} onViewDetail={() => navigate(`/products/${product.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Các component trang khác tương tự...
function ProductDetailPage() { 
  const { productId } = useParams(); 
  const { products, addToCart } = useOutletContext();
  const product = products.find(p => p.id.toString() === productId);
  const navigate = useNavigate();
  if (!product) return <div>Sản phẩm không tồn tại.</div>;
  return <ProductDetail product={product} onBack={() => navigate('/')} onAddToCart={addToCart} />;
}
function CheckoutPage() { 
  const navigate = useNavigate(); 
  const { cartItems, clearCart, currentUser } = useOutletContext();
  return <Checkout 
    onBack={() => navigate('/')} 
    cartItems={cartItems || []} 
    onCheckoutSuccess={() => { clearCart(); navigate('/profile'); }}
    currentUser={currentUser}
  />; 
}
function UserProfilePage() { const { currentUser, logout } = useOutletContext(); const navigate = useNavigate(); return <UserProfile currentUser={currentUser} onBack={() => navigate('/')} onLogout={() => { logout(); navigate('/'); }} />; }
function DashboardPage() { const navigate = useNavigate(); return <Dashboard onBack={() => navigate('/')} />; }
function OrderManagementPage() { const navigate = useNavigate(); return <OrderManagement onBack={() => navigate('/')} />; }
function SalesManagementPage() { const navigate = useNavigate(); return <SalesManagement onBack={() => navigate('/')} />; }
function InventoryManagementPage() { const navigate = useNavigate(); return <WarehouseManagement onBack={() => navigate('/')} />; }
function ProductManagementPage() { const navigate = useNavigate(); return <ProductManagement onBack={() => navigate('/')} />; }
function PromotionManagementPage() { const navigate = useNavigate(); return <PromotionManagement onBack={() => navigate('/')} />; }
function FeedbackManagementPage() { const navigate = useNavigate(); return <FeedbackManagement onBack={() => navigate('/')} />; }
function SalaryManagementPage() { const navigate = useNavigate(); return <SalaryManagement onBack={() => navigate('/')} />; }
function AccountingManagementPage() { const navigate = useNavigate(); return <AccountingManagement onBack={() => navigate('/')} />; }
function ITManagementPage() { const navigate = useNavigate(); return <ITManagement onBack={() => navigate('/')} />; }


export default App;