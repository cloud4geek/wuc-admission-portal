import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import VoucherPurchase from './pages/VoucherPurchase';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationFormTopUp from './pages/ApplicationFormTopUp';
import AdminLogin from './pages/AdminLogin';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminResetPassword from './pages/AdminResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import ApplicationStatus from './pages/ApplicationStatus';
import VerifyLetter from './pages/VerifyLetter';
import Footer from './components/Footer';

// Wrapper to conditionally hide footer on admin pages
const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* Global watermark backdrop */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        backgroundImage: 'url(http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg)',
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        opacity: 0.5, pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/purchase-voucher" element={<VoucherPurchase />} />
          <Route path="/apply" element={<ApplicationForm />} />
          <Route path="/apply-topup" element={<ApplicationFormTopUp />} />
          <Route path="/application-status" element={<ApplicationStatus />} />
          <Route path="/verify-letter" element={<VerifyLetter />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
