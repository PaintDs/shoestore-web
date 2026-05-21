import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Star, Filter, CheckCircle, EyeOff, X } from 'lucide-react';

const FeedbackManagement = ({ onBack }) => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRating, setFilterRating] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [processReason, setProcessReason] = useState('');
  const [processAction, setProcessAction] = useState('');

  const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/feedback';
      const params = new URLSearchParams();
      if (filterRating !== 'all') params.append('rating', filterRating);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Lỗi khi tải phản hồi: ${response.statusText}`);
      }
      const data = await response.json();
      setFeedbackList(data);
    } catch (err) {
      console.error("Lỗi tải phản hồi:", err);
      setError(err.message || "Không thể tải danh sách phản hồi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [filterRating, filterStatus]);

  const handleProcessFeedback = async (e) => {
    e.preventDefault();
    if (!processReason.trim()) {
      alert('Vui lòng nhập lý do xử lý!');
      return;
    }
    try {
      const response = await fetch(`/api/feedback/${currentFeedback.id}/process`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action: processAction, reason: processReason })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Lỗi khi ${processAction === 'process' ? 'xử lý' : 'ẩn'} phản hồi.`);
      }
      alert('Cập nhật trạng thái phản hồi thành công!');
      setShowProcessModal(false);
      setCurrentFeedback(null);
      setProcessReason('');
      fetchFeedback(); // Refresh list
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Chờ xử lý</span>;
      case 'processed': return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Đã xử lý</span>;
      case 'hidden': return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">Đã ẩn</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6 text-cyan-400" /> Phản hồi Khách hàng</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Danh sách Phản hồi</h2>
            <div className="flex items-center gap-4">
              <div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><select className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" value={filterRating} onChange={(e) => setFilterRating(e.target.value)}><option value="all">Tất cả sao</option>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} sao</option>)}</select></div>
              <div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><select className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Tất cả</option><option value="pending">Chờ xử lý</option><option value="processed">Đã xử lý</option><option value="hidden">Đã ẩn</option></select></div>
            </div>
          </div>

          {loading && <div className="text-center py-10 text-gray-600">Đang tải phản hồi...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert"><strong className="font-bold">Lỗi!</strong><span className="block sm:inline"> {error}</span></div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr>
                    <th className="p-4">Khách hàng</th>
                    <th className="p-4">Sản phẩm</th>
                    <th className="p-4">Đánh giá</th>
                    <th className="p-4">Nội dung</th>
                    <th className="p-4">Ngày gửi</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feedbackList.map((fb) => (
                    <tr key={fb.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{fb.customer_name}</td>
                      <td className="p-4 text-sm text-gray-600">{fb.product_name || `ID: ${fb.product_id}`}</td>
                      <td className="p-4 flex items-center">{Array.from({ length: fb.rating }).map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}</td>
                      <td className="p-4 text-gray-700 max-w-xs truncate">{fb.comment}</td>
                      <td className="p-4 text-sm text-gray-500">{new Date(fb.created_at).toLocaleString('vi-VN')}</td>
                      <td className="p-4">{getStatusPill(fb.status)}</td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        {fb.status === 'pending' && (
                          <>
                            <button onClick={() => { setCurrentFeedback(fb); setProcessAction('process'); setShowProcessModal(true); }} className="text-blue-500 hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Xử lý</button>
                            <button onClick={() => { setCurrentFeedback(fb); setProcessAction('hide'); setShowProcessModal(true); }} className="text-gray-500 hover:text-gray-700 font-bold text-sm bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><EyeOff className="w-4 h-4" /> Ẩn</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showProcessModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">{processAction === 'process' ? <CheckCircle className="w-6 h-6 text-blue-600" /> : <EyeOff className="w-6 h-6 text-gray-600" />}{processAction === 'process' ? 'Xử lý Phản hồi' : 'Ẩn Phản hồi'}</h2>
              <button onClick={() => { setShowProcessModal(false); setCurrentFeedback(null); setProcessReason(''); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleProcessFeedback} className="space-y-4">
              <div><label className="block text-sm font-semibold mb-1">Nội dung phản hồi:</label><p className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">{currentFeedback?.comment}</p></div>
              <div><label className="block text-sm font-semibold mb-1">Lý do xử lý/ẩn <span className="text-red-500">*</span></label><textarea required rows="4" placeholder="Nhập lý do xử lý hoặc ẩn phản hồi..." value={processReason} onChange={e => setProcessReason(e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:border-blue-500"></textarea></div>
              <div className="pt-4 border-t mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowProcessModal(false); setCurrentFeedback(null); setProcessReason(''); }} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200">{processAction === 'process' ? 'Xác nhận Xử lý' : 'Xác nhận Ẩn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;