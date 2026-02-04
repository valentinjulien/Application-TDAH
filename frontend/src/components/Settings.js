import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser, useTheme } from '../App';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Moon,
  Sun,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  ExternalLink,
  Heart,
  Coffee,
  Sparkles,
  Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Settings = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const SettingItem = ({ icon: Icon, label, description, action, danger = false }) => (
    <button
      onClick={action}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
        danger
          ? 'hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        danger
          ? 'bg-red-100 dark:bg-red-900/30'
          : 'bg-neutral-100 dark:bg-neutral-800'
      }`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-neutral-600 dark:text-neutral-400'}`} />
      </div>
      <div className="flex-1 text-left">
        <p className={`font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'}`}>
          {label}
        </p>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-neutral-400" />
    </button>
  );

  const ToggleItem = ({ icon: Icon, label, description, value, onChange }) => (
    <div className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-neutral-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-all ${
          value ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          className="w-5 h-5 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Paramètres ⚙️
          </h1>
          <p className="text-neutral-500">Personnalise ton expérience</p>
        </div>

        {/* Profile Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">
                {user?.email?.split('@')[0] || 'Utilisateur'}
              </h2>
              <p className="text-sm text-neutral-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-success">
                  <Check className="w-3 h-3 mr-1" />
                  Connecté
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card mb-6">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Apparence</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <ToggleItem
              icon={darkMode ? Moon : Sun}
              label="Mode sombre"
              description="Réduit la fatigue visuelle le soir"
              value={darkMode}
              onChange={toggleDarkMode}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="card mb-6">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Notifications</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <ToggleItem
              icon={Bell}
              label="Notifications push"
              description="Rappels pour les tâches et sessions"
              value={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>
        </div>

        {/* About */}
        <div className="card mb-6">
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white">À propos</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <SettingItem
              icon={Sparkles}
              label="TDAH Companion"
              description="Version 1.0.0"
              action={() => {}}
            />
            <SettingItem
              icon={Heart}
              label="Fait avec amour"
              description="Pour les esprits créatifs"
              action={() => {}}
            />
            <SettingItem
              icon={Coffee}
              label="Soutenir le projet"
              description="Offrir un café aux développeurs"
              action={() => window.open('https://ko-fi.com', '_blank')}
            />
          </div>
        </div>

        {/* Logout */}
        <div className="card mb-6">
          <SettingItem
            icon={LogOut}
            label="Se déconnecter"
            description="À bientôt ! 👋"
            action={handleLogout}
            danger
          />
        </div>

        {/* Tips */}
        <div className="card p-4 mb-20 md:mb-0">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">💡 Astuce TDAH</h3>
          <p className="text-sm text-neutral-500">
            Le mode sombre peut aider à réduire les distractions visuelles et la fatigue oculaire,
            surtout en fin de journée. Essaie-le !
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
