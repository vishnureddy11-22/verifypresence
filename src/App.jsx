import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { TopNav } from './components/TopNav/TopNav';
import { StudentDashboard } from './pages/StudentDashboard/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard';
import { VerificationFlow } from './pages/VerificationFlow/VerificationFlow';
import { LandingPage } from './pages/LandingPage/LandingPage';

// Layout: TopNav is OUTSIDE container so it sticks full-width at top
const AppLayout = () => (
  <>
    <TopNav />
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
