import React, { useState } from 'react';
import { Server, ShieldAlert, Webhook, Bot, ArrowLeft, Database, Activity, Play, Square, RefreshCw, Save } from 'lucide-react';

const ITManagement = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('system'); // system, rbac, api, ai

  // Mock Data: Ma trận phân quyền (RBAC)
  const [users, setUsers] = useState([
    { id: "NV001", name: "Nguyễn Văn Khải", email: "khai.it@shoestore.vn", role: "Super Admin", access: ["IT", "Kho", "Kế toán", "Đơn hàng"] },
    { id: "NV002", name: "Trần Thu Hà", email: "ha.ketoan@shoestore.vn", role: "Kế toán trưởng", access: ["Kế toán"] },
    { id: "NV003", name: "Lê Văn Bình", email: "binh.kho@shoestore.vn", role: "Thủ kho", access: ["Kho", "Đơn hàng"] },
  ]);

  // Mock Data: Tình trạng API
  const [apis, setApis] = useState([
    { name: "Viettel Post Logistics API", endpoint: "https://partner.viettelpost.vn/v2/...", status: "Connected", ping: "24ms" },
    { name: "VNPay Payment Gateway", endpoint: "https://sandbox.vnpayment.vn/...", status: "Connected", ping: "45ms" },
    { name: "Zalo ZNS (Gửi tin nhắn)", endpoint: "https://business.openapi.zalo.me/...", status: "Error", ping: "Timeout" },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header IT */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center border-b-4 border-indigo-500">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Server className="w-6 h-6 text-indigo-400" /> System Control Panel</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 px-3 py-1.5 rounded-lg font-mono">
            <Activity className="w-4 h-4 animate-pulse text-green-400"/> System Online
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
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

        {/* NỘI DUNG TABS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          
          {/* TAB 1: SYSTEM & DATABASE */}
          {activeTab === 'system' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Trạng thái Cơ sở hạ tầng</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-2"><span className="font-semibold text-slate-600">CPU Usage</span><span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">Normal</span></div>
                  <div className="text-3xl font-black text-slate-900 mb-2">24%</div>
                  <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: '24%'}}></div></div>
                </div>
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-2"><span className="font-semibold text-slate-600">RAM Usage</span><span className="text-xs font-mono bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Warning</span></div>
                  <div className="text-3xl font-black text-slate-900 mb-2">12.4 / 16 GB</div>
                  <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{width: '78%'}}></div></div>
                </div>
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-2"><span className="font-semibold text-slate-600">Database Size (SQLite)</span></div>
                  <div className="text-3xl font-black text-slate-900 mb-2">1.2 GB</div>
                  <button className="w-full mt-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
                    <Save className="w-4 h-4"/> Backup Snapshot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC */}
          {activeTab === 'rbac' && (
            <div>
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Ma trận Phân quyền (Role-Based Access Control)</h2>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm border-b">
                  <tr><th className="p-4">Nhân viên</th><th className="p-4">Chức vụ</th><th className="p-4">Quyền truy cập Module</th><th className="p-4 text-center">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.id} | {u.email}</div>
                      </td>
                      <td className="p-4 font-semibold text-indigo-600">{u.role}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {['IT', 'Kho', 'Kế toán', 'Đơn hàng'].map(module => (
                            <label key={module} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border cursor-pointer ${u.access.includes(module) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'}`}>
                              <input type="checkbox" checked={u.access.includes(module)} readOnly className="w-3 h-3 accent-indigo-600" /> {module}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center"><button className="text-indigo-600 hover:underline text-sm font-bold">Cập nhật</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: API & WEBHOOKS */}
          {activeTab === 'api' && (
            <div>
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Quản lý Kết nối Đối tác (Third-party API)</h2>
              </div>
              <div className="p-6 space-y-4">
                {apis.map((api, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row justify-between items-center p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                    <div className="mb-2 md:mb-0">
                      <h3 className="font-bold text-slate-900">{api.name}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-1">{api.endpoint}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${api.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>{api.status}</div>
                        <div className="text-xs text-slate-400">Ping: {api.ping}</div>
                      </div>
                      <button className={`p-2 rounded-lg ${api.status === 'Connected' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {api.status === 'Connected' ? <Square className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AI & LOGS */}
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
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-hidden h-64 relative shadow-inner">
                <div className="absolute top-2 right-4 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div><div className="w-2 h-2 rounded-full bg-yellow-500"></div><div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <p className="mb-1">[11:05:22] System: AI Log Analyzer daemon started.</p>
                <p className="mb-1">[11:05:25] Analyzer: Scanning /var/log/nginx/access.log...</p>
                <p className="mb-1 text-slate-300">[11:05:28] Chatbot: Handling intent [CHECK_ORDER_STATUS] from UserID: 8492...</p>
                <p className="mb-1 text-yellow-400">[11:06:01] Analyzer: Warning - High latency detected on /api/v1/inventory (450ms)</p>
                <p className="mb-1">[11:06:15] Chatbot: Response generated with 0.98 confidence score.</p>
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