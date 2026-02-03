import { useState } from 'react';
import { callOpenRouter } from './useAI';

export const useContentClassifier = () => {
  const [loading, setLoading] = useState(false);

  const classifyContent = async (text) => {
    setLoading(true);
    try {
      const prompt = `Analyse ce texte et détermine s'il s'agit d'une tâche à faire, d'un événement à planifier, ou d'une note de réunion. Réponds uniquement en JSON avec ce format exact :
{
  "type": "task"|"event"|"meeting_note",
  "confidence": 0.0-1.0,
  "title": "titre court et précis",
  "description": "description complète si nécessaire",
  "priority": "high"|"medium"|"low" (pour les tâches),
  "start_time": "ISO datetime string" (pour les événements),
  "end_time": "ISO datetime string" (pour les événements),
  "participants": ["email1", "email2"] (pour les réunions)
}

Texte à analyser : "${text}"`;

      const response = await callOpenRouter(prompt);
      const result = JSON.parse(response);

      return result;
    } catch (error) {
      console.error('Erreur de classification:', error);
      // Fallback: traiter comme une tâche
      return {
        type: 'task',
        confidence: 0.5,
        title: text,
        description: text,
        priority: 'medium'
      };
    } finally {
      setLoading(false);
    }
  };

  return { classifyContent, loading };
};