import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import { useTasks } from '../hooks/useTasks';
import { callOpenRouter } from '../hooks/useAI';
import { X, Sun, Moon, Sparkles, Target, CheckCircle, Brain, ArrowRight } from 'lucide-react';

// Check if we should show the gazette/review
export const shouldShowMorningGazette = () => {
  const hour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('lastMorningGazette');
  return hour >= 7 && hour < 11 && lastShown !== today;
};

export const shouldShowEveningReview = () => {
  const hour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('lastEveningReview');
  return hour >= 20 && hour < 24 && lastShown !== today;
};

// Morning Gazette Component
export const MorningGazette = ({ onClose }) => {
  const { user } = useUser();
  const { tasks } = useTasks();
  const [step, setStep] = useState('greeting'); // greeting, tasks, goal, complete
  const [dailyGoal, setDailyGoal] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingTasks = tasks.filter(t => !t.completed);
  const urgentTasks = pendingTasks.filter(t => t.quadrant === 1);
  const importantTasks = pendingTasks.filter(t => t.quadrant === 2);

  useEffect(() => {
    generateAISuggestion();
  }, []);

  const generateAISuggestion = async () => {
    setLoading(true);
    try {
      const taskList = pendingTasks.slice(0, 5).map(t => t.text).join(', ');
      const prompt = `En tant que coach TDAH bienveillant, suggère UN objectif réaliste et motivant pour aujourd'hui basé sur ces tâches: ${taskList || 'aucune tâche'}. Réponds en 1-2 phrases maximum, de façon encourageante et simple.`;
      const response = await callOpenRouter(prompt);
      setAiSuggestion(response);
    } catch (error) {
      setAiSuggestion('Choisis une seule chose importante à accomplir aujourd\'hui. Tu peux le faire ! 💪');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('lastMorningGazette', new Date().toISOString().split('T')[0]);
    if (dailyGoal) {
      localStorage.setItem('todayGoal', dailyGoal);
    }
    onClose();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name?.split(' ')[0] || 'toi';
    if (hour < 9) return `Bonjour ${name} ! ☀️`;
    if (hour < 11) return `Hey ${name} ! 🌤️`;
    return `Bonne matinée ${name} !`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-xl" />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gazette du Matin</h2>
                <p className="text-amber-100 text-sm">Ton briefing quotidien</p>
              </div>
            </div>
            <button onClick={handleComplete} className="p-2 rounded-full hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'greeting' && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-4"
              >
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                  {getGreeting()}
                </h3>
                <p className="text-neutral-500 mb-6">
                  Prêt(e) à conquérir cette journée ?
                </p>
                <button
                  onClick={() => setStep('tasks')}
                  className="btn-primary"
                >
                  C'est parti ! <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {step === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Ton radar du jour
                </h3>

                <div className="space-y-3 mb-6">
                  {urgentTasks.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        🔥 {urgentTasks.length} tâche{urgentTasks.length > 1 ? 's' : ''} urgente{urgentTasks.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                        {urgentTasks[0]?.text}
                      </p>
                    </div>
                  )}

                  {importantTasks.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        ⭐ {importantTasks.length} tâche{importantTasks.length > 1 ? 's' : ''} importante{importantTasks.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {pendingTasks.length === 0 && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        ✨ Aucune tâche en attente ! Journée libre.
                      </p>
                    </div>
                  )}
                </div>

                <button onClick={() => setStep('goal')} className="btn-primary w-full">
                  Définir mon objectif <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {step === 'goal' && (
              <motion.div
                key="goal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Ton objectif du jour
                </h3>

                {/* AI Suggestion */}
                <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 mb-4">
                  <p className="text-xs text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Suggestion IA
                  </p>
                  {loading ? (
                    <div className="animate-pulse h-4 bg-primary-200 dark:bg-primary-800 rounded w-3/4" />
                  ) : (
                    <p className="text-sm text-primary-700 dark:text-primary-300">{aiSuggestion}</p>
                  )}
                </div>

                <textarea
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  placeholder="Mon objectif principal aujourd'hui..."
                  className="input mb-4 resize-none"
                  rows={2}
                />

                <button onClick={handleComplete} className="btn-primary w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  C'est parti !
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Evening Review Component
export const EveningReview = ({ onClose }) => {
  const { user } = useUser();
  const { tasks } = useTasks();
  const [step, setStep] = useState('greeting'); // greeting, review, dump, complete
  const [brainDump, setBrainDump] = useState('');
  const [mood, setMood] = useState(null);

  const todayGoal = localStorage.getItem('todayGoal');
  const completedToday = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.completed && t.updated_at?.startsWith(today);
  });

  const handleComplete = () => {
    localStorage.setItem('lastEveningReview', new Date().toISOString().split('T')[0]);
    localStorage.removeItem('todayGoal');
    onClose();
  };

  const moods = [
    { emoji: '😫', label: 'Épuisé(e)', value: 1 },
    { emoji: '😐', label: 'Bof', value: 2 },
    { emoji: '🙂', label: 'Correct', value: 3 },
    { emoji: '😊', label: 'Bien', value: 4 },
    { emoji: '🤩', label: 'Super !', value: 5 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl" />
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Revue du Soir</h2>
                <p className="text-indigo-200 text-sm">Vide ton esprit avant de dormir</p>
              </div>
            </div>
            <button onClick={handleComplete} className="p-2 rounded-full hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'greeting' && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-4"
              >
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Bonne soirée ! 🌙
                </h3>
                <p className="text-neutral-500 mb-6">
                  Prenons un moment pour décompresser
                </p>
                <button
                  onClick={() => setStep('review')}
                  className="btn-primary bg-indigo-500 hover:bg-indigo-600"
                >
                  Commencer <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  📊 Bilan du jour
                </h3>

                {todayGoal && (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 mb-4">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Objectif du jour</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">{todayGoal}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-4">
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    ✅ {completedToday.length} tâche{completedToday.length > 1 ? 's' : ''} terminée{completedToday.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    {completedToday.length === 0 ? 'Demain est un nouveau jour !' : 'Bravo pour tes efforts !'}
                  </p>
                </div>

                {/* Mood selector */}
                <p className="text-sm text-neutral-500 mb-3">Comment tu te sens ?</p>
                <div className="flex justify-between mb-6">
                  {moods.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                        mood === m.value 
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 scale-110' 
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-xs text-neutral-500 mt-1">{m.label}</span>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setStep('dump')} 
                  className="btn-primary w-full bg-indigo-500 hover:bg-indigo-600"
                >
                  Continuer <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            )}

            {step === 'dump' && (
              <motion.div
                key="dump"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                  🧠 Brain Dump
                </h3>
                <p className="text-sm text-neutral-500 mb-4">
                  Note tout ce qui te passe par la tête pour dormir l'esprit tranquille
                </p>

                <textarea
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  placeholder="Pensées, idées, inquiétudes, todo de demain..."
                  className="input mb-4 resize-none"
                  rows={4}
                />

                <button 
                  onClick={handleComplete} 
                  className="btn-primary w-full bg-indigo-500 hover:bg-indigo-600"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Bonne nuit !
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default { MorningGazette, EveningReview, shouldShowMorningGazette, shouldShowEveningReview };
