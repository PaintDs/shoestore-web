import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const ChatWidget = ({ currentUser }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Xin chào! ShoeStore hỗ trợ bạn đặt hàng và tra cứu đơn.' },
  ]);
  const [sending, setSending] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setText('');
    setSending(true);
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Gửi tin nhắn thất bại.');
      setMessages((prev) => [...prev, { from: 'bot', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: 'bot', text: `Lỗi: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
        aria-label="Mở chat hỗ trợ"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-sm">Hỗ trợ trực tuyến</span>
            <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-slate-800 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 max-h-72 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${
                  m.from === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-white border text-gray-800'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={currentUser ? 'Nhập tin nhắn...' : 'Đăng nhập để chat đầy đủ'}
              className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-blue-600 text-white p-2 rounded-xl disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
