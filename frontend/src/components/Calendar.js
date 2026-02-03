import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useEvents } from '../hooks/useEvents';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useAICreateEvent } from '../hooks/useAI';

const Calendar = () => {
  const { tasks } = useTasks();
  const { events: dbEvents, addEvent } = useEvents();
  const { events: googleEvents, isConnected, createEvent } = useGoogleCalendar();
  const { createEvent: aiCreateEvent, loading: aiLoading } = useAICreateEvent();
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    // Merge local schedule with DB and Google events
    setSchedule([...schedule, ...dbEvents, ...googleEvents]);
  }, [dbEvents, googleEvents, isConnected]);

  // Simuler ajout au calendrier avec buffer
  const addToCalendar = async (task) => {
    const aiEventData = await aiCreateEvent({ task: task.text, priority: task.priority });
    if (aiEventData) {
      try {
        await addEvent(aiEventData);
        // Also create in Google if connected
        if (isConnected) {
          await createEvent(aiEventData);
        }
      } catch (error) {
        console.error('Erreur création événement:', error);
      }
    } else {
      // Fallback to local
      const newEntry = { title: task.text, start: new Date(), end: new Date(Date.now() + 3600000), buffer: 15 };
      await addEvent(newEntry);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-3xl font-bold text-dark mb-8">Calendrier à Temps Fluide</h2>
      {!isConnected && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Connectez-vous à Google Calendar dans les paramètres pour synchroniser vos événements.
        </div>
      )}
      <div className="mb-8">
        <h3 className="text-xl mb-4">Tâches à planifier</h3>
        {tasks.map(task => (
          <div key={task.id} className="flex justify-between items-center p-2 bg-secondary rounded mb-2">
            <span>{task.text}</span>
            <button
              onClick={() => addToCalendar(task)}
              disabled={aiLoading}
              className="bg-accent text-dark px-4 py-1 rounded hover:bg-primary disabled:opacity-50"
            >
              {aiLoading ? 'Création...' : 'Ajouter'}
            </button>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-xl mb-4">Planning</h3>
        {schedule.map((entry, index) => (
          <div key={entry.id || index} className="p-2 bg-light rounded mb-2">
            <p>{entry.title || entry.text}</p>
            <p>Début: {new Date(entry.start).toLocaleTimeString()} - Fin: {new Date(entry.end).toLocaleTimeString()} {entry.buffer ? `(Buffer: ${entry.buffer}min)` : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;