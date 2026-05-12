import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/GlassCard/GlassCard';
import { PrimaryButton } from '../../components/PrimaryButton/PrimaryButton';
import {
  ScanFace, Clock, MapPin, KeySquare, CheckCircle,
  Shield, AlertTriangle, Calendar, ChevronRight
} from 'lucide-react';
import { safeDoc as doc, safeOnSnapshot as onSnapshot } from '../../services/firestore';
import { db } from '../../services/firebase';
import './StudentDashboard.css';

export function StudentDashboard() {
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(null);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Listen for active session from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "active_session"), (snap) => {
      if (snap.exists() && snap.data().otp) {
        setSessionActive(true);
        const ts = snap.data().timestamp;
        if (ts) {
          setSessionTime(ts.toDate ? ts.toDate() : new Date(ts));
        }
      } else {
        setSessionActive(false);
        setSessionTime(null);
      }
    });
    return () => unsub();
  }, []);

  const timeString = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  const dateString = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="student-wrapper animate-fade-in">

      {/* Top header */}
      <div className="student-header">
        <div>
          <h2 className="student-greeting">Student Portal</h2>
          <p className="text-muted">{dateString}</p>
        </div>
        <div className="live-clock">{timeString}</div>
      </div>

      {/* Session status banner */}
      <div className={`session-banner ${sessionActive ? 'active' : 'inactive'}`}>
        {sessionActive ? (
          <>
            <CheckCircle size={20} />
            <span><strong>Session is Live</strong> — An admin session is active. You can mark your attendance now.</span>
          </>
        ) : (
          <>
            <AlertTriangle size={20} />
            <span><strong>No Active Session</strong> — Wait for your admin to start a session and generate an OTP.</span>
          </>
        )}
      </div>

      <div className="student-content">
        {/* Main action card */}
        <GlassCard className="attend-card text-center">
          <div className="attend-icon-ring">
            <ScanFace size={40} className="attend-icon" />
          </div>
          <h3 className="attend-title">Validate Your Presence</h3>
          <p className="text-muted attend-desc">
            Complete all 3 security checks to mark attendance. Make sure you are physically present on-site.
          </p>

          {/* 3-step mini summary */}
          <div className="step-mini-list">
            <div className="step-mini">
              <MapPin size={16} />
              <span>GPS Geofence</span>
              <ChevronRight size={14} className="step-arrow" />
            </div>
            <div className="step-mini">
              <ScanFace size={16} />
              <span>Face Scan</span>
              <ChevronRight size={14} className="step-arrow" />
            </div>
            <div className="step-mini">
              <KeySquare size={16} />
              <span>OTP Code</span>
            </div>
          </div>

          <PrimaryButton
            className="attend-btn"
            onClick={() => navigate('/verify')}
          >
            <ScanFace size={18} />
            Begin Verification
          </PrimaryButton>

          <p className="security-notice text-muted">
            <Shield size={13} /> Anti-spoofing active — location, face & OTP required
          </p>
        </GlassCard>

        {/* Info cards column */}
        <div className="info-col">
          <GlassCard className="info-card">
            <div className="info-icon-wrap geo"><MapPin size={22} /></div>
            <div>
              <h4>Geofence</h4>
              <p className="text-muted small">Must be within 500m of campus. GPS spoofing will be rejected.</p>
            </div>
          </GlassCard>

          <GlassCard className="info-card">
            <div className="info-icon-wrap face"><ScanFace size={22} /></div>
            <div>
              <h4>Face Verification</h4>
              <p className="text-muted small">Look directly into the camera. Ensure good lighting. No photos allowed.</p>
            </div>
          </GlassCard>

          <GlassCard className="info-card">
            <div className="info-icon-wrap otp"><KeySquare size={22} /></div>
            <div>
              <h4>Live OTP</h4>
              <p className="text-muted small">Enter the 6-digit code shown on the classroom projector. It expires in seconds.</p>
            </div>
          </GlassCard>

          <GlassCard className="info-card">
            <div className="info-icon-wrap secure"><Shield size={22} /></div>
            <div>
              <h4>Anti-Fraud</h4>
              <p className="text-muted small">5 wrong OTP attempts trigger a 10-min lockout. Steps cannot be skipped.</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
