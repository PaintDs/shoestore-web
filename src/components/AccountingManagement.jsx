import React, { useState } from 'react';
import { Calculator, FileText, Wallet, BarChart3, Plus, Printer, ArrowLeft, Download, X } from 'lucide-react';

const AccountingManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('invoices'); 

  // ================= STATE QUẢN LÝ DỮ LIỆU KẾ TOÁN =================
  // 1. Dữ liệu Hóa đơn
  const [invoices, setInvoices] = useState([
    { id: "HD-00124", date: "09/05/2026", customer: "CÔNG TY TNHH ABC", taxId: "0101234567", amount: "5.230.000đ", status: "Đã xuất" },
    { id: "HD-00125", date: "09/05/2026", customer: "Nguyễn Văn A", taxId: "-", amount: "3.400.000đ", status: "Chờ xuất" },
  ]);

  // 2. Dữ liệu Thu Chi
  const [transactions, setTransactions] = useState([
    { id: "TC-101", date: "09/05/2026 08:30", type: "Thu", category: "Bán hàng", desc: "Doanh thu ca sáng", amount: "+ 12.500.000đ", method: "Chuyển khoản" },
    { id: "TC-102", date: "09/05/2026 14:15", type: "Chi", category: "Vận hành", desc: "Thanh toán tiền điện tháng 4", amount: "- 2.100.000đ", method: "Tiền mặt" },
    { id: "TC-103", date: "09/05/2026 16:00", type: "Chi", category: "Lương", desc: "Tạm ứng lương NV Kho", amount: "- 3.000.000đ", method: "Chuyển khoản" },
  ]);

  // ================= STATE QUẢN LÝ MODAL (POPUP NHẬP LIỆU) =================
  const [showTxModal, setShowTxModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Form thêm Thu Chi
  const [txForm, setTxForm] = useState({ type: 'Thu', category: 'Bán hàng', desc: '', amount: '', method: 'Tiền mặt' });
  
  // Form thêm Hóa đơn
  const [invForm, setInvForm] = useState({ customer: '', taxId: '', amount: '' });

  // ================= HÀM XỬ LÝ LOGIC =================
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const newId = `TC-${Math.floor(Math.random() * 1000) + 200}`;
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/05/2026 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const formattedAmount = `${txForm.type === 'Thu' ? '+' : '-'} ${Number(txForm.amount).toLocaleString()}đ`;

    const newTx = { id: newId, date: dateStr, type: txForm.type, category: txForm.category, desc: txForm.desc, amount: formattedAmount, method: txForm.method };
    setTransactions([newTx, ...transactions]); // Thêm lên đầu mảng
    setShowTxModal(false); // Đóng modal
    setTxForm({ type: 'Thu', category: 'Bán hàng', desc: '', amount: '', method: 'Tiền mặt' }); // Reset form
  };

  const handleAddInvoice = (e) => {
    e.preventDefault();
    const newId = `HD-00${Math.floor(Math.random() * 100) + 126}`;
    const formattedAmount = `${Number(invForm.amount).toLocaleString()}đ`;

    const newInv = { id: newId, date: "09/05/2026", customer: invForm.customer, taxId: invForm.taxId || '-', amount: formattedAmount, status: "Chờ xuất" };
    setInvoices([newInv, ...invoices]);
    setShowInvoiceModal(false);
    setInvForm({ customer: '', taxId: '', amount: '' });
  };

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

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('invoices')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'invoices' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <FileText className="w-5 h-5" /> Quản lý Hóa đơn
          </button>
          <button onClick={() => setActiveTab('cashbook')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'cashbook' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <Wallet className="w-5 h-5" /> Thu chi & Sổ sách
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <BarChart3 className="w-5 h-5" /> Báo cáo Tài chính
          </button>
        </div>

        {/* ================= TAB 1: HÓA ĐƠN ================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Danh sách Hóa đơn GTGT</h2>
              <button onClick={() => setShowInvoiceModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> Xuất Hóa đơn mới
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
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
                    <td className="p-4 font-bold text-green-600">{inv.id}</td>
                    <td className="p-4 text-sm text-gray-600">{inv.date}</td>
                    <td className="p-4 font-medium text-gray-900">{inv.customer}</td>
                    <td className="p-4 text-sm text-gray-500">{inv.taxId}</td>
                    <td className="p-4 font-bold text-gray-900">{inv.amount}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === 'Đã xuất' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button className="p-1.5 text-gray-500 hover:text-green-600" title="In hóa đơn"><Printer className="w-5 h-5" /></button>
                      <button className="p-1.5 text-gray-500 hover:text-blue-600" title="Tải file XML"><Download className="w-5 h-5" /></button>
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
                <p className="text-gray-500 font-medium mb-1">Tổng Quỹ Đầu Kỳ</p>
                <p className="text-3xl font-black text-gray-900">45.000.000đ</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 bg-green-50/50">
                <p className="text-green-600 font-medium mb-1">Tổng Thu (Trong kỳ)</p>
                <p className="text-3xl font-black text-green-700">+ 128.500.000đ</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 bg-red-50/50">
                <p className="text-red-600 font-medium mb-1">Tổng Chi (Trong kỳ)</p>
                <p className="text-3xl font-black text-red-700">- 42.100.000đ</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Sổ Nhật Ký Thu Chi</h2>
                <button onClick={() => setShowTxModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Lập Phiếu Thu/Chi
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
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
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{tx.id}</td>
                      <td className="p-4 text-sm text-gray-600">{tx.date}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'Thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tx.type}</span></td>
                      <td className="p-4 font-medium text-gray-700">{tx.category}</td>
                      <td className="p-4 text-sm text-gray-600">{tx.desc}</td>
                      <td className={`p-4 font-bold ${tx.type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>{tx.amount}</td>
                      <td className="p-4 text-sm font-medium text-gray-500">{tx.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BÁO CÁO (Giữ nguyên) ================= */}
        {activeTab === 'reports' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
            <div className="text-center mb-8 border-b pb-6">
              <h2 className="text-2xl font-black text-gray-900 uppercase">Báo cáo Kết quả Hoạt động Kinh doanh</h2>
              <p className="text-gray-500 mt-2">Kỳ báo cáo: Tháng 05/2026</p>
            </div>
            {/* Các số liệu báo cáo */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-bold text-gray-700 text-lg">1. Tổng doanh thu bán hàng</span>
                <span className="font-black text-gray-900 text-lg">128.500.000đ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-gray-800 bg-gray-50 px-4 rounded-lg">
                <span className="font-bold text-blue-800 text-lg">2. Doanh thu thuần</span>
                <span className="font-black text-blue-800 text-lg">125.000.000đ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-bold text-gray-700 text-lg">3. Giá vốn hàng bán</span>
                <span className="font-bold text-red-600 text-lg">(75.000.000đ)</span>
              </div>
              <div className="flex justify-between items-center py-5 border-t-4 border-double border-gray-900 mt-4 px-4 bg-gray-900 text-white rounded-xl shadow-lg">
                <span className="font-black text-xl">LỢI NHUẬN THUẦN TỪ HOẠT ĐỘNG KD</span>
                <span className="font-black text-2xl text-green-400">15.000.000đ</span>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-green-200"><Download className="w-5 h-5"/> Xuất Excel</button>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL LẬP PHIẾU THU CHI ================= */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Lập Phiếu Thu / Chi</h2>
              <button onClick={() => setShowTxModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Loại giao dịch</label>
                  <select value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500">
                    <option value="Thu">Khoản Thu</option>
                    <option value="Chi">Khoản Chi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hạng mục</label>
                  <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500">
                    {txForm.type === 'Thu' ? <><option>Bán hàng</option><option>Thu nợ</option></> : <><option>Vận hành</option><option>Lương</option><option>Nhập hàng</option></>}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số tiền (VNĐ)</label>
                <input required type="number" placeholder="Ví dụ: 2500000" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phương thức</label>
                <select value={txForm.method} onChange={e => setTxForm({...txForm, method: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500">
                  <option>Tiền mặt</option><option>Chuyển khoản</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Diễn giải</label>
                <input required type="text" placeholder="Lý do thu/chi..." value={txForm.desc} onChange={e => setTxForm({...txForm, desc: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500"/>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4">Xác nhận Ghi Sổ</button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XUẤT HÓA ĐƠN ================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Xuất Hóa Đơn GTGT Mới</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Khách hàng / Đơn vị mua</label>
                <input required type="text" placeholder="CÔNG TY TNHH..." value={invForm.customer} onChange={e => setInvForm({...invForm, customer: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã số thuế</label>
                <input type="text" placeholder="Để trống nếu là khách lẻ" value={invForm.taxId} onChange={e => setInvForm({...invForm, taxId: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tổng tiền (VNĐ)</label>
                <input required type="number" placeholder="Nhập số tiền..." value={invForm.amount} onChange={e => setInvForm({...invForm, amount: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-green-500"/>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mt-4">Phát hành Hóa đơn</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountingManagement;