import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Search, Package, Filter, X, AlertCircle, Trash2 } from 'lucide-react';

const ProductManagement = ({ onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // State cho Modal thêm sản phẩm
  const [showAddModal, setShowAddModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', price: '', category: 'Lifestyle', image: '', stock: 0, bin: ''
  });
  const [modalError, setModalError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('name', searchTerm);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const url = `/api/products?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách sản phẩm.');
      }
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setProducts([]); // Đảm bảo products là mảng rỗng khi có lỗi
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const payload = {
        ...productForm,
        price: parseInt(productForm.price, 10),
        stock: parseInt(productForm.stock, 10)
      };

      if (isNaN(payload.price) || isNaN(payload.stock) || payload.price <= 0) {
        setModalError('Giá và tồn kho phải là số hợp lệ (giá > 0).');
        return;
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể thêm sản phẩm.');

      alert('Thêm sản phẩm mới thành công!');
      setShowAddModal(false);
      setProductForm({ name: '', price: '', category: 'Lifestyle', image: '', stock: 0, bin: '' });
      fetchProducts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`)) {
      try {
        const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Không thể xóa sản phẩm.');
        }
        alert('Xóa sản phẩm thành công!');
        fetchProducts();
      } catch (err) {
        alert(`Lỗi: ${err.message}`);
      }
    }
  };

  const categories = ["Lifestyle", "Running", "Jordan", "Casual", "Sportstyle", "Skate", "Other"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-blue-400" /> Quản lý Sản phẩm</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => { setShowAddModal(true); setModalError(''); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
              <Plus className="w-5 h-5" /> Thêm sản phẩm mới
            </button>
          </div>

          {loading && <div className="text-center py-10 text-gray-600">Đang tải danh sách sản phẩm...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4" role="alert">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold">Hình ảnh</th>
                    <th className="p-4 font-semibold">Tên sản phẩm</th>
                    <th className="p-4 font-semibold">Giá bán</th>
                    <th className="p-4 font-semibold">Danh mục</th>
                    <th className="p-4 font-semibold">Tồn kho</th>
                    <th className="p-4 font-semibold">Vị trí</th>
                    <th className="p-4 font-semibold text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length > 0 ? (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3"><img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg" /></td>
                        <td className="p-4 font-medium text-gray-900">{p.name}</td>
                        <td className="p-4 font-bold text-gray-800">{p.price.toLocaleString('vi-VN')}đ</td>
                        <td className="p-4 text-sm text-gray-600">{p.category}</td>
                        <td className="p-4 text-sm font-medium">{p.stock}</td>
                        <td className="p-4 text-sm text-gray-500">{p.bin}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">Chưa có sản phẩm nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Thêm sản phẩm */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Thêm sản phẩm mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm font-medium border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <span>{modalError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Tên sản phẩm</label>
                  <input required name="name" value={productForm.name} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Giá bán (VNĐ)</label>
                  <input required name="price" type="number" value={productForm.price} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Danh mục</label>
                <select required name="category" value={productForm.category} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">URL Hình ảnh</label>
                <input required name="image" value={productForm.image} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Số lượng tồn kho</label>
                  <input required name="stock" type="number" value={productForm.stock} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Vị trí trong kho (Bin)</label>
                  <input required name="bin" value={productForm.bin} onChange={handleFormChange} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4">Lưu sản phẩm</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;