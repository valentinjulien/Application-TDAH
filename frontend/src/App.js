import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
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

// Context pour le thème
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// Context pour l'utilisateur
const UserContext = createContext();
export const useUser = () => useContext(UserContext);

// Composant de chargement adapté TDAH (calme et non stressant)
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-calm">
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
      <p className="text-neutral-600 font-medium">Chargement en douceur...</p>
      <p className="text-sm text-neutral-400 mt-1">Prenez une grande respiration 😌</p>
    </motion.div>
  </div>
);

// Route protégée (bypass temporaire pour démo)
const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) return <LoadingScreen />;
  // Bypass auth for demo - remove in production
  return children;
  // return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Appliquer le mode sombre
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <UserContext.Provider value={{ user, setUser }}>
        <Router>
          <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-neutral-950' : 'bg-neutral-50'}`}>
            <AnimatePresence mode="wait">
              {user && <Navigation key="nav" />}
            </AnimatePresence>
            
            <main className={user ? 'pb-20 md:pb-0 md:ml-64' : ''}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/matrix"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <EisenhowerMatrix />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <Calendar />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pomodoro"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <Pomodoro />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/community"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <Community />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mood"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <MoodTracker />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute user={user} loading={loading}>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </Router>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
