import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import { Mic, MicOff, X, Sparkles, ArrowLeft, CheckCircle, AlertCircle, Volume2, Loader2 } from 'lucide-react';

// Configuration Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'general'; // task, question, general
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState('initializing'); // initializing, listening, processing, success, error
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef(null);
  const autoStartRef = useRef(false);
  const silenceTimeoutRef = useRef(null);

  // Messages contextuels selon l'action
  const actionMessages = {
    task: {
      prompt: "Décris ta tâche...",
      success: "Tâche enregistrée !",
      placeholder: "Ex: Rappeler le médecin demain matin"
    },
    question: {
      prompt: "Pose ta question...",
      success: "Voici ma réponse",
      placeholder: "Ex: Comment mieux gérer mon temps ?"
    },
    general: {
      prompt: "Je t'écoute...",
      success: "Message reçu !",
      placeholder: "Parle librement ou dis 'Terminé'"
    }
  };

  const currentAction = actionMessages[action] || actionMessages.general;

  // Commandes vocales de fin
  const STOP_COMMANDS = ['terminé', 'termine', 'fini', 'stop', 'arrête', 'envoyer', 'envoie', 'c\'est tout'];

  // Vérifier si le transcript contient une commande de fin
  const checkForStopCommand = useCallback((text) => {
    const lowerText = text.toLowerCase().trim();
    return STOP_COMMANDS.some(cmd => lowerText.includes(cmd) || lowerText.endsWith(cmd));
  }, []);

  // Synthèse vocale pour le feedback
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window && text) {
      // Annuler toute synthèse en cours
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Envoyer à l'IA
  const sendToAI = useCallback(async (text) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    
    // Nettoyer le texte des commandes de fin
    let cleanText = text;
    STOP_COMMANDS.forEach(cmd => {
      cleanText = cleanText.replace(new RegExp(cmd, 'gi'), '').trim();
    });
    
    if (!cleanText) {
      setStatus('listening');
      return;
    }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: cleanText,
          user_id: user?.user_id,
          action: action
        })
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      setAiResponse(data);
      setStatus('success');
      
      // Feedback vocal de la réponse IA
      speak(data.message);
      
    } catch (err) {
      console.error('AI Error:', err);
      setError("Erreur de communication avec l'IA");
      setStatus('error');
      speak("Désolé, une erreur s'est produite");
    }
  }, [user, action, speak]);

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
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      if (final) {
        setTranscript(prev => {
          const newTranscript = prev + ' ' + final;
          
          // Vérifier si commande de fin détectée
          if (checkForStopCommand(final)) {
            // Arrêter et envoyer
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
              sendToAI(newTranscript);
            }, 300);
          }
          
          return newTranscript.trim();
        });
        
        // Reset silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-envoi après 3 secondes de silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && transcript) {
            recognitionRef.current.stop();
            sendToAI(transcript + ' ' + final);
          }
        }, 3000);
      }
      
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError("Accès au microphone refusé. Autorisez l'accès dans les paramètres de votre navigateur.");
        setPermissionGranted(false);
        setStatus('error');
      } else if (event.error === 'no-speech') {
        // Pas d'erreur affichée, continuer à écouter
      } else if (event.error !== 'aborted') {
        setError(`Erreur: ${event.error}`);
        setStatus('error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Ne pas redémarrer si on est en train de traiter
      if (status === 'listening' && !silenceTimeoutRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Could not restart recognition');
        }
      }
    };

    return recognition;
  }, [status, transcript, checkForStopCommand, sendToAI]);

  // Démarrer l'écoute
  const startListening = useCallback(async () => {
    // Reset state
    setTranscript('');
    setInterimTranscript('');
    setAiResponse(null);
    setError(null);
    
    // Vérifier/demander la permission du micro
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
    } catch (err) {
      setPermissionGranted(false);
      setError("Accès au microphone requis. Cliquez sur l'icône de cadenas dans la barre d'adresse.");
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
        // Peut-être déjà démarré, essayer de redémarrer
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 100);
        } catch (e2) {
          console.error('Could not restart:', e2);
        }
      }
    }
  }, [initializeRecognition]);

  // Arrêter l'écoute et envoyer
  const stopAndSend = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (transcript) {
      sendToAI(transcript);
    }
  }, [transcript, sendToAI]);

  // Auto-start au montage du composant
  useEffect(() => {
    if (!autoStartRef.current) {
      autoStartRef.current = true;
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
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Fermer et retourner
  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis?.cancel();
    navigate(-1);
  };

  // Retourner au dashboard
  const handleGoHome = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis?.cancel();
    navigate('/');
  };

  // Nouvelle conversation
  const handleNewConversation = () => {
    setTranscript('');
    setInterimTranscript('');
    setAiResponse(null);
    startListening();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isListening ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        </div>
      </div>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button
          onClick={handleClose}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="voice-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span className="text-white font-medium">Assistant IA</span>
          {isSpeaking && <Volume2 className="w-4 h-4 text-primary-400 animate-pulse" />}
        </div>
        
        <button
          onClick={handleClose}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="voice-close-btn"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl px-6 z-10">
        
        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
            {status === 'listening' && currentAction.prompt}
            {status === 'processing' && "L'IA réfléchit..."}
            {status === 'success' && (aiResponse?.task_created ? "Tâche créée !" : currentAction.success)}
            {status === 'error' && "Oups..."}
            {status === 'initializing' && "Initialisation..."}
          </h1>
          <p className="text-neutral-400">
            {action === 'task' && "Mode: Création de tâche"}
            {action === 'question' && "Mode: Question"}
            {action === 'general' && "Mode: Conversation libre"}
          </p>
        </motion.div>

        {/* Mic Animation */}
        <div className="relative mb-8">
          <motion.div
            animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
            className={`w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-colors duration-500 ${
              status === 'success' ? 'bg-accent-500' :
              status === 'error' ? 'bg-red-500' :
              status === 'processing' ? 'bg-purple-500' :
              isListening ? 'bg-primary-500' : 'bg-neutral-700'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle className="w-14 h-14 text-white" />
            ) : status === 'error' ? (
              <AlertCircle className="w-14 h-14 text-white" />
            ) : status === 'processing' ? (
              <Loader2 className="w-14 h-14 text-white animate-spin" />
            ) : isListening ? (
              <Mic className="w-14 h-14 text-white" />
            ) : (
              <MicOff className="w-14 h-14 text-white" />
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
              <motion.div
                animate={{ scale: [1, 2.6], opacity: [0.2, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
                className="absolute inset-0 rounded-full border-2 border-primary-500"
              />
            </>
          )}
        </div>

        {/* Sound Wave Bars */}
        {isListening && (
          <div className="flex items-end justify-center gap-1 h-12 mb-6">
            {[...Array(24)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [8, Math.random() * 48 + 8, 8],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.4 + Math.random() * 0.4,
                  delay: i * 0.03,
                }}
                className="w-1 bg-gradient-to-t from-primary-500 to-primary-300 rounded-full"
              />
            ))}
          </div>
        )}

        {/* Transcript Display */}
        <div className="w-full min-h-[100px] mb-6">
          <AnimatePresence mode="wait">
            {(transcript || interimTranscript) && status !== 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/10"
              >
                <p className="text-lg md:text-xl text-white leading-relaxed">
                  {transcript}
                  <span className="text-neutral-400">{interimTranscript}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* AI Response Display */}
          <AnimatePresence>
            {aiResponse && status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* User message */}
                <div className="bg-primary-500/20 rounded-2xl p-4 border border-primary-500/30">
                  <p className="text-sm text-primary-300 mb-1">Toi :</p>
                  <p className="text-white">{transcript}</p>
                </div>
                
                {/* AI response */}
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                  <p className="text-sm text-accent-300 mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Assistant :
                  </p>
                  <p className="text-white text-lg">{aiResponse.message}</p>
                  
                  {/* Task created badge */}
                  {aiResponse.task_created && aiResponse.task && (
                    <div className="mt-3 p-3 bg-accent-500/20 rounded-xl border border-accent-500/30">
                      <p className="text-accent-300 text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Tâche ajoutée à la matrice
                      </p>
                      <p className="text-white mt-1">{aiResponse.task.text}</p>
                      <p className="text-neutral-400 text-xs mt-1">
                        Quadrant {aiResponse.task.quadrant} • Priorité {aiResponse.task.priority}
                      </p>
                    </div>
                  )}
                </div>
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
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 max-w-md"
          >
            <p className="text-red-300 text-center text-sm">{error}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          {status === 'listening' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopAndSend}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg"
              data-testid="voice-send-btn"
            >
              <Sparkles className="w-5 h-5" />
              Envoyer
            </motion.button>
          )}
          
          {status === 'success' && (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNewConversation}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Nouvelle question
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGoHome}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Retour
              </motion.button>
            </>
          )}
          
          {(status === 'error' || status === 'initializing') && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startListening}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              {permissionGranted === false ? "Réessayer" : "Démarrer"}
            </motion.button>
          )}
        </div>
      </div>

      {/* Footer Hint */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center z-10">
        <p className="text-neutral-600 text-sm">
          {status === 'listening' && '💡 Dis "Terminé" ou attends 3 secondes pour envoyer'}
          {status === 'processing' && '🧠 Analyse en cours...'}
          {status === 'success' && '✨ L\'IA a répondu !'}
        </p>
      </div>
    </div>
  );
};

export default VoiceAssistant;
