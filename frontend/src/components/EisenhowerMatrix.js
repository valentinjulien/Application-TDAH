import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../hooks/useTasks';
import { useAIDecompose } from '../hooks/useAI';
import TimeBlockingModal from './TimeBlockingModal';
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Trash2,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';

const EisenhowerMatrix = () => {
  const { tasks, loading, error, updateTask, deleteTask } = useTasks();
  const { decompose, loading: loadingSteps } = useAIDecompose();
  const [expanded, setExpanded] = useState({ 1: true, 2: true, 3: false, 4: false });
  const [decomposeModal, setDecomposeModal] = useState(null);
  const [microSteps, setMicroSteps] = useState([]);
  const [timeBlockingTask, setTimeBlockingTask] = useState(null);

  const quadrants = [
    {
      id: 1,
      title: 'Urgent & Important',
      subtitle: 'Faire maintenant',
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      headerBg: 'bg-red-500',
      iconColor: 'text-red-500',
      description: 'Ces tâches ne peuvent pas attendre'
    },
    {
      id: 2,
      title: 'Important, pas Urgent',
      subtitle: 'Planifier',
      icon: Clock,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      headerBg: 'bg-amber-500',
      iconColor: 'text-amber-500',
      description: 'Planifie du temps pour celles-ci'
    },
    {
      id: 3,
      title: 'Urgent, pas Important',
      subtitle: 'Déléguer',
      icon: UserCheck,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      headerBg: 'bg-blue-500',
      iconColor: 'text-blue-500',
      description: 'Quelqu\'un peut t\'aider ?'
    },
    {
      id: 4,
      title: 'Ni Urgent ni Important',
      subtitle: 'Éliminer',
      icon: Trash2,
      bgColor: 'bg-neutral-50 dark:bg-neutral-800/50',
      borderColor: 'border-neutral-200 dark:border-neutral-700',
      headerBg: 'bg-neutral-500',
      iconColor: 'text-neutral-500',
      description: 'Vraiment nécessaire ?'
    }
  ];

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleComplete = async (taskId) => {
    try {
      await updateTask(taskId, { completed: true });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const decomposeTask = async (task) => {
    setDecomposeModal(task);
    setMicroSteps([]);
    
    try {
      const result = await decompose(task.text);
      setMicroSteps(result.steps || []);
    } catch (error) {
      console.error('Error decomposing task:', error);
      setMicroSteps(['Erreur lors de la génération des étapes']);
    }
  };

  const getTasksByQuadrant = (quadrantId) => {
    return tasks.filter(t => t.quadrant === quadrantId && !t.completed);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="card p-8 text-center">
            <div className="loading-spinner mx-auto mb-4 text-primary-500" />
            <p className="text-neutral-500">Chargement de ta matrice...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Matrice Eisenhower 🎯
          </h1>
          <p className="text-neutral-500">
            Priorise tes tâches selon leur urgence et importance
          </p>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {quadrants.map((quadrant) => {
            const Icon = quadrant.icon;
            const quadrantTasks = getTasksByQuadrant(quadrant.id);
            const isExpanded = expanded[quadrant.id];

            return (
              <motion.div
                key={quadrant.id}
                layout
                className={`rounded-2xl border-2 overflow-hidden transition-all ${quadrant.bgColor} ${quadrant.borderColor}`}
              >
                {/* Quadrant Header */}
                <div className={`${quadrant.headerBg} text-white p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{quadrant.title}</h3>
                        <p className="text-sm opacity-90">{quadrant.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                        {quadrantTasks.length}
                      </span>
                      <button
                        onClick={() => toggleExpand(quadrant.id)}
                        className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs opacity-75 mt-2">{quadrant.description}</p>
                </div>

                {/* Quadrant Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="p-4"
                    >
                      {quadrantTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <Icon className={`w-12 h-12 mx-auto mb-2 ${quadrant.iconColor} opacity-30`} />
                          <p className="text-sm text-neutral-500">
                            Aucune tâche ici 🎉
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {quadrantTasks.map((task, index) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-soft border border-neutral-100 dark:border-neutral-700 group"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleComplete(task.id)}
                                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 hover:border-accent-500 hover:bg-accent-50 transition-colors flex-shrink-0"
                                  data-testid={`complete-task-${task.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                                    {task.text}
                                  </p>
                                  {task.priority && (
                                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                                    }`}>
                                      {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setTimeBlockingTask(task)}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500"
                                    title="Planifier dans le calendrier"
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => decomposeTask(task)}
                                    className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-500"
                                    title="Décomposer en micro-étapes"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Decompose Modal */}
        <AnimatePresence>
          {decomposeModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setDecomposeModal(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white dark:bg-neutral-900 rounded-2xl z-50 overflow-hidden shadow-large"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-neutral-900 dark:text-white">
                          Micro-étapes
                        </h3>
                        <p className="text-sm text-neutral-500 truncate max-w-[200px]">
                          {decomposeModal.text}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDecomposeModal(null)}
                      className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <X className="w-5 h-5 text-neutral-500" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {loadingSteps ? (
                    <div className="text-center py-8">
                      <div className="loading-spinner mx-auto mb-4 text-primary-500" />
                      <p className="text-neutral-500">L'IA découpe ta tâche...</p>
                      <p className="text-sm text-neutral-400 mt-1">Ça arrive 🚀</p>
                    </div>
                  ) : microSteps.length > 0 ? (
                    <div className="space-y-3">
                      {microSteps.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {step}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-neutral-500 py-8">
                      Aucune étape générée
                    </p>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <button
                    onClick={() => setDecomposeModal(null)}
                    className="btn-primary w-full"
                  >
                    C'est parti ! 🚀
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Time Blocking Modal */}
        <AnimatePresence>
          {timeBlockingTask && (
            <TimeBlockingModal
              task={timeBlockingTask}
              onClose={() => setTimeBlockingTask(null)}
              onScheduled={async (taskWithSchedule) => {
                try {
                  await updateTask(taskWithSchedule.id, {
                    scheduled_at: taskWithSchedule.scheduled_at,
                    estimated_total_minutes: taskWithSchedule.estimated_total_minutes,
                    energy_required: taskWithSchedule.energy_required,
                  });
                } catch (error) {
                  console.error('Error scheduling task:', error);
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default EisenhowerMatrix;
