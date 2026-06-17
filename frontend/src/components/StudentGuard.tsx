import React from 'react';
import { Navigate } from 'react-router-dom';

interface StudentGuardProps {
  children: React.ReactNode;
}

const StudentGuard: React.FC<StudentGuardProps> = ({ children }) => {
  const token = localStorage.getItem('studentToken');

  if (!token) {
    return <Navigate to="/student/login" replace />;
  }

  // Basic token expiry check (JWT payload is base64)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('studentToken');
      localStorage.removeItem('studentInfo');
      return <Navigate to="/student/login" replace />;
    }
  } catch {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentInfo');
    return <Navigate to="/student/login" replace />;
  }

  return <>{children}</>;
};

export default StudentGuard;
