import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EisenhowerMatrix from './components/EisenhowerMatrix';
import Calendar from './components/Calendar';
import Pomodoro from './components/Pomodoro';
import Community from './components/Community';
import MoodTracker from './components/MoodTracker';
import Settings from './components/Settings';
import Login from './components/Login';
import Navigation from './components/Navigation';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Context pour le thème
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// Context pour l'utilisateur
const UserContext = createContext();
export const useUser = () => useContext(UserContext);

// Composant de chargement adapté TDAH (calme et non stressant)
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-calm dark:bg-neutral-950">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
        <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <p className="text-neutral-600 dark:text-neutral-400 font-medium">Chargement en douceur...</p>
      <p className="text-sm text-neutral-400 mt-1">Prenez une grande respiration 😌</p>
    </motion.div>
  </div>
);

// Auth Callback Component - Handles Emergent OAuth redirect
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const { setUser } = useUser();

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL hash
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error('No session_id found in URL');
        navigate('/login', { replace: true });
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        // Exchange session_id for session_token
        const response = await fetch(`${API_URL}/api/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate');
        }

        const userData = await response.json();
        setUser(userData);
        
        // Navigate to dashboard with user data
        navigate('/', { replace: true, state: { user: userData } });
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [location, navigate, setUser]);

  return <LoadingScreen />;
};

// Protected Route with server-side verification
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );

  useEffect(() => {
    // Skip if user was passed from AuthCallback
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };

    checkAuth();
  }, [location.state, navigate, setUser]);

  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? children : null;
};

// Main App Router - Detects session_id BEFORE rendering routes
const AppRouter = () => {
  const location = useLocation();

  // CRITICAL: Check for session_id synchronously during render
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matrix"
        element={
          <ProtectedRoute>
            <EisenhowerMatrix />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute>
            <Pomodoro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mood"
        element={
          <ProtectedRoute>
            <MoodTracker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// Navigation Wrapper - Only shows nav when authenticated
const NavigationWrapper = () => {
  const location = useLocation();
  const { user } = useUser();
  
  // Don't show nav on login page or during auth callback
  if (location.pathname === '/login' || location.hash?.includes('session_id=')) {
    return null;
  }

  return user ? <Navigation /> : null;
};

function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <UserContext.Provider value={{ user, setUser }}>
        <Router>
          <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-neutral-950' : 'bg-neutral-50'}`}>
            <NavigationWrapper />
            
            <main className={user ? 'pb-20 md:pb-0 md:ml-64' : ''}>
              <AnimatePresence mode="wait">
                <AppRouter />
              </AnimatePresence>
            </main>
          </div>
        </Router>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
