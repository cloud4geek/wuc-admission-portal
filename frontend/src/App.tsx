import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/purchase-voucher" element={<VoucherPurchase />} />
          <Route path="/apply" element={<ApplicationForm />} />
          <Route path="/apply-topup" element={<ApplicationFormTopUp />} />
          <Route path="/application-status" element={<ApplicationStatus />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
