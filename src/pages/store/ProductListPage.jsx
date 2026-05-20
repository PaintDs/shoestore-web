import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ProductCard from '../../components/ProductCard.jsx';
import { SHOE_SIZES, PRICE_RANGES } from '../../lib/constants.js';

export default function ProductListPage() {
  const { products, addToCart } = useOutletContext();
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedPrices, setSelectedPrices] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const navigate = useNavigate();

  const handleSizeClick = (size) =>
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  const handlePriceClick = (range) =>
    setSelectedPrices((prev) => (prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]));
  const handleCategoryClick = (cat) =>
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  const categories = [...new Set((products || []).map((p) => p.category).filter(Boolean))];

  const priceFilteredProducts = products.filter((product) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) return false;
    if (selectedPrices.length === 0) return true;
    return selectedPrices.some((range) => {
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
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3">Size (EU)</h3>
            <div className="flex flex-wrap gap-2">
              {SHOE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeClick(size)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                    selectedSizes.includes(size)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-slate-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedSizes.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSizes([])}
                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
              >
                Xóa lọc size
              </button>
            )}
          </div>
          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3">Danh mục</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedCategories.includes(cat)
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3">Khoảng giá</h3>
            <div className="space-y-2">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => handlePriceClick(range)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedPrices.includes(range)
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
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
              <button
                type="button"
                onClick={() => {
                  setSelectedPrices([]);
                  setSelectedSizes([]);
                  setSelectedCategories([]);
                }}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {priceFilteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onViewDetail={() => navigate(`/products/${product.id}`)}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
