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
import './index.css';
import './api/axiosConfig';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  return user.is_super_admin ? children : <Navigate to="/home" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<DashboardHome />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/financial" element={<FinancialPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/clinicas" element={<SuperAdminRoute><AdminCompaniesPage /></SuperAdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
