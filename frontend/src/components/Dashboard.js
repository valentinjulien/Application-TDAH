import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useEvents } from '../hooks/useEvents';
import { useAIClassification } from '../hooks/useAI';
import { useContentClassifier } from '../hooks/useContentClassifier';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import EisenhowerMatrix from './EisenhowerMatrix';
import ChatBot from './ChatBot';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const Dashboard = () => {
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask } = useTasks();
  const { addEvent } = useEvents();
  const { classify, loading: classifyLoading } = useAIClassification();
  const { classifyContent, loading: classifierLoading } = useContentClassifier();
  const { isConnected: calendarConnected, events: googleEvents, createEvent } = useGoogleCalendar();
  const { requestPermission, scheduleNotification } = useNotifications();

  // Vérifier l'état d'authentification
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Simuler agenda du jour
  const todayEvents = [
    { id: 1, title: 'Réunion équipe', start: '10:00', end: '11:00', buffer: 15 },
    { id: 2, title: 'Pause', start: '11:00', end: '11:15', isBuffer: true },
  ];

  useEffect(() => {
    // Request notification permission
    requestPermission();
  }, [requestPermission]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!isAuthenticated) {
      setLastAction({
        type: 'error',
        message: 'Veuillez vous connecter d\'abord dans les Paramètres'
      });
      setTimeout(() => setLastAction(null), 5000);
      return;
    }

    try {
      const classification = await classify(input);

      if (classification.type === 'task') {
        await handleTaskSubmission(input, classification);
      } else if (classification.type === 'event') {
        await handleEventSubmission(input, classification);
      } else if (classification.type === 'meeting_note') {
        await handleMeetingNoteSubmission(input, classification);
      }

      setInput('');
    } catch (error) {
      console.error('Erreur lors de la classification:', error);
      setLastAction({
        type: 'error',
        message: 'Erreur lors du traitement. Réessayez.'
      });
      setTimeout(() => setLastAction(null), 5000);
    }
  };

  const handleTaskSubmission = async (text, classification) => {
    const taskData = {
      text: classification.title,
      priority: classification.priority || 'medium',
      quadrant: classification.quadrant || 1,
    };

    await addTask(taskData);

    setLastAction({
      type: 'task',
      message: `Tâche ajoutée au quadrant ${classification.quadrant || 1}`
    });
    setTimeout(() => setLastAction(null), 3000);
  };

  const handleEventSubmission = async (text, classification) => {
    const eventData = {
      title: classification.title,
      description: classification.description,
      start_time: classification.start_time,
      end_time: classification.end_time,
      priority: classification.priority || 'medium',
    };

    await addEvent(eventData);

    // Créer aussi dans Google Calendar si connecté
    if (calendarConnected) {
      try {
        await createEvent({
          title: classification.title,
          description: classification.description,
          start: classification.start_time,
          end: classification.end_time,
        });
      } catch (error) {
        console.error('Erreur Google Calendar:', error);
      }
    }

    setLastAction({
      type: 'event',
      message: 'Événement ajouté au calendrier'
    });
    setTimeout(() => navigate('/calendar'), 1000);
  };

  const handleMeetingNoteSubmission = async (text, classification) => {
    // Pour l'instant, on crée une tâche spéciale et on redirige vers l'assistant de réunion
    const meetingTask = {
      text: `Note de réunion: ${classification.title}`,
      priority: 'high',
      quadrant: 1, // Toujours quadrant 1 pour les réunions
    };

    await addTask(meetingTask);

    // Rediriger vers l'assistant de réunion avec les données
    navigate('/meeting', {
      state: {
        meetingNote: text,
        title: classification.title,
        participants: classification.participants
      }
    });
  };

  const createTestData = async () => {
    try {
      // Vérifier si l'utilisateur est connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLastAction({
          type: 'error',
          message: 'Veuillez vous connecter d\'abord dans les Paramètres'
        });
        setTimeout(() => setLastAction(null), 5000);
        return;
      }

      // Créer des tâches de test
      const testTasks = [
        { text: 'Répondre aux emails urgents', priority: 'high', quadrant: 1 },
        { text: 'Préparer la réunion client', priority: 'high', quadrant: 1 },
        { text: 'Faire du sport cette semaine', priority: 'medium', quadrant: 2 },
        { text: 'Nettoyer le bureau', priority: 'low', quadrant: 4 },
      ];

      for (const task of testTasks) {
        await addTask(task);
      }

      setLastAction({
        type: 'success',
        message: 'Données de test créées avec succès !'
      });
      setTimeout(() => setLastAction(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la création des données de test:', error);
      setLastAction({
        type: 'error',
        message: 'Erreur lors de la création des données de test'
      });
      setTimeout(() => setLastAction(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header avec statistiques */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                Bonjour ! 👋
              </h1>
              <p className="text-neutral-600">
                Organisez votre journée avec l'IA
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Status de connexion */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isAuthenticated
                  ? 'bg-accent-100 text-accent-800'
                  : 'bg-secondary-100 text-secondary-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isAuthenticated ? 'bg-accent-500' : 'bg-secondary-500'
                }`}></div>
                <span>{isAuthenticated ? 'Connecté' : 'Non connecté'}</span>
              </div>

              {/* Status Google Calendar */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                calendarConnected
                  ? 'bg-accent-100 text-accent-800'
                  : 'bg-neutral-100 text-neutral-600'
              }`}>
                <CalendarIcon className="w-4 h-4" />
                <span>{calendarConnected ? 'Calendar OK' : 'Calendar off'}</span>
              </div>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Tâches aujourd'hui</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {tasks.filter(t => t.created_at?.startsWith(new Date().toISOString().split('T')[0])).length}
                    </p>
                  </div>
                  <ChartBarIcon className="w-8 h-8 text-primary-500" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Événements</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {todayEvents.filter(e => !e.isBuffer).length}
                    </p>
                  </div>
                  <CalendarIcon className="w-8 h-8 text-secondary-500" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Priorité haute</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {tasks.filter(t => t.priority === 'high').length}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-danger" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Complétées</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {tasks.filter(t => t.completed).length}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-accent-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Capture - Design amélioré */}
        <div className="card mb-8">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-neutral-900">
                  Quick Capture
                </h2>
                <p className="text-sm text-neutral-600">
                  Saisissez ce qui vous vient à l'esprit, l'IA s'occupe du reste
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Indicateur d'action récente */}
            {lastAction && (
              <div className={`mb-6 p-4 rounded-xl animate-fade-in ${
                lastAction.type === 'error'
                  ? 'error-message'
                  : lastAction.type === 'task'
                  ? 'success-message'
                  : lastAction.type === 'event'
                  ? 'bg-primary-50 border border-primary-200 text-primary-800'
                  : lastAction.type === 'meeting_note'
                  ? 'bg-secondary-50 border border-secondary-200 text-secondary-800'
                  : 'success-message'
              }`}>
                <div className="flex items-center space-x-2">
                  {lastAction.type === 'task' && <CheckCircleSolid className="w-5 h-5" />}
                  {lastAction.type === 'event' && <CalendarIcon className="w-5 h-5" />}
                  {lastAction.type === 'meeting_note' && <UserGroupIcon className="w-5 h-5" />}
                  {lastAction.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5" />}
                  <span className="font-medium">{lastAction.message}</span>
                </div>
              </div>
            )}

            {/* Message de connexion requise */}
            {!isAuthenticated && (
              <div className="warning-message mb-6">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Connexion requise</p>
                  <p>Pour utiliser Quick Capture, connectez-vous d'abord dans les <a href="/settings" className="underline hover:text-secondary-900">Paramètres</a>.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Saisissez votre tâche, événement ou note de réunion ici...

Exemples :
• "Préparer la réunion client demain à 14h"
• "Répondre aux emails urgents avant midi"
• "Réunion équipe : discuté du nouveau projet, décisions prises..."
• "Rappel : acheter du lait en rentrant"`}
                  className="input min-h-32 text-base resize-none"
                  disabled={!isAuthenticated}
                />
                {classifyLoading && (
                  <div className="absolute top-3 right-3">
                    <div className="loading-spinner"></div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={!input.trim() || !isAuthenticated || classifyLoading}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                >
                  {classifyLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Classification en cours...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5" />
                      <span>Envoyer à l'IA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceMode(!voiceMode)}
                  className={`btn-secondary flex items-center justify-center space-x-2 ${
                    voiceMode ? 'bg-secondary-100 text-secondary-800' : ''
                  }`}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                  <span>Voix</span>
                </button>

                <button
                  type="button"
                  onClick={createTestData}
                  disabled={!isAuthenticated}
                  className="btn-ghost text-sm"
                >
                  Données test
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Agenda du jour et Matrice Eisenhower */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agenda du jour */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-display font-semibold text-neutral-900">
                    Aujourd'hui
                  </h3>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {todayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg ${
                        event.isBuffer
                          ? 'bg-neutral-50 border border-neutral-200'
                          : 'bg-primary-50 border border-primary-200'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${
                        event.isBuffer ? 'bg-neutral-400' : 'bg-primary-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          event.isBuffer ? 'text-neutral-600' : 'text-neutral-900'
                        }`}>
                          {event.title}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {event.start} - {event.end}
                          {event.buffer && ` (+${event.buffer}min buffer)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Matrice Eisenhower */}
          <div className="lg:col-span-2">
            <EisenhowerMatrix />
          </div>
        </div>

        {/* ChatBot flottant */}
        <ChatBot />
      </div>
    </div>
  );
};

export default Dashboard;