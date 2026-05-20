import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Login.jsx';
import { adminLandingPath } from '../lib/auth.js';
import { apiFetch } from '../lib/api.js';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = async () => {
    try {
      const user = await apiFetch('/api/users/me');
      navigate(adminLandingPath(user.role));
    } catch {
      navigate('/');
    }
  };

  return <Login onLoginSuccess={handleLoginSuccess} onBack={() => navigate('/')} />;
}
