import React, { useState, useEffect } from 'react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { supabase, signOut, getCurrentUser } from '../services/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { testSupabaseConnection, initializeUserData } from '../services/supabaseUtils';
import { getAuthDiagnostics } from '../services/supabaseClient';

const Settings = () => {
  const { isConnected, loading, error, signIn, signOut: googleSignOut } = useGoogleCalendar();
  const { profile, updateProfile } = useProfile();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [initResult, setInitResult] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await getCurrentUser();
      setUser(user);
      setAuthLoading(false);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleProfileUpdate = async (field, value) => {
    await updateProfile({ [field]: value });
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await testSupabaseConnection();
    setTestResult(result);
  };

  const handleInitializeData = async () => {
    setInitResult(null);
    const result = await initializeUserData();
    setInitResult(result);
  };

  const handleRunDiagnostics = async () => {
    setDiagnostics(null);
    const result = await getAuthDiagnostics();
    setDiagnostics(result);
  };

  if (authLoading) return <div className="container mx-auto p-8">Chargement...</div>;

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-3xl font-bold text-dark mb-8">Paramètres</h2>

      {/* Authentication Section */}
      <div className="bg-primary p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-bold mb-4">Compte</h3>
        {user && (
          <div>
            <p className="mb-4">
              <span className="font-semibold">Connecté en tant que :</span> {user?.email || 'Utilisateur'}
            </p>
            <div className="mb-4 flex gap-2">
              <button
                onClick={handleTestConnection}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Tester Connexion Supabase
              </button>
              <button
                onClick={handleInitializeData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Initialiser Données
              </button>
              <button
                onClick={handleRunDiagnostics}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Diagnostics Auth
              </button>
            </div>
            {testResult && (
              <p className={`mb-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {typeof testResult.message === 'string' ? testResult.message : 'Erreur inconnue'}
              </p>
            )}
            {initResult && (
              <p className={`mb-2 text-sm ${initResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {typeof initResult.message === 'string' ? initResult.message : 'Erreur inconnue'}
              </p>
            )}
            {diagnostics && (
              <div className="mb-4 p-4 bg-gray-100 rounded text-sm">
                <h4 className="font-bold mb-2">🔍 Diagnostics Authentification</h4>
                <pre className="whitespace-pre-wrap overflow-x-auto text-xs">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mt-4"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* Profile Section */}
      {user && (
        <div className="bg-primary p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-bold mb-4">Préférences</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Buffer de notification (minutes)</label>
              <input
                type="number"
                value={profile?.notification_buffer || 15}
                onChange={(e) => handleProfileUpdate('notification_buffer', parseInt(e.target.value))}
                className="p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Niveau d'énergie</label>
              <select
                value={profile?.energy_level || 'medium'}
                onChange={(e) => handleProfileUpdate('energy_level', e.target.value)}
                className="p-2 border rounded"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyen</option>
                <option value="high">Élevé</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Section */}
      <div className="bg-primary p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-bold mb-4">Connexions</h3>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg">Google Calendar</h4>
            <p className="text-sm text-gray-600">
              {isConnected ? 'Connecté' : 'Non connecté'}
            </p>
            {error && <p className="text-red-500 text-sm">{typeof error === 'string' ? error : 'Erreur de connexion'}</p>}
          </div>
          <button
            onClick={isConnected ? googleSignOut : signIn}
            disabled={loading}
            className={`px-4 py-2 rounded-lg ${
              isConnected
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-secondary text-dark hover:bg-accent'
            } transition`}
          >
            {loading ? 'Chargement...' : isConnected ? 'Déconnecter' : 'Connecter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;