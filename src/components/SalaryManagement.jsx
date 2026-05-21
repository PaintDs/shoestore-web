import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, DollarSign, Calendar, Lock, FileDown, X, Gift } from 'lucide-react';

// Helper function to format currency
const formatCurrency = (amount) => {
    if (typeof amount !== 'number') {
        return '0 VNĐ';
    }
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
};

const SalaryManagement = ({ onBack }) => {
  // --- STATES ---
  const [payrollData, setPayrollData] = useState([]); // Dữ liệu bảng lương
  const [employees, setEmployees] = useState([]); // Danh sách nhân viên cho dropdown
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Thông báo lỗi

  const [currentDate, setCurrentDate] = useState(new Date('2026-05-01')); // Mặc định tháng 5 năm 2026

  // State quản lý hiển thị các Modal
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false); // Chưa dùng nhưng khai báo sẵn
  const [showBonusPenaltyModal, setShowBonusPenaltyModal] = useState(false);

  // State cho các Form nhập liệu
  const [setupForm, setSetupForm] = useState({ user_id: '', base_salary: '', coefficient: 1.0 });
  const [timesheetForm, setTimesheetForm] = useState({ user_id: '', work_date: new Date().toISOString().split('T')[0], hours_worked: 8 }); // Mặc định ngày hôm nay
  const [bonusPenaltyForm, setBonusPenaltyForm] = useState({ user_id: '', amount: '', reason: '' });
  
  // State cho nhân viên được chọn khi thực hiện hành động cụ thể (ví dụ: thưởng/phạt)
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Token và Headers (placeholder, sẽ được dùng khi nạp logic API)
  const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // --- DERIVED STATES ---
  // Kiểm tra xem bảng lương của tháng hiện tại đã bị khóa chưa
  const isPayrollLocked = useMemo(() => {
    // Nếu không có dữ liệu hoặc không có mục nào bị khóa, coi như chưa khóa
    if (payrollData.length === 0) return false;
    // Kiểm tra xem có ít nhất một nhân viên có trạng thái 'locked' không
    return payrollData.some(p => p.status === 'locked');
  }, [payrollData]);

  // --- DATA FETCHING ---
  // Hàm nạp dữ liệu bảng lương
  const fetchPayrollData = async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/salaries/payroll/${year}/${month}`, { headers });
      if (!response.ok) {
          const errData = await response.json();
          let errMsg = errData.detail || `Lỗi khi tải bảng lương: ${response.statusText}`;
          if (Array.isArray(errData.detail)) {
              errMsg = errData.detail.map(err => `Trường [${err.loc[err.loc.length - 1]}]: ${err.msg}`).join('\n');
          }
          throw new Error(errMsg);
      }
      const data = await response.json();
      setPayrollData(data);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu lương.");
      setPayrollData([]); // Xóa dữ liệu cũ khi có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Hàm nạp danh sách nhân viên
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/users/employees`, { headers });
      if (!response.ok) throw new Error('Lỗi khi tải danh sách nhân viên');
      const data = await response.json();
      setEmployees(data);
      // Gán nhân viên mặc định cho form nếu có
      if (data.length > 0) {
        setSetupForm(prev => ({ ...prev, user_id: data[0].id }));
        setTimesheetForm(prev => ({ ...prev, user_id: data[0].id }));
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhân viên:", err.message);
      // Không cần set lỗi ở đây vì đây là dữ liệu phụ
    }
  };

  // useEffect để nạp dữ liệu khi component mount hoặc khi thay đổi tháng/năm
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchPayrollData(year, month);
    fetchEmployees();
  }, [currentDate]);

  // --- API HANDLERS ---
  // Hàm gọi API chung, xử lý lỗi và làm mới dữ liệu
  const handleApiCall = async (endpoint, method, body, successMessage) => {
    try {
      const config = { method, headers };
      if (body) {
          config.body = JSON.stringify(body);
      }
      const response = await fetch(endpoint, config);
      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          const errorMessages = data.detail.map(err => `Trường [${err.loc[err.loc.length - 1]}]: ${err.msg}`).join('\n');
          throw new Error(`Dữ liệu không hợp lệ:\n${errorMessages}`);
        }
        throw new Error(data.detail || 'Thao tác thất bại.');
      }
      alert(successMessage);
      // Tự động làm mới dữ liệu sau khi thành công
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      fetchPayrollData(year, month);
      return true;
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
      return false;
    }
  };

  // Logic Lưu cấu hình lương (MGR_SAL_01, MGR_SAL_02)
  const handleSetupSalary = async (e) => {
    e.preventDefault();
    // Validate trực tiếp tại UI
    if (!setupForm.user_id) {
        alert("Vui lòng chọn nhân viên."); return;
    }
    if (isNaN(setupForm.base_salary) || Number(setupForm.base_salary) <= 0) {
      alert("Báo lỗi định dạng số liệu: Lương cơ bản không hợp lệ, phải là số dương.");
      return;
    }
    if (isNaN(setupForm.coefficient) || Number(setupForm.coefficient) <= 0) {
      alert("Báo lỗi định dạng số liệu: Hệ số lương không hợp lệ, phải là số dương.");
      return;
    }
    const payload = {
        user_id: Number(setupForm.user_id),
        base_salary: Number(setupForm.base_salary),
        coefficient: Number(setupForm.coefficient)
    };
    const success = await handleApiCall('/api/salaries/setup', 'POST', payload, 'Thiết lập lương thành công!');
    if (success) setShowSetupModal(false);
  };

  // Logic Thêm Thưởng/Phạt (MGR_SAL_05)
  const handleAddBonusPenalty = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
        alert("Lỗi: Không có nhân viên nào được chọn."); return;
    }
    if (isNaN(bonusPenaltyForm.amount) || Number(bonusPenaltyForm.amount) === 0) {
      alert("Số tiền thưởng/phạt không hợp lệ. Phải là số khác 0.");
      return;
    }
    if (!bonusPenaltyForm.reason.trim()) {
      alert("Vui lòng nhập lý do thưởng/phạt.");
      return;
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const payload = {
        user_id: selectedEmployee.user_id,
        amount: Number(bonusPenaltyForm.amount),
        reason: bonusPenaltyForm.reason,
        year,
        month
    };
    const success = await handleApiCall(
      '/api/salaries/bonus-penalty',
      'POST',
      payload,
      'Thêm thưởng/phạt thành công!'
    );
    if (success) {
      setShowBonusPenaltyModal(false);
      setSelectedEmployee(null); // Reset selected employee
      setBonusPenaltyForm({ user_id: '', amount: '', reason: '' }); // Reset form
    }
  };

  // Logic Chốt bảng lương (MGR_SAL_06)
  const handleLockPayroll = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn CHỐT BẢNG LƯƠNG tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}? Sau khi chốt sẽ không thể thay đổi.`)) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await handleApiCall(`/api/salaries/finalize/${year}/${month}`, 'POST', null, 'Chốt bảng lương thành công!');
    // Dữ liệu sẽ tự động được làm mới bởi handleApiCall, và UI sẽ disable các nút.
  };

  // Logic Xuất dữ liệu (MGR_SAL_07)
  const handleExportPayroll = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    try {
      const response = await fetch(`/api/salaries/export?year=${year}&month=${month}`, { headers });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Xuất báo cáo thất bại.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll_${year}_${String(month).padStart(2, '0')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleTimesheetSubmit = async (e) => {
    e.preventDefault();
    if (!timesheetForm.user_id) {
      alert('Vui lòng chọn nhân viên.');
      return;
    }
    const hours = Number(timesheetForm.hours_worked);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      alert('Số giờ làm việc phải từ 0.5 đến 24.');
      return;
    }
    const payload = {
      user_id: Number(timesheetForm.user_id),
      work_date: timesheetForm.work_date,
      hours_worked: hours,
    };
    const success = await handleApiCall('/api/salaries/timesheet', 'POST', payload, 'Chấm công thành công!');
    if (success) setShowTimesheetModal(false);
  };

  // --- MODAL OPEN HANDLERS ---
  // Hàm mở modal thưởng/phạt cho một nhân viên cụ thể
  const openBonusPenaltyModal = (employee) => {
    setSelectedEmployee(employee);
    // Reset form khi mở modal
    setBonusPenaltyForm({ user_id: employee.user_id, amount: '', reason: '' });
    setShowBonusPenaltyModal(true);
  };

  // --- RENDER UI ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-yellow-400" /> Quản lý Lương nhân viên</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">Bảng lương tháng:</h2>
              <input type="month" value={`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`} onChange={e => setCurrentDate(new Date(e.target.value))} className="border p-2 rounded-lg" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowSetupModal(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isPayrollLocked}>
                  <DollarSign className="w-4 h-4" /> Thiết lập Lương
              </button>
              <button onClick={() => setShowTimesheetModal(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isPayrollLocked}>
                  <Calendar className="w-4 h-4" /> Chấm công
              </button>
              <button onClick={handleLockPayroll} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isPayrollLocked}>
                  <Lock className="w-4 h-4" /> Chốt Bảng lương
              </button>
              <button onClick={handleExportPayroll} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
                  <FileDown className="w-4 h-4" /> Xuất Excel
              </button>
            </div>
          </div>

          {loading && <div className="text-center py-10 text-gray-600">Đang tải dữ liệu lương...</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert"><strong className="font-bold">Lỗi!</strong><span className="block sm:inline"> {error}</span></div>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                        <tr>
                            <th className="p-4">Nhân viên</th>
                            <th className="p-4">Ngày công</th>
                            <th className="p-4">Hoa hồng</th>
                            <th className="p-4">Thưởng</th>
                            <th className="p-4">Phạt</th>
                            <th className="p-4">Tổng lương</th>
                            <th className="p-4">Trạng thái</th>
                            <th className="p-4">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {payrollData.map((p) => (
                            <tr key={p.user_id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{p.name} <span className="text-xs text-gray-400">({p.role})</span></td>
                                <td className="p-4 font-bold">{p.work_days || 0}</td>
                                <td className="p-4 text-blue-600">{formatCurrency(p.commission)}</td>
                                <td className="p-4 text-green-600">{formatCurrency(p.bonus)}</td>
                                <td className="p-4 text-red-600">{formatCurrency(p.penalty)}</td>
                                <td className="p-4 font-black text-lg text-green-700">{formatCurrency(p.total_salary)}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'locked' ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-700'}`}>
                                        {p.status === 'locked' ? 'Đã chốt' : 'Bản nháp'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => openBonusPenaltyModal(p)} 
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 text-xs disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        disabled={p.status === 'locked'}
                                    >
                                        <Gift className="w-4 h-4" /> Thưởng/Phạt
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-bold">Thiết lập Lương Cơ bản</h2><button onClick={() => setShowSetupModal(false)}><X/></button></div>
            <form onSubmit={handleSetupSalary} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nhân viên</label>
                <select required value={setupForm.user_id} onChange={e => setSetupForm({ ...setupForm, user_id: e.target.value })} className="w-full border p-2.5 rounded-xl">
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
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
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Chấm công</h2>
              <button onClick={() => setShowTimesheetModal(false)}><X/></button>
            </div>
            <form onSubmit={handleTimesheetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nhân viên</label>
                <select required value={timesheetForm.user_id} onChange={e => setTimesheetForm({ ...timesheetForm, user_id: e.target.value })} className="w-full border p-2.5 rounded-xl">
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Ngày làm việc</label>
                <input required type="date" value={timesheetForm.work_date} onChange={e => setTimesheetForm({ ...timesheetForm, work_date: e.target.value })} className="w-full border p-2.5 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Số giờ</label>
                <input required type="number" min="0.5" max="24" step="0.5" value={timesheetForm.hours_worked} onChange={e => setTimesheetForm({ ...timesheetForm, hours_worked: e.target.value })} className="w-full border p-2.5 rounded-xl" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Lưu chấm công</button>
            </form>
          </div>
        </div>
      )}

      {showBonusPenaltyModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold">Thưởng/Phạt cho: <span className="text-blue-600">{selectedEmployee.name}</span></h2>
                <button onClick={() => setShowBonusPenaltyModal(false)}><X/></button>
            </div>
            <form onSubmit={handleAddBonusPenalty} className="space-y-4">
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