import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ProfileService, type UserProfile } from '../services/profileService';

export const Sidebar: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(ProfileService.getProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(ProfileService.getProfile());
    };
    window.addEventListener('profile_updated', handleUpdate);
    return () => window.removeEventListener('profile_updated', handleUpdate);
  }, []);

  const role = profile.role;

  const navItems = [
    { to: "/", label: "Transformer List", icon: "list_alt" },
    { to: "/add", label: "Add Transformer", icon: "add_box" },
    { to: "/scanner", label: "Scanner", icon: "qr_code_scanner" },
    { to: "/profile", label: "Profile", icon: "account_circle" }
  ].filter((item) => {
    if (role === 'Load Engineer') {
      return item.to === '/scanner' || item.to === '/profile';
    }
    if (role === 'Client Engineer') {
      return item.to !== '/add';
    }
    return true;
  });

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container flex flex-col py-4 z-50 border-r border-outline-variant/20">
      <div className="px-6 mb-8 flex items-center gap-3">
        <img 
          alt="Transformer Tracker Logo" 
          className="h-10 w-10 object-contain rounded-lg shadow-sm" 
          src="/logo.png" 
        />
        <div>
          <h1 className="font-headline-md text-headline-md text-primary leading-tight font-semibold">
            Eddy Tracker
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive 
                  ? "text-primary bg-surface-container-high font-bold border-r-2 border-primary" 
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-variant"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>


    </aside>
  );
};
