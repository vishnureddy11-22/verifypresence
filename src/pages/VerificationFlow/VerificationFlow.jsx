import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/GlassCard/GlassCard';
import { PrimaryButton } from '../../components/PrimaryButton/PrimaryButton';
import { validateLocation } from '../../utils/geolocation';
import { loadFaceModels, verifyFace } from '../../utils/faceVerification';
import { verifyOTP } from '../../utils/otpVerification';
import { MapPin, KeySquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import './VerificationFlow.css';

// Helper icon to avoid importing FaceId which might not exist in lucide-react depending on version
const ScanFaceIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <path d="M9 9h.01"></path>
    <path d="M15 9h.01"></path>
  </svg>
);

export function VerificationFlow() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [step, setStep] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [geoBypass, setGeoBypass] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null); // { latitude, longitude }

  // Secure step advance — prevents skipping via DevTools
  const advanceStep = (targetStep) => {
    if (targetStep === maxUnlocked + 1) {
      setMaxUnlocked(targetStep);
      setStep(targetStep);
    }
  };

  // Step 1: Geolocation
  const handleGeoCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await validateLocation();
      if (result.success) {
        if (result.bypassed) setGeoBypass(true);
        // Store GPS coords to attach to the attendance log
        if (result.coords) setGeoCoords(result.coords);
        advanceStep(2);
      } else {
        setError(result.error || `Location failed. You are ${Math.round(result.distance)}m away from the target.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Setup Camera and Face Models
  useEffect(() => {
    if (step === 2) {
      const initCamera = async () => {
        setLoading(true);
        try {
          await loadFaceModels();
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera or Model access error:", err);
          setError(`Access denied or failed: ${err.message || err.toString()}`);
        } finally {
          setLoading(false);
        }
      };
      initCamera();
    }
    
    // Cleanup camera
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const handleFaceCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyFace(videoRef.current);
      if (result.success) {
        advanceStep(3);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Face verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: OTP
  const handleOTPCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass geo coords so they're stored in the attendance log
      const studentInfo = geoCoords ? { coords: geoCoords } : {};
      const result = await verifyOTP(otp, studentInfo);
      if (result.success) {
        advanceStep(4);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verification-wrapper">
      <GlassCard className="verification-card">
        <h2 className="text-center mb-4">Validate Presence</h2>
        
        {/* Progress Bar */}
        <div className="progress-bar mb-4">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}><MapPin size={18}/></div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}><ScanFaceIcon size={18}/></div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}><KeySquare size={18}/></div>
        </div>

        {error && (
          <div className="error-alert mb-4">
            <XCircle size={20} />
            {error}
          </div>
        )}

        {/* Step 1: Geo */}
        {step === 1 && (
          <div className="step-content text-center animate-fade-in">
            <div className="icon-wrapper mb-3">
              <MapPin size={48} className="text-primary" />
            </div>
            <h3>Location Verification</h3>
            <p className="text-muted mb-4">We need to verify you are within the 50m geofence of the premises.</p>
            <PrimaryButton onClick={handleGeoCheck} disabled={loading} className="w-100">
              {loading ? <Loader2 className="spinner" /> : "Verify Location"}
            </PrimaryButton>
          </div>
        )}

        {/* Step 2: Face */}
        {step === 2 && (
          <div className="step-content text-center animate-fade-in">
            <h3>Face Verification</h3>
            <p className="text-muted mb-3">Align your face with the camera frame.</p>
            <div className="video-container mb-4">
              <video ref={videoRef} autoPlay muted playsInline className="camera-feed"></video>
            </div>
            <PrimaryButton onClick={handleFaceCheck} disabled={loading} className="w-100">
              {loading ? <Loader2 className="spinner" /> : "Scan Face"}
            </PrimaryButton>
          </div>
        )}

        {/* Step 3: OTP */}
        {step === 3 && (
          <div className="step-content text-center animate-fade-in">
            <h3>Secondary Validation</h3>
            <p className="text-muted mb-3">Enter the 6-digit OTP displayed on the classroom screen.</p>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="glass-input otp-input mb-4" 
              placeholder="••••••" 
              value={otp}
              onChange={(e) => {
                // Only allow digits, no letters or special chars
                const digitsOnly = e.target.value.replace(/\D/g, '');
                setOtp(digitsOnly);
              }}
              maxLength={6}
              autoComplete="one-time-code"
            />
            <PrimaryButton onClick={handleOTPCheck} disabled={loading || otp.length < 6} className="w-100">
              {loading ? <Loader2 className="spinner" /> : "Confirm OTP"}
            </PrimaryButton>
          </div>
        )}

        {step === 4 && (
          <div className="step-content text-center animate-fade-in">
            <div className="icon-wrapper success mb-3">
              <CheckCircle size={64} className="text-success" />
            </div>
            <h3 className="text-success mb-2">Verification Complete!</h3>
            <p className="text-muted mb-2">Your presence has been securely validated and logged.</p>
            <div className="success-checks mb-4">
              <span className="check-pill"><CheckCircle size={14}/> Location</span>
              <span className="check-pill"><CheckCircle size={14}/> Face</span>
              <span className="check-pill"><CheckCircle size={14}/> OTP</span>
            </div>
            <PrimaryButton onClick={() => navigate('/student')} className="w-100">
              Return to Dashboard
            </PrimaryButton>
          </div>
        )}

      </GlassCard>
    </div>
  );
}


