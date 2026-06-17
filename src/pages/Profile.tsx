import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileService } from '../services/profileService';
import type { UserProfile } from '../services/profileService';

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(ProfileService.getProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('tracker2_logged_in') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    // Populate local form fields from loaded profile data
    setFname(profile.fname);
    setLname(profile.lname);
    setEmail(profile.email);
    setPin(profile.pin);
  }, [profile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const downloadUrl = await ProfileService.uploadProfilePicture(profile.pin, file);
      
      const updatedProfile = {
        ...profile,
        avatarUrl: downloadUrl
      };
      await ProfileService.saveProfile(updatedProfile);
      setProfile(updatedProfile);
      
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      // Save changes
      const updatedProfile: UserProfile = {
        ...profile,
        fname: fname.trim(),
        lname: lname.trim(),
        email: email.trim(),
        pin: pin.trim()
      };
      await ProfileService.saveProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } else {
      setIsEditing(true);
    }
  };

  const handleLogout = async () => {
    await ProfileService.logout();
    navigate('/login');
  };

  return (
    <div className="flex-grow min-h-screen pb-12 relative">
      
      {/* Top Navbar */}
      <header className="flex justify-between items-center px-6 py-4 w-full bg-white shadow-sm sticky top-0 z-40">
        <h2 className="font-headline-md text-headline-md text-primary font-semibold">
          User Profile
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

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="absolute top-20 right-8 z-50 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm animate-fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          Profile Saved Successfully!
        </div>
      )}

      {/* Profile Content */}
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Column: Identity Card */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-xl shadow-soft overflow-hidden border border-surface-container-highest">
              <div 
                className="h-24" 
                style={{ background: 'linear-gradient(135deg, #00668a 0%, #1aa7df 100%)' }}
              />
              <div className="px-6 pb-8 -mt-12 text-center">
                <div className="relative inline-block mb-4">
                  <img 
                    alt="Profile Picture" 
                    className={`w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover mx-auto ${isUploadingImage ? 'opacity-40' : ''}`} 
                    src={profile.avatarUrl} 
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  <button 
                    onClick={triggerFileInput}
                    disabled={isUploadingImage}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-md hover:scale-105 transition-transform cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                <h3 className="font-bold text-lg text-on-surface">
                  {profile.fname} {profile.lname}
                </h3>
                <div className="mt-2 inline-flex items-center px-3 py-1 bg-primary-container/10 text-primary rounded-full">
                  <span className="material-symbols-outlined text-[14px] mr-1">verified_user</span>
                  <span className="font-bold text-[10px] uppercase">{profile.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow-soft border border-surface-container-highest p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Personal Information
                  {isEditing && (
                    <span className="text-primary text-[10px] font-bold ml-2 bg-primary-container/10 px-2.5 py-0.5 rounded-full animate-pulse uppercase">
                      Editing Mode
                    </span>
                  )}
                </h4>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                
                {/* Field: PIN */}
                <div className="space-y-1">
                  <label className="font-bold text-[10px] text-outline uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">pin</span>
                    PIN Code
                  </label>
                  <div className="p-3 bg-surface rounded-lg border border-outline-variant/30 opacity-70">
                    <input 
                      className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm font-mono tracking-widest text-on-surface outline-none cursor-default" 
                      id="field-pin" 
                      readOnly={true}
                      type="text"
                      value={pin}
                    />
                  </div>
                </div>

                {/* Field: Role */}
                <div className="space-y-1">
                  <label className="font-bold text-[10px] text-outline uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">work</span>
                    Current Role
                  </label>
                  <div className="p-3 bg-surface rounded-lg border border-outline-variant/30 opacity-70">
                    <span className="text-sm text-on-surface font-semibold">{profile.role}</span>
                  </div>
                </div>

                {/* Field: First Name */}
                <div className="space-y-1">
                  <label className="font-bold text-[10px] text-outline uppercase block">First Name</label>
                  <div className={`p-3 bg-surface rounded-lg border transition-all duration-200 ${
                    isEditing ? 'border-primary bg-surface-container-high' : 'border-outline-variant/30'
                  }`}>
                    <input 
                      className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm text-on-surface outline-none" 
                      id="field-fname" 
                      readOnly={!isEditing} 
                      type="text" 
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Last Name */}
                <div className="space-y-1">
                  <label className="font-bold text-[10px] text-outline uppercase block">Last Name</label>
                  <div className={`p-3 bg-surface rounded-lg border transition-all duration-200 ${
                    isEditing ? 'border-primary bg-surface-container-high' : 'border-outline-variant/30'
                  }`}>
                    <input 
                      className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm text-on-surface outline-none" 
                      id="field-lname" 
                      readOnly={!isEditing} 
                      type="text" 
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Email */}
                <div className="md:col-span-2 space-y-1">
                  <label className="font-bold text-[10px] text-outline uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">mail</span>
                    Email Address
                  </label>
                  <div className={`p-3 bg-surface rounded-lg border transition-all duration-200 ${
                    isEditing ? 'border-primary bg-surface-container-high' : 'border-outline-variant/30'
                  }`}>
                    <input 
                      className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm text-on-surface outline-none" 
                      id="field-email" 
                      readOnly={!isEditing} 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4 border-t border-surface-container pt-8">
                <button 
                  onClick={handleEditToggle}
                  className="flex-grow px-8 py-3 bg-primary-container hover:bg-primary text-white font-bold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="edit-profile-btn"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isEditing ? 'save' : 'edit'}
                  </span>
                  <span>{isEditing ? 'Save Changes' : 'Edit Profile'}</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-grow px-8 py-3 bg-white border border-error text-error font-bold text-sm rounded-lg hover:bg-error/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
