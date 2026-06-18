import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransformerService } from '../services/transformerService';
import type { Transformer } from '../services/transformerService';
import { ProfileService, type UserProfile } from '../services/profileService';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not Scheduled';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export const TransformerDetails: React.FC = () => {
  const { serialNo } = useParams<{ serialNo: string }>();
  const [transformer, setTransformer] = useState<Transformer | null>(null);
  
  const [shippingDate, setShippingDate] = useState('05/06/2026');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed)
  const [selectedDay, setSelectedDay] = useState(5);
  
  const [showQr, setShowQr] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const fetchDetails = async () => {
      if (serialNo) {
        const item = await TransformerService.getTransformerBySerialNo(decodeURIComponent(serialNo));
        if (item) {
          setTransformer(item);
          if (item.dateSubmitted) {
            // Convert YYYY-MM-DD to DD/MM/YYYY
            const parts = item.dateSubmitted.split('-');
            if (parts.length === 3) {
              setShippingDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
              setSelectedDay(parseInt(parts[2]));
              setCurrentMonth(parseInt(parts[1]) - 1);
              setCurrentYear(parseInt(parts[0]));
            }
          }
        }
      }
    };
    fetchDetails();
  }, [serialNo]);

  // Click outside listener for calendar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    const dateStr = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear}`;
    setShippingDate(dateStr);
    setIsCalendarOpen(false);
  };

  const handleAction = async (status: 'Approved' | 'Rejected') => {
    if (!transformer) return;
    setIsLoading(true);

    // Format shipping date from DD/MM/YYYY to YYYY-MM-DD
    const dateParts = shippingDate.split('/');
    const formattedDate = dateParts.length === 3 
      ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` 
      : new Date().toISOString().split('T')[0];

    const success = await TransformerService.updateTransformerFields(transformer.serialNo, {
      status,
      dateSubmitted: formattedDate
    });

    setIsLoading(false);

    if (success) {
      setTransformer(prev => prev ? { ...prev, status, dateSubmitted: formattedDate } : null);
      alert(`Transformer status updated to: ${status}`);
      navigate('/');
    } else {
      alert("Failed to update status. Please try again.");
    }
  };

  // Populate calendar days
  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    // Empty slots before 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDay && currentMonth === 5 && currentYear === 2026; // Highlight default mockup date
      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleDaySelect(day)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs hover:bg-primary-container hover:text-white transition-colors cursor-pointer ${
            isSelected ? 'bg-primary text-white font-bold' : 'text-on-surface'
          }`}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  if (!transformer) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="animate-pulse text-on-surface-variant font-medium">
          Loading unit specifications...
        </div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Shipping':
        return 'bg-[#d1fadf] text-[#027a48]';
      case 'Rejected':
      case 'Declined':
        return 'bg-error-container text-error';
      case 'Approved':
        return 'bg-green-100 text-green-700';
      case 'Submitted':
        return 'bg-blue-100 text-blue-700';
      case 'Saved':
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  return (
    <div className="flex-1 min-h-screen pb-12">
      {/* Top Navbar */}
      <header className="flex justify-between items-center px-6 py-4 w-full bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="hover:bg-surface-container-high rounded-full p-2 transition-transform active:scale-95 cursor-pointer flex items-center justify-center text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-md text-headline-md text-primary font-semibold">
            Transformer Details
          </h2>
        </div>
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

      {/* Main Content Area */}
      <main className="p-8 flex flex-col items-center max-w-7xl mx-auto w-full">
        <div className="w-full max-w-2xl space-y-6">
          
          {/* Unit Specifications Bento Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-lg p-6 shadow-soft border border-surface-variant/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  precision_manufacturing
                </span>
              </div>
              <h3 className="text-label-bold text-primary mb-4 uppercase tracking-wider font-bold text-xs">
                Unit Specifications
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                  <span className="font-bold text-xs text-on-surface-variant uppercase">Serial No:</span>
                  <span className="font-bold text-on-surface text-base">{transformer.serialNo}</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                  <span className="font-bold text-xs text-on-surface-variant uppercase">Part No:</span>
                  <span className="font-bold text-on-surface text-base">{transformer.partNo}</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
                  <span className="font-bold text-xs text-on-surface-variant uppercase">Status:</span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs ${getStatusStyle(transformer.status)}`}>
                    {transformer.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-on-surface-variant uppercase">Item Shipping Date:</span>
                  <span className="font-bold text-on-surface text-base">{formatDate(transformer.dateSubmitted)}</span>
                </div>
              </div>
            </div>

            {/* QR Code trigger bento card */}
            <div 
              onClick={() => setShowQr(true)}
              className="bg-primary-container text-white rounded-lg p-6 shadow-soft flex flex-col items-center justify-center text-center gap-4 group cursor-pointer active:scale-95 transition-all hover:brightness-110"
            >
              <div className="bg-white/20 p-4 rounded-xl">
                <span className="material-symbols-outlined text-4xl">qr_code_2</span>
              </div>
              <p className="font-bold text-xs uppercase tracking-widest">Generate QR Code</p>
              <p className="text-[10px] opacity-80">Link unit to digital twin repository</p>
            </div>
          </div>

          {/* Action Card / Operations Hub */}
          {profile.role === 'Superadmin' && (
            <div className="bg-white rounded-lg p-8 shadow-soft border border-surface-variant/30">
              <h4 className="font-bold text-lg mb-6 text-on-surface">Operations Hub</h4>
              <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                
                {/* Custom Date Picker */}
                <div className="relative">
                  <label className="font-bold text-xs text-on-surface mb-2 block uppercase" htmlFor="shipping-date">
                    Shipping Date
                  </label>
                  <div 
                    ref={triggerRef}
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="relative group cursor-pointer"
                  >
                    <input 
                      className="w-full h-14 pl-4 pr-12 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all cursor-pointer text-base outline-none" 
                      id="shipping-date" 
                      placeholder="Select Date" 
                      readOnly 
                      type="text"
                      value={shippingDate}
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                      calendar_month
                    </span>
                  </div>

                  {/* Date picker calendar popup */}
                  {isCalendarOpen && (
                    <div 
                      ref={calendarRef}
                      className="absolute left-0 mt-2 w-72 bg-white border border-outline-variant rounded-xl shadow-xl p-4 z-50"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <button 
                          onClick={() => handleMonthChange('prev')}
                          className="p-1 hover:bg-surface-container rounded-full text-primary cursor-pointer flex items-center"
                          type="button"
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="font-bold text-sm">
                          {monthNames[currentMonth]} {currentYear}
                        </span>
                        <button 
                          onClick={() => handleMonthChange('next')}
                          className="p-1 hover:bg-surface-container rounded-full text-primary cursor-pointer flex items-center"
                          type="button"
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-2 font-bold text-[10px] text-on-surface-variant uppercase">
                        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {getCalendarDays()}
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-on-surface-variant font-medium">
                    Confirmed delivery window for logistics planning.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => handleAction('Approved')}
                    disabled={isLoading}
                    className="flex-grow h-14 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction('Rejected')}
                    disabled={isLoading}
                    className="flex-grow h-14 bg-[#F44336] hover:bg-[#e53935] text-white rounded-lg font-bold text-sm uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Reject
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Initial device photos visualization */}
          {transformer.photos.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-soft border border-surface-variant/30">
              <h4 className="font-bold text-xs text-primary mb-4 uppercase tracking-wider">Device Media Artifacts</h4>
              <div className="grid grid-cols-3 gap-3">
                {transformer.photos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-outline-variant">
                    <img className="w-full h-full object-cover" src={url} alt={`Transformer ${i+1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test report attachment details */}
          {transformer.testReportUrl && (
            <div className="bg-white rounded-lg p-6 shadow-soft border border-surface-variant/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">picture_as_pdf</span>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Test Report Calibration PDF</p>
                  <p className="text-xs text-outline">Calibration record attached</p>
                </div>
              </div>
              <a 
                href={transformer.testReportUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-surface-container-high rounded text-xs font-bold text-primary hover:bg-surface-variant flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Open
              </a>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Dialog Modal */}
      {showQr && (
        <div 
          onClick={() => setShowQr(false)}
          className="fixed inset-0 bg-on-surface/50 z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center relative max-w-sm w-full text-center"
          >
            <button 
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-outline hover:text-on-surface cursor-pointer flex items-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-bold text-lg mb-2 text-on-surface">Transformer QR Code</h3>
            <p className="text-xs text-on-surface-variant mb-6">Linked to: {transformer.serialNo}</p>
            <div className="p-4 bg-white border border-outline-variant rounded-xl shadow-inner mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(transformer.serialNo)}`} 
                alt="QR Code" 
                className="w-48 h-48 object-contain"
              />
            </div>
            <p className="text-xs text-outline italic">Use a scanner app or the system Scanner tab to identify this asset label.</p>
          </div>
        </div>
      )}
    </div>
  );
};
