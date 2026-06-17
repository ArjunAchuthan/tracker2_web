import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformerService } from '../services/transformerService';
import type { Transformer } from '../services/transformerService';
import { ProfileService } from '../services/profileService';
import type { UserProfile } from '../services/profileService';

export const Dashboard: React.FC = () => {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('View All');
  const [dateFilter, setDateFilter] = useState('All');

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(ProfileService.getProfile());
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth
    if (localStorage.getItem('tracker2_logged_in') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = TransformerService.listenToTransformers((list) => {
      setTransformers(list);
    });

    const handleUpdate = () => {
      setProfile(ProfileService.getProfile());
    };
    window.addEventListener('profile_updated', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('profile_updated', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tracker2_logged_in');
    window.dispatchEvent(new Event('auth_state_changed'));
    navigate('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Filter logic
  const filteredTransformers = transformers.filter((t) => {
    const matchesSearch = t.serialNo.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'View All' ||
      t.status.toLowerCase() === statusFilter.toLowerCase();

    let matchesDate = true;
    if (dateFilter !== 'All') {
      const today = new Date();
      const itemDate = new Date(t.dateSubmitted || '');
      const diffTime = Math.abs(today.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === 'Yesterday') {
        matchesDate = diffDays <= 2; // Rough mock check
      } else if (dateFilter === 'Last Week') {
        matchesDate = diffDays <= 7;
      } else if (dateFilter === 'Last Month') {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

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
      {/* TopAppBar */}
      <header className="sticky top-0 z-40 bg-white shadow-sm flex justify-between items-center px-6 py-4 w-full">
        <h2 className="font-headline-md text-headline-md text-primary font-semibold">
          Transformer List
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

      {/* Main content wrapper */}
      <div className="px-6 py-6 max-w-7xl mx-auto">

        {/* Search & Filter Row */}
        <section className="mb-6 flex flex-col md:flex-row gap-4 items-center relative z-40">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-soft font-body-md outline-none"
              placeholder="Enter serial no..."
              type="text"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {/* Filter selectors */}
          <div className="flex gap-2 w-full md:w-auto relative">
            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setIsStatusOpen(!isStatusOpen); setIsDateOpen(false); }}
                className="flex items-center justify-between gap-2 px-6 py-3 bg-white border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors shadow-soft font-bold text-sm w-full md:w-auto cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  <span>Status: {statusFilter}</span>
                </div>
                <span className="material-symbols-outlined text-outline text-xs">expand_more</span>
              </button>
              {isStatusOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-outline-variant rounded-lg shadow-md z-50 p-4">
                  <h3 className="text-on-surface font-semibold text-sm mb-4 px-2">Filter by Status</h3>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {['View All', 'Saved', 'Submitted', 'Approved', 'Rejected', 'Received', 'Declined', 'Shipping', 'Reviewed'].map((status) => (
                      <label key={status} className="flex items-center gap-3 px-2 py-1.5 hover:bg-surface-container-low rounded-md cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="status-filter"
                          checked={statusFilter === status}
                          onChange={() => { setStatusFilter(status); setIsStatusOpen(false); }}
                          className="w-4 h-4 text-primary border-outline-variant focus:ring-primary"
                        />
                        <span className="text-body-md text-on-surface text-sm">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setIsDateOpen(!isDateOpen); setIsStatusOpen(false); }}
                className="flex items-center justify-between gap-2 px-6 py-3 bg-white border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors shadow-soft font-bold text-sm w-full md:w-auto cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_today</span>
                  <span>Date: {dateFilter}</span>
                </div>
                <span className="material-symbols-outlined text-outline text-xs">expand_more</span>
              </button>
              {isDateOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-outline-variant rounded-lg shadow-md z-50 p-2">
                  {['All', 'Yesterday', 'Last Week', 'Last Month'].map((date) => (
                    <label key={date} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low rounded-md cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="date-filter"
                        checked={dateFilter === date}
                        onChange={() => { setDateFilter(date); setIsDateOpen(false); }}
                        className="w-4 h-4 text-primary border-outline-variant focus:ring-primary"
                      />
                      <span className="text-body-md text-on-surface text-sm">{date}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Transformer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {filteredTransformers.map((item) => (
            <div
              key={item.serialNo}
              className="bg-white rounded-lg shadow-soft overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-200 border border-outline-variant/20"
            >
              <div className="px-5 py-3 flex justify-between items-center bg-surface-container-low border-b border-outline-variant/30">
                <span className="font-bold text-outline text-[10px] tracking-widest uppercase">
                  Asset ID
                </span>
                <button
                  onClick={() => navigate(`/transformer/${item.serialNo}`)}
                  className="p-1.5 hover:bg-surface-variant rounded-md transition-colors text-primary cursor-pointer flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-xl text-on-surface mb-2 tracking-tight">
                  {item.serialNo}
                </h3>
                <div className="flex items-center gap-2 text-on-surface-variant mb-6 text-sm">
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  <span>Shipping Date: {item.dateSubmitted || 'Not Scheduled'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-outline font-semibold">
                    {item.partNo}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredTransformers.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-lg border border-dashed border-outline-variant/50">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">
                info
              </span>
              <p className="text-on-surface-variant font-medium">
                No transformer records found matching your filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
