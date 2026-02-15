import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const EMERGENT_LLM_KEY = 'sk-emergent-932624d8e6b1152661';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface UseSpeechToTextReturn {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  cancelListening: () => void;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recording = useRef<Audio.Recording | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Autorisation du micro nécessaire. Veuillez activer le micro dans les paramètres.');
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = newRecording;
      setIsListening(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Impossible de démarrer l\'enregistrement. Vérifiez les permissions.');
    }
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    if (!recording.current) {
      return '';
    }

    setIsListening(false);
    setIsProcessing(true);

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Transcribe with Whisper
      const transcribedText = await transcribeAudio(uri);
      setTranscript(transcribedText);
      setIsProcessing(false);
      
      // Clean up the file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (e) {
        // Ignore cleanup errors
      }

      return transcribedText;
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Erreur lors de la transcription. Réessayez.');
      setIsProcessing(false);
      return '';
    }
  }, []);

  const cancelListening = useCallback(() => {
    if (recording.current) {
      recording.current.stopAndUnloadAsync().catch(() => {});
      recording.current = null;
    }
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}

async function transcribeAudio(uri: string): Promise<string> {
  // Read the file as base64
  const base64Audio = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Create form data for the API
  const formData = new FormData();
  
  // Convert base64 to blob
  const audioBlob = {
    uri: uri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  };

  formData.append('file', audioBlob as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr');
  formData.append('response_format', 'text');

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Whisper API error:', errorData);
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const text = await response.text();
  return text.trim();
}

export default useSpeechToText;
