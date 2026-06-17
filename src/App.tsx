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

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('tracker2_logged_in') === 'true');
  const [role, setRole] = useState(() => {
    const profileJson = localStorage.getItem('tracker2_user_profile');
    if (profileJson) {
      try {
        return JSON.parse(profileJson).role || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(localStorage.getItem('tracker2_logged_in') === 'true');
      const profileJson = localStorage.getItem('tracker2_user_profile');
      if (profileJson) {
        try {
          setRole(JSON.parse(profileJson).role || '');
        } catch (e) {
          setRole('');
        }
      } else {
        setRole('');
      }
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
          <Route path="/" element={
            <RequireAuth>
              {role === 'Load Engineer' ? <Navigate to="/scanner" replace /> : <Dashboard />}
            </RequireAuth>
          } />
          <Route path="/add" element={
            <RequireAuth>
              {role === 'Client Engineer' || role === 'Load Engineer' ? (
                <Navigate to="/" replace />
              ) : (
                <AddTransformer />
              )}
            </RequireAuth>
          } />
          <Route path="/transformer/:serialNo" element={
            <RequireAuth>
              <TransformerDetails />
            </RequireAuth>
          } />
          <Route path="/scanner" element={
            <RequireAuth>
              <Scanner />
            </RequireAuth>
          } />
          <Route path="/profile" element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          } />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to={role === 'Load Engineer' ? "/scanner" : "/"} replace />} />
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
