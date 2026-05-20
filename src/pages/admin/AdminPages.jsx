import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminGuard from '../../components/guards/AdminGuard.jsx';
import Dashboard from '../../components/Dashboard.jsx';
import OrderManagement from '../../components/OrderManagement.jsx';
import SalesManagement from '../../components/SalesManagement.jsx';
import WarehouseManagement from '../../components/InventoryManagement.jsx';
import AccountingManagement from '../../components/AccountingManagement.jsx';
import ProductManagement from '../../components/ProductManagement.jsx';
import PromotionManagement from '../../components/PromotionManagement.jsx';
import FeedbackManagement from '../../components/FeedbackManagement.jsx';
import SalaryManagement from '../../components/SalaryManagement.jsx';
import ITManagement from '../../components/ITManagement.jsx';

function AdminPage({ module, children }) {
  const navigate = useNavigate();
  return (
    <AdminGuard module={module}>
      {React.cloneElement(children, { onBack: () => navigate('/') })}
    </AdminGuard>
  );
}

export function DashboardPage() {
  return <AdminPage module="dashboard"><Dashboard /></AdminPage>;
}
export function OrderManagementPage() {
  return <AdminPage module="orders"><OrderManagement /></AdminPage>;
}
export function SalesManagementPage() {
  return <AdminPage module="sales"><SalesManagement /></AdminPage>;
}
export function InventoryManagementPage() {
  return <AdminPage module="inventory"><WarehouseManagement /></AdminPage>;
}
export function ProductManagementPage() {
  return <AdminPage module="product_management"><ProductManagement /></AdminPage>;
}
export function PromotionManagementPage() {
  return <AdminPage module="promotion_management"><PromotionManagement /></AdminPage>;
}
export function FeedbackManagementPage() {
  return <AdminPage module="feedback_management"><FeedbackManagement /></AdminPage>;
}
export function SalaryManagementPage() {
  return <AdminPage module="salary"><SalaryManagement /></AdminPage>;
}
export function AccountingManagementPage() {
  return <AdminPage module="accounting"><AccountingManagement /></AdminPage>;
}
export function ITManagementPage() {
  return <AdminPage module="it"><ITManagement /></AdminPage>;
}
