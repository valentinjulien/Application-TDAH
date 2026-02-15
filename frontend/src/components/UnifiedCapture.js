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
  Zap
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
const WAKE_WORDS = ['hey assistant', 'hé assistant', 'ok assistant', 'dis assistant'];

// Stop commands
const STOP_COMMANDS = ['terminé', 'termine', 'fini', 'stop', 'arrête', 'envoyer', 'envoie', 'c\'est tout'];

const UnifiedCapture = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { addTask } = useTasks();
  
  // Mode: text or voice
  const [mode, setMode] = useState('text'); // text, voice, listening_wake
  
  // Common state
  const [inputText, setInputText] = useState('');
  const [placeholder] = useState(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  
  // Refs
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeWordRecognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Initialize - auto focus text input
  useEffect(() => {
    if (mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    
    // Start wake word listening in background
    startWakeWordListening();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    window.speechSynthesis?.cancel();
  }, []);

  // Close handler
  const handleClose = useCallback(() => {
    cleanup();
    navigate(-1);
  }, [cleanup, navigate]);

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

  // Start wake word listening (background)
  const startWakeWordListening = useCallback(() => {
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (checkWakeWord(text)) {
          // Wake word detected!
          setWakeWordActive(true);
          recognition.stop();
          speak("Je t'écoute !");
          setTimeout(() => {
            setMode('voice');
            startVoiceCapture();
          }, 500);
          return;
        }
      }
    };
    
    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.log('Wake word recognition error:', event.error);
      }
    };
    
    recognition.onend = () => {
      // Restart wake word listening if not in voice mode
      if (mode === 'text' && !wakeWordActive) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // Ignore
          }
        }, 100);
      }
    };
    
    wakeWordRecognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.log('Could not start wake word recognition');
    }
  }, [mode, wakeWordActive, checkWakeWord, speak]);

  // Start voice capture
  const startVoiceCapture = useCallback(async () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setAiResponse(null);
    
    // Check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setError("Accès au microphone requis");
      setStatus('error');
      return;
    }
    
    if (!SpeechRecognition) {
      setError("La reconnaissance vocale n'est pas supportée");
      setStatus('error');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    
    recognition.onstart = () => {
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
        // Remove wake word from transcript
        let cleanFinal = final;
        WAKE_WORDS.forEach(wake => {
          cleanFinal = cleanFinal.replace(new RegExp(wake, 'gi'), '').trim();
        });
        
        setTranscript(prev => {
          const newTranscript = (prev + ' ' + cleanFinal).trim();
          
          // Check for stop command
          if (checkStopCommand(cleanFinal)) {
            setTimeout(() => {
              recognition.stop();
              processVoiceInput(newTranscript);
            }, 300);
          }
          
          return newTranscript;
        });
        
        // Reset silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-send after 3s silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            setTranscript(prev => {
              processVoiceInput(prev + ' ' + cleanFinal);
              return prev;
            });
          }
        }, 3000);
      }
      
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError("Microphone refusé");
        setStatus('error');
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  }, [checkStopCommand]);

  // Process voice input
  const processVoiceInput = useCallback(async (text) => {
    // Clean stop commands from text
    let cleanText = text;
    STOP_COMMANDS.forEach(cmd => {
      cleanText = cleanText.replace(new RegExp(cmd, 'gi'), '').trim();
    });
    
    if (!cleanText) {
      setMode('text');
      startWakeWordListening();
      return;
    }
    
    setStatus('processing');
    
    try {
      // Send to AI chat for intelligent processing
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
      
      // Speak response
      speak(data.message);
      
      // Auto-close after 3s
      setTimeout(() => {
        setWakeWordActive(false);
        setMode('text');
        startWakeWordListening();
      }, 4000);
      
    } catch (err) {
      console.error('Voice processing error:', err);
      setError("Erreur de traitement");
      setStatus('error');
      speak("Désolé, une erreur s'est produite");
    }
  }, [user, speak, startWakeWordListening]);

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
      
      // Auto-close after success
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
  const switchToVoice = () => {
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
    }
    setMode('voice');
    startVoiceCapture();
  };

  // Switch to text mode
  const switchToText = () => {
    cleanup();
    setMode('text');
    setTranscript('');
    setInterimTranscript('');
    setAiResponse(null);
    setWakeWordActive(false);
    setTimeout(() => {
      inputRef.current?.focus();
      startWakeWordListening();
    }, 100);
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
        onClick={status === 'idle' && mode === 'text' ? handleClose : undefined}
      />
      
      {/* Wake Word Indicator */}
      <AnimatePresence>
        {mode === 'text' && !wakeWordActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/30">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-sm text-primary-300">Dis "Hey Assistant" pour la voix</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={switchToText}
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
                  <div className="space-y-1 text-sm text-neutral-400">
                    <p>📊 Classification Eisenhower</p>
                    <p>⚡ Niveau d'énergie</p>
                    <p>⏱️ Estimation durée</p>
                  </div>
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
                  >
                    <Sparkles className="w-5 h-5" />
                    Envoyer
                  </button>
                )}
                
                {!isListening && status === 'idle' && (
                  <button
                    onClick={startVoiceCapture}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
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
                  >
                    <Mic className="w-5 h-5" />
                    Nouvelle capture
                  </button>
                )}
              </div>

              {/* Footer hint */}
              <p className="text-neutral-600 text-sm mt-6">
                {isListening && '💡 Dis "Terminé" ou attends 3 secondes'}
                {status === 'processing' && '🧠 Analyse en cours...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default UnifiedCapture;
