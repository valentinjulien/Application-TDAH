import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  LayoutGrid,
  Calendar,
  Timer,
  Users,
  Heart,
  Settings,
  Sun,
  Moon,
  Sparkles,
  Menu,
  X,
  Mic,
  Ghost,
  Plus
} from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home, color: 'text-primary-500' },
    { to: '/matrix', label: 'Matrice', icon: LayoutGrid, color: 'text-amber-500' },
    { to: '/calendar', label: 'Calendrier', icon: Calendar, color: 'text-blue-500' },
    { to: '/pomodoro', label: 'Focus', icon: Timer, color: 'text-red-500' },
    { to: '/community', label: 'Communauté', icon: Users, color: 'text-purple-500' },
    { to: '/mood', label: 'Humeur', icon: Heart, color: 'text-pink-500' },
    { to: '/settings', label: 'Paramètres', icon: Settings, color: 'text-neutral-500' },
  ];

  const isActive = (path) => location.pathname === path;

  // Navigation mobile (bottom nav)
  const mobileNavItems = navItems.slice(0, 5);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex-col z-40"
      >
        {/* Logo */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-neutral-900 dark:text-white">
                TDAH
              </h1>
              <p className="text-xs text-neutral-500">Companion</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={`w-5 h-5 ${active ? item.color : ''}`} />
                <span>{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Dark Mode Toggle */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          {/* Ghost Capture Button */}
          <button
            onClick={() => navigate('/capture')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all shadow-soft hover:shadow-glow"
            data-testid="ghost-capture-btn"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Capture Rapide</span>
          </button>

          {/* Voice Assistant Button */}
          <button
            onClick={() => navigate('/assist')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 text-white hover:from-primary-600 hover:to-purple-600 transition-all shadow-soft hover:shadow-glow"
            data-testid="voice-assistant-btn"
          >
            <Mic className="w-5 h-5" />
            <span className="text-sm font-medium">Assistant Vocal</span>
          </button>

          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            data-testid="dark-mode-toggle"
          >
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {darkMode ? 'Mode clair' : 'Mode sombre'}
            </span>
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-primary-500" />
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 pb-safe z-50"
      >
        <div className="flex justify-around items-center py-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center py-2 px-3 relative"
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${
                  active ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                }`}>
                  <Icon className={`w-5 h-5 ${
                    active ? item.color : 'text-neutral-400'
                  }`} />
                </div>
                <span className={`text-xs mt-1 ${
                  active ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-neutral-500'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-0.5 w-1 h-1 rounded-full bg-primary-500"
                  />
                )}
              </Link>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center py-2 px-3"
            data-testid="mobile-nav-more"
          >
            <div className="p-2 rounded-xl">
              <Menu className="w-5 h-5 text-neutral-400" />
            </div>
            <span className="text-xs mt-1 text-neutral-500">Plus</span>
          </button>
        </div>
      </motion.nav>

      {/* Mobile More Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-3xl z-50 pb-safe"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-neutral-900 dark:text-white">
                    Menu
                  </h3>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <X className="w-5 h-5 text-neutral-500" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {navItems.slice(5).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        <span className="font-medium text-neutral-700 dark:text-neutral-200">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Dark mode toggle in mobile menu */}
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800"
                  >
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      {darkMode ? 'Mode clair' : 'Mode sombre'}
                    </span>
                    {darkMode ? (
                      <Sun className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Moon className="w-5 h-5 text-primary-500" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
