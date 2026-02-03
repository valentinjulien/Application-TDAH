import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useAIMeetingSummary } from '../hooks/useAI';
import { useLocation } from 'react-router-dom';

const MeetingAssistant = () => {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [nextSteps, setNextSteps] = useState([]);
  const { addTask } = useTasks();
  const { summarize, loading } = useAIMeetingSummary();
  const location = useLocation();

  // Vérifier si on arrive avec des données du Quick Capture
  useEffect(() => {
    const state = location.state;
    if (state && state.meetingNote) {
      setNotes(state.meetingNote);
      // Générer automatiquement le résumé
      handleGenerateFromNote(state.meetingNote);
    }
  }, [location]);

  const handleGenerate = async () => {
    if (notes.trim()) {
      const result = await summarize(notes);
      setSummary(result.summary);
      setNextSteps(result.nextSteps);
    }
  };

  const handleGenerateFromNote = async (note) => {
    if (note.trim()) {
      const result = await summarize(note);
      setSummary(result.summary);
      setNextSteps(result.nextSteps);
    }
  };

  const addNextStep = async (step) => {
    const newTask = { text: step, priority: 'high', quadrant: 1 };
    await addTask(newTask);
  };

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-3xl font-bold text-dark mb-8">IA Meeting Assistant</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Collez vos notes de réunion ici..."
        className="w-full h-64 p-4 border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-4"
      />
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-accent text-dark px-6 py-2 rounded-lg hover:bg-primary transition mb-8"
      >
        {loading ? 'Génération...' : 'Générer Résumé'}
      </button>
      {summary && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Résumé (TL;DR)</h3>
          <p className="bg-secondary p-4 rounded">{summary}</p>
        </div>
      )}
      {nextSteps.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Next Steps</h3>
          <ul>
            {nextSteps.map((step, index) => (
              <li key={index} className="flex justify-between items-center p-2 bg-light rounded mb-2">
                <span>{step}</span>
                <button
                  onClick={() => addNextStep(step)}
                  className="bg-accent text-dark px-4 py-1 rounded hover:bg-primary"
                >
                  Ajouter à Tâches
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MeetingAssistant;