import { safeDoc as doc, safeGetDoc as getDoc, safeAddDoc as addDoc, safeCollection as collection } from '../services/firestore';
import { db } from '../services/firebase';

// --- Rate limiter (in-memory, resets on page reload) ---
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 10 * 60 * 1000; // 10 minutes lockout after max attempts
const OTP_TTL_MS   = 30 * 1000;      // OTP expires 30 seconds after generated

let attemptCount = 0;
let lockoutUntil  = null;

// --- Local OTP cache using localStorage (survives page navigation between /admin and /verify) ---
const LS_OTP_KEY  = 'vp_cached_otp';
const LS_TIME_KEY = 'vp_cached_otp_time';

/** Called by AdminDashboard when a new OTP is generated */
export function cacheOtp(otp) {
  localStorage.setItem(LS_OTP_KEY,  otp);
  localStorage.setItem(LS_TIME_KEY, Date.now().toString());
}

function getLocalCache() {
  const otp  = localStorage.getItem(LS_OTP_KEY);
  const time = localStorage.getItem(LS_TIME_KEY);
  return otp ? { otp, time: time ? parseInt(time, 10) : null } : null;
}

/** Fetches the active session from Firebase with a 4-second timeout */
async function fetchSession() {
  const fetchPromise = getDoc(doc(db, 'settings', 'active_session'));
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Firebase timeout')), 4000)
  );
  return Promise.race([fetchPromise, timeout]);
}

export async function verifyOTP(inputOtp, studentInfo = {}) {
  // 1. Rate limit check
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const mins = Math.ceil((lockoutUntil - Date.now()) / 60000);
    return { success: false, error: `Too many failed attempts. Try again in ${mins} minute(s).` };
  }

  let activeOtp = null;
  let otpTimestamp = null;
  let usedCache = false;

  // 2. Try Firebase first, fall back to local cache
  try {
    const docSnap = await fetchSession();

    if (docSnap.exists && docSnap.exists() && docSnap.data().otp) {
      const data = docSnap.data();
      activeOtp = data.otp;
      otpTimestamp = data.timestamp
        ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp))
        : null;
    }
  } catch (fetchErr) {
    console.warn('Firebase fetch failed, trying local cache:', fetchErr.message);
  }

  // 3. Fall back to localStorage cache if Firebase was unavailable
  if (!activeOtp) {
    const cache = getLocalCache();
    if (cache) {
      activeOtp    = cache.otp;
      otpTimestamp = cache.time ? new Date(cache.time) : null;
      usedCache    = true;
      console.info('Using localStorage cached OTP for verification.');
    }
  }

  // 4. No OTP available at all
  if (!activeOtp) {
    return {
      success: false,
      error: 'No active session found. Ask your admin to generate an OTP.',
    };
  }

  // 5. OTP expiry check (10 seconds)
  if (otpTimestamp) {
    const age = Date.now() - otpTimestamp.getTime();
    if (age > OTP_TTL_MS) {
      return { success: false, error: 'OTP has expired. Ask your admin to generate a new one.' };
    }
  }

  // 6. Compare
  const isCorrect = inputOtp.trim() === activeOtp.trim();

  if (isCorrect) {
    attemptCount = 0;
    lockoutUntil  = null;

    // 7. Build the log entry
    const logEntry = {
      id: `local_log_${Date.now()}`,
      ...studentInfo,
      verifiedAt: new Date().toISOString(),
      status: 'verified',
      method: 'otp+face+geo',
      usedCachedOtp: usedCache,
    };

    // 7a. Save to localStorage IMMEDIATELY so the dashboard updates right away
    try {
      const LS_LOGS_KEY = 'vp_attendance_logs';
      const existing = JSON.parse(localStorage.getItem(LS_LOGS_KEY) || '[]');
      existing.unshift(logEntry); // newest first
      localStorage.setItem(LS_LOGS_KEY, JSON.stringify(existing.slice(0, 200))); // cap at 200
    } catch (e) {
      console.warn('Could not save log to localStorage:', e.message);
    }

    // 7b. Sync to Firebase in background (best-effort)
    addDoc(collection(db, 'attendance_logs'), logEntry)
      .catch(e => console.warn('Firebase log sync failed:', e.message));

    return { success: true };

  } else {
    attemptCount += 1;
    if (attemptCount >= MAX_ATTEMPTS) {
      lockoutUntil  = Date.now() + LOCKOUT_MS;
      attemptCount  = 0;
      return { success: false, error: 'Too many wrong attempts. Locked out for 10 minutes.' };
    }
    const remaining = MAX_ATTEMPTS - attemptCount;
    return { success: false, error: `Invalid OTP. ${remaining} attempt(s) remaining.` };
  }
}
