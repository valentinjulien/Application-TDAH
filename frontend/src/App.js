import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import Dashboard from './components/Dashboard';
import EisenhowerMatrix from './components/EisenhowerMatrix';
import Calendar from './components/Calendar';
import MeetingAssistant from './components/MeetingAssistant';
import Settings from './components/Settings';
import Login from './components/Login';
import Navigation from './components/Navigation';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';

// Composant pour protéger les routes
const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'utilisateur au chargement
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

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-light">
        {user && <Navigation />}
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
            path="/meeting"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <MeetingAssistant />
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

        {/* Composants PWA */}
        {user && (
          <>
            <InstallPrompt />
            <UpdatePrompt />
            <OfflineIndicator />
          </>
        )}
      </div>
    </Router>
  );
}

export default App;