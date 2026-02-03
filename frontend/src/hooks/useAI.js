import { useState } from 'react';

const Thotify = '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';
const MODEL = 'google/gemini-2.0-flash-exp:free';

const callOpenRouter = async (prompt) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Thotify}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error('Erreur API');
  }
  const data = await response.json();
  return data.choices[0].message.content;
};

export { callOpenRouter };

export const useAIClassification = () => {
  const [loading, setLoading] = useState(false);

  const classify = async (text) => {
    setLoading(true);
    try {
      const prompt = `Classifie cette tâche selon la matrice Eisenhower. Réponds uniquement en JSON : {"priority": "urgent"|"important"|"low", "quadrant": 1|2|3|4}. Tâche : ${text}`;
      const result = await callOpenRouter(prompt);
      const parsed = JSON.parse(result);
      return parsed;
    } catch (error) {
      console.error(error);
      return { priority: 'low', quadrant: 4 };
    } finally {
      setLoading(false);
    }
  };

  return { classify, loading };
};

export const useAIMeetingSummary = () => {
  const [loading, setLoading] = useState(false);

  const summarize = async (notes) => {
    setLoading(true);
    try {
      const prompt = `Résume cette réunion en TL;DR et liste les next steps actionnables. Réponds uniquement en JSON : {"summary": "string", "nextSteps": ["step1", "step2"]}. Notes : ${notes}`;
      const result = await callOpenRouter(prompt);
      const parsed = JSON.parse(result);
      return parsed;
    } catch (error) {
      console.error(error);
      return { summary: 'Erreur de génération', nextSteps: [] };
    } finally {
      setLoading(false);
    }
  };

  return { summarize, loading };
};

export const useAICreateEvent = () => {
  const [loading, setLoading] = useState(false);

  const createEvent = async (data) => {
    setLoading(true);
    try {
      const prompt = `Crée un événement Google Calendar basé sur ces données : ${JSON.stringify(data)}. Réponds uniquement en JSON : {"title": "string", "description": "string", "start": "ISO date string", "end": "ISO date string"}.`;
      const result = await callOpenRouter(prompt);
      const parsed = JSON.parse(result);
      return parsed;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createEvent, loading };
};