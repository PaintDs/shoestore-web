import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, HardDrive, Shield, Save, AlertCircle } from 'lucide-react';

const SystemManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'logs'
  const [users, setUsers] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleChanges, setRoleChanges] = useState({});

  const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const availableRoles = ['admin', 'it', 'kho', 'ketoan', 'sale'];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', { headers });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Không thể tải danh sách người dùng.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Lỗi tải người dùng:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/backups', { headers });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Không thể tải nhật ký backup.');
      }
      const data = await response.json();
      setBackups(data);
    } catch (err) {
      console.error("Lỗi tải backups:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchUsers();
    } else if (activeTab === 'logs') {
      fetchBackups();
    }
  }, [activeTab]);

  const handleRoleChange = (userId, newRole) => {
    setRoleChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = async (userId) => {
    const newRole = roleChanges[userId];
    if (!newRole) {
      alert("Bạn chưa thay đổi vai trò cho người dùng này.");
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn đổi vai trò của người dùng này thành '${newRole}'?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          const errorMessages = data.detail.map(err => `+ Trường ${err.loc[err.loc.length - 1]}: ${err.msg}`);
          throw new Error(`Dữ liệu không hợp lệ:\n${errorMessages.join('\n')}`);
        }
        throw new Error(data.detail || 'Cập nhật vai trò thất bại.');
      }
      alert(data.message);
      fetchUsers(); // Refresh user list
      setRoleChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[userId];
        return newChanges;
      });
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const renderRoleManagement = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-gray-500 text-sm border-b">
          <tr>
            <th className="p-4">Tên nhân viên</th>
            <th className="p-4">Email</th>
            <th className="p-4">Vai trò hiện tại</th>
            <th className="p-4">Thay đổi vai trò</th>
            <th className="p-4 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="p-4 font-medium">{user.name}</td>
              <td className="p-4 text-gray-600">{user.email}</td>
              <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">{user.role}</span></td>
              <td className="p-4">
                <select
                  value={roleChanges[user.id] || user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="border p-2 rounded-lg text-sm"
                >
                  {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </td>
              <td className="p-4 text-center">
                <button
                  onClick={() => handleUpdateRole(user.id)}
                  disabled={!roleChanges[user.id] || roleChanges[user.id] === user.role}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 text-xs disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" /> Cập nhật
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSystemLogs = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-gray-500 text-sm border-b">
          <tr>
            <th className="p-4">Tên file</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4">Ngày tạo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {backups.map((backup) => (
            <tr key={backup.id} className="hover:bg-gray-50">
              <td className="p-4 font-medium font-mono">{backup.filename}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${backup.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{backup.status}</span></td>
              <td className="p-4 text-gray-600">{new Date(backup.created_at).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-red-400" /> Quản trị Hệ thống</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex border-b mb-6">
          <button onClick={() => setActiveTab('roles')} className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'roles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            <Users className="w-5 h-5" /> Quản lý Phân quyền
          </button>
          <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-4 py-2 font-semibold ${activeTab === 'logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            <HardDrive className="w-5 h-5" /> Nhật ký Hệ thống
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          {loading && <div className="text-center py-10 text-gray-600">Đang tải dữ liệu...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert"><strong className="font-bold">Lỗi!</strong><span className="block sm:inline"> {error}</span></div>}
          {!loading && !error && (
            activeTab === 'roles' ? renderRoleManagement() : renderSystemLogs()
          )}
        </div>
      </main>
    </div>
  );
};

export default SystemManagement;