import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { callOpenRouter } from '../hooks/useAI';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const EisenhowerMatrix = () => {
  const { tasks, loading, error, updateTask } = useTasks();
  const [expanded, setExpanded] = useState({ 1: true }); // Quadrant 1 ouvert par défaut
  const [decomposeModal, setDecomposeModal] = useState(null);
  const [microSteps, setMicroSteps] = useState([]);
  const [completingTask, setCompletingTask] = useState(null);

  const quadrants = {
    1: {
      title: 'Urgent & Important',
      subtitle: 'Faire maintenant',
      tasks: tasks.filter(t => t.quadrant === 1),
      color: 'bg-danger/10 border-danger/20',
      headerColor: 'bg-danger-500',
      icon: ExclamationTriangleIcon,
      description: 'Tâches critiques qui nécessitent une attention immédiate'
    },
    2: {
      title: 'Important, pas Urgent',
      subtitle: 'Planifier',
      tasks: tasks.filter(t => t.quadrant === 2),
      color: 'bg-secondary/10 border-secondary/20',
      headerColor: 'bg-secondary-500',
      icon: ClockIcon,
      description: 'Tâches importantes à programmer dans le temps'
    },
    3: {
      title: 'Urgent, pas Important',
      subtitle: 'Déléguer',
      tasks: tasks.filter(t => t.quadrant === 3),
      color: 'bg-warning/10 border-warning/20',
      headerColor: 'bg-warning',
      icon: ArrowPathIcon,
      description: 'Tâches urgentes que d\'autres peuvent faire'
    },
    4: {
      title: 'Ni Urgent ni Important',
      subtitle: 'Éliminer',
      tasks: tasks.filter(t => t.quadrant === 4),
      color: 'bg-neutral-100 border-neutral-200',
      headerColor: 'bg-neutral-500',
      icon: XMarkIcon,
      description: 'Tâches à supprimer ou minimiser'
    },
  };

  const toggleQuadrant = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const decomposeTask = async (task) => {
    setDecomposeModal(task);
    try {
      const prompt = `Décompose cette tâche en micro-étapes actionnables pour TDAH : ${task.text}. Réponds en JSON : {"steps": ["étape1", "étape2", "étape3", "étape4", "étape5"]}`;
      const response = await callOpenRouter(prompt);
      const parsed = JSON.parse(response);
      setMicroSteps(parsed.steps);
    } catch (error) {
      setMicroSteps(['Erreur de génération des micro-étapes']);
    }
  };

  const completeTask = async (taskId) => {
    setCompletingTask(taskId);
    try {
      await updateTask(taskId, { completed: true });
    } catch (error) {
      console.error('Erreur lors de la completion:', error);
    } finally {
      setCompletingTask(null);
    }
  };

  const moveTask = async (taskId, newQuadrant) => {
    try {
      await updateTask(taskId, { quadrant: newQuadrant });
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <div className="loading-spinner mr-3"></div>
            <span>Chargement de la matrice...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="error-message">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>Erreur lors du chargement des tâches</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-neutral-900">
                Matrice Eisenhower
              </h2>
              <p className="text-sm text-neutral-600">
                Priorisez vos tâches selon leur urgence et importance
              </p>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(quadrants).map(([key, quad]) => {
              const Icon = quad.icon;
              const isExpanded = expanded[key];
              const taskCount = quad.tasks.length;

              return (
                <div
                  key={key}
                  className={`rounded-2xl border-2 transition-all duration-200 hover:shadow-medium ${quad.color}`}
                >
                  {/* Header du quadrant */}
                  <div className={`p-4 rounded-t-2xl ${quad.headerColor} text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{quad.title}</h3>
                          <p className="text-xs opacity-90">{quad.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                          {taskCount}
                        </span>
                        <button
                          onClick={() => toggleQuadrant(key)}
                          className="w-6 h-6 bg-white/20 rounded flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs opacity-75 mt-2">{quad.description}</p>
                  </div>

                  {/* Contenu du quadrant */}
                  {isExpanded && (
                    <div className="p-4">
                      {taskCount === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                          <Icon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucune tâche dans ce quadrant</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {quad.tasks.map(task => (
                            <div
                              key={task.id}
                              className="bg-white rounded-xl p-4 shadow-soft border border-neutral-200 hover:shadow-medium transition-all duration-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-neutral-900 mb-1">
                                    {task.text}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    {task.priority && (
                                      <span className={`badge ${
                                        task.priority === 'high' ? 'badge-danger' :
                                        task.priority === 'medium' ? 'badge-warning' :
                                        'badge-success'
                                      }`}>
                                        {task.priority === 'high' ? 'Haute' :
                                         task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                      </span>
                                    )}
                                    {task.completed && (
                                      <span className="badge-success">
                                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                                        Terminée
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-1 ml-3">
                                  {!task.completed && (
                                    <button
                                      onClick={() => completeTask(task.id)}
                                      disabled={completingTask === task.id}
                                      className="p-1 text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                                      title="Marquer comme terminée"
                                    >
                                      {completingTask === task.id ? (
                                        <div className="loading-spinner w-4 h-4"></div>
                                      ) : (
                                        <CheckCircleIcon className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}

                                  <button
                                    onClick={() => decomposeTask(task)}
                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Décomposer en micro-étapes"
                                  >
                                    <SparklesIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Décomposer */}
      {decomposeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-large">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-neutral-900">
                      Micro-étapes
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Décomposition de : {decomposeModal.text}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDecomposeModal(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {microSteps.length > 0 ? (
                <div className="space-y-3">
                  {microSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-neutral-700 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="loading-spinner mx-auto mb-3"></div>
                  <p className="text-neutral-600">Génération des micro-étapes...</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200 bg-neutral-50">
              <button
                onClick={() => setDecomposeModal(null)}
                className="btn-primary w-full"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EisenhowerMatrix;