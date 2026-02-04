import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

// Configuration Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'general'; // task, question, general
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState('initializing'); // initializing, listening, processing, success, error
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  
  const recognitionRef = useRef(null);
  const autoStartRef = useRef(false);

  // Messages contextuels selon l'action
  const actionMessages = {
    task: {
      prompt: "Décris ta tâche...",
      success: "Tâche enregistrée !",
      placeholder: "Ex: Rappeler le médecin demain matin"
    },
    question: {
      prompt: "Pose ta question...",
      success: "Question reçue !",
      placeholder: "Ex: Quelles sont mes tâches urgentes ?"
    },
    general: {
      prompt: "Je t'écoute...",
      success: "Message reçu !",
      placeholder: "Parle librement..."
    }
  };

  const currentAction = actionMessages[action] || actionMessages.general;

  // Initialisation de la reconnaissance vocale
  const initializeRecognition = useCallback(() => {
    if (!SpeechRecognition) {
      setError("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      setStatus('error');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError("Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
        setPermissionGranted(false);
      } else if (event.error === 'no-speech') {
        // Pas d'erreur affichée, juste redémarrer
        setError(null);
      } else {
        setError(`Erreur: ${event.error}`);
      }
      setStatus('error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === 'listening') {
        // Redémarrer automatiquement si on était en écoute
        try {
          recognition.start();
        } catch (e) {
          console.log('Could not restart recognition');
        }
      }
    };

    return recognition;
  }, [status]);

  // Démarrer l'écoute
  const startListening = useCallback(async () => {
    // Vérifier/demander la permission du micro
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // On libère le stream
      setPermissionGranted(true);
    } catch (err) {
      setPermissionGranted(false);
      setError("Accès au microphone requis. Cliquez sur l'icône de cadenas dans la barre d'adresse pour autoriser.");
      setStatus('error');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setStatus('listening');
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  }, [initializeRecognition]);

  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (transcript) {
      setStatus('processing');
      // Simuler le traitement
      setTimeout(() => {
        handleSubmit(transcript);
      }, 500);
    }
  }, [transcript]);

  // Soumettre le texte transcrit
  const handleSubmit = async (text) => {
    if (!text.trim()) return;

    setStatus('processing');

    try {
      // Envoyer au backend selon l'action
      if (action === 'task') {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            text: text.trim(),
            priority: 'medium',
            quadrant: 1,
            source: 'voice'
          })
        });

        if (response.ok) {
          setStatus('success');
          // Feedback vocal
          speak("Tâche enregistrée avec succès");
        } else {
          throw new Error('Failed to create task');
        }
      } else {
        // Pour les questions ou général, on affiche juste le succès
        setStatus('success');
        speak("Message bien reçu");
      }
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
      setStatus('error');
    }
  };

  // Synthèse vocale pour le feedback
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-start au montage du composant
  useEffect(() => {
    if (!autoStartRef.current) {
      autoStartRef.current = true;
      // Petit délai pour laisser le composant se monter
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [startListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Fermer et retourner
  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    navigate(-1);
  };

  // Retourner au dashboard
  const handleGoHome = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <button
          onClick={handleClose}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span className="text-white font-medium">Assistant Vocal</span>
        </div>
        
        <button
          onClick={handleClose}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl px-6">
        
        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
            {status === 'listening' && currentAction.prompt}
            {status === 'processing' && "Traitement en cours..."}
            {status === 'success' && currentAction.success}
            {status === 'error' && "Oups..."}
            {status === 'initializing' && "Initialisation..."}
          </h1>
          <p className="text-neutral-400">
            {action === 'task' && "Mode: Création de tâche"}
            {action === 'question' && "Mode: Question"}
            {action === 'general' && "Mode: Libre"}
          </p>
        </motion.div>

        {/* Sound Wave Animation */}
        <div className="relative mb-12">
          <motion.div
            animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center ${
              status === 'success' ? 'bg-accent-500' :
              status === 'error' ? 'bg-red-500' :
              isListening ? 'bg-primary-500' : 'bg-neutral-700'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle className="w-16 h-16 text-white" />
            ) : status === 'error' ? (
              <AlertCircle className="w-16 h-16 text-white" />
            ) : isListening ? (
              <Mic className="w-16 h-16 text-white" />
            ) : (
              <MicOff className="w-16 h-16 text-white" />
            )}
          </motion.div>

          {/* Animated Rings */}
          {isListening && (
            <>
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full border-2 border-primary-500"
              />
              <motion.div
                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                className="absolute inset-0 rounded-full border-2 border-primary-500"
              />
            </>
          )}
        </div>

        {/* Sound Wave Bars */}
        {isListening && (
          <div className="flex items-end justify-center gap-1 h-16 mb-8">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [10, Math.random() * 60 + 10, 10],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + Math.random() * 0.5,
                  delay: i * 0.05,
                }}
                className="w-1.5 bg-primary-500 rounded-full"
              />
            ))}
          </div>
        )}

        {/* Transcript Display */}
        <div className="w-full min-h-[120px] mb-8">
          <AnimatePresence mode="wait">
            {(transcript || interimTranscript) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10"
              >
                <p className="text-xl md:text-2xl text-white leading-relaxed">
                  {transcript}
                  <span className="text-neutral-400">{interimTranscript}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!transcript && !interimTranscript && status === 'listening' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-center text-neutral-500 text-lg"
            >
              {currentAction.placeholder}
            </motion.p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 max-w-md"
          >
            <p className="text-red-300 text-center">{error}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {status === 'listening' ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopListening}
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors"
            >
              <MicOff className="w-5 h-5" />
              Terminer
            </motion.button>
          ) : status === 'success' ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGoHome}
              className="px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Retour au Dashboard
            </motion.button>
          ) : status === 'error' || status === 'initializing' ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startListening}
              className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors"
            >
              <Mic className="w-5 h-5" />
              {permissionGranted === false ? "Réessayer" : "Démarrer"}
            </motion.button>
          ) : null}
        </div>
      </div>

      {/* Footer Hint */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <p className="text-neutral-600 text-sm">
          💡 Astuce : Dis "Terminé" quand tu as fini de parler
        </p>
      </div>
    </div>
  );
};

export default VoiceAssistant;
