import React, { useState, useEffect } from 'react';
import ExamDashboard from './ExamDashboard.jsx';
import StudentTerminal from './StudentTerminal.jsx';
import SupervisorTerminal from './SupervisorTerminal.jsx';
import AdminTerminal from './AdminTerminal.jsx';
import VerificationTerminal from './VerificationTerminal.jsx';
import CenterRegistrationTerminal from './CenterRegistrationTerminal.jsx';

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const hostname = window.location.hostname;
  const defaultPortal = import.meta.env.VITE_DEFAULT_PORTAL;

  const isRegisterPortal =
    hostname.includes('register') ||
    defaultPortal === 'register' ||
    route.startsWith('/register') ||
    route.startsWith('/registration') ||
    window.location.search.includes('portal=register') ||
    window.location.search.includes('portal=registration') ||
    window.location.hash.includes('register');

  const isVerifyPortal =
    hostname.includes('verify') ||
    defaultPortal === 'verify' ||
    route.startsWith('/verify') ||
    route.startsWith('/verification') ||
    window.location.search.includes('portal=verify') ||
    window.location.search.includes('portal=verification') ||
    window.location.hash.includes('verify');

  const isAdminPortal =
    hostname.includes('admin') ||
    defaultPortal === 'admin' ||
    route.startsWith('/admin') ||
    window.location.search.includes('portal=admin') ||
    window.location.hash.includes('admin');

  const isSupervisorPortal =
    hostname.includes('supervisor') ||
    defaultPortal === 'supervisor' ||
    route.startsWith('/supervisor') ||
    window.location.search.includes('portal=supervisor') ||
    window.location.hash.includes('supervisor');

  const isStudentPortal =
    hostname.includes('student') ||
    defaultPortal === 'student' ||
    route.startsWith('/student') ||
    window.location.search.includes('portal=student') ||
    window.location.hash.includes('student');

  if (isRegisterPortal) {
    return <CenterRegistrationTerminal />;
  }

  if (isVerifyPortal) {
    return <VerificationTerminal />;
  }

  if (isAdminPortal) {
    return <AdminTerminal />;
  }

  if (isSupervisorPortal) {
    return <SupervisorTerminal />;
  }

  if (isStudentPortal) {
    return <StudentTerminal />;
  }

  return <ExamDashboard />;
}

