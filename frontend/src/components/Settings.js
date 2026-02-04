import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useTheme } from '../App';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import {
  Moon,
  Sun,
  Bell,
  BellOff,
  LogOut,
  ChevronRight,
  ChevronDown,
  Heart,
  Coffee,
  Sparkles,
  Check,
  Mic,
  Smartphone,
  Monitor,
  Apple,
  Copy,
  Loader2
} from 'lucide-react';

// Use relative URL for API calls
const API_URL = '';

const Settings = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  
  // Hook notifications
  const {
    isSupported: notifSupported,
    permission: notifPermission,
    isSubscribed,
    subscribe,
    unsubscribe,
    showNotification
  } = useNotifications();

  // URL de l'assistant vocal
  const assistUrl = `${window.location.origin}/assist`;
  const assistTaskUrl = `${window.location.origin}/assist?action=task`;

  // Gérer les notifications
  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const sub = await subscribe();
        if (sub) {
          // Notification de test
          setTimeout(() => {
            showNotification('Notifications activées !', {
              body: 'Tu recevras des rappels pour tes tâches.'
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Notification toggle error:', error);
    } finally {
      setNotifLoading(false);
    }
  };

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Paramètres
          </h1>
          <p className="text-neutral-500">Personnalise ton expérience</p>
        </div>

        {/* Profile Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">
                {user?.name || user?.email?.split('@')[0] || 'Utilisateur'}
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

        {/* Voice Assistant Section */}
        <div className="card mb-6">
          <button
            onClick={() => setShowVoiceGuide(!showVoiceGuide)}
            className="w-full px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Assistant Vocal</h3>
                <p className="text-sm text-neutral-500">Configurer Siri ou raccourcis</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showVoiceGuide ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showVoiceGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-6">
                  {/* URL Links */}
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                      Liens à utiliser :
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-neutral-200 dark:bg-neutral-700 px-3 py-2 rounded-lg text-primary-600 dark:text-primary-400 overflow-x-auto">
                          {assistUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(assistUrl)}
                          className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
                          title="Copier"
                        >
                          <Copy className="w-4 h-4 text-neutral-500" />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500">Mode général</p>
                      
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-neutral-200 dark:bg-neutral-700 px-3 py-2 rounded-lg text-primary-600 dark:text-primary-400 overflow-x-auto">
                          {assistTaskUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(assistTaskUrl)}
                          className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
                          title="Copier"
                        >
                          <Copy className="w-4 h-4 text-neutral-500" />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500">Mode création de tâche</p>
                    </div>

                    {copied && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-accent-500 text-sm mt-2"
                      >
                        Copié !
                      </motion.p>
                    )}
                  </div>

                  {/* Mac/iOS Instructions */}
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Apple className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        Mac / iPhone (Siri)
                      </h4>
                    </div>
                    <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 list-decimal list-inside">
                      <li>Ouvre l'app <strong>Raccourcis</strong> (Shortcuts)</li>
                      <li>Crée un nouveau raccourci nommé <strong>"Assistant TDAH"</strong></li>
                      <li>Ajoute l'action <strong>"Ouvrir l'URL"</strong></li>
                      <li>Colle le lien ci-dessus</li>
                      <li>Sauvegarde le raccourci</li>
                    </ol>
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <p className="text-sm text-primary-700 dark:text-primary-300">
                        <strong>Usage :</strong> Dis "Dis Siri, Assistant TDAH" pour lancer l'assistant vocal instantanément !
                      </p>
                    </div>
                  </div>

                  {/* Windows Instructions */}
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Monitor className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        Windows (Raccourci clavier)
                      </h4>
                    </div>
                    <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 list-decimal list-inside">
                      <li>Fais un clic droit sur le Bureau → <strong>Nouveau</strong> → <strong>Raccourci</strong></li>
                      <li>Colle le lien de l'assistant</li>
                      <li>Nomme-le <strong>"Assistant TDAH"</strong></li>
                      <li>Clic droit sur le raccourci → <strong>Propriétés</strong></li>
                      <li>Dans "Touche de raccourci", appuie sur <strong>Ctrl + Alt + V</strong></li>
                    </ol>
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <p className="text-sm text-primary-700 dark:text-primary-300">
                        <strong>Usage :</strong> Appuie sur <kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded">Alt</kbd> + <kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded">V</kbd> pour lancer l'assistant !
                      </p>
                    </div>
                  </div>

                  {/* Android Instructions */}
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        Android (Google Assistant)
                      </h4>
                    </div>
                    <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 list-decimal list-inside">
                      <li>Ouvre l'app <strong>Google</strong> → Paramètres → <strong>Routines</strong></li>
                      <li>Crée une nouvelle routine</li>
                      <li>Déclencheur : dis <strong>"Assistant TDAH"</strong></li>
                      <li>Action : <strong>Ouvrir un site web</strong> → colle le lien</li>
                    </ol>
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <p className="text-sm text-primary-700 dark:text-primary-300">
                        <strong>Usage :</strong> Dis "Hey Google, Assistant TDAH" !
                      </p>
                    </div>
                  </div>

                  {/* Test Button */}
                  <button
                    onClick={() => navigate('/assist')}
                    className="w-full btn-primary gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Tester l'Assistant Vocal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              description="Version 1.1.0 - Voice Assistant"
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
            description="À bientôt !"
            action={handleLogout}
            danger
          />
        </div>

        {/* Tips */}
        <div className="card p-4 mb-20 md:mb-0">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Astuce TDAH</h3>
          <p className="text-sm text-neutral-500">
            L'assistant vocal te permet de capturer tes idées instantanément sans ouvrir l'app.
            Configure un raccourci Siri ou clavier pour une productivité maximale !
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
