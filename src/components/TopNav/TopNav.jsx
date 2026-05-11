import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import './TopNav.css';

export function TopNav() {
  return (
    <nav className="top-nav glass-panel">
      <div className="nav-brand">
        <ShieldCheck className="brand-icon" size={28} />
        <span className="brand-text text-gradient">VerifyPresence</span>
      </div>
      <div className="nav-links">
        <Link to="/student" className="nav-link">Student</Link>
        <Link to="/admin" className="nav-link">Admin</Link>
      </div>
    </nav>
  );
}
