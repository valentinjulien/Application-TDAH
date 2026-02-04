import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EisenhowerMatrix from './components/EisenhowerMatrix';
import Calendar from './components/Calendar';
import Pomodoro from './components/Pomodoro';
import Community from './components/Community';
import MoodTracker from './components/MoodTracker';
import Settings from './components/Settings';
import Login from './components/Login';
import Navigation from './components/Navigation';
import VoiceAssistant from './components/VoiceAssistant';
import { motion, AnimatePresence } from 'framer-motion';

// Use relative URL for API calls (goes through same origin)
const API_URL = '';

// Context pour le thème
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// Context pour l'utilisateur
const UserContext = createContext();
export const useUser = () => useContext(UserContext);

// Composant de chargement adapté TDAH (calme et non stressant)
const LoadingScreen = ({ message }) => (
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
      <p className="text-neutral-600 dark:text-neutral-400 font-medium">{message || 'Chargement en douceur...'}</p>
      <p className="text-sm text-neutral-400 mt-1">Prenez une grande respiration 😌</p>
    </motion.div>
  </div>
);

// Auth Callback Component - Handles Emergent OAuth redirect
const AuthCallback = ({ onSuccess, onError }) => {
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL hash (window.location for reliability)
      const hash = window.location.hash;
      console.log('Processing auth callback, hash:', hash);
      
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error('No session_id found in URL hash');
        setStatus('error');
        onError('No session_id found');
        return;
      }

      const sessionId = sessionIdMatch[1];
      console.log('Found session_id:', sessionId.substring(0, 10) + '...');

      try {
        // Exchange session_id for session_token
        const response = await fetch(`${API_URL}/api/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId })
        });

        console.log('Auth response status:', response.status);

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Auth failed:', errorData);
          throw new Error('Failed to authenticate');
        }

        const userData = await response.json();
        console.log('Auth successful, user:', userData.email);
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        setStatus('success');
        onSuccess(userData);
      } catch (error) {
        console.error('Auth error:', error);
        setStatus('error');
        onError(error.message);
      }
    };

    processAuth();
  }, [onSuccess, onError]);

  return <LoadingScreen message={status === 'processing' ? 'Connexion en cours...' : 'Redirection...'} />;
};

// Protected Route with server-side verification
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUser();
  const [authState, setAuthState] = useState(user ? 'authenticated' : 'checking');
  const hasChecked = useRef(false);

  useEffect(() => {
    // Skip if already have user
    if (user) {
      setAuthState('authenticated');
      return;
    }

    // Prevent double checking
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAuth = async () => {
      try {
        console.log('Checking auth status...');
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        const userData = await response.json();
        console.log('User authenticated:', userData.email);
        setUser(userData);
        setAuthState('authenticated');
      } catch (error) {
        console.log('Not authenticated, redirecting to login');
        setAuthState('unauthenticated');
        navigate('/login', { replace: true });
      }
    };

    checkAuth();
  }, [user, navigate, setUser]);

  if (authState === 'checking') {
    return <LoadingScreen message="Vérification..." />;
  }

  return authState === 'authenticated' ? children : null;
};

// Main App Content - Inside Router
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  
  // CRITICAL: Check for session_id in hash FIRST (before any routing)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const hash = window.location.hash;
  const hasSessionId = hash.includes('session_id=');

  if (hasSessionId) {
    return (
      <AuthCallback 
        onSuccess={(userData) => {
          setUser(userData);
          navigate('/', { replace: true });
        }}
        onError={(error) => {
          console.error('Auth callback error:', error);
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  return (
    <>
      {/* Navigation - only show when user is logged in and not on login page */}
      {user && location.pathname !== '/login' && <Navigation />}
      
      <main className={user && location.pathname !== '/login' ? 'pb-20 md:pb-0 md:ml-64' : ''}>
        <AnimatePresence mode="wait">
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
        </AnimatePresence>
      </main>
    </>
  );
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
            <AppContent />
          </div>
        </Router>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
