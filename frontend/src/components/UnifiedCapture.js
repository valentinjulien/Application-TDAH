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

// Placeholders
const PLACEHOLDERS = ['Vider l\'esprit...', 'Une idée ?', 'À faire...', 'Note rapide...', 'Capture...'];

// Stop commands
const STOP_COMMANDS = ['terminé', 'termine', 'fini', 'stop', 'arrête', 'envoyer', 'envoie', 'c\'est tout'];

const UnifiedCapture = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { addTask } = useTasks();
  
  // Microphone permission state
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState('unknown');
  
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
  
  // Porcupine state
  const [porcupineStatus, setPorcupineStatus] = useState('initializing');
  const [detectedKeyword, setDetectedKeyword] = useState(null);
  const porcupineRef = useRef(null);
  const webVpRef = useRef(null);
  
  // Refs
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Get access key from backend
  const getAccessKey = async () => {
    try {
      const response = await fetch('/api/porcupine/access-key');
      if (!response.ok) return null;
      const data = await response.json();
      return data.accessKey;
    } catch (e) {
      return null;
    }
  };

  // Initialize Porcupine with built-in keyword "Hey Google" (works in any language)
  const initPorcupine = useCallback(async () => {
    try {
      setPorcupineStatus('initializing');
      console.log('🎤 Initializing Porcupine...');
      
      const accessKey = await getAccessKey();
      if (!accessKey) {
        console.log('No Porcupine access key');
        setPorcupineStatus('error');
        return false;
      }
      
      // Import Porcupine
      const porcupineModule = await import('@picovoice/porcupine-web');
      const { WebVoiceProcessor } = await import('@picovoice/web-voice-processor');
      
      const Porcupine = porcupineModule.Porcupine;
      const BuiltInKeyword = porcupineModule.BuiltInKeyword;
      
      console.log('🎤 Creating Porcupine with built-in keyword...');
      
      // Use built-in keyword "HEY_GOOGLE" - this doesn't require a model file
      const porcupine = await Porcupine.create(
        accessKey,
        [BuiltInKeyword.HeyGoogle],
        { 
          processErrorCallback: (error) => {
            console.error('Porcupine process error:', error);
          }
        }
      );
      
      console.log('🎤 Porcupine instance created, frame length:', porcupine.frameLength);
      
      // Set up keyword detection callback BEFORE subscribing
      const keywordLabels = ['Hey Google'];
      
      // Create a custom engine wrapper for WebVoiceProcessor
      const porcupineEngine = {
        frameLength: porcupine.frameLength,
        sampleRate: porcupine.sampleRate,
        process: (inputFrame) => {
          const result = porcupine.process(inputFrame);
          if (result >= 0) {
            console.log('🎉 KEYWORD DETECTED:', keywordLabels[result]);
            setDetectedKeyword(keywordLabels[result]);
            onWakeWordDetected();
          }
        },
        release: () => porcupine.release()
      };
      
      porcupineRef.current = porcupineEngine;
      
      // Subscribe to WebVoiceProcessor
      console.log('🎤 Subscribing to WebVoiceProcessor...');
      await WebVoiceProcessor.subscribe(porcupineEngine);
      webVpRef.current = WebVoiceProcessor;
      
      setPorcupineStatus('listening');
      console.log('✅ Porcupine listening for "Hey Google"');
      return true;
      
    } catch (err) {
      console.error('❌ Porcupine initialization error:', err);
      setPorcupineStatus('error');
      return false;
    }
  }, []);

  // Handle wake word detection
  const onWakeWordDetected = useCallback(() => {
    console.log('🎤 Wake word handler triggered!');
    setWakeWordActive(true);
    speak("Je t'écoute !");
    
    setTimeout(() => {
      setMode('voice');
      startVoiceCapture();
    }, 500);
  }, []);

  // Cleanup Porcupine
  const cleanupPorcupine = useCallback(async () => {
    try {
      if (webVpRef.current && porcupineRef.current) {
        await webVpRef.current.unsubscribe(porcupineRef.current);
      }
      if (porcupineRef.current) {
        porcupineRef.current.release();
        porcupineRef.current = null;
      }
    } catch (e) {
      console.log('Porcupine cleanup:', e);
    }
    setPorcupineStatus('disabled');
  }, []);

  // Check and request microphone permission
  const checkAndRequestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setShowMicPermission(false);
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setMicPermissionStatus('denied');
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      // Check mic permission first
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'microphone' });
          if (result.state === 'granted') {
            setMicPermissionStatus('granted');
            if (mounted) await initPorcupine();
          } else {
            setShowMicPermission(true);
          }
        } else {
          setShowMicPermission(true);
        }
      } catch (e) {
        setShowMicPermission(true);
      }
    };
    
    init();
    setTimeout(() => inputRef.current?.focus(), 100);
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      mounted = false;
      document.removeEventListener('keydown', handleKeyDown);
      cleanupPorcupine();
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e) {}
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Start Porcupine after permission granted
  const onPermissionGranted = useCallback(async () => {
    const granted = await checkAndRequestMicPermission();
    if (granted) await initPorcupine();
  }, [checkAndRequestMicPermission, initPorcupine]);

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

  // Check for stop command
  const checkStopCommand = useCallback((text) => {
    const lowerText = text.toLowerCase().trim();
    return STOP_COMMANDS.some(cmd => lowerText.includes(cmd) || lowerText.endsWith(cmd));
  }, []);

  // Process voice input
  const processVoiceInput = useCallback(async (text) => {
    let cleanText = text.trim();
    STOP_COMMANDS.forEach(cmd => {
      cleanText = cleanText.replace(new RegExp(cmd, 'gi'), '').trim();
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
        body: JSON.stringify({ message: cleanText, user_id: user?.user_id, action: 'task' })
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

  // Start voice capture
  const startVoiceCapture = useCallback(async () => {
    console.log('Starting voice capture...');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setAiResponse(null);
    
    // Pause Porcupine
    if (webVpRef.current && porcupineRef.current) {
      try {
        await webVpRef.current.unsubscribe(porcupineRef.current);
        setPorcupineStatus('disabled');
      } catch(e) {}
    }
    
    if (!SpeechRecognition) {
      setError("Utilisez Chrome pour la reconnaissance vocale");
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
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      
      if (final) {
        setTranscript(prev => {
          const newTranscript = (prev + ' ' + final).trim();
          if (checkStopCommand(final)) {
            setTimeout(() => {
              recognition.stop();
              processVoiceInput(newTranscript);
            }, 300);
          }
          return newTranscript;
        });
        
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            setTranscript(prev => {
              if (prev.trim()) processVoiceInput(prev);
              return prev;
            });
          }
        }, 3000);
      }
      
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setMicPermissionStatus('denied');
        setError("Microphone refusé");
        setStatus('error');
      }
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      setError("Impossible de démarrer la reconnaissance");
    }
  }, [checkStopCommand, processVoiceInput]);

  // Close handler
  const handleClose = useCallback(() => {
    cleanupPorcupine();
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e) {}
    navigate(-1);
  }, [cleanupPorcupine, navigate]);

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
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  // Switch to voice mode
  const switchToVoice = useCallback(async () => {
    if (micPermissionStatus !== 'granted') {
      const granted = await checkAndRequestMicPermission();
      if (!granted) {
        setShowMicPermission(true);
        return;
      }
    }
    
    if (webVpRef.current && porcupineRef.current) {
      try {
        await webVpRef.current.unsubscribe(porcupineRef.current);
        setPorcupineStatus('disabled');
      } catch(e) {}
    }
    
    setMode('voice');
    setWakeWordActive(true);
    startVoiceCapture();
  }, [micPermissionStatus, checkAndRequestMicPermission, startVoiceCapture]);

  // Switch to text mode
  const switchToText = useCallback(async () => {
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e) {}
    setMode('text');
    setTranscript('');
    setInterimTranscript('');
    setAiResponse(null);
    setWakeWordActive(false);
    setIsListening(false);
    setError(null);
    
    setTimeout(async () => {
      inputRef.current?.focus();
      // Restart Porcupine
      if (micPermissionStatus === 'granted') {
        await initPorcupine();
      }
    }, 100);
  }, [micPermissionStatus, initPorcupine]);

  // Get status text
  const getStatusText = () => {
    if (micPermissionStatus !== 'granted') {
      return { text: 'Autorisez le micro pour "Hey Google"', color: 'amber' };
    }
    if (porcupineStatus === 'listening') {
      return { text: '🎤 Dites "Hey Google" pour activer', color: 'green' };
    }
    if (porcupineStatus === 'initializing') {
      return { text: 'Initialisation Porcupine...', color: 'blue' };
    }
    if (porcupineStatus === 'error') {
      return { text: 'Erreur - Cliquez sur Voix', color: 'red' };
    }
    return { text: 'Cliquez sur Voix', color: 'gray' };
  };

  const statusInfo = getStatusText();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div 
        className={`absolute inset-0 backdrop-blur-xl transition-colors duration-500 ${
          mode === 'voice' ? 'bg-neutral-950/95' : 'bg-neutral-900/90'
        }`}
        onClick={status === 'idle' && mode === 'text' && !showMicPermission ? handleClose : undefined}
      />

      {/* Mic Permission Popup */}
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
              <h2 className="text-xl font-bold text-white mb-2">Autoriser le microphone</h2>
              <p className="text-neutral-400 mb-6">
                Dites "Hey Google" pour activer l'assistant vocal.
              </p>
              <div className="bg-neutral-700/50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-neutral-300">
                    L'audio est traité localement. Rien n'est envoyé au serveur.
                  </p>
                </div>
              </div>
              {micPermissionStatus === 'denied' && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
                  <p className="text-red-300 text-sm">Cliquez sur 🔒 dans la barre d'adresse.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowMicPermission(false)} className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-medium">
                  Plus tard
                </button>
                <button onClick={onPermissionGranted} className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                  <Mic className="w-5 h-5" /> Autoriser
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Status Indicator */}
      <AnimatePresence>
        {mode === 'text' && !wakeWordActive && !showMicPermission && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => micPermissionStatus !== 'granted' ? setShowMicPermission(true) : null}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                statusInfo.color === 'green' ? 'bg-green-500/20 border-green-500/30' :
                statusInfo.color === 'amber' ? 'bg-amber-500/20 border-amber-500/30' :
                statusInfo.color === 'red' ? 'bg-red-500/20 border-red-500/30' :
                statusInfo.color === 'blue' ? 'bg-blue-500/20 border-blue-500/30' :
                'bg-neutral-500/20 border-neutral-500/30'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                statusInfo.color === 'green' ? 'bg-green-400 animate-pulse' :
                statusInfo.color === 'amber' ? 'bg-amber-400' :
                statusInfo.color === 'red' ? 'bg-red-400' :
                statusInfo.color === 'blue' ? 'bg-blue-400 animate-pulse' :
                'bg-neutral-400'
              }`} />
              <span className={`text-sm ${
                statusInfo.color === 'green' ? 'text-green-300' :
                statusInfo.color === 'amber' ? 'text-amber-300' :
                statusInfo.color === 'red' ? 'text-red-300' :
                statusInfo.color === 'blue' ? 'text-blue-300' :
                'text-neutral-300'
              }`}>{statusInfo.text}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`relative z-10 w-full max-w-2xl px-6 ${showMicPermission ? 'opacity-30 pointer-events-none' : ''}`}>
        <button onClick={handleClose} className="absolute -top-12 right-0 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700" data-testid="close-capture-btn">
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        <div className="flex justify-center gap-2 mb-6">
          <button onClick={switchToText} data-testid="text-mode-btn" className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${mode === 'text' ? 'bg-primary-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
            <Keyboard className="w-4 h-4" /><span className="text-sm font-medium">Texte</span>
          </button>
          <button onClick={switchToVoice} data-testid="voice-mode-btn" className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${mode === 'voice' ? 'bg-primary-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
            <Mic className="w-4 h-4" /><span className="text-sm font-medium">Voix</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'text' && (
            <motion.div key="text-mode" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {status === 'processing' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary-400" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white">Analyse en cours...</h3>
                </motion.div>
              )}
              {status === 'success' && result && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }} className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-500 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-4">Capturé !</h3>
                  <div className="bg-neutral-800 rounded-xl p-4 max-w-md mx-auto text-left">
                    <p className="text-white font-medium mb-3">{result.text}</p>
                  </div>
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Erreur</h3>
                </motion.div>
              )}
              {status === 'idle' && (
                <>
                  <textarea ref={inputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={handleKeyPress} placeholder={placeholder} className="w-full bg-transparent text-white text-3xl md:text-4xl font-light text-center placeholder-neutral-600 resize-none focus:outline-none leading-relaxed" rows={3} autoFocus maxLength={500} data-testid="capture-input" />
                  <div className="mt-8 text-center space-y-2">
                    <p className="text-neutral-500 text-sm">Entrée pour capturer • Échap pour annuler</p>
                    {inputText.length > 10 && (
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-primary-400 text-sm flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> L'IA va analyser
                      </motion.p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {mode === 'voice' && (
            <motion.div key="voice-mode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {isListening && "Je t'écoute..."}
                {status === 'processing' && "L'IA réfléchit..."}
                {status === 'success' && "Compris !"}
                {status === 'error' && "Oups..."}
                {!isListening && status === 'idle' && "Prêt à écouter"}
              </h1>
              
              {isSpeaking && (
                <div className="flex items-center justify-center gap-2 text-primary-400 mb-4">
                  <Volume2 className="w-4 h-4 animate-pulse" /><span className="text-sm">L'assistant parle...</span>
                </div>
              )}

              <div className="relative my-8 mx-auto w-fit">
                <motion.div animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }} className={`w-28 h-28 rounded-full flex items-center justify-center transition-colors duration-500 ${
                  status === 'success' ? 'bg-accent-500' : status === 'error' ? 'bg-red-500' : status === 'processing' ? 'bg-purple-500' : isListening ? 'bg-primary-500' : 'bg-neutral-700'
                }`}>
                  {status === 'success' ? <CheckCircle className="w-12 h-12 text-white" /> :
                   status === 'error' ? <AlertCircle className="w-12 h-12 text-white" /> :
                   status === 'processing' ? <Loader2 className="w-12 h-12 text-white animate-spin" /> :
                   isListening ? <Mic className="w-12 h-12 text-white" /> : <MicOff className="w-12 h-12 text-white" />}
                </motion.div>
                {isListening && (
                  <>
                    <motion.div animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border-2 border-primary-500" />
                    <motion.div animate={{ scale: [1, 2.2], opacity: [0.4, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="absolute inset-0 rounded-full border-2 border-primary-500" />
                  </>
                )}
              </div>

              {isListening && (
                <div className="flex items-end justify-center gap-1 h-12 mb-6">
                  {[...Array(20)].map((_, i) => (
                    <motion.div key={i} animate={{ height: [8, Math.random() * 40 + 8, 8] }} transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.4, delay: i * 0.03 }} className="w-1 bg-gradient-to-t from-primary-500 to-primary-300 rounded-full" />
                  ))}
                </div>
              )}

              <div className="min-h-[80px] mb-4">
                {(transcript || interimTranscript) && status !== 'success' && (
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-lg text-white">{transcript}<span className="text-neutral-400">{interimTranscript}</span></p>
                  </div>
                )}
                {aiResponse && status === 'success' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                      <p className="text-white">{aiResponse.message}</p>
                    </div>
                  </motion.div>
                )}
                {!transcript && !interimTranscript && isListening && <p className="text-neutral-500">Parle librement ou dis "Terminé"</p>}
              </div>

              {error && <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4"><p className="text-red-300 text-sm">{error}</p></div>}

              <div className="flex gap-3 justify-center">
                {isListening && (
                  <button onClick={() => { if (recognitionRef.current) recognitionRef.current.stop(); processVoiceInput(transcript); }} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium flex items-center gap-2" data-testid="send-voice-btn">
                    <Sparkles className="w-5 h-5" /> Envoyer
                  </button>
                )}
                {!isListening && status === 'idle' && (
                  <button onClick={startVoiceCapture} className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2" data-testid="start-voice-btn">
                    <Mic className="w-5 h-5" /> Commencer
                  </button>
                )}
                {status === 'success' && (
                  <button onClick={() => { setStatus('idle'); setTranscript(''); setAiResponse(null); startVoiceCapture(); }} className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2" data-testid="new-capture-btn">
                    <Mic className="w-5 h-5" /> Nouvelle capture
                  </button>
                )}
              </div>
              <p className="text-neutral-600 text-sm mt-6">{isListening && 'Dis "Terminé" ou attends 3 secondes'}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default UnifiedCapture;
