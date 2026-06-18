import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AddTransformer } from './pages/AddTransformer';
import { TransformerDetails } from './pages/TransformerDetails';
import { Scanner } from './pages/Scanner';
import { Profile } from './pages/Profile';

// Route guard component
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('tracker2_logged_in') === 'true';
  const location = useLocation();

  let isRoleBlocked = false;
  const profileJson = localStorage.getItem('tracker2_user_profile');
  if (profileJson) {
    try {
      const role = JSON.parse(profileJson).role;
      if (role === 'Client Engineer' || role === 'Load Engineer') {
        isRoleBlocked = true;
      }
    } catch (e) {}
  }

  if (!isLoggedIn || isRoleBlocked) {
    if (isRoleBlocked) {
      localStorage.removeItem('tracker2_logged_in');
      localStorage.removeItem('tracker2_user_profile');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('tracker2_logged_in') === 'true');
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(localStorage.getItem('tracker2_logged_in') === 'true');
    };
    window.addEventListener('auth_state_changed', handleAuthChange);
    window.addEventListener('profile_updated', handleAuthChange);
    return () => {
      window.removeEventListener('auth_state_changed', handleAuthChange);
      window.removeEventListener('profile_updated', handleAuthChange);
    };
  }, []);

  const isLoginPage = location.pathname === '/login';
  const showSidebar = isLoggedIn && !isLoginPage;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Render sidebar only if user is logged in and not on login page */}
      {showSidebar && <Sidebar />}
      
      {/* Main content viewport */}
      <div className={`flex-1 flex flex-col min-h-screen ${showSidebar ? 'ml-64' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Authenticated routes */}
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/add" element={<RequireAuth><AddTransformer /></RequireAuth>} />
          <Route path="/transformer/:serialNo" element={<RequireAuth><TransformerDetails /></RequireAuth>} />
          <Route path="/scanner" element={<RequireAuth><Scanner /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// Main App component
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
