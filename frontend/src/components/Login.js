import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

// Use relative URL for API calls
const API_URL = '';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const checkUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.log('Not authenticated');
      } finally {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleGoogleSignIn = () => {
    setLoading(true);
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-calm dark:bg-neutral-950">
        <div className="loading-spinner text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-calm dark:bg-neutral-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
              Assistant TDAH
            </h1>
            <p className="text-neutral-500 mt-2">
              Organisez votre vie avec douceur ✨
            </p>
          </div>

          {/* Welcome Message */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-primary-700 dark:text-primary-300 text-center">
              🧠 Une app conçue spécialement pour les cerveaux TDAH
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-secondary w-full gap-3 py-4 text-base"
            data-testid="google-login-btn"
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          {/* Features preview */}
          <div className="mt-8 space-y-3">
            <p className="text-xs text-neutral-400 text-center uppercase tracking-wider mb-4">
              Ce qui t'attend
            </p>
            <Feature emoji="🎯" text="Matrice Eisenhower pour prioriser" />
            <Feature emoji="⏱️" text="Timer Pomodoro adapté TDAH" />
            <Feature emoji="💬" text="Communauté bienveillante" />
            <Feature emoji="📊" text="Suivi d'humeur et d'énergie" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 mt-6">
          Conçu avec 💙 pour les esprits créatifs
        </p>
      </motion.div>
    </div>
  );
};

const Feature = ({ emoji, text }) => (
  <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
    <span className="text-lg">{emoji}</span>
    <span>{text}</span>
  </div>
);

export default Login;
