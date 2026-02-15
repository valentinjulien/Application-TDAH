/**
 * Hook personnalisé pour la détection du wake word "hey assistant" avec Picovoice Porcupine
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePorcupine } from '@picovoice/porcupine-react';

// Wake words intégrés disponibles dans Porcupine
const BUILT_IN_KEYWORDS = {
  'alexa': { publicPath: '/porcupine/alexa_wasm.ppn', label: 'alexa' },
  'hey google': { publicPath: '/porcupine/hey google_wasm.ppn', label: 'hey google' },
  'ok google': { publicPath: '/porcupine/ok google_wasm.ppn', label: 'ok google' },
  'computer': { publicPath: '/porcupine/computer_wasm.ppn', label: 'computer' },
  'jarvis': { publicPath: '/porcupine/jarvis_wasm.ppn', label: 'jarvis' },
  'picovoice': { publicPath: '/porcupine/picovoice_wasm.ppn', label: 'picovoice' },
  'porcupine': { publicPath: '/porcupine/porcupine_wasm.ppn', label: 'porcupine' },
  'bumblebee': { publicPath: '/porcupine/bumblebee_wasm.ppn', label: 'bumblebee' },
  'terminator': { publicPath: '/porcupine/terminator_wasm.ppn', label: 'terminator' },
};

// Configuration par défaut - utiliser "hey google" comme fallback
const DEFAULT_KEYWORD = 'hey google';

export function usePorcupineWakeWord({ 
  onWakeWordDetected, 
  enabled = true,
  keyword = DEFAULT_KEYWORD 
}) {
  const [accessKey, setAccessKey] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [porcupineSupported, setPorcupineSupported] = useState(true);
  const initAttemptedRef = useRef(false);
  const callbackRef = useRef(onWakeWordDetected);
  
  // Garder la référence du callback à jour
  useEffect(() => {
    callbackRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const {
    keywordDetection,
    isLoaded,
    isListening,
    error: porcupineError,
    init,
    start,
    stop,
    release,
  } = usePorcupine();

  // Récupérer la clé d'accès depuis le backend
  useEffect(() => {
    const fetchAccessKey = async () => {
      try {
        const response = await fetch('/api/porcupine/access-key');
        if (response.ok) {
          const data = await response.json();
          setAccessKey(data.accessKey);
        } else {
          console.log('Porcupine access key not configured, using fallback');
          setPorcupineSupported(false);
        }
      } catch (err) {
        console.log('Could not fetch Porcupine key:', err);
        setPorcupineSupported(false);
      }
    };

    if (enabled) {
      fetchAccessKey();
    }
  }, [enabled]);

  // Initialiser Porcupine quand on a la clé
  useEffect(() => {
    if (!accessKey || !enabled || initAttemptedRef.current || !porcupineSupported) return;

    const initPorcupine = async () => {
      initAttemptedRef.current = true;
      
      try {
        // Utiliser le wake word intégré "hey google" comme fallback
        // Pour un wake word personnalisé, il faudrait un fichier .ppn entraîné
        const keywordConfig = BUILT_IN_KEYWORDS[keyword] || BUILT_IN_KEYWORDS[DEFAULT_KEYWORD];
        
        // Modèle de langue (anglais par défaut car les wake words intégrés sont en anglais)
        const modelConfig = {
          publicPath: '/porcupine/porcupine_params.pv',
        };

        await init(
          accessKey,
          keywordConfig,
          modelConfig
        );
        
        setIsReady(true);
        console.log('Porcupine initialized successfully');
      } catch (err) {
        console.error('Failed to initialize Porcupine:', err);
        setError(err.message);
        setPorcupineSupported(false);
      }
    };

    initPorcupine();
  }, [accessKey, enabled, init, keyword, porcupineSupported]);

  // Démarrer l'écoute quand prêt
  useEffect(() => {
    if (isLoaded && isReady && enabled && !isListening) {
      start().catch(err => {
        console.error('Failed to start Porcupine:', err);
        setError(err.message);
      });
    }
  }, [isLoaded, isReady, enabled, isListening, start]);

  // Détecter le wake word
  useEffect(() => {
    if (keywordDetection !== null) {
      console.log('Wake word detected!', keywordDetection);
      if (callbackRef.current) {
        callbackRef.current();
      }
    }
  }, [keywordDetection]);

  // Gérer les erreurs Porcupine
  useEffect(() => {
    if (porcupineError) {
      console.error('Porcupine error:', porcupineError);
      setError(porcupineError.message || porcupineError);
    }
  }, [porcupineError]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (isListening) {
        stop().catch(() => {});
      }
      release().catch(() => {});
    };
  }, []);

  // Fonctions de contrôle
  const startListening = useCallback(async () => {
    if (isLoaded && !isListening) {
      try {
        await start();
      } catch (err) {
        setError(err.message);
      }
    }
  }, [isLoaded, isListening, start]);

  const stopListening = useCallback(async () => {
    if (isListening) {
      try {
        await stop();
      } catch (err) {
        setError(err.message);
      }
    }
  }, [isListening, stop]);

  return {
    isReady,
    isListening,
    error,
    porcupineSupported,
    startListening,
    stopListening,
  };
}

export default usePorcupineWakeWord;
