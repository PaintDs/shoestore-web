import React, { useState, useEffect, useCallback } from 'react';
import { Server, ShieldAlert, Webhook, Bot, ArrowLeft, Database, Activity, Play, Square, RefreshCw, Save } from 'lucide-react';

const ITManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('system'); // system, rbac, api, ai
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State for each tab
  const [users, setUsers] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);
  const [intents, setIntents] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState({ is_maintenance: false, banner_message: '' });

  const fetchApi = useCallback(async (url, options = {}) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
      return data;
    } catch (err) {
      setError(err.message);
      alert(`Lỗi API: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
    setToken(storedToken);
  }, []);

  const fetchUsers = useCallback(() => {
    fetchApi('/api/users').then(data => {
      if (data && Array.isArray(data)) {
        setUsers(data);
      }
    });
  }, [fetchApi]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'rbac') {
      fetchUsers();
    } else if (activeTab === 'ai') {
      fetchApi('/api/it/chatbot').then(data => data && setIntents(data));
    }
  }, [activeTab, token, fetchApi, fetchUsers]);

  const handleUpdateRole = async (userId, newRole) => {
    if (window.confirm(`Bạn có chắc muốn đổi vai trò của người dùng ID ${userId} thành ${newRole}?`)) {
      const result = await fetchApi('/api/it/users/role', {
        method: 'PUT',
        body: JSON.stringify({ user_id: userId, new_role: newRole })
      });
      if (result) {
        alert(result.message);
        fetchUsers();
      }
    }
  };

  const handleBackup = async () => {
    const result = await fetchApi('/api/it/backup', { method: 'POST' });
    if (result) alert(result.message);
  };

  const handleToggleMaintenance = async () => {
    const newStatus = !maintenanceMode.is_maintenance;
    const message = newStatus ? prompt("Nhập nội dung thông báo bảo trì:", "Hệ thống đang được bảo trì, vui lòng quay lại sau.") : '';
    if (newStatus && message === null) return; // User cancelled prompt

    const payload = { is_maintenance: newStatus, banner_message: message || '' };
    const result = await fetchApi('/api/it/maintenance', { method: 'POST', body: JSON.stringify(payload) });
    if (result) {
      alert(result.message);
      setMaintenanceMode(payload);
    }
  };

  const handleSimulateApiError = async (apiName) => {
    const formData = new FormData();
    formData.append('api_name', apiName);
    const result = await fetchApi('/api/it/integrate-api', { method: 'POST', body: formData, headers: { 'Content-Type': null } }); // Let browser set content-type for FormData
    if (result) alert(result.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center border-b-4 border-indigo-500">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Server className="w-6 h-6 text-indigo-400" /> System Control Panel</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg font-mono ${maintenanceMode.is_maintenance ? 'bg-red-600/30 text-red-300 border-red-500/50' : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'}`}>
            <Activity className="w-4 h-4 animate-pulse text-green-400"/> System Online
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('system')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <Database className="w-5 h-5" /> Quản lý Máy chủ & DB
          </button>
          <button onClick={() => setActiveTab('rbac')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'rbac' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <ShieldAlert className="w-5 h-5" /> Ma trận Phân quyền (RBAC)
          </button>
          <button onClick={() => setActiveTab('api')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'api' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <Webhook className="w-5 h-5" /> Tích hợp API Đối tác
          </button>
          <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            <Bot className="w-5 h-5" /> AI Chatbot & Log Analyzer
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          {activeTab === 'system' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Trạng thái Cơ sở hạ tầng</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50 col-span-2">
                  <h3 className="font-bold text-slate-800 mb-4">Bảo trì & Sao lưu</h3>
                  <div className="flex items-center gap-4">
                    <button onClick={handleToggleMaintenance} className={`w-full font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors ${maintenanceMode.is_maintenance ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}`}>
                      {maintenanceMode.is_maintenance ? 'Tắt Bảo trì' : 'Bật Bảo trì'}
                    </button>
                    <button onClick={handleBackup} className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                      <Save className="w-4 h-4"/> Backup Snapshot
                    </button>
                  </div>
                </div>
                 <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-2"><span className="font-semibold text-slate-600">Database Size (SQLite)</span></div>
                  <div className="text-3xl font-black text-slate-900 mb-2">1.2 GB</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rbac' && (
            <div>
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Ma trận Phân quyền (Role-Based Access Control)</h2>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm border-b">
                  <tr><th className="p-4">Nhân viên</th><th className="p-4">Email</th><th className="p-4">Vai trò hiện tại</th><th className="p-4 text-center">Cập nhật vai trò</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono">ID: {u.id}</div>
                      </td>
                      <td className="p-4 text-slate-600 font-mono text-sm">{u.email}</td>
                      <td className="p-4 font-semibold text-indigo-600">{u.role}</td>
                      <td className="p-4 text-center">
                        <select onChange={(e) => handleUpdateRole(u.id, e.target.value)} value={u.role} className="border p-2 rounded-lg text-sm">
                          <option value="admin">admin</option>
                          <option value="it">it</option>
                          <option value="kho">kho</option>
                          <option value="ketoan">ketoan</option>
                          <option value="sale">sale</option>
                          <option value="customer">customer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Quản lý Kết nối Đối tác (Third-party API)</h2>
              </div>
              <div className="p-6 space-y-4">
                <button onClick={() => handleSimulateApiError('ViettelPost')} className="w-full p-4 border rounded-lg text-left hover:bg-slate-50">
                  <h3 className="font-bold">Mô phỏng gọi API ViettelPost</h3>
                  <p className="text-sm text-slate-500">Gửi yêu cầu tạo vận đơn. Có 20% tỉ lệ xảy ra lỗi 504 Timeout để test ghi log.</p>
                </button>
                <button onClick={() => handleSimulateApiError('VNPay')} className="w-full p-4 border rounded-lg text-left hover:bg-slate-50">
                  <h3 className="font-bold">Mô phỏng gọi API VNPay</h3>
                  <p className="text-sm text-slate-500">Gửi yêu cầu tạo giao dịch thanh toán. Có 20% tỉ lệ xảy ra lỗi.</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">AI Chatbot & Phân tích Log Hệ thống</h2>
                  <p className="text-sm text-slate-500 mt-1">Sử dụng mô hình Machine Learning để tự động phát hiện lỗi và hỗ trợ khách hàng.</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Retrain Model
                </button>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-y-auto h-96 relative shadow-inner">
                <div className="absolute top-2 right-4 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div><div className="w-2 h-2 rounded-full bg-yellow-500"></div><div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                {intents.map(intent => (
                  <p key={intent.id} className="mb-1"><span className="text-cyan-400">[{intent.intent_name}]</span> <span className="text-slate-300">{intent.pattern} {" -> "}</span> {intent.response}</p>
                ))}
                <p className="mb-1 mt-4 animate-pulse">_</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ITManagement;