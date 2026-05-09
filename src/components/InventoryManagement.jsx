import React, { useState } from 'react';
import { PackageSearch, ArrowLeft, Plus, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, RotateCcw, Boxes, X, AlertCircle } from 'lucide-react';

const InventoryManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('products'); // products, transactions, audit, returns

  // ================= STATE DỮ LIỆU KHO =================
  // 1. Dữ liệu Hàng hóa & Vị trí lưu trữ (Location/Bin)
  const [products, setProducts] = useState([
    { id: "SP-001", name: "Air Jordan 1 Retro High", stock: 45, bin: "A1-Kệ 01", status: "Bình thường" },
    { id: "SP-002", name: "Adidas Ultraboost Light", stock: 12, bin: "B2-Kệ 03", status: "Sắp hết" },
    { id: "SP-003", name: "Nike Pegasus 40", stock: 0, bin: "A2-Kệ 02", status: "Hết hàng" },
  ]);

  // 2. Lịch sử Nhập / Xuất kho
  const [transactions, setTransactions] = useState([
    { id: "PN-052026-01", date: "09/05/2026", type: "Nhập kho", sku: "SP-001", qty: "+50", note: "Nhập từ nhà cung cấp Nike VN" },
    { id: "PX-052026-01", date: "09/05/2026", type: "Xuất kho", sku: "SP-002", qty: "-2", note: "Xuất giao đơn vị vận chuyển J&T" },
  ]);

  // 3. Lịch sử Kiểm kê
  const [audits, setAudits] = useState([
    { id: "KK-042026", date: "30/04/2026", sku: "SP-002", sysQty: 14, actualQty: 12, diff: -2, note: "Thất thoát chưa rõ nguyên nhân" },
  ]);

  // 4. Lịch sử Hàng hoàn
  const [returns, setReturns] = useState([
    { id: "TH-001", orderId: "ORD-2026-089", date: "08/05/2026", sku: "SP-001", reason: "Khách đổi size", qcStatus: "Đủ điều kiện", action: "Nhập lại kệ" },
    { id: "TH-002", orderId: "ORD-2026-092", date: "09/05/2026", sku: "SP-002", reason: "Lỗi keo dán", qcStatus: "Hư hỏng", action: "Chuyển kho lỗi" },
  ]);

  // ================= STATE MODAL (POPUP) =================
  const [showTxModal, setShowTxModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [txForm, setTxForm] = useState({ type: 'Nhập kho', sku: '', qty: '', note: '' });
  const [returnForm, setReturnForm] = useState({ orderId: '', sku: '', reason: '', qcStatus: 'Đủ điều kiện' });

  // ================= LOGIC XỬ LÝ =================
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const newId = txForm.type === 'Nhập kho' ? `PN-052026-${Math.floor(Math.random()*100)}` : `PX-052026-${Math.floor(Math.random()*100)}`;
    const formattedQty = txForm.type === 'Nhập kho' ? `+${txForm.qty}` : `-${txForm.qty}`;
    
    setTransactions([{ id: newId, date: "09/05/2026", type: txForm.type, sku: txForm.sku, qty: formattedQty, note: txForm.note }, ...transactions]);
    setShowTxModal(false);
    setTxForm({ type: 'Nhập kho', sku: '', qty: '', note: '' });
  };

  const handleAddReturn = (e) => {
    e.preventDefault();
    const action = returnForm.qcStatus === 'Đủ điều kiện' ? 'Nhập lại kệ' : 'Chuyển kho lỗi';
    setReturns([{ id: `TH-00${Math.floor(Math.random()*100)}`, date: "09/05/2026", ...returnForm, action }, ...returns]);
    setShowReturnModal(false);
    setReturnForm({ orderId: '', sku: '', reason: '', qcStatus: 'Đủ điều kiện' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><PackageSearch className="w-6 h-6 text-orange-400" /> Quản trị Kho bãi</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-orange-600 px-3 py-1.5 rounded-lg font-medium">Trưởng kho</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Báo cáo nhanh trên cùng */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm font-medium mb-1">Tổng Tồn Kho</p>
            <p className="text-2xl font-black text-gray-900">1,248 SP</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 bg-orange-50/30">
            <p className="text-orange-600 text-sm font-medium mb-1">Cảnh báo Sắp hết / Hết hàng</p>
            <p className="text-2xl font-black text-orange-700">15 SP</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-200 bg-red-50/30">
            <p className="text-red-600 text-sm font-medium mb-1">Hàng lưu Kho Lỗi</p>
            <p className="text-2xl font-black text-red-700">23 SP</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 bg-blue-50/30">
            <p className="text-blue-600 text-sm font-medium mb-1">Tỷ lệ Lệch kiểm kê</p>
            <p className="text-2xl font-black text-blue-700">0.2%</p>
          </div>
        </div>

        {/* Menu Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <Boxes className="w-5 h-5" /> Hàng hóa & Vị trí
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <ArrowUpFromLine className="w-5 h-5" /> Nhập / Xuất kho
          </button>
          <button onClick={() => setActiveTab('audit')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <ClipboardCheck className="w-5 h-5" /> Kiểm kê định kỳ
          </button>
          <button onClick={() => setActiveTab('returns')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'returns' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <RotateCcw className="w-5 h-5" /> Xử lý Hàng hoàn
          </button>
        </div>

        {/* NỘI DUNG TABS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          
          {/* TAB 1: SẮP XẾP & HÀNG HÓA */}
          {activeTab === 'products' && (
            <>
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Danh sách & Vị trí Lưu trữ (Bin Location)</h2>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr><th className="p-4">Mã SKU</th><th className="p-4">Tên sản phẩm</th><th className="p-4">Tồn kho</th><th className="p-4">Vị trí Kệ (Bin)</th><th className="p-4">Trạng thái</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-bold">{p.id}</td>
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4 font-black text-gray-900">{p.stock}</td>
                      <td className="p-4 text-orange-600 font-bold">{p.bin}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'Bình thường' ? 'bg-green-100 text-green-700' : p.status === 'Sắp hết' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* TAB 2: QUẢN LÝ NHẬP XUẤT */}
          {activeTab === 'transactions' && (
            <>
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Lịch sử Lập Phiếu Nhập / Xuất</h2>
                <button onClick={() => setShowTxModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Lập Phiếu Mới
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr><th className="p-4">Mã Phiếu</th><th className="p-4">Ngày giờ</th><th className="p-4">Loại hình</th><th className="p-4">Mã SKU</th><th className="p-4">Số lượng</th><th className="p-4">Ghi chú</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-900">{tx.id}</td>
                      <td className="p-4 text-sm">{tx.date}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'Nhập kho' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{tx.type}</span></td>
                      <td className="p-4 font-medium">{tx.sku}</td>
                      <td className={`p-4 font-black ${tx.type === 'Nhập kho' ? 'text-blue-600' : 'text-orange-600'}`}>{tx.qty}</td>
                      <td className="p-4 text-sm text-gray-500">{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* TAB 3: KIỂM KÊ */}
          {activeTab === 'audit' && (
            <>
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Kết quả Kiểm kê định kỳ</h2>
                <button className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold">Lập Biên bản Kiểm kê</button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr><th className="p-4">Mã Phiếu KK</th><th className="p-4">Ngày kiểm</th><th className="p-4">Mã SKU</th><th className="p-4 text-center">Tồn PM</th><th className="p-4 text-center">Tồn Thực tế</th><th className="p-4 text-center">Chênh lệch</th><th className="p-4">Nguyên nhân</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {audits.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-bold">{a.id}</td>
                      <td className="p-4 text-sm">{a.date}</td>
                      <td className="p-4 font-medium">{a.sku}</td>
                      <td className="p-4 text-center font-medium bg-gray-50">{a.sysQty}</td>
                      <td className="p-4 text-center font-medium bg-blue-50">{a.actualQty}</td>
                      <td className="p-4 text-center font-black text-red-600">{a.diff}</td>
                      <td className="p-4 text-sm text-red-500">{a.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* TAB 4: HÀNG HOÀN */}
          {activeTab === 'returns' && (
            <>
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Nghiệp vụ Xử lý Hàng hoàn (Trả/Bom)</h2>
                <button onClick={() => setShowReturnModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Xử lý Kiện hàng mới
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                  <tr><th className="p-4">Mã Xử lý</th><th className="p-4">Từ Đơn hàng</th><th className="p-4">Mã SKU</th><th className="p-4">Lý do Hoàn</th><th className="p-4">Tình trạng QC</th><th className="p-4">Hướng xử lý</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-bold">{r.id}</td>
                      <td className="p-4 text-sm text-blue-600 font-medium cursor-pointer hover:underline">{r.orderId}</td>
                      <td className="p-4 font-medium">{r.sku}</td>
                      <td className="p-4 text-sm">{r.reason}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${r.qcStatus === 'Đủ điều kiện' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.qcStatus}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-700">{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </main>

      {/* ================= MODAL NHẬP XUẤT ================= */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Lập Phiếu Nhập / Xuất Kho</h2>
              <button onClick={() => setShowTxModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Loại Phiếu</label>
                  <select value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500">
                    <option>Nhập kho</option><option>Xuất kho</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Số lượng</label>
                  <input required type="number" min="1" value={txForm.qty} onChange={e => setTxForm({...txForm, qty: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mã SKU Sản phẩm</label>
                <input required type="text" placeholder="VD: SP-001" value={txForm.sku} onChange={e => setTxForm({...txForm, sku: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Ghi chú / Nguồn gốc</label>
                <input required type="text" placeholder="Nhà cung cấp / Mã đơn vị vận chuyển..." value={txForm.note} onChange={e => setTxForm({...txForm, note: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl mt-4">Xác nhận Lưu Hệ thống</button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XỬ LÝ HÀNG HOÀN ================= */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Xử lý Kiện Hàng Hoàn</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddReturn} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Mã Đơn hàng</label>
                  <input required type="text" placeholder="ORD-..." value={returnForm.orderId} onChange={e => setReturnForm({...returnForm, orderId: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Mã SKU</label>
                  <input required type="text" placeholder="SP-..." value={returnForm.sku} onChange={e => setReturnForm({...returnForm, sku: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Lý do Khách Hoàn/Bom</label>
                <input required type="text" placeholder="Không vừa size, giao trễ..." value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Kết quả Kiểm tra chất lượng (QC)</label>
                <select value={returnForm.qcStatus} onChange={e => setReturnForm({...returnForm, qcStatus: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:border-orange-500">
                  <option value="Đủ điều kiện">Hàng còn nguyên vẹn (Đủ điều kiện nhập lại kệ)</option>
                  <option value="Hư hỏng">Hàng dơ, rách box (Chuyển sang kho lỗi)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl mt-4">Cập nhật Trạng thái</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryManagement;