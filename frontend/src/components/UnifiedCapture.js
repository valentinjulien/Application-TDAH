import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import { useTasks } from '../hooks/useTasks';
import { processCapture } from '../services/captureService';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  Loader2,
  Keyboard,
  Brain,
  Shield
} from 'lucide-react';

// Configuration Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Placeholders dynamiques
const PLACEHOLDERS = [
  'Vider l\'esprit...',
  'Une idée ?',
  'À faire...',
  'Note rapide...',
  'Capture...',
  'Pensée fugitive...',
  'Avant d\'oublier...',
];

// Wake word configuration
const WAKE_WORDS = ['hey assistant', 'hé assistant', 'ok assistant', 'dis assistant', 'assistant'];

// Stop commands
const STOP_COMMANDS = ['terminé', 'termine', 'fini', 'stop', 'arrête', 'envoyer', 'envoie', 'c\'est tout'];

const UnifiedCapture = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { addTask } = useTasks();
  
  // Microphone permission state
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState('unknown'); // unknown, granted, denied, requesting
  
  // Mode: text or voice
  const [mode, setMode] = useState('text');
  
  // Common state
  const [inputText, setInputText] = useState('');
  const [placeholder] = useState(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [wakeWordStatus, setWakeWordStatus] = useState('waiting'); // waiting, listening, error
  
  // Refs
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeWordRecognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      // Check if permission API is available
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        if (result.state === 'granted') {
          setMicPermissionStatus('granted');
          return true;
        } else if (result.state === 'denied') {
          setMicPermissionStatus('denied');
          return false;
        }
      }
      // Permission state unknown, show popup
      setShowMicPermission(true);
      return false;
    } catch (e) {
      // Permission API not supported, show popup
      setShowMicPermission(true);
      return false;
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    setMicPermissionStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setShowMicPermission(false);
      // Start wake word listening after permission granted
      setTimeout(() => startWakeWordListening(), 500);
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setMicPermissionStatus('denied');
      return false;
    }
  };

  // Text-to-speech
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Check for wake word
  const checkWakeWord = useCallback((text) => {
    const lowerText = text.toLowerCase().trim();
    return WAKE_WORDS.some(wake => lowerText.includes(wake));
  }, []);

  // Check for stop command
  const checkStopCommand = useCallback((text) => {
    const lowerText = text.toLowerCase().trim();
    return STOP_COMMANDS.some(cmd => lowerText.includes(cmd) || lowerText.endsWith(cmd));
  }, []);

  // Process voice input
  const processVoiceInput = useCallback(async (text) => {
    let cleanText = text;
    STOP_COMMANDS.forEach(cmd => {
      cleanText = cleanText.replace(new RegExp(cmd, 'gi'), '').trim();
    });
    WAKE_WORDS.forEach(wake => {
      cleanText = cleanText.replace(new RegExp(wake, 'gi'), '').trim();
    });
    
    if (!cleanText) {
      setMode('text');
      setWakeWordActive(false);
      return;
    }
    
    setStatus('processing');
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: cleanText,
          user_id: user?.user_id,
          action: 'task'
        })
      });
      
      if (!response.ok) throw new Error('AI error');
      
      const data = await response.json();
      setAiResponse(data);
      setResult(data);
      setStatus('success');
      speak(data.message);
      
      setTimeout(() => {
        setWakeWordActive(false);
        setMode('text');
        setStatus('idle');
        setTranscript('');
        setAiResponse(null);
      }, 4000);
      
    } catch (err) {
      console.error('Voice processing error:', err);
      setError("Erreur de traitement");
      setStatus('error');
      speak("Désolé, une erreur s'est produite");
    }
  }, [user, speak]);

  // Start voice capture (for active recording)
  const startVoiceCapture = useCallback(async () => {
    console.log('Starting voice capture...');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setAiResponse(null);
    
    // Stop wake word listening first
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.abort();
        wakeWordRecognitionRef.current = null;
      } catch (e) {}
    }
    
    // Check microphone permission
    if (micPermissionStatus !== 'granted') {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        setError("Accès au microphone requis");
        setStatus('error');
        return;
      }
    }
    
    if (!SpeechRecognition) {
      setError("La reconnaissance vocale n'est pas supportée. Utilisez Chrome.");
      setStatus('error');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    
    recognition.onstart = () => {
      console.log('Voice capture started');
      setIsListening(true);
      setStatus('idle');
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      
      if (final) {
        let cleanFinal = final;
        WAKE_WORDS.forEach(wake => {
          cleanFinal = cleanFinal.replace(new RegExp(wake, 'gi'), '').trim();
        });
        
        setTranscript(prev => {
          const newTranscript = (prev + ' ' + cleanFinal).trim();
          
          if (checkStopCommand(cleanFinal)) {
            setTimeout(() => {
              recognition.stop();
              processVoiceInput(newTranscript);
            }, 300);
          }
          
          return newTranscript;
        });
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            setTranscript(prev => {
              if (prev.trim()) {
                processVoiceInput(prev);
              }
              return prev;
            });
          }
        }, 3000);
      }
      
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setMicPermissionStatus('denied');
        setError("Microphone refusé. Cliquez sur l'icône cadenas dans la barre d'adresse pour autoriser.");
        setStatus('error');
      } else if (event.error === 'aborted') {
        // Ignore aborted errors (happens when we stop recognition)
      } else if (event.error !== 'no-speech') {
        setError(`Erreur: ${event.error}`);
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      console.log('Voice capture ended');
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setError("Impossible de démarrer la reconnaissance vocale");
    }
  }, [micPermissionStatus, checkStopCommand, processVoiceInput]);

  // Start wake word listening (background)
  const startWakeWordListening = useCallback(() => {
    if (!SpeechRecognition) {
      console.log('SpeechRecognition not supported');
      setWakeWordStatus('error');
      return;
    }
    
    if (micPermissionStatus !== 'granted') {
      console.log('Microphone permission not granted yet');
      setWakeWordStatus('waiting');
      return;
    }
    
    // Don't start if already running
    if (wakeWordRecognitionRef.current) {
      console.log('Wake word already running');
      return;
    }
    
    console.log('Starting wake word listening...');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;
    
    let isActive = true;
    let restartTimeout = null;
    
    recognition.onstart = () => {
      console.log('Wake word listening active');
      setWakeWordStatus('listening');
    };
    
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        console.log('Wake word heard:', text);
        if (checkWakeWord(text)) {
          console.log('WAKE WORD DETECTED!');
          isActive = false;
          if (restartTimeout) clearTimeout(restartTimeout);
          try { recognition.abort(); } catch(e) {}
          wakeWordRecognitionRef.current = null;
          setWakeWordActive(true);
          speak("Je t'écoute !");
          setTimeout(() => {
            setMode('voice');
            startVoiceCapture();
          }, 600);
          return;
        }
      }
    };
    
    recognition.onerror = (event) => {
      console.log('Wake word error:', event.error);
      // Ignore these common errors that don't mean failure
      if (event.error === 'aborted' || event.error === 'no-speech' || event.error === 'network') {
        return;
      }
      setWakeWordStatus('error');
    };
    
    recognition.onend = () => {
      console.log('Wake word listening ended, isActive:', isActive);
      wakeWordRecognitionRef.current = null;
      
      // Auto-restart if still active and conditions are met
      if (isActive && micPermissionStatus === 'granted') {
        if (restartTimeout) clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          console.log('Restarting wake word listening...');
          startWakeWordListening();
        }, 300); // Short delay before restart
      }
    };
    
    wakeWordRecognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.log('Could not start wake word:', e);
      wakeWordRecognitionRef.current = null;
      // Retry after delay
      setTimeout(() => {
        if (micPermissionStatus === 'granted') {
          startWakeWordListening();
        }
      }, 1000);
    }
  }, [checkWakeWord, speak, startVoiceCapture, micPermissionStatus]);

  // Start wake word listening when permission is granted
  useEffect(() => {
    if (micPermissionStatus === 'granted' && mode === 'text' && !wakeWordActive) {
      startWakeWordListening();
    }
  }, [micPermissionStatus]);

  // Initialize
  useEffect(() => {
    if (mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (wakeWordRecognitionRef.current) {
        try { wakeWordRecognitionRef.current.abort(); } catch (e) {}
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Close handler
  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if (wakeWordRecognitionRef.current) {
      try { wakeWordRecognitionRef.current.abort(); } catch (e) {}
    }
    navigate(-1);
  }, [navigate]);

  // Handle text submit
  const handleTextSubmit = async (e) => {
    e?.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText || !user || status === 'processing') return;
    
    setStatus('processing');
    
    try {
      const captureResult = await processCapture(trimmedText);
      setResult(captureResult);
      
      await addTask({
        text: captureResult.text,
        priority: captureResult.priority,
        quadrant: captureResult.quadrant,
        user_id: user.user_id || user.id,
        due_date: captureResult.due_date,
        energy_required: captureResult.energy_required,
        estimated_total_minutes: captureResult.estimated_total_minutes,
      });
      
      setStatus('success');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      console.error('Capture error:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // Handle text key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  // Switch to voice mode manually
  const switchToVoice = useCallback(() => {
    console.log('Switching to voice mode manually');
    if (wakeWordRecognitionRef.current) {
      try { wakeWordRecognitionRef.current.abort(); } catch (e) {}
      wakeWordRecognitionRef.current = null;
    }
    setMode('voice');
    setWakeWordActive(true);
    startVoiceCapture();
  }, [startVoiceCapture]);

  // Switch to text mode
  const switchToText = useCallback(() => {
    console.log('Switching to text mode');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    setMode('text');
    setTranscript('');
    setInterimTranscript('');
    setAiResponse(null);
    setWakeWordActive(false);
    setIsListening(false);
    setError(null);
    setTimeout(() => {
      inputRef.current?.focus();
      if (micPermissionStatus === 'granted') {
        startWakeWordListening();
      }
    }, 100);
  }, [startWakeWordListening, micPermissionStatus]);

  // Get wake word status text
  const getWakeWordText = () => {
    if (micPermissionStatus !== 'granted') {
      return 'Autorisez le micro pour "Hey Assistant"';
    }
    if (wakeWordStatus === 'listening') {
      return '🎤 Écoute active - Dis "Hey Assistant"';
    }
    if (wakeWordStatus === 'error') {
      return 'Cliquez sur Voix pour activer';
    }
    return 'Initialisation du micro...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-xl transition-colors duration-500 ${
          mode === 'voice' ? 'bg-neutral-950/95' : 'bg-neutral-900/90'
        }`}
        onClick={status === 'idle' && mode === 'text' && !showMicPermission ? handleClose : undefined}
      />

      {/* Microphone Permission Popup */}
      <AnimatePresence>
        {showMicPermission && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 bg-neutral-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-neutral-700"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Mic className="w-8 h-8 text-primary-400" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                Autoriser le microphone
              </h2>
              
              <p className="text-neutral-400 mb-6">
                Pour utiliser l'assistant vocal et dire "Hey Assistant", nous avons besoin d'accéder à votre microphone.
              </p>
              
              <div className="bg-neutral-700/50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">Votre vie privée est protégée</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      L'audio n'est jamais enregistré ni stocké. Il est traité uniquement en temps réel pour la reconnaissance vocale.
                    </p>
                  </div>
                </div>
              </div>
              
              {micPermissionStatus === 'denied' && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
                  <p className="text-red-300 text-sm">
                    Accès refusé. Cliquez sur l'icône 🔒 dans la barre d'adresse pour modifier les permissions.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMicPermission(false)}
                  className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-medium transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={requestMicrophonePermission}
                  disabled={micPermissionStatus === 'requesting'}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {micPermissionStatus === 'requesting' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Autorisation...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Autoriser
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Wake Word Indicator */}
      <AnimatePresence>
        {mode === 'text' && !wakeWordActive && !showMicPermission && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20"
          >
            <button
              onClick={() => micPermissionStatus !== 'granted' ? setShowMicPermission(true) : null}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/30 hover:bg-primary-500/30 transition-colors cursor-pointer"
            >
              <div className={`w-2 h-2 rounded-full ${
                wakeWordStatus === 'listening' ? 'bg-green-400 animate-pulse' : 
                micPermissionStatus !== 'granted' ? 'bg-amber-400' :
                wakeWordStatus === 'error' ? 'bg-red-400' : 
                'bg-neutral-500 animate-pulse'
              }`} />
              <span className="text-sm text-primary-300">{getWakeWordText()}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative z-10 w-full max-w-2xl px-6 ${showMicPermission ? 'opacity-30 pointer-events-none' : ''}`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
          data-testid="close-capture-btn"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={switchToText}
            data-testid="text-mode-btn"
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              mode === 'text' 
                ? 'bg-primary-500 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-sm font-medium">Texte</span>
          </button>
          <button
            onClick={switchToVoice}
            data-testid="voice-mode-btn"
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              mode === 'voice' 
                ? 'bg-primary-500 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Voix</span>
          </button>
        </div>

        {/* TEXT MODE */}
        <AnimatePresence mode="wait">
          {mode === 'text' && (
            <motion.div
              key="text-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {status === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
                </motion.div>
              )}

              {status === 'success' && result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-500 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-4">Capturé !</h3>
                  
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
                        {result.energy_required === 'high' ? 'Deep Work' :
                         result.energy_required === 'low' ? 'Repos' : 'Focus'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Erreur</h3>
                  <p className="text-neutral-400">Réessaie dans un instant</p>
                </motion.div>
              )}

              {status === 'idle' && (
                <>
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-white text-3xl md:text-4xl font-light text-center placeholder-neutral-600 resize-none focus:outline-none leading-relaxed"
                    rows={3}
                    autoFocus
                    maxLength={500}
                    data-testid="capture-input"
                  />
                  
                  <div className="mt-8 text-center space-y-2">
                    <p className="text-neutral-500 text-sm">
                      Entrée pour capturer • Échap pour annuler
                    </p>
                    {inputText.length > 10 && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-primary-400 text-sm flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        L'IA va analyser : priorité, énergie, durée
                      </motion.p>
                    )}
                    <p className="text-neutral-600 text-xs">{inputText.length}/500</p>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* VOICE MODE */}
          {mode === 'voice' && (
            <motion.div
              key="voice-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              {/* Status Message */}
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {isListening && "Je t'écoute..."}
                {status === 'processing' && "L'IA réfléchit..."}
                {status === 'success' && (aiResponse?.task_created ? "Tâche créée !" : "Compris !")}
                {status === 'error' && "Oups..."}
                {!isListening && status === 'idle' && "Prêt à écouter"}
              </h1>
              
              {isSpeaking && (
                <div className="flex items-center justify-center gap-2 text-primary-400 mb-4">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">L'assistant parle...</span>
                </div>
              )}

              {/* Mic Animation */}
              <div className="relative my-8 mx-auto w-fit">
                <motion.div
                  animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                  className={`w-28 h-28 rounded-full flex items-center justify-center transition-colors duration-500 ${
                    status === 'success' ? 'bg-accent-500' :
                    status === 'error' ? 'bg-red-500' :
                    status === 'processing' ? 'bg-purple-500' :
                    isListening ? 'bg-primary-500' : 'bg-neutral-700'
                  }`}
                >
                  {status === 'success' ? (
                    <CheckCircle className="w-12 h-12 text-white" />
                  ) : status === 'error' ? (
                    <AlertCircle className="w-12 h-12 text-white" />
                  ) : status === 'processing' ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : isListening ? (
                    <Mic className="w-12 h-12 text-white" />
                  ) : (
                    <MicOff className="w-12 h-12 text-white" />
                  )}
                </motion.div>

                {/* Animated Rings */}
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full border-2 border-primary-500"
                    />
                    <motion.div
                      animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                      className="absolute inset-0 rounded-full border-2 border-primary-500"
                    />
                  </>
                )}
              </div>

              {/* Sound Wave Bars */}
              {isListening && (
                <div className="flex items-end justify-center gap-1 h-12 mb-6">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, Math.random() * 40 + 8, 8] }}
                      transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.4, delay: i * 0.03 }}
                      className="w-1 bg-gradient-to-t from-primary-500 to-primary-300 rounded-full"
                    />
                  ))}
                </div>
              )}

              {/* Transcript Display */}
              <div className="min-h-[80px] mb-4">
                {(transcript || interimTranscript) && status !== 'success' && (
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-lg text-white">
                      {transcript}
                      <span className="text-neutral-400">{interimTranscript}</span>
                    </p>
                  </div>
                )}
                
                {/* AI Response */}
                {aiResponse && status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                      <p className="text-sm text-accent-300 mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Assistant :
                      </p>
                      <p className="text-white">{aiResponse.message}</p>
                      
                      {aiResponse.task_created && aiResponse.task && (
                        <div className="mt-3 p-3 bg-accent-500/20 rounded-xl border border-accent-500/30">
                          <p className="text-accent-300 text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Tâche ajoutée
                          </p>
                          <p className="text-white mt-1">{aiResponse.task.text}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {!transcript && !interimTranscript && isListening && (
                  <p className="text-neutral-500">Parle librement ou dis "Terminé"</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Voice Actions */}
              <div className="flex gap-3 justify-center">
                {isListening && (
                  <button
                    onClick={() => {
                      if (recognitionRef.current) recognitionRef.current.stop();
                      processVoiceInput(transcript);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium flex items-center gap-2"
                    data-testid="send-voice-btn"
                  >
                    <Sparkles className="w-5 h-5" />
                    Envoyer
                  </button>
                )}
                
                {!isListening && status === 'idle' && (
                  <button
                    onClick={startVoiceCapture}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
                    data-testid="start-voice-btn"
                  >
                    <Mic className="w-5 h-5" />
                    Commencer
                  </button>
                )}
                
                {status === 'success' && (
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setTranscript('');
                      setAiResponse(null);
                      startVoiceCapture();
                    }}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
                    data-testid="new-capture-btn"
                  >
                    <Mic className="w-5 h-5" />
                    Nouvelle capture
                  </button>
                )}
              </div>

              {/* Footer hint */}
              <p className="text-neutral-600 text-sm mt-6">
                {isListening && 'Dis "Terminé" ou attends 3 secondes'}
                {status === 'processing' && 'Analyse en cours...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default UnifiedCapture;
