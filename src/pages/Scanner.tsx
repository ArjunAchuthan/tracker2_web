import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { TransformerService } from '../services/transformerService';
import { ProfileService, type UserProfile } from '../services/profileService';

export const Scanner: React.FC = () => {
  const [cameraStatus, setCameraStatus] = useState<'INACTIVE' | 'LIVE FEED'>('INACTIVE');
  const [scanHint, setScanHint] = useState('Align QR code within the frame');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);
  const [profile, setProfile] = useState<UserProfile>(ProfileService.getProfile());
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(ProfileService.getProfile());
    };
    window.addEventListener('profile_updated', handleUpdate);
    return () => window.removeEventListener('profile_updated', handleUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tracker2_logged_in');
    window.dispatchEvent(new Event('auth_state_changed'));
    navigate('/login');
  };

  useEffect(() => {
    if (localStorage.getItem('tracker2_logged_in') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  // Cleanup stream and requestAnimationFrame on unmount or stream change
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const handleQrDecoded = async (serialNo: string, mediaStream: MediaStream) => {
    // Stop camera feed immediately
    mediaStream.getTracks().forEach(track => track.stop());
    setStream(null);
    setCameraStatus('INACTIVE');
    setScanHint(`Verifying Asset: ${serialNo}...`);
    setIsLoading(true);
    setScanErrorMsg('');

    try {
      const transformer = await TransformerService.getTransformerBySerialNo(serialNo);
      setIsLoading(false);
      if (transformer) {
        setScanSuccess(true);
        setScanHint(`Transformer #${serialNo} Identified`);
        
        // Auto-redirect to details page after success
        setTimeout(() => {
          navigate(`/transformer/${encodeURIComponent(serialNo)}`);
        }, 1500);
      } else {
        setScanErrorMsg(`Asset "${serialNo}" not found in database.`);
        setScanHint('Scan failed');
        
        // Restart scanning after showing error message for 3 seconds
        setTimeout(() => {
          setScanErrorMsg('');
          startCamera();
        }, 3000);
      }
    } catch (e) {
      console.error("Error validating scanned QR: ", e);
      setIsLoading(false);
      setScanErrorMsg("Error querying database. Please try again.");
      setScanHint('Scan failed');
      
      setTimeout(() => {
        setScanErrorMsg('');
        startCamera();
      }, 3000);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("playsinline", "true");
      }
      setCameraStatus('LIVE FEED');
      setScanHint('Align QR code within the frame');
      setScanSuccess(false);
      setScanErrorMsg('');

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const tick = () => {
        const video = videoRef.current;
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
              handleQrDecoded(code.data, mediaStream);
              return;
            }
          }
        }
        requestRef.current = requestAnimationFrame(tick);
      };
      requestRef.current = requestAnimationFrame(tick);

    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Could not access camera. Please ensure permissions are granted in your browser settings.");
    }
  };

  return (
    <div className="flex-1 min-h-screen pb-12">
      {/* Top Navbar */}
      <header className="flex justify-between items-center px-6 py-4 w-full bg-white shadow-sm sticky top-0 z-40">
        <h2 className="font-headline-md text-headline-md text-primary font-semibold">
          Scanner
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="hover:bg-surface-container-high rounded-full p-2 transition-transform active:scale-95 cursor-pointer flex items-center justify-center text-on-surface-variant hover:text-error"
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>

          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 pl-2 border-l border-outline-variant cursor-pointer hover:opacity-80 transition-opacity"
            title="View Profile"
          >
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-on-surface leading-tight">
                {profile.fname} {profile.lname}
              </p>
              <p className="text-xs text-on-surface-variant">{profile.role}</p>
            </div>
            <img
              alt="User Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary-container shadow-sm"
              src={profile.avatarUrl}
            />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="max-w-2xl w-full flex flex-col items-center">
          
          {/* Main Scanner Card */}
          <div className="w-full bg-white rounded-2xl shadow-lg border border-outline-variant overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
              <span className="font-bold flex items-center text-primary text-sm">
                <span className="material-symbols-outlined mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                  videocam
                </span>
                SCANNER INTERFACE
              </span>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${cameraStatus === 'LIVE FEED' ? 'bg-error animate-pulse' : 'bg-outline'}`} />
                <span className={`font-semibold text-xs ${cameraStatus === 'LIVE FEED' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {cameraStatus}
                </span>
              </div>
            </div>

            {/* Viewport Area */}
            <div className="relative aspect-video bg-on-surface flex items-center justify-center overflow-hidden">
              
              {/* Initial Placeholder Content */}
              {cameraStatus === 'INACTIVE' && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-container-highest/30 px-12 text-center">
                  <span className="material-symbols-outlined text-8xl mb-4 text-outline/50">
                    linked_camera
                  </span>
                  <p className="text-sm font-semibold text-surface-bright/50">
                    Camera access is required to scan QR codes
                  </p>
                </div>
              )}

              {/* Loading Spinner during verification */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-on-surface/80 text-white z-20">
                  <svg className="animate-spin h-12 w-12 text-primary mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-semibold">Verifying Asset in Database...</p>
                </div>
              )}

              {/* Video Element */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${cameraStatus === 'LIVE FEED' ? 'block' : 'hidden'}`}
              />

              {/* Scan UI Overlay */}
              {cameraStatus === 'LIVE FEED' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary-container/40 rounded-xl relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-container rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-container rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-container rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-container rounded-br-lg"></div>
                      
                      {/* Scanning Animated Line */}
                      {!scanSuccess && (
                        <div className="absolute w-full h-0.5 bg-primary-container shadow-[0_0_15px_#1aa7df] animate-scan z-10" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Toast Notification inside Viewport */}
              {(cameraStatus === 'LIVE FEED' || isLoading || scanErrorMsg || scanSuccess) && (
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full border border-outline/30 text-white flex items-center space-x-3 transition-all duration-300 z-30 ${
                  scanSuccess 
                    ? 'bg-green-600/95 shadow-[0_0_15px_rgba(76,175,80,0.5)]' 
                    : scanErrorMsg 
                      ? 'bg-error/95 shadow-[0_0_15px_rgba(244,67,54,0.5)]' 
                      : 'bg-on-surface/90 backdrop-blur-md'
                }`}>
                  <span className="material-symbols-outlined text-white">
                    {scanSuccess ? 'check_circle' : scanErrorMsg ? 'warning' : 'info'}
                  </span>
                  <span className="text-sm font-semibold">{scanErrorMsg || scanHint}</span>
                </div>
              )}
            </div>

            {/* Action Area */}
            <div className="p-8 bg-surface-container-low flex flex-col items-center">
              <button 
                onClick={startCamera}
                disabled={cameraStatus === 'LIVE FEED' || isLoading}
                className={`px-12 py-4 rounded-xl font-bold text-base flex items-center space-x-3 shadow-lg transition-all ${
                  cameraStatus === 'LIVE FEED' || isLoading
                    ? 'bg-surface-container-high text-outline cursor-not-allowed'
                    : 'bg-primary text-white hover:brightness-110 active:scale-95 cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span>{cameraStatus === 'LIVE FEED' ? 'Scanning...' : 'Scan QR Code'}</span>
              </button>
              <p className="mt-4 text-on-surface-variant font-semibold text-xs">
                Supports all standard industrial QR labels
              </p>
            </div>
          </div>

          {/* Guidance Note */}
          <div className="mt-8 text-center text-on-surface-variant max-w-md">
            <p className="text-sm italic font-medium">
              Quickly identify equipment by scanning the tracking label located on the main transformer housing.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Scan Animation Styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
