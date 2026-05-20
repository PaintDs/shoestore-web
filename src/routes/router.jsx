import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import ProductListPage from '../pages/store/ProductListPage.jsx';
import { ProductDetailPage, CheckoutPage, UserProfilePage } from '../pages/store/StorePages.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import {
  DashboardPage,
  OrderManagementPage,
  SalesManagementPage,
  InventoryManagementPage,
  AccountingManagementPage,
  ProductManagementPage,
  PromotionManagementPage,
  FeedbackManagementPage,
  SalaryManagementPage,
  ITManagementPage,
} from '../pages/admin/AdminPages.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'products/:productId', element: <ProductDetailPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'profile', element: <UserProfilePage /> },
      { path: 'admin/dashboard', element: <DashboardPage /> },
      { path: 'admin/sales', element: <SalesManagementPage /> },
      { path: 'admin/orders', element: <OrderManagementPage /> },
      { path: 'admin/inventory', element: <InventoryManagementPage /> },
      { path: 'admin/accounting', element: <AccountingManagementPage /> },
      { path: 'admin/products', element: <ProductManagementPage /> },
      { path: 'admin/promotions', element: <PromotionManagementPage /> },
      { path: 'admin/feedback', element: <FeedbackManagementPage /> },
      { path: 'admin/salary', element: <SalaryManagementPage /> },
      { path: 'admin/it', element: <ITManagementPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
]);
