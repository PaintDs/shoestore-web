import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { roleHasAccess } from '../../lib/auth.js';

export default function AdminGuard({ module, children }) {
  const { currentUser } = useOutletContext();
  const navigate = useNavigate();
  const role = currentUser?.role;

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <p className="text-gray-600 mb-4">Bạn cần đăng nhập để truy cập khu vực quản trị.</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (!roleHasAccess(role, module)) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center">
        <p className="text-red-600 font-semibold mb-2">Bạn không có quyền truy cập trang này.</p>
        <p className="text-gray-500 text-sm mb-4">Vai trò: {role}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return children;
}
