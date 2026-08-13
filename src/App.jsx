import React, { useState, useEffect } from 'react';
import ExamDashboard from './ExamDashboard.jsx';
import StudentTerminal from './StudentTerminal.jsx';
import SupervisorTerminal from './SupervisorTerminal.jsx';
import AdminTerminal from './AdminTerminal.jsx';

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminPortal =
    route.startsWith('/admin') ||
    window.location.search.includes('portal=admin') ||
    window.location.hash.includes('admin');

  const isSupervisorPortal =
    route.startsWith('/supervisor') ||
    window.location.search.includes('portal=supervisor') ||
    window.location.hash.includes('supervisor');

  const isStudentPortal =
    route.startsWith('/student') ||
    window.location.search.includes('portal=student') ||
    window.location.hash.includes('student');

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

