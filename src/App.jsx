import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { TopNav } from './components/TopNav/TopNav';
import { StudentDashboard } from './pages/StudentDashboard/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard';
import { VerificationFlow } from './pages/VerificationFlow/VerificationFlow';
import { LandingPage } from './pages/LandingPage/LandingPage';

import { FIREBASE_AVAILABLE } from './services/firebase';

// Layout: TopNav is OUTSIDE container so it sticks full-width at top
const AppLayout = () => (
  <>
    <TopNav />
    {!FIREBASE_AVAILABLE && (
      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
        color: '#eab308',
        padding: '8px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: '500',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: '64px',
        zIndex: 50
      }}>
        ⚠️ Running in Demo Mode (Local Storage only). Real-time sync disabled.
      </div>
    )}
    <div className="container animate-fade-in">
      <main style={{ paddingTop: '24px' }}>
        <Outlet />
      </main>
    </div>
  </>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Internal app pages with sticky TopNav */}
        <Route element={<AppLayout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/verify" element={<VerificationFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
