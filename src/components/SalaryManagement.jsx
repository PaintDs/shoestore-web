import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, DollarSign, Plus, Lock, FileDown, X, AlertCircle, Save, Gift, ShieldAlert } from 'lucide-react';

const SalaryManagement = ({ onBack }) => {
  const [payrollData, setPayrollData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showBonusPenaltyModal, setShowBonusPenaltyModal] = useState(false);

  const [setupForm, setSetupForm] = useState({ user_id: '', base_salary: '', coefficient: 1.0 });
  const [timesheetForm, setTimesheetForm] = useState({ user_id: '', work_date: '', hours_worked: 8 });
  const [bonusPenaltyForm, setBonusPenaltyForm] = useState({ user_id: '', amount: '', reason: '' });

  const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchPayrollData = async () => {
    setLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(`http://localhost:8000/api/salaries/payroll/${year}/${month}`, { headers });
      if (!response.ok) throw new Error(`Lỗi khi tải bảng lương: ${response.statusText}`);
      const data = await response.json();
      setPayrollData(data);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu lương.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    // This endpoint doesn't exist, so we'll mock it or assume payroll data has user info.
    // For now, we'll populate users from the payroll data itself.
  };

  useEffect(() => {
    fetchPayrollData();
    fetchUsers();
  }, [currentDate]);

  const handleApiCall = async (endpoint, method, body, successMessage) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, { method, headers, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Thao tác thất bại.');
      alert(successMessage);
      fetchPayrollData(); // Refresh data
      return true;
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
      return false;
    }
  };

  const handleSetupSalary = async (e) => {
    e.preventDefault();
    const success = await handleApiCall('/api/salaries/setup', 'POST', { ...setupForm, base_salary: Number(setupForm.base_salary), coefficient: Number(setupForm.coefficient) }, 'Thiết lập lương thành công!');
    if (success) setShowSetupModal(false);
  };

  const handleUpdateTimesheet = async (e) => {
    e.preventDefault();
    const success = await handleApiCall('/api/salaries/timesheet', 'POST', { ...timesheetForm, hours_worked: Number(timesheetForm.hours_worked) }, 'Chấm công thành công!');
    if (success) setShowTimesheetModal(false);
  };

  const handleAddBonusPenalty = async (e) => {
    e.preventDefault();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const success = await handleApiCall('/api/salaries/bonus-penalty', 'POST', { ...bonusPenaltyForm, amount: Number(bonusPenaltyForm.amount), year, month }, 'Thêm thưởng/phạt thành công!');
    if (success) setShowBonusPenaltyModal(false);
  };

  const handleLockPayroll = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn CHỐT BẢNG LƯƠNG tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}? Sau khi chốt sẽ không thể thay đổi.`)) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await handleApiCall(`/api/salaries/finalize/${year}/${month}`, 'POST', null, 'Chốt bảng lương thành công!');
  };

  const handleExportPayroll = async () => {
    await handleApiCall('/api/salaries/export', 'GET', null, 'Đang xuất báo cáo lương...');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0) + ' VNĐ';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-yellow-400" /> Quản lý Lương nhân viên</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">Bảng lương tháng:</h2>
              <input type="month" value={`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`} onChange={e => setCurrentDate(new Date(e.target.value))} className="border p-2 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSetupModal(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-50"><DollarSign className="w-4 h-4" /> Thiết lập Lương</button>
              <button onClick={() => setShowTimesheetModal(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-50"><Calendar className="w-4 h-4" /> Chấm công</button>
              <button onClick={() => setShowBonusPenaltyModal(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-50"><Gift className="w-4 h-4" /> Thưởng/Phạt</button>
              <button onClick={handleLockPayroll} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm"><Lock className="w-4 h-4" /> Chốt Bảng lương</button>
              <button onClick={handleExportPayroll} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm"><FileDown className="w-4 h-4" /> Xuất Excel</button>
            </div>
          </div>

          {loading && <div className="text-center py-10 text-gray-600">Đang tải dữ liệu lương...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert"><strong className="font-bold">Lỗi!</strong><span className="block sm:inline"> {error}</span></div>}
          {!loading && !error && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                <tr>
                  <th className="p-4">Nhân viên</th>
                  <th className="p-4">Lương cứng</th>
                  <th className="p-4">Ngày công</th>
                  <th className="p-4">Hoa hồng</th>
                  <th className="p-4">Thưởng / Phạt</th>
                  <th className="p-4">Thực lĩnh</th>
                  <th className="p-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollData.map((p) => (
                  <tr key={p.user_id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{p.name} <span className="text-xs text-gray-400">({p.role})</span></td>
                    <td className="p-4">{formatCurrency(p.base_salary)}</td>
                    <td className="p-4 font-bold">{p.work_days || 0}</td>
                    <td className="p-4 text-blue-600">{formatCurrency(p.commission)}</td>
                    <td className="p-4">
                      <span className="text-green-600">{formatCurrency(p.bonus)}</span> / <span className="text-red-600">{formatCurrency(p.penalty)}</span>
                    </td>
                    <td className="p-4 font-black text-lg text-green-700">{formatCurrency(p.total_salary)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'locked' ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-700'}`}>
                        {p.status === 'locked' ? 'Đã chốt' : 'Chưa chốt'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modals */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-bold">Thiết lập Lương Cơ bản</h2><button onClick={() => setShowSetupModal(false)}><X/></button></div>
            <form onSubmit={handleSetupSalary} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nhân viên</label>
                <select required value={setupForm.user_id} onChange={e => setSetupForm({ ...setupForm, user_id: e.target.value })} className="w-full border p-2.5 rounded-xl">
                  <option value="">-- Chọn nhân viên --</option>
                  {payrollData.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Lương cơ bản (VNĐ)</label><input required type="number" min="1" value={setupForm.base_salary} onChange={e => setSetupForm({ ...setupForm, base_salary: e.target.value })} className="w-full border p-2.5 rounded-xl"/></div>
              <div><label className="block text-sm font-semibold mb-1">Hệ số lương</label><input type="number" step="0.1" min="0.1" value={setupForm.coefficient} onChange={e => setSetupForm({ ...setupForm, coefficient: e.target.value })} className="w-full border p-2.5 rounded-xl"/></div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Lưu Thiết lập</button>
            </form>
          </div>
        </div>
      )}

      {showTimesheetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-bold">Chấm công</h2><button onClick={() => setShowTimesheetModal(false)}><X/></button></div>
            <form onSubmit={handleUpdateTimesheet} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nhân viên</label>
                <select required value={timesheetForm.user_id} onChange={e => setTimesheetForm({ ...timesheetForm, user_id: e.target.value })} className="w-full border p-2.5 rounded-xl">
                  <option value="">-- Chọn nhân viên --</option>
                  {payrollData.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Ngày làm việc</label><input required type="date" value={timesheetForm.work_date} onChange={e => setTimesheetForm({ ...timesheetForm, work_date: e.target.value })} className="w-full border p-2.5 rounded-xl"/></div>
              <div><label className="block text-sm font-semibold mb-1">Số giờ làm việc</label><input required type="number" step="0.5" min="0" value={timesheetForm.hours_worked} onChange={e => setTimesheetForm({ ...timesheetForm, hours_worked: e.target.value })} className="w-full border p-2.5 rounded-xl"/></div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Xác nhận Chấm công</button>
            </form>
          </div>
        </div>
      )}

      {showBonusPenaltyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-bold">Thêm Thưởng / Phạt</h2><button onClick={() => setShowBonusPenaltyModal(false)}><X/></button></div>
            <form onSubmit={handleAddBonusPenalty} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nhân viên</label>
                <select required value={bonusPenaltyForm.user_id} onChange={e => setBonusPenaltyForm({ ...bonusPenaltyForm, user_id: e.target.value })} className="w-full border p-2.5 rounded-xl">
                  <option value="">-- Chọn nhân viên --</option>
                  {payrollData.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Số tiền (VNĐ)</label><input required type="number" value={bonusPenaltyForm.amount} onChange={e => setBonusPenaltyForm({ ...bonusPenaltyForm, amount: e.target.value })} className="w-full border p-2.5 rounded-xl" placeholder="Nhập số dương để Thưởng, số âm để Phạt"/></div>
              <div><label className="block text-sm font-semibold mb-1">Lý do</label><input required type="text" value={bonusPenaltyForm.reason} onChange={e => setBonusPenaltyForm({ ...bonusPenaltyForm, reason: e.target.value })} className="w-full border p-2.5 rounded-xl" placeholder="VD: Thưởng KPI, Phạt đi muộn..."/></div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Lưu thay đổi</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;