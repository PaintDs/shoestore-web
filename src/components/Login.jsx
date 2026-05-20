import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

const Login = ({ onLoginSuccess, onBack }) => {
  // mode có thể là: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login'); 
  const [error, setError] = useState('');
  
  // 1. Khởi tạo state riêng biệt, không dùng object phức tạp để tránh lỗi uncontrolled input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Hàm helper để reset các trường không cần thiết khi đổi mode
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setNewPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Reset lỗi mỗi lần submit
    const cleanEmail = email.trim();

    // ================= XỬ LÝ QUÊN MẬT KHẨU (GỬI MÃ OTP) =================
    if (mode === 'forgot') {
      if (!cleanEmail) {
        setError('Vui lòng nhập email của bạn! (INT_FORGOT_03)');
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setError('Định dạng email không đúng! (INT_FORGOT_04)');
        return;
      }

      try {
        const response = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || 'Lỗi hệ thống'); // Bắt INT_FORGOT_02 (Email không tồn tại)
          return;
        }

        alert(`Mã OTP test local của bạn là: ${data.otp_dev}\n(Đồng thời mã đã in ở Terminal Backend)`);
        switchMode('reset'); // Chuyển sang màn hình nhập OTP
      } catch (err) {
        setError('Không kết nối được với Backend!');
      }
      return;
    }

    // ================= XỬ LÝ ĐẶT LẠI MẬT KHẨU MỚI =================
    if (mode === 'reset') {
      if (!otp || !newPassword) {
        setError('Vui lòng nhập đầy đủ mã OTP và mật khẩu mới!');
        return;
      }
      if (newPassword.length < 6) {
        setError('Mật khẩu mới phải từ 6 ký tự trở lên!');
        return;
      }

      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp, new_password: newPassword })
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.detail || 'Mã OTP không hợp lệ! (INT_FORGOT_06)');
          return;
        }

        alert('🎉 Đổi mật khẩu thành công! Hãy đăng nhập lại bằng mật khẩu mới. (INT_FORGOT_05)');
        switchMode('login');
      } catch (err) {
        setError('Lỗi kết nối máy chủ!');
      }
      return;
    }

    // ================= XỬ LÝ ĐĂNG KÝ VÀ ĐĂNG NHẬP =================
    if (!cleanEmail || !password || (mode === 'register' && (!name || !confirmPassword))) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc! (INT_LOGIN_04 / INT_REG_02)');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Định dạng Email không hợp lệ! (INT_LOGIN_07 / INT_REG_04)');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu nhập lại không trùng khớp! (INT_REG_05)');
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/register' : '/api/login';
      
      // 3. Đảm bảo payload gửi đi đúng cấu trúc
      const payload = mode === 'register' 
        ? { name: name.trim(), email: cleanEmail, password }
        : { email: cleanEmail, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Lỗi thông tin xác thực!');
        return;
      }

      if (mode === 'register') {
        alert('Đăng ký tài khoản thành công! (INT_REG_01)');
        switchMode('login');
      } else {
        // Đăng nhập thành công
        if (rememberMe) {
          localStorage.setItem('shoestore_token', data.access_token);
        } else {
          sessionStorage.setItem('token', data.access_token);
        }
        onLoginSuccess(data.access_token);
      }
    } catch (err) {
      setError('Lỗi kết nối hệ thống!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <button onClick={onBack} className="absolute top-8 left-8 flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" /> Trở về trang chủ
      </button>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">SHOE<span className="text-blue-600">STORE</span></h2>
          <p className="text-gray-500 mt-2 font-medium">
            {mode === 'login' && 'Đăng nhập để tiếp tục làm việc'}
            {mode === 'register' && 'Tạo tài khoản mới để nhận ưu đãi'}
            {mode === 'forgot' && 'Khôi phục mật khẩu qua mã OTP'}
            {mode === 'reset' && 'Thiết lập mật khẩu an toàn mới'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-100 animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TRƯỜNG: HỌ TÊN (Chỉ hiện khi Đăng ký) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="Nguyễn Văn A" />
              </div>
            </div>
          )}

          {/* TRƯỜNG: EMAIL (Hiện ở mọi mode trừ màn hình nhập OTP) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email đăng nhập</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                {/* 2. Gán chính xác value và onChange */}
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="VD: user@shoestore.vn" />
              </div>
            </div>
          )}

          {/* TRƯỜNG: NHẬP OTP & PASS MỚI (Chỉ xuất hiện khi ở mode Đặt lại mật khẩu) */}
          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mã xác thực OTP (6 số)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" placeholder="******" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" placeholder="Tối thiểu 6 ký tự..." />
                </div>
              </div>
            </>
          )}

          {/* TRƯỜNG: MẬT KHẨU CŨ (Chỉ hiện khi Đăng ký / Đăng nhập) */}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Mật khẩu</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-blue-600 hover:text-blue-700 font-bold">
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                {/* 2. Gán chính xác value và onChange */}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="••••••••" />
              </div>
              {mode === 'login' && (
                <div className="flex items-center mt-3">
                  <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600 font-medium">Ghi nhớ phiên đăng nhập</label>
                </div>
              )}
            </div>
          )}

          {/* TRƯỜNG: RE-PASSWORD (Chỉ hiện khi Đăng ký) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="Nhập lại mật khẩu..." />
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]">
            <span>
              {mode === 'login' && 'Đăng nhập ngay'}
              {mode === 'register' && 'Hoàn tất Đăng ký'}
              {mode === 'forgot' && 'Gửi mã xác thực OTP'}
              {mode === 'reset' && 'Xác nhận Đổi Mật Khẩu'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* NÚT ĐIỀU HƯỚNG GIỮA CÁC CHẾ ĐỘ THÀNH VIÊN */}
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-gray-600 text-sm">
            {mode === 'login' && (
              <>Chưa có tài khoản? <button type="button" onClick={() => switchMode('register')} className="text-blue-600 font-bold hover:underline">Đăng ký thành viên</button></>
            )}
            {(mode === 'register' || mode === 'forgot' || mode === 'reset') && (
              <button type="button" onClick={() => switchMode('login')} className="text-gray-500 font-bold hover:text-blue-600 flex items-center justify-center mx-auto gap-1">
                <ArrowLeft className="w-4 "/> Quay lại Đăng nhập
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;