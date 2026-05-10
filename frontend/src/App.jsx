/**
 * 家味 · Family Chef — Main App
 * React Router 配置
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import UserHomePage from './pages/UserHomePage';
import DishDetailPage from './pages/DishDetailPage';
import UserProfilePage from './pages/UserProfilePage';
import OrderPage from './pages/OrderPage';
import ChefOrdersPage from './pages/ChefOrdersPage';
import AdminHomePage from './pages/AdminHomePage';
import AdminDishesPage from './pages/AdminDishesPage';
import './css/styles.css';

// Protected Route Wrapper
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading"><div className="loading-spinner"></div>加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

// Redirect Route
function RedirectRoute() {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'chef') {
      return <Navigate to="/chef/orders" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/login" replace />;
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Redirect Root */}
            <Route path="/" element={<RedirectRoute />} />

            {/* User Routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <UserHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dishes/:id"
              element={
                <ProtectedRoute>
                  <DishDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order"
              element={
                <ProtectedRoute>
                  <OrderPage />
                </ProtectedRoute>
              }
            />

            {/* Chef Routes */}
            <Route
              path="/chef/orders"
              element={
                <ProtectedRoute requiredRoles={['chef', 'admin']}>
                  <ChefOrdersPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dishes"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminDishesPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
