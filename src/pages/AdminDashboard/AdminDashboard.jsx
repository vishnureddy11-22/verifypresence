import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard/GlassCard';
import { PrimaryButton } from '../../components/PrimaryButton/PrimaryButton';
import {
  Users, TrendingDown, Map, ShieldAlert, KeySquare, MapPin,
  UserPlus, Trash2, Search, GraduationCap, CheckCircle, XCircle, Loader2,
  Activity, CalendarCheck, Wifi, WifiOff
} from 'lucide-react';
import {
  doc, setDoc, onSnapshot, collection,
  addDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cacheOtp } from '../../utils/otpVerification';
import './AdminDashboard.css';

// --- localStorage helpers (outside component to avoid stale closures) ---
const LS_KEY       = 'vp_students_local';    // admin-added local students
const LS_FB_CACHE  = 'vp_students_firebase'; // last-known Firebase students (cache)
const LS_GEO_KEY   = 'vp_target_location';   // admin-set geofence coordinates

const getLocalStudents   = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)      || '[]'); } catch { return []; } };
const getFbCacheStudents = () => { try { return JSON.parse(localStorage.getItem(LS_FB_CACHE) || '[]'); } catch { return []; } };
const saveLocalStudents  = (list) => localStorage.setItem(LS_KEY,      JSON.stringify(list));
const saveFbCache        = (list) => localStorage.setItem(LS_FB_CACHE, JSON.stringify(list));

const mergeStudents = (firebaseList) => {
  const local   = getLocalStudents();
  // Combine Firebase + local-only students (deduped by rollNumber)
  const fbRolls = new Set(firebaseList.map(s => s.rollNumber));
  const uniqueLocal = local.filter(s => !fbRolls.has(s.rollNumber));
  const merged = [...firebaseList, ...uniqueLocal];
  merged.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return merged;
};

// Build list from cache when Firebase is unavailable
const mergeFromCache = () => {
  const fbCache = getFbCacheStudents();
  return mergeStudents(fbCache);
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('session'); // 'session' | 'students'

  // --- Session State ---
  const [activeOtp, setActiveOtp] = useState('------');
  const [targetLat, setTargetLat] = useState('37.7749');
  const [targetLng, setTargetLng] = useState('-122.4194');
  const [isUpdating, setIsUpdating] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpGeneratedAt, setOtpGeneratedAt] = useState(null);
  const [sessionToast, setSessionToast] = useState(null); // { type, text }
  const OTP_TTL = 30;

  // --- Student State — initialize from BOTH caches instantly ---
  const [students, setStudents] = useState(mergeFromCache());
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentMsg, setStudentMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Attendance Logs State ---
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // --- Live countdown timer ---
  useEffect(() => {
    if (!otpGeneratedAt) return;
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - otpGeneratedAt) / 1000);
      const left = Math.max(0, OTP_TTL - elapsed);
      setOtpSecondsLeft(left);
      if (left === 0) clearInterval(tick);
    }, 250); // update 4x/sec for smooth feel
    return () => clearInterval(tick);
  }, [otpGeneratedAt]);

  // --- Listen to active session ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "active_session"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.otp) setActiveOtp(data.otp);
        if (data.targetLocation) {
          setTargetLat(data.targetLocation.latitude);
          setTargetLng(data.targetLocation.longitude);
        }
      }
    });
    return () => unsub();
  }, []);

  // --- Listen to students collection ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'students'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // ✅ Cache Firebase students locally so they survive Firebase outages
      saveFbCache(list);
      setStudents(mergeStudents(list));
    }, (err) => {
      console.warn('Firebase student fetch failed — using cached data:', err.message);
      // Fall back to last-known Firebase data + local students
      setStudents(mergeFromCache());
    });
    return () => unsub();
  }, []);

  // --- Attendance logs: localStorage-first, Firebase as bonus sync ---
  const LS_LOGS_KEY = 'vp_attendance_logs';
  const getLocalLogs = () => {
    try { return JSON.parse(localStorage.getItem(LS_LOGS_KEY) || '[]'); } catch { return []; }
  };

  useEffect(() => {
    // Load from localStorage immediately (instant, no Firebase wait)
    const localLogs = getLocalLogs();
    if (localLogs.length > 0) setAttendanceLogs(localLogs);

    // Also listen to Firebase and merge
    const unsub = onSnapshot(collection(db, 'attendance_logs'), (snapshot) => {
      const fbLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Merge: Firebase + local (dedupe by verifiedAt timestamp)
      const localOnly = getLocalLogs().filter(l =>
        !fbLogs.some(f => f.verifiedAt === l.verifiedAt)
      );
      const merged = [...fbLogs, ...localOnly];
      merged.sort((a, b) => (b.verifiedAt || '').localeCompare(a.verifiedAt || ''));
      setAttendanceLogs(merged);
      // Cache Firebase logs locally
      localStorage.setItem(LS_LOGS_KEY, JSON.stringify(merged.slice(0, 200)));
    }, (err) => {
      console.warn('Firebase logs unavailable, using local:', err.message);
      setAttendanceLogs(getLocalLogs());
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const generateNewSession = async () => {
    setIsUpdating(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    // Always save coords to localStorage immediately (before Firebase attempt)
    const targetLocation = {
      latitude: parseFloat(targetLat),
      longitude: parseFloat(targetLng),
      setAt: now,
    };
    localStorage.setItem(LS_GEO_KEY, JSON.stringify(targetLocation));

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    try {
      await Promise.race([
        setDoc(doc(db, 'settings', 'active_session'), {
          otp: newOtp,
          targetLocation: { latitude: targetLocation.latitude, longitude: targetLocation.longitude },
          timestamp: new Date().toISOString(),
        }, { merge: true }),
        timeout,
      ]);
      setActiveOtp(newOtp);
      setOtpGeneratedAt(now);
      setOtpSecondsLeft(OTP_TTL);
      cacheOtp(newOtp);
    } catch (error) {
      console.error('Error updating session:', error.message);
      setActiveOtp(newOtp);
      setOtpGeneratedAt(now);
      setOtpSecondsLeft(OTP_TTL);
      cacheOtp(newOtp);
      setSessionToast({ type: 'warn', text: `⚠️ Firebase offline — OTP & location saved locally.` });
      setTimeout(() => setSessionToast(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };


  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) return;
    setAddingStudent(true);
    setStudentMsg(null);

    const newStudent = {
      name: studentName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      email: studentEmail.trim(),
      department: department.trim(),
      createdAt: new Date().toISOString(),
      attendanceCount: 0,
      status: 'active',
    };

    // ── STEP 1: Save to localStorage IMMEDIATELY (source of truth) ──
    const localId = `local_${Date.now()}`;
    const localStudent = { ...newStudent, id: localId, isLocal: true };
    const localList = getLocalStudents();
    localList.push(localStudent);
    saveLocalStudents(localList);

    // Update UI count immediately — no waiting for Firebase
    setStudents(prev => {
      const merged = [...prev, localStudent];
      merged.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return merged;
    });
    setStudentMsg({ type: 'success', text: `✓ ${newStudent.name} added!` });

    // Clear form right away
    setStudentName(''); setRollNumber('');
    setStudentEmail(''); setDepartment('');
    setAddingStudent(false);
    setTimeout(() => setStudentMsg(null), 3000);

    // ── STEP 2: Sync to Firebase in background (best-effort) ──
    try {
      await Promise.race([
        addDoc(collection(db, 'students'), newStudent),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      // Firebase saved — remove local copy to avoid future duplicates
      const updated = getLocalStudents().filter(s => s.id !== localId);
      saveLocalStudents(updated);
    } catch (err) {
      console.warn('Firebase sync failed, student stays local:', err.message);
      // Student is already in localStorage — no action needed
    }
  };


  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system?`)) return;
    // If local-only student, remove from localStorage
    if (id.startsWith('local_')) {
      const updated = getLocalStudents().filter(s => s.id !== id);
      saveLocalStudents(updated);
      setStudents(prev => prev.filter(s => s.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      console.error('Delete failed:', err.message);
      // Remove from local view anyway
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-dashboard animate-fade-in">
      <div className="admin-header">
        <h2>Institution Dashboard</h2>
        <p className="text-muted">Real-time attendance &amp; anomaly tracking</p>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'session' ? 'active' : ''}`}
          onClick={() => setActiveTab('session')}
        >
          <KeySquare size={16} /> Session Control
        </button>
        <button
          className={`admin-tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <GraduationCap size={16} /> Students
          {students.length > 0 && <span className="tab-badge">{students.length}</span>}
        </button>
      </div>

      {/* === SESSION TAB === */}
      {activeTab === 'session' && (
        <>
          <div className="admin-controls-grid">
            {/* OTP Generator */}
            <GlassCard className="control-card otp-card">
              <div className="card-header">
                <h3><KeySquare size={20} /> Active OTP</h3>
                {otpGeneratedAt && (
                  <span className={`otp-expiry-badge ${otpSecondsLeft <= 3 ? 'expiring' : ''}`}>
                    {otpSecondsLeft > 0 ? `Expires in ${otpSecondsLeft}s` : '⚠ Expired'}
                  </span>
                )}
              </div>

              <div className="otp-display">
                <span className={`live-otp ${otpSecondsLeft === 0 && otpGeneratedAt ? 'otp-expired' : ''}`}>
                  {activeOtp}
                </span>
              </div>

              {/* Countdown bar */}
              {otpGeneratedAt && (
                <div className="otp-countdown-bar">
                  <div
                    className={`otp-countdown-fill ${otpSecondsLeft <= 3 ? 'danger' : ''}`}
                    style={{ width: `${(otpSecondsLeft / OTP_TTL) * 100}%` }}
                  />
                </div>
              )}

              <p className="text-muted text-center mb-3">Display this on the classroom/premises screen.</p>

              {/* Inline toast — replaces blocking alert() */}
              {sessionToast && (
                <div className={`session-toast ${sessionToast.type}`}>
                  {sessionToast.text}
                </div>
              )}

              <PrimaryButton onClick={generateNewSession} disabled={isUpdating} className="w-100">
                {isUpdating ? <Loader2 className="spinner" size={18} /> : '🔄 Generate New OTP'}
              </PrimaryButton>
            </GlassCard>

            {/* Geolocation Target */}
            <GlassCard className="control-card geo-card">
              <div className="card-header">
                <h3><MapPin size={20} /> On-Site Location</h3>
              </div>
              <div className="geo-inputs mb-3">
                <div className="input-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    className="glass-input small-input"
                    value={targetLat}
                    onChange={(e) => setTargetLat(e.target.value)}
                    step="any"
                  />
                </div>
                <div className="input-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    className="glass-input small-input"
                    value={targetLng}
                    onChange={(e) => setTargetLng(e.target.value)}
                    step="any"
                  />
                </div>
              </div>
              <PrimaryButton onClick={generateNewSession} disabled={isUpdating} className="w-100">
                Update Target Coordinates
              </PrimaryButton>
            </GlassCard>
          </div>

          {/* Stats */}
          {(() => {
            const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
            const todayLogs = attendanceLogs.filter(l =>
              l.verifiedAt && l.verifiedAt.startsWith(todayStr)
            );
            const attendanceRate = students.length > 0
              ? Math.round((todayLogs.length / students.length) * 100)
              : null;
            const sessionActive = otpGeneratedAt && otpSecondsLeft > 0;

            return (
              <div className="stats-grid mt-4">

                {/* Card 1: Today's Check-ins */}
                <GlassCard className="stat-card">
                  <div className="stat-icon-wrapper text-primary"><CalendarCheck size={24} /></div>
                  <div className="stat-info">
                    <h3>
                      {todayLogs.length}
                      <span className="stat-sub"> / {students.length}</span>
                    </h3>
                    <p className="text-muted">Today's Check-ins</p>
                  </div>
                </GlassCard>

                {/* Card 2: Attendance Rate */}
                <GlassCard className="stat-card">
                  <div className={`stat-icon-wrapper ${attendanceRate >= 75 ? 'text-success' : attendanceRate !== null ? 'text-warning' : 'text-muted'}`}>
                    <Activity size={24} />
                  </div>
                  <div className="stat-info">
                    <h3 className={attendanceRate >= 75 ? 'text-success' : attendanceRate < 50 && attendanceRate !== null ? 'text-danger' : ''}>
                      {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                    </h3>
                    <p className="text-muted">Attendance Rate</p>
                  </div>
                </GlassCard>

                {/* Card 3: Session Status */}
                <GlassCard className="stat-card">
                  <div className={`stat-icon-wrapper ${sessionActive ? 'text-success' : 'text-muted'}`}>
                    {sessionActive ? <Wifi size={24} /> : <WifiOff size={24} />}
                  </div>
                  <div className="stat-info">
                    <h3 className={sessionActive ? 'text-success' : 'text-muted'}>
                      {sessionActive ? `${otpSecondsLeft}s` : 'Idle'}
                    </h3>
                    <p className="text-muted">
                      {sessionActive ? 'OTP Active — expires soon' : 'No active session'}
                    </p>
                  </div>
                </GlassCard>

              </div>
            );
          })()}

          {/* Heatmap + Logs */}
          <div className="dashboard-content mt-4">
            <GlassCard className="heatmap-card">
              <div className="card-header">
                <h3><Map size={20} /> Live Attendance Heatmap</h3>
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const todayCount = attendanceLogs.filter(l => l.verifiedAt?.startsWith(todayStr)).length;
                  return (
                    <span className={`badge ${todayCount > 0 ? 'success' : ''}`}>
                      {todayCount > 0 ? `${todayCount} today` : 'Waiting'}
                    </span>
                  );
                })()}
              </div>
              <div className="heatmap-placeholder">
                <div className="mock-map">
                  {/* Target crosshair at center */}
                  <div className="heatmap-target" style={{ top: '50%', left: '50%' }} title="Target Location" />

                  {/* Dynamic dots from actual check-in GPS coords */}
                  {(() => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const todayLogs = attendanceLogs.filter(l => l.verifiedAt?.startsWith(todayStr));
                    const tLat = parseFloat(targetLat);
                    const tLng = parseFloat(targetLng);
                    const hasTarget = !isNaN(tLat) && !isNaN(tLng);

                    if (todayLogs.length === 0) {
                      return (
                        <div className="heatmap-empty">
                          <p>No check-ins yet today</p>
                        </div>
                      );
                    }

                    return todayLogs.map((log, i) => {
                      let top = 50, left = 50; // default = center (target)
                      if (hasTarget && log.coords?.latitude && log.coords?.longitude) {
                        // Scale: 0.005° lat/lng ≈ ~500m → map to ±35% from center
                        const dLat = log.coords.latitude  - tLat;
                        const dLng = log.coords.longitude - tLng;
                        const scale = 35 / 0.005; // pixels per degree
                        top  = Math.min(85, Math.max(15, 50 - dLat * scale));
                        left = Math.min(85, Math.max(15, 50 + dLng * scale));
                      } else {
                        // No coords — scatter near center slightly
                        top  = 45 + (i % 3) * 7;
                        left = 42 + (i % 4) * 8;
                      }
                      return (
                        <div
                          key={log.id}
                          className="pulse-dot"
                          style={{ top: `${top}%`, left: `${left}%` }}
                          title={log.verifiedAt ? new Date(log.verifiedAt).toLocaleTimeString() : ''}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            </GlassCard>


            <GlassCard className="recent-logs-card">
              <div className="card-header">
                <h3>Recent Verified Check-ins</h3>
                {attendanceLogs.length > 0 && (
                  <span className="badge">{attendanceLogs.length} total</span>
                )}
              </div>
              {attendanceLogs.length === 0 ? (
                <div className="empty-logs">
                  <CheckCircle size={28} className="text-muted" />
                  <p className="text-muted">No check-ins yet. Students who complete verification will appear here.</p>
                </div>
              ) : (
                <ul className="log-list">
                  {attendanceLogs.slice(0, 6).map(log => {
                    const ts = log.verifiedAt ? new Date(log.verifiedAt) : null;
                    const timeStr = ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
                    return (
                      <li key={log.id} className="log-item">
                        <span className="log-time">{timeStr}</span>
                        <span className="log-detail">
                          <strong>{log.studentName || 'Student'}</strong>
                          {log.rollNumber ? ` · ${log.rollNumber}` : ''}
                          {log.usedCachedOtp ? ' · (offline OTP)' : ''}
                        </span>
                        <span className="badge success">Verified</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </div>
        </>
      )}

      {/* === STUDENTS TAB === */}
      {activeTab === 'students' && (
        <div className="students-tab animate-fade-in">
          {/* Add Student Form */}
          <GlassCard className="add-student-card">
            <div className="card-header">
              <h3><UserPlus size={20} /> Add New Student</h3>
            </div>
            {studentMsg && (
              <div className={`inline-alert ${studentMsg.type}`}>
                {studentMsg.type === 'success' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                {studentMsg.text}
              </div>
            )}
            <form className="student-form" onSubmit={handleAddStudent}>
              <div className="form-row">
                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. Arjun Kumar"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Roll Number *</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. CS2024001"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="glass-input"
                    placeholder="student@college.edu"
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  />
                </div>
              </div>
              <PrimaryButton type="submit" disabled={addingStudent || !studentName || !rollNumber} className="w-100">
                {addingStudent ? <><Loader2 className="spinner" size={16}/> Adding...</> : <><UserPlus size={16}/> Add Student</>}
              </PrimaryButton>
            </form>
          </GlassCard>

          {/* Student List */}
          <GlassCard className="student-list-card">
            <div className="card-header">
              <h3><Users size={20} /> Registered Students ({students.length})</h3>
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="glass-input search-input"
                  placeholder="Search by name, roll no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="empty-state">
                <GraduationCap size={48} className="text-muted" />
                <p className="text-muted">
                  {students.length === 0 ? 'No students registered yet. Add your first student above.' : 'No students match your search.'}
                </p>
              </div>
            ) : (
              <div className="student-table-wrapper">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Roll No.</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Attendance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <tr key={s.id}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="student-name">{s.name}</td>
                        <td><span className="roll-badge">{s.rollNumber}</span></td>
                        <td className="text-muted">{s.department || '—'}</td>
                        <td className="text-muted">{s.email || '—'}</td>
                        <td>
                          <span className="attendance-count">{s.attendanceCount ?? 0}</span>
                        </td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            title="Remove student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
