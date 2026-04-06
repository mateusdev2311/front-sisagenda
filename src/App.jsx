import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardHome from './pages/DashboardHome';
import UsersPage from './pages/UsersPage';
import DoctorsPage from './pages/DoctorsPage';
import PatientsPage from './pages/PatientsPage';
import SchedulesPage from './pages/SchedulesPage';
import RecordsPage from './pages/RecordsPage';
import FinancialPage from './pages/FinancialPage';
import SettingsPage from './pages/SettingsPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AtendimentosPage from './pages/AtendimentosPage';
import FollowUpsPage from './pages/FollowUpsPage';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import SubscribePage from './pages/SubscribePage';
import './index.css';
import './api/axiosConfig';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  // Se houver pagamento pendente, bloquear acesso ao dashboard (exceto super admin e parceiros)
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const hasPendingPayment = localStorage.getItem('pending_company_id');
  // Verifica parceiro tanto pelo user.plan quanto pelo pending_plan (fallback para usuários sem plan no token)
  const pendingPlan = localStorage.getItem('pending_plan');
  const isPartner = user?.plan === 'parceiro' || pendingPlan === 'parceiro';
  if (hasPendingPayment && !user?.is_super_admin && !isPartner) {
    return <Navigate to="/subscribe" replace />;
  }

  return children;
};

const SuperAdminRoute = ({ children }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  return user.is_super_admin ? children : <Navigate to="/home" replace />;
};

const RoleBasedRedirect = () => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  return user.is_super_admin ? <Navigate to="/admin/clinicas" replace /> : <Navigate to="/home" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (public) */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Public Register + Subscribe (sem AuthLayout, design próprio) */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/home" element={<DashboardHome />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/atendimentos" element={<AtendimentosPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/financial" element={<FinancialPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/clinicas" element={<SuperAdminRoute><AdminCompaniesPage /></SuperAdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
