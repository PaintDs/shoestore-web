import React from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import ProductDetail from '../../components/ProductDetail.jsx';
import Checkout from '../../components/Checkout.jsx';
import UserProfile from '../../components/UserProfile.jsx';

export function ProductDetailPage() {
  const { productId } = useParams();
  const { products, addToCart } = useOutletContext();
  const product = products.find((p) => p.id.toString() === productId);
  const navigate = useNavigate();
  if (!product) return <div>Sản phẩm không tồn tại.</div>;
  return <ProductDetail product={product} onBack={() => navigate('/')} onAddToCart={addToCart} />;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart, currentUser } = useOutletContext();
  return (
    <Checkout
      onBack={() => navigate('/')}
      cartItems={cartItems || []}
      onCheckoutSuccess={() => {
        clearCart();
        navigate('/profile');
      }}
      currentUser={currentUser}
    />
  );
}

export function UserProfilePage() {
  const { currentUser, logout } = useOutletContext();
  const navigate = useNavigate();
  return (
    <UserProfile
      currentUser={currentUser}
      onBack={() => navigate('/')}
      onLogout={() => {
        logout();
        navigate('/');
      }}
    />
  );
}
