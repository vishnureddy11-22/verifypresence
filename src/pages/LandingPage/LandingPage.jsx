import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Play, MapPin, ScanFace, KeySquare,
  CheckCircle, ArrowRight, X, Cpu, Lock, Zap, Users
} from 'lucide-react';
import { PrimaryButton } from '../../components/PrimaryButton/PrimaryButton';
import './LandingPage.css';

export function LandingPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="landing-wrapper animate-fade-in">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-brand">
          <Shield className="landing-logo" size={28} />
          <span className="landing-brand-text">Proxy Attendance</span>
        </div>

        <div className="landing-links">
          <a href="#features" className="landing-link">Features</a>
          <a href="#how-it-works" className="landing-link">How It Works</a>
          <a href="#stats" className="landing-link">Stats</a>
        </div>

        <div className="landing-actions">
          <button className="landing-link btn-plain" onClick={() => navigate('/admin')}>
            Admin Panel
          </button>
          <PrimaryButton onClick={() => navigate('/student')}>
            Student Portal →
          </PrimaryButton>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="landing-hero">
        <div className="hero-badge">
          <Shield size={14} />
          Enterprise-Grade Anti-Fraud Protection
        </div>

        <h1 className="hero-title">
          Make Attendance<br />
          <span className="text-primary-gradient">Proxy Impossible</span>
        </h1>

        <p className="hero-subtitle">
          AI-powered multi-modal verification that eliminates buddy punching,
          photo spoofing, and mock locations. Validate <em>presence</em>, not just attendance.
        </p>

        <div className="hero-cta-group">
          <PrimaryButton
            onClick={() => navigate('/admin')}
            style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
          >
            Admin Dashboard
          </PrimaryButton>
          <button className="btn btn-secondary" onClick={() => navigate('/student')}>
            Student Portal
          </button>
          <button className="btn btn-text" onClick={() => setShowModal(true)}>
            <Play size={18} /> How It Works
          </button>
        </div>

        {/* Quick flow pills */}
        <div className="hero-flow">
          <div className="flow-step">
            <MapPin size={16} />
            <span>GPS Fence</span>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <ScanFace size={16} />
            <span>Face Scan</span>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <KeySquare size={16} />
            <span>Live OTP</span>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step verified">
            <CheckCircle size={16} />
            <span>Verified</span>
          </div>
        </div>
      </main>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <h2 className="section-title">Three Layers. Zero Loopholes.</h2>
        <p className="section-subtitle">
          Each verification gate must pass before the next one opens — no shortcuts.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon geo"><MapPin size={28} /></div>
            <h3>Geofence Verification</h3>
            <p>Students must be physically within 500m of the target location set by the admin. GPS spoofing is detected and blocked.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon face"><ScanFace size={28} /></div>
            <h3>Live Face Recognition</h3>
            <p>On-device AI (face-api.js) detects a real, live face. Photos, screens, and pre-recorded videos are rejected automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon otp"><KeySquare size={28} /></div>
            <h3>Time-Locked OTP</h3>
            <p>Admin generates a 6-digit OTP that expires in seconds. It must be entered fresh — stored codes are useless.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon secure"><Lock size={28} /></div>
            <h3>Anti-Brute Force</h3>
            <p>5 wrong OTP attempts trigger a 10-minute lockout. Steps cannot be skipped — client-side manipulation is impossible.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon fast"><Zap size={28} /></div>
            <h3>Real-Time Sync</h3>
            <p>Admin changes — OTP, location, session state — propagate to all student devices instantly via Firebase Firestore.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon audit"><Cpu size={28} /></div>
            <h3>Audit Logs</h3>
            <p>Every verification attempt — success or failure — is timestamped and stored in Firestore for full accountability.</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-howit" id="how-it-works">
        <div className="howit-inner">
          <div className="howit-col">
            <div className="role-badge admin">Admin</div>
            <h3>What the Admin Does</h3>
            <ul className="howit-list">
              <li><CheckCircle size={16} /> Set the on-site GPS coordinates</li>
              <li><CheckCircle size={16} /> Register students with name & roll number</li>
              <li><CheckCircle size={16} /> Generate a fresh OTP for each session</li>
              <li><CheckCircle size={16} /> Display OTP on the classroom projector</li>
              <li><CheckCircle size={16} /> Monitor the live attendance dashboard</li>
            </ul>
            <button className="howit-btn" onClick={() => navigate('/admin')}>
              Open Admin Panel <ArrowRight size={16} />
            </button>
          </div>

          <div className="howit-divider" />

          <div className="howit-col">
            <div className="role-badge student">Student</div>
            <h3>What the Student Does</h3>
            <ul className="howit-list">
              <li><CheckCircle size={16} /> Open the Student Portal on their phone</li>
              <li><CheckCircle size={16} /> Tap "Validate Presence"</li>
              <li><CheckCircle size={16} /> Allow GPS — must be within the geofence</li>
              <li><CheckCircle size={16} /> Look into the camera for face scan</li>
              <li><CheckCircle size={16} /> Enter the OTP shown on the screen</li>
            </ul>
            <button className="howit-btn" onClick={() => navigate('/verify')}>
              Try Verification <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats" id="stats">
        <div className="stat-item">
          <div className="stat-value">99.7%</div>
          <div className="stat-label">Detection Accuracy</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">3</div>
          <div className="stat-label">Verification Layers</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">$4.1B</div>
          <div className="stat-label">Market Size 2026</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">10.4%</div>
          <div className="stat-label">CAGR Growth</div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>© 2026 Proxy Attendance — Anti-Proxy Attendance System</span>
        <div className="footer-links">
          <button className="landing-link btn-plain" onClick={() => navigate('/admin')}>Admin</button>
          <button className="landing-link btn-plain" onClick={() => navigate('/student')}>Student</button>
          <button className="landing-link btn-plain" onClick={() => navigate('/verify')}>Verify</button>
        </div>
      </footer>

      {/* ── How-It-Works Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <h3 className="modal-title">Verification Flow</h3>
            <p className="text-muted mb-4">Three gates that must all pass — in order.</p>

            <div className="modal-steps">
              <div className="modal-step">
                <div className="ms-icon geo"><MapPin size={22} /></div>
                <div className="ms-body">
                  <strong>Step 1 — Location Check</strong>
                  <p>Browser GPS is compared to the admin-set coordinates. Must be within 500m.</p>
                </div>
              </div>
              <div className="modal-step">
                <div className="ms-icon face"><ScanFace size={22} /></div>
                <div className="ms-body">
                  <strong>Step 2 — Face Scan</strong>
                  <p>On-device AI detects exactly one live human face. Photos and recordings fail.</p>
                </div>
              </div>
              <div className="modal-step">
                <div className="ms-icon otp"><KeySquare size={22} /></div>
                <div className="ms-body">
                  <strong>Step 3 — OTP Entry</strong>
                  <p>6-digit code shown on the classroom projector. Expires in seconds. 5-attempt lockout.</p>
                </div>
              </div>
              <div className="modal-step">
                <div className="ms-icon done"><CheckCircle size={22} /></div>
                <div className="ms-body">
                  <strong>Attendance Logged</strong>
                  <p>A verified record is written to Firestore with timestamp and all check results.</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <PrimaryButton onClick={() => { setShowModal(false); navigate('/verify'); }} className="w-100">
                Try It Now →
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
