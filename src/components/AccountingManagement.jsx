import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, FileText, Wallet, BarChart3, Plus, Printer, ArrowLeft, Download, X, AlertCircle, Lock, Search } from 'lucide-react';

const AccountingManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('invoices'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);

  // ================= STATE QUẢN LÝ DỮ LIỆU KẾ TOÁN =================
  const [invoices, setInvoices] = useState([]);
  const [cashLedgerData, setCashLedgerData] = useState({ transactions: [], summary: { income: 0, expense: 0, balance: 0 } }); // Khởi tạo với balance
  const [reportData, setReportData] = useState(null);

  // Lấy token khi component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
    setToken(storedToken);
  }, []);

  // Hàm fetch API chung
  const fetchApi = useCallback(async (url, options = {}) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Có lỗi xảy ra');
      }
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ================= STATE QUẢN LÝ MODAL (POPUP NHẬP LIỆU) =================
  const [showTxModal, setShowTxModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Form thêm Thu Chi
  const [txForm, setTxForm] = useState({ type: 'income', category: 'Bán hàng', description: '', amount: '', method: 'Tiền mặt', file: null }); // Khởi tạo với type 'income' và trường 'description'
  const [modalError, setModalError] = useState(''); // State lưu lỗi cho validation trong modal
  
  // Form thêm Hóa đơn
  const [invForm, setInvForm] = useState({ order_id: '', customer_name: '', company_name: '', tax_id: '', address: '', total_amount: '' });

  // State lọc phương thức giao dịch (ACC_CASH_04)
  const [filterMethod, setFilterMethod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch dữ liệu khi tab thay đổi hoặc token sẵn sàng
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'invoices') {
      fetchApi('/api/accounting/invoices').then(data => data && setInvoices(data));
    } else if (activeTab === 'cashbook') {
      fetchCashLedger(); // Gọi hàm fetch riêng cho cash ledger
    } else if (activeTab === 'reports') {
      // Tự động lấy dữ liệu báo cáo cho kỳ hiện tại khi chuyển tab
      const current = new Date();
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      // ACC_FIN_01: Gọi API lấy báo cáo
      fetchApi(`/api/accounting/reports?year=${year}&month=${month}`).then(data => data && setReportData(data));
    }
  }, [activeTab, token, fetchApi]);

  const handleSearch = () => {
    if (activeTab !== 'invoices') return;
    fetchApi(`/api/accounting/invoices?search_term=${searchTerm}`).then(data => data && setInvoices(data));
  }

  // Hàm fetch riêng cho Cash Ledger để có thể gọi lại sau khi thêm/lọc
  const fetchCashLedger = useCallback(async (methodFilter = filterMethod) => {
    const url = `/api/accounting/cash-ledger?method=${methodFilter}`;
    const data = await fetchApi(url);
    if (data) {
      // Tính toán balance từ summary
      const balance = data.summary.income - data.summary.expense;
      setCashLedgerData({ ...data, summary: { ...data.summary, balance } });
    } else {
      setCashLedgerData({ transactions: [], summary: { income: 0, expense: 0, balance: 0 } });
    }
  }, [fetchApi, filterMethod]);


  // ================= HÀM XỬ LÝ LOGIC =================
  // Hàm bắt lỗi Upload chứng từ (ACC_CASH_06)
  const handleFileUpload = (e) => {
    setModalError('');
    const file = e.target.files[0];
    if (!file) return;

    // Validate định dạng file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setModalError('ACC_CASH_06: Sai định dạng! Chỉ cho phép upload file PDF, JPG, hoặc PNG.');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate dung lượng file (Tối đa 2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setModalError('ACC_CASH_06: Dung lượng file vượt quá 2MB cho phép!');
      e.target.value = ''; // Reset input
      return;
    }

    setTxForm({ ...txForm, file: file });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setModalError('');
    const payload = { // Đảm bảo payload đúng với CashLedgerCreate model và sử dụng txForm đã chuẩn hóa
      type: txForm.type,
      category: txForm.category,
      amount: parseInt(txForm.amount, 10),
      method: txForm.method,
      description: txForm.description
    };

    const result = await fetchApi('/api/accounting/cash-ledger', { method: 'POST', body: JSON.stringify(payload) });
    if (result) {
      alert(result.message);
      setShowTxModal(false);
      setTxForm({ type: 'income', category: 'Bán hàng', description: '', amount: '', method: 'Tiền mặt', file: null }); // Reset form
      fetchCashLedger(); // Refresh list
    } else {
      setModalError(error || 'Lỗi không xác định.');
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    setModalError('');
    const payload = {
      ...invForm,
      order_id: parseInt(invForm.order_id, 10),
      total_amount: parseInt(invForm.total_amount, 10)
    };
    const result = await fetchApi('/api/accounting/invoices', { method: 'POST', body: JSON.stringify(payload) });
    if (result) {
      alert(result.message);
      setShowInvoiceModal(false);
      setInvForm({ order_id: '', customer_name: '', company_name: '', tax_id: '', address: '', total_amount: '' }); // Reset form
      fetchApi('/api/accounting/invoices').then(data => data && setInvoices(data)); // Refresh list
    } else {
      setModalError(error || 'Lỗi không xác định.');
    }
  };

  const handleLockPeriod = async () => {
    const current = new Date();
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    if (window.confirm(`Bạn có chắc chắn muốn KHÓA SỔ kỳ kế toán ${month}/${year}? Hành động này không thể hoàn tác.`)) {
      const result = await fetchApi('/api/accounting/periods/lock', { method: 'POST', body: JSON.stringify({ month, year }) });
      if (result) {
        alert(result.message);
      }
    }
  };

  // Xử lý thay đổi filterMethod
  useEffect(() => {
    if (activeTab === 'cashbook') fetchCashLedger(filterMethod);
  }, [filterMethod, activeTab, fetchCashLedger]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Header Admin */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6 text-green-400" /> Quản lý Kế toán</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-green-600 px-3 py-1.5 rounded-lg font-medium">Kế toán trưởng</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-md" role="alert">
          <p className="font-bold">Lỗi Hệ thống</p>
          <p>{error}</p>
        </div>
      )}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('invoices')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'invoices' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <FileText className="w-5 h-5" /> Quản lý Hóa đơn
          </button>
          <button onClick={() => setActiveTab('cashbook')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'cashbook' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <Wallet className="w-5 h-5" /> Thu chi & Sổ sách
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <BarChart3 className="w-5 h-5" /> Báo cáo Tài chính
          </button>
        </div>

        {/* ================= TAB 1: HÓA ĐƠN ================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900">Danh sách Hóa đơn GTGT</h2>
                <div className="relative">
                  <input type="text" placeholder="Tìm theo mã HĐ, MST, tên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border border-gray-300 p-2 pl-8 rounded-lg text-sm"/>
                  <Search onClick={handleSearch} className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"/>
                </div>
              </div>
              
              <button onClick={() => {setShowInvoiceModal(true); setModalError('');}} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> Xuất Hóa đơn mới
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <th className="p-4 font-semibold">Mã HĐ</th>
                  <th className="p-4 font-semibold">Ngày lập</th>
                  <th className="p-4 font-semibold">Khách hàng / Đơn vị</th>
                  <th className="p-4 font-semibold">Mã số thuế</th>
                  <th className="p-4 font-semibold">Tổng tiền</th>
                  <th className="p-4 font-semibold">Trạng thái</th>
                  <th className="p-4 font-semibold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-green-600">HD-{String(inv.id).padStart(5, '0')}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(inv.issued_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 font-medium text-gray-900">{inv.company_name}</td>
                    <td className="p-4 text-sm text-gray-500">{inv.tax_id}</td>
                    <td className="p-4 font-bold text-gray-900">{inv.total_amount.toLocaleString()}đ</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Hủy</button>
                      <button className="ml-2 text-blue-500 hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">Tải PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 2: THU CHI ================= */}
        {activeTab === 'cashbook' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <p className="text-gray-500 font-medium mb-1">Số dư quỹ hiện tại</p>
                <p className="text-3xl font-black text-blue-900">{cashLedgerData.summary.balance?.toLocaleString() || 0}đ</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 bg-green-50/50">
                <p className="text-green-600 font-medium mb-1">Tổng Thu (Trong kỳ)</p>
                <p className="text-3xl font-black text-green-700">+ {cashLedgerData.summary.income.toLocaleString()}đ</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 bg-red-50/50">
                <p className="text-red-600 font-medium mb-1">Tổng Chi (Trong kỳ)</p>
                <p className="text-3xl font-black text-red-700">- {cashLedgerData.summary.expense.toLocaleString()}đ</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-gray-900">Sổ Nhật Ký Thu Chi</h2>
                  <select 
                    value={filterMethod} 
                    onChange={e => setFilterMethod(e.target.value)} // ACC_CASH_04
                    className="border border-gray-300 p-2 rounded-lg text-sm outline-none focus:border-green-500 font-medium text-gray-700"
                  >
                    <option value="all">Tất cả</option>
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                  </select>
                </div>
                <button onClick={() => {setShowTxModal(true); setModalError('');}} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Lập Phiếu Thu/Chi
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                    <th className="p-4 font-semibold">Mã GD</th>
                    <th className="p-4 font-semibold">Thời gian</th>
                    <th className="p-4 font-semibold">Loại</th>
                    <th className="p-4 font-semibold">Hạng mục</th>
                    <th className="p-4 font-semibold">Diễn giải</th>
                    <th className="p-4 font-semibold">Số tiền</th>
                    <th className="p-4 font-semibold">PTTT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100"> 
                  {Array.isArray(cashLedgerData.transactions) && cashLedgerData.transactions.length > 0 ? (
                    cashLedgerData.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">TC-{String(tx.id).padStart(3, '0')}</td>
                      <td className="p-4 text-sm text-gray-600">{new Date(tx.created_at).toLocaleString('vi-VN')}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tx.type === 'income' ? 'Thu' : 'Chi'}</span></td>
                      <td className="p-4 font-medium text-gray-700">{tx.category}</td>
                      <td className="p-4 text-sm text-gray-600">{tx.description}</td>
                      <td className={`p-4 font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}đ</td>
                      <td className="p-4 text-sm font-medium text-gray-500">{tx.method}</td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-gray-500">Chưa có giao dịch nào được ghi nhận.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BÁO CÁO ================= */}
        {activeTab === 'reports' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Báo cáo Tài chính</h2>
                <p className="text-gray-500 mt-2">Kỳ báo cáo: Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
              </div>
              <div className="text-right"><p className="text-sm font-bold text-gray-500">Trạng thái kỳ</p><span className="text-lg font-bold text-green-600">Đang mở</span></div>
            </div>
            {/* Các số liệu báo cáo */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-bold text-gray-700 text-lg">1. Tổng doanh thu bán hàng</span>
                <span className="font-black text-gray-900 text-lg">{(reportData?.total_revenue || 0).toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-gray-800 bg-gray-50 px-4 rounded-lg">
                <span className="font-bold text-blue-800 text-lg">2. Doanh thu thuần</span>
                <span className="font-black text-blue-800 text-lg">{(reportData?.total_revenue || 0).toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-bold text-gray-700 text-lg">3. Giá vốn hàng bán</span>
                <span className="font-bold text-red-600 text-lg">({(reportData?.cogs || 0).toLocaleString()}đ)</span>
              </div>
              <div className="flex justify-between items-center py-5 border-t-4 border-double border-gray-900 mt-4 px-4 bg-gray-900 text-white rounded-xl shadow-lg">
                <span className="font-black text-xl">LỢI NHUẬN THUẦN TỪ HOẠT ĐỘNG KD</span>
                <span className="font-black text-2xl text-green-400">{(reportData?.net_profit || 0).toLocaleString()}đ</span>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button onClick={handleLockPeriod} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-red-200"><Lock className="w-5 h-5"/> Khóa Sổ Kỳ Này</button>
              <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-green-200"><Download className="w-5 h-5"/> Xuất Excel</button>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL LẬP PHIẾU THU CHI ================= */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Lập Phiếu Thu / Chi</h2>
              <button onClick={() => setShowTxModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm font-medium border border-red-100 animate-pulse">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <span className="leading-tight">{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại giao dịch</label>
                  <select value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500"> 
                    <option value="income">Khoản Thu</option> 
                    <option value="expense">Khoản Chi</option> 
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hạng mục</label>
                  <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500">
                    {txForm.type === 'income' ? (<><option value="Bán hàng">Bán hàng</option><option value="Thu nợ">Thu nợ</option></>) : (<><option value="Vận hành">Vận hành</option><option value="Lương">Lương</option><option value="Nhập hàng">Nhập hàng</option></>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số tiền (VNĐ)</label>
                {/* Sử dụng type text để bắt Test Case ACC_CASH_03: có nhập được chữ cái không */}
                <input required type="number" placeholder="Ví dụ: 2500000" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phương thức</label>
                <select value={txForm.method} onChange={e => setTxForm({...txForm, method: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500">
                  <option>Tiền mặt</option><option>Chuyển khoản</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Upload chứng từ đính kèm (ACC_CASH_06)</label>
                <input type="file" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" className="w-full border p-2 rounded-xl bg-gray-50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                <p className="text-xs text-gray-500 mt-1.5 ml-1">Chỉ chấp nhận file định dạng PDF, JPG, PNG. Tối đa 2MB.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Diễn giải</label>
                <input required type="text" placeholder="Lý do thu/chi..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500"/>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-blue-200">Xác nhận Ghi Sổ</button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XUẤT HÓA ĐƠN ================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Xuất Hóa Đơn GTGT Mới</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddInvoice} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm font-medium border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <span className="leading-tight">{modalError}</span>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mã đơn hàng gốc</label>
                  <input required type="number" placeholder="Ví dụ: 123" value={invForm.order_id} onChange={e => setInvForm({...invForm, order_id: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
                 <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên người mua hàng</label>
                  <input required type="text" placeholder="Nguyễn Văn A" value={invForm.customer_name} onChange={e => setInvForm({...invForm, customer_name: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đơn vị mua</label>
                  <input required type="text" placeholder="CÔNG TY TNHH..." value={invForm.company_name} onChange={e => setInvForm({...invForm, company_name: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mã số thuế</label>
                  <input required type="text" placeholder="10 hoặc 13 chữ số" value={invForm.tax_id} onChange={e => setInvForm({...invForm, tax_id: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ xuất hóa đơn</label>
                  <input required type="text" placeholder="Số nhà, đường, phường, quận, thành phố" value={invForm.address} onChange={e => setInvForm({...invForm, address: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tổng tiền (VNĐ)</label>
                  <input required type="number" placeholder="Nhập số tiền..." value={invForm.total_amount} onChange={e => setInvForm({...invForm, total_amount: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-green-200">Phát hành Hóa đơn</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountingManagement;