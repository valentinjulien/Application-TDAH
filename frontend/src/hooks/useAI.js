import { useState } from 'react';

// API URL - use relative path to go through same origin
const API_URL = '';

// Centralized API call function for AI endpoints
const callAIEndpoint = async (endpoint, data) => {
  const response = await fetch(`${API_URL}/api/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }
  
  return response.json();
};

// Legacy function for components that still use it directly
export const callOpenRouter = async (prompt) => {
  try {
    const response = await callAIEndpoint('chat', { message: prompt });
    return response.message || JSON.stringify(response);
  } catch (error) {
    console.error('AI call error:', error);
    throw error;
  }
};

export const useAIClassification = () => {
  const [loading, setLoading] = useState(false);

  const classify = async (text) => {
    setLoading(true);
    try {
      const result = await callAIEndpoint('classify', { message: text });
      return result;
    } catch (error) {
      console.error('Classification error:', error);
      return { priority: 'medium', quadrant: 2 };
    } finally {
      setLoading(false);
    }
  };

  return { classify, loading };
};

export const useAIDecompose = () => {
  const [loading, setLoading] = useState(false);

  const decompose = async (taskText) => {
    setLoading(true);
    try {
      const result = await callAIEndpoint('decompose', { task_text: taskText });
      return result;
    } catch (error) {
      console.error('Decompose error:', error);
      return { steps: ['Erreur lors de la génération des étapes'] };
    } finally {
      setLoading(false);
    }
  };

  return { decompose, loading };
};

export const useAITaskWeight = () => {
  const [loading, setLoading] = useState(false);

  const calculateWeight = async (taskText) => {
    setLoading(true);
    try {
      const result = await callAIEndpoint('task-weight', { task_text: taskText });
      return result;
    } catch (error) {
      console.error('Task weight error:', error);
      return {
        estimated_minutes: 30,
        estimated_total_minutes: 36,
        energy_required: 'medium',
        energy_emoji: '⚡',
        energy_label: 'Focus',
        hidden_subtasks: [],
        reasoning: 'Estimation par défaut'
      };
    } finally {
      setLoading(false);
    }
  };

  return { calculateWeight, loading };
};

export const useAIMeetingSummary = () => {
  const [loading, setLoading] = useState(false);

  const summarize = async (notes) => {
    setLoading(true);
    try {
      const response = await callAIEndpoint('chat', { 
        message: `Résume cette réunion en TL;DR et liste les next steps actionnables. Notes : ${notes}`,
        action: 'question'
      });
      // Try to parse if it's JSON
      try {
        const parsed = JSON.parse(response.message);
        return parsed;
      } catch {
        return { summary: response.message, nextSteps: [] };
      }
    } catch (error) {
      console.error('Summary error:', error);
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
      const response = await callAIEndpoint('chat', { 
        message: `Crée un événement Google Calendar basé sur ces données : ${JSON.stringify(data)}. Réponds en JSON : {"title": "string", "description": "string", "start": "ISO date string", "end": "ISO date string"}.`,
        action: 'question'
      });
      try {
        return JSON.parse(response.message);
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Create event error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createEvent, loading };
};