import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

const Login = ({ onLoginSuccess, onBack }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); 
  };

  const handleSubmit = (e) => {
    e.preventDefault(); 
    
    if (!formData.email || !formData.password || (isRegister && !formData.name)) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    // ================= LOGIC PHÂN QUYỀN MỚI =================
    let role = 'customer';
    let userName = isRegister ? formData.name : 'Khách hàng thân thiết';

    // Nhận diện theo từ khóa trong email
    if (formData.email.includes('admin')) {
      role = 'admin'; 
      userName = 'Giám đốc';
    } else if (formData.email.includes('it')) {
      role = 'it'; 
      userName = 'IT System Admin';
    } else if (formData.email.includes('kho')) {
      role = 'kho'; 
      userName = 'Trưởng Kho';
    } else if (formData.email.includes('ketoan')) {
      role = 'ketoan'; 
      userName = 'Kế Toán Trưởng';
    }

    onLoginSuccess({ 
      email: formData.email, 
      name: userName, 
      role: role 
    });
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
            {isRegister ? 'Tạo tài khoản mới để nhận ưu đãi' : 'Đăng nhập để tiếp tục làm việc'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-100">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="Nguyễn Văn A" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email đăng nhập</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="VD: kho@shoestore.vn" />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">Mật khẩu</label>
              {!isRegister && <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Quên mật khẩu?</button>}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]">
            <span>{isRegister ? 'Hoàn tất Đăng ký' : 'Đăng nhập ngay'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-gray-600 text-sm">
            {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-blue-600 font-bold hover:underline">
              {isRegister ? 'Đăng nhập tại đây' : 'Đăng ký thành viên'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;