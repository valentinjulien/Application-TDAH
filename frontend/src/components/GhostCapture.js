import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { useTasks } from '../hooks/useTasks';
import { processCapture } from '../services/captureService';
import { X, Loader, Check, AlertCircle, Brain, Sparkles } from 'lucide-react';

// Dynamic placeholders
const PLACEHOLDERS = [
  'Vider l\'esprit...',
  'Une idée ?',
  'À faire...',
  'Note rapide...',
  'Capture...',
  'Pensée fugitive...',
  'Avant d\'oublier...',
];

const GhostCapture = () => {
  const { user } = useUser();
  const { addTask } = useTasks();
  const navigate = useNavigate();
  
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [state, setState] = useState('idle'); // idle, processing, success, error
  const [result, setResult] = useState(null);
  
  const inputRef = useRef(null);

  // Initialize
  useEffect(() => {
    // Random placeholder
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    
    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 100);

    // Handle escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !user || state === 'processing') return;

    setState('processing');

    try {
      // Process with AI
      const captureResult = await processCapture(trimmedText);
      setResult(captureResult);

      // Save to database
      await addTask({
        text: captureResult.text,
        priority: captureResult.priority,
        quadrant: captureResult.quadrant,
        user_id: user.id,
        due_date: captureResult.due_date,
        energy_required: captureResult.energy_required,
        estimated_total_minutes: captureResult.estimated_total_minutes,
      });

      setState('success');
      
      // Auto-close after success
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('Capture error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop blur */}
      <div 
        className="absolute inset-0 bg-neutral-900/90 backdrop-blur-xl"
        onClick={state === 'idle' ? handleClose : undefined}
      />

      {/* Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-2xl px-6"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Processing state */}
        <AnimatePresence mode="wait">
          {state === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-500/20 flex items-center justify-center"
              >
                <Brain className="w-8 h-8 text-primary-400" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">Analyse en cours...</h3>
              <div className="space-y-1 text-sm text-neutral-400">
                <p>📊 Classification Eisenhower</p>
                <p>⚡ Niveau d'énergie</p>
                <p>⏱️ Estimation durée</p>
                <p>📅 Extraction de date</p>
              </div>
            </motion.div>
          )}

          {state === 'success' && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-500 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-4">Capturé !</h3>
              
              {/* Result summary */}
              <div className="bg-neutral-800 rounded-xl p-4 max-w-md mx-auto text-left">
                <p className="text-white font-medium mb-3">{result.text}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-neutral-700 text-neutral-300">
                    Q{result.quadrant}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    result.energy_required === 'high' ? 'bg-red-900/50 text-red-300' :
                    result.energy_required === 'low' ? 'bg-green-900/50 text-green-300' :
                    'bg-amber-900/50 text-amber-300'
                  }`}>
                    {result.energy_required === 'high' ? '🔥 Deep Work' :
                     result.energy_required === 'low' ? '🌿 Repos' : '⚡ Focus'}
                  </span>
                  {result.estimated_total_minutes && (
                    <span className="px-2 py-1 rounded-full text-xs bg-neutral-700 text-neutral-300">
                      ⏱️ {result.estimated_total_minutes} min
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Erreur de sauvegarde</h3>
              <p className="text-neutral-400">Réessaie dans un instant</p>
            </motion.div>
          )}

          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Input */}
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="w-full bg-transparent text-white text-3xl md:text-4xl font-light text-center placeholder-neutral-600 resize-none focus:outline-none leading-relaxed"
                rows={3}
                autoFocus
                maxLength={500}
              />

              {/* Hints */}
              <div className="mt-8 text-center space-y-2">
                <p className="text-neutral-500 text-sm">
                  Entrée pour capturer • Échap pour annuler
                </p>
                {text.length > 10 && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-primary-400 text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    L'IA va analyser : priorité, énergie, durée
                  </motion.p>
                )}
                <p className="text-neutral-600 text-xs">{text.length}/500</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default GhostCapture;
