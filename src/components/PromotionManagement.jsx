import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Tag, Calendar, Percent, DollarSign, Clock, X, AlertCircle, Save, Ban } from 'lucide-react';

const PromotionManagement = ({ onBack }) => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPromotionForm, setNewPromotionForm] = useState({
    name: '', code: '', discount_percentage: '', min_order_amount: '',
    start_date: '', end_date: ''
  });

  const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchPromotions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/promotions', { headers });
      if (!response.ok) {
        throw new Error(`Lỗi khi tải khuyến mãi: ${response.statusText}`);
      }
      const data = await response.json();
      setPromotions(data);
    } catch (err) {
      console.error("Lỗi tải khuyến mãi:", err);
      setError(err.message || "Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const promoData = {
        ...newPromotionForm,
        discount_percentage: parseFloat(newPromotionForm.discount_percentage),
        min_order_amount: parseInt(newPromotionForm.min_order_amount, 10),
        start_date: newPromotionForm.start_date.replace('T', ' '),
        end_date: newPromotionForm.end_date.replace('T', ' '),
      };

      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers,
        body: JSON.stringify(promoData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi khi tạo khuyến mãi.');
      }
      alert('Tạo khuyến mãi thành công!');
      setShowCreateModal(false);
      setNewPromotionForm({ name: '', code: '', discount_percentage: '', min_order_amount: '', start_date: '', end_date: '' });
      fetchPromotions(); // Refresh list
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleEndPromotionEarly = async (promoId) => {
    if (!window.confirm('Bạn có chắc chắn muốn kết thúc sớm khuyến mãi này?')) return;
    try {
      const response = await fetch(`/api/promotions/${promoId}/end`, {
        method: 'POST',
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Lỗi khi kết thúc khuyến mãi.');
      }
      alert('Kết thúc khuyến mãi thành công!');
      fetchPromotions(); // Refresh list
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Tag className="w-6 h-6 text-pink-400" /> Quản lý Khuyến mãi</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Danh sách Chương trình Khuyến mãi</h2>
            <button onClick={() => setShowCreateModal(true)} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> Tạo Khuyến mãi mới
            </button>
          </div>

          {loading && <div className="text-center py-10 text-gray-600">Đang tải khuyến mãi...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert"><strong className="font-bold">Lỗi!</strong><span className="block sm:inline"> {error}</span></div>}
          {!loading && !error && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Tên chương trình</th>
                  <th className="p-4">Mã Code</th>
                  <th className="p-4">Mức giảm</th>
                  <th className="p-4">Đơn tối thiểu</th>
                  <th className="p-4">Ngày bắt đầu</th>
                  <th className="p-4">Ngày kết thúc</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold">{promo.id}</td>
                    <td className="p-4 font-medium">{promo.name}</td>
                    <td className="p-4 font-mono text-pink-600">{promo.code}</td>
                    <td className="p-4">{promo.discount_percentage * 100}%</td>
                    <td className="p-4">{new Intl.NumberFormat('vi-VN').format(promo.min_order_amount)} VNĐ</td>
                    <td className="p-4">{formatDateTime(promo.start_date)}</td>
                    <td className="p-4">{formatDateTime(promo.end_date)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${promo.status === 'active' ? 'bg-green-100 text-green-700' : promo.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {promo.status === 'active' ? 'Đang diễn ra' : promo.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {promo.status === 'active' && (
                        <button
                          onClick={() => handleEndPromotionEarly(promo.id)}
                          className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Ban className="w-4 h-4" /> Kết thúc sớm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create Promotion Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Save className="w-6 h-6 text-pink-600" /> Tạo Khuyến mãi mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleCreatePromotion} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Tên chương trình</label>
                <input required type="text" placeholder="VD: Khuyến mãi Black Friday" value={newPromotionForm.name} onChange={e => setNewPromotionForm({ ...newPromotionForm, name: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Mã Code</label>
                  <input required type="text" placeholder="VD: BF2026" value={newPromotionForm.code} onChange={e => setNewPromotionForm({ ...newPromotionForm, code: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Mức giảm (%)</label>
                  <input required type="number" step="0.01" min="0" max="1" placeholder="0.1 (10%) hoặc 0.25 (25%)" value={newPromotionForm.discount_percentage} onChange={e => setNewPromotionForm({ ...newPromotionForm, discount_percentage: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Giá trị đơn hàng tối thiểu (VNĐ)</label>
                <input required type="number" min="0" placeholder="500000" value={newPromotionForm.min_order_amount} onChange={e => setNewPromotionForm({ ...newPromotionForm, min_order_amount: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Ngày bắt đầu</label>
                  <input required type="datetime-local" value={newPromotionForm.start_date} onChange={e => setNewPromotionForm({ ...newPromotionForm, start_date: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Ngày kết thúc</label>
                  <input required type="datetime-local" value={newPromotionForm.end_date} onChange={e => setNewPromotionForm({ ...newPromotionForm, end_date: e.target.value })} className="w-full border p-2.5 rounded-xl outline-none focus:border-pink-500" />
                </div>
              </div>
              <div className="pt-4 border-t mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-200">Tạo Khuyến mãi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;