import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import UserHomePage from './pages/UserHomePage';
import DishDetailPage from './pages/DishDetailPage';
import UserProfilePage from './pages/UserProfilePage';
import UserOrdersPage from './pages/UserOrdersPage';
import UserFavoritesPage from './pages/UserFavoritesPage';
import OrderPage from './pages/OrderPage';
import PreferencesPage from './pages/PreferencesPage';
import ChefOrdersPage from './pages/ChefOrdersPage';
import AdminHomePage from './pages/AdminHomePage';
import AdminDishesPage from './pages/AdminDishesPage';
import ChefDishesPage from './pages/ChefDishesPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminStatsPage from './pages/AdminStatsPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminIngredientsPage from './pages/AdminIngredientsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminChefsPage from './pages/AdminChefsPage';
import ForceChangePasswordPage from './pages/ForceChangePasswordPage';
import './css/styles.css';

const VALID_ROLES = ['admin', 'user', 'chef'];

function getRoleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'chef') return '/chef/orders';
  return '/home';
}

function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading"><div className="loading-spinner"></div>加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.force_pwd_change) {
    return <Navigate to="/force-change-password" replace />;
  }

  if (!VALID_ROLES.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return children;
}

function RedirectRoute() {
  const { user } = useAuth();
  if (user && VALID_ROLES.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
}

function PcLayout() {
  const location = useLocation();
  return (
    <div className="pc-layout">
      <Sidebar />
      <main className="pc-main" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <ToastProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
            <Route path="/" element={<RedirectRoute />} />

            <Route element={<PcLayout />}>
              <Route
                path="/home"
                element={
                  <ProtectedRoute requiredRoles={['user', 'chef']}>
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
                path="/my-orders"
                element={
                  <ProtectedRoute>
                    <UserOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-favorites"
                element={
                  <ProtectedRoute>
                    <UserFavoritesPage />
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
              <Route
                path="/preferences"
                element={
                  <ProtectedRoute>
                    <PreferencesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chef/orders"
                element={
                  <ProtectedRoute requiredRoles={['chef', 'admin']}>
                    <ChefOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute requiredRoles={['chef', 'admin']}>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />
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
              <Route
                path="/chef/dishes"
                element={
                  <ProtectedRoute requiredRoles={['chef']}>
                    <ChefDishesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ingredients"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'chef']}>
                    <AdminIngredientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'chef']}>
                    <AdminCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/chefs"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminChefsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminStatsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
