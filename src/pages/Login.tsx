import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileService } from '../services/profileService';

export const Login: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect
    if (localStorage.getItem('tracker2_logged_in') === 'true') {
      navigate('/');
    }
  }, [navigate]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setPin(val);
      setIsError(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setIsLoading(true);
    try {
      const profile = await ProfileService.login(pin);
      if (profile) {
        window.dispatchEvent(new Event('auth_state_changed'));
        navigate('/');
      } else {
        setIsError(true);
        setTimeout(() => setIsError(false), 500);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Industrial Background with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(245, 250, 255, 0.85), rgba(245, 250, 255, 0.95)), url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
          backgroundAttachment: 'fixed'
        }}
      />

      {/* Login Card */}
      <main className="relative z-10 w-full max-w-[480px] px-6 flex flex-col items-center">
        <div className="w-full bg-white rounded-xl shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden border border-outline-variant/30">
          
          {/* Branding Header */}
          <div className="pt-10 pb-6 px-10 text-center">
            <div className="flex flex-col items-center gap-4">
              <img 
                alt="Eddy Logo" 
                className="w-16 h-16 object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmo50XCXY55F6bQHOzuwemQLPZLX85_hfOI7BzkLzCX2BQPQeb196jboAJjFPWQpQN_6G2NXbswJ8aifWTSFYeNTT0YfQsfYYfMmuJAiZgjBmEyt8bj9nyUl4Ccevzn4I_MMQnCEUxoKAq00ZIWs3JwYsg90TkSyhi7ncmIQ1Dx5cn6rddVlp5b-ZE6knXlASnpZZTzgJ7ce64TOY94RjxvIVWlcXg8_kOMJWmIIG4KqOzbB7hZcryaaFPYsjxzPlGC_ueRCHkHn5-5g" 
              />
              <div>
                <h1 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                  Eddy Transformer Tracker
                </h1>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-10 pb-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-semibold text-xs text-on-surface ml-1 block" htmlFor="pin">
                  Enter PIN (6 digits)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  </div>
                  <input 
                    className={`w-full pl-12 pr-4 py-3.5 bg-surface rounded-lg border focus:ring-1 focus:ring-primary transition-all font-bold tracking-[0.5em] text-center outline-none ${
                      isError 
                        ? 'border-error animate-shake' 
                        : 'border-outline-variant focus:border-primary'
                    }`}
                    id="pin" 
                    maxLength={6} 
                    name="pin" 
                    placeholder="••••••" 
                    type="password"
                    value={pin}
                    onChange={handlePinChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Primary Action */}
              <button 
                onClick={handleLogin}
                disabled={isLoading}
                className={`w-full font-bold text-sm py-4 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                  pin.length === 6 && !isLoading
                    ? 'bg-primary text-white hover:bg-primary-container shadow-md'
                    : 'bg-primary-container text-on-primary-container opacity-90'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <span className="material-symbols-outlined">login</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>


      </main>

      {/* Shake Animation Style */}
      <style>{`
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};
