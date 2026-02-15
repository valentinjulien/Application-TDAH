import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Calendar, Brain, Check, Loader, ChevronRight } from 'lucide-react';
import { calculateTaskWeight, findOptimalSlots, formatDuration } from '../services/captureService';

const TimeBlockingModal = ({ task, onClose, onScheduled }) => {
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (task) {
      analyzeTask();
    }
  }, [task]);

  const analyzeTask = async () => {
    setLoading(true);
    try {
      const taskWeight = await calculateTaskWeight(task.text);
      setWeight(taskWeight);

      const optimalSlots = findOptimalSlots(
        taskWeight.energy_required,
        taskWeight.estimated_total_minutes
      );
      setSlots(optimalSlots);
    } catch (error) {
      console.error('Error analyzing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedSlot || !weight) return;
    setScheduling(true);

    try {
      await onScheduled({
        ...task,
        scheduled_at: selectedSlot.start.toISOString(),
        estimated_total_minutes: weight.estimated_total_minutes,
        energy_required: weight.energy_required,
      });
      onClose();
    } catch (error) {
      console.error('Error scheduling:', error);
    } finally {
      setScheduling(false);
    }
  };

  const getEnergyColor = (energy) => {
    switch (energy) {
      case 'low': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700' };
      case 'high': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-300 dark:border-red-700' };
      default: return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative bg-white dark:bg-neutral-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Planifier cette tâche</h3>
                <p className="text-sm text-neutral-500 truncate max-w-[200px]">{task?.text}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
              >
                <Brain className="w-6 h-6 text-primary-500" />
              </motion.div>
              <p className="text-neutral-500">Analyse de la charge cognitive...</p>
            </div>
          ) : weight ? (
            <div className="space-y-6">
              {/* Energy Analysis */}
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Analyse énergétique
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Duration */}
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <p className="text-xs text-neutral-500 mb-1">Durée estimée</p>
                    <p className="text-xl font-bold text-neutral-900 dark:text-white">
                      {formatDuration(weight.estimated_total_minutes)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">(+20% marge TDAH)</p>
                  </div>

                  {/* Energy Level */}
                  <div className={`p-4 rounded-xl ${getEnergyColor(weight.energy_required).bg}`}>
                    <p className="text-xs text-neutral-500 mb-1">Niveau d'énergie</p>
                    <p className={`text-xl font-bold ${getEnergyColor(weight.energy_required).text}`}>
                      {weight.energy_emoji} {weight.energy_label}
                    </p>
                  </div>
                </div>

                {/* Reasoning */}
                {weight.reasoning && (
                  <div className="mt-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500">
                    <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 mb-1">
                      <Brain className="w-3 h-3" /> Analyse IA
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-300">{weight.reasoning}</p>
                  </div>
                )}

                {/* Hidden Subtasks */}
                {weight.hidden_subtasks?.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                      🔍 Sous-tâches souvent oubliées
                    </p>
                    <ul className="space-y-1">
                      {weight.hidden_subtasks.map((sub, i) => (
                        <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  Créneaux suggérés
                </h4>
                <p className="text-xs text-neutral-500 mb-3">
                  {weight.energy_required === 'high' 
                    ? 'Tâche Deep Work → Créneaux matinaux recommandés'
                    : weight.energy_required === 'low'
                    ? 'Tâche légère → Fin de journée idéale'
                    : 'Tâche standard → Horaires flexibles'}
                </p>

                <div className="space-y-2">
                  {slots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        selectedSlot === slot
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${
                          selectedSlot === slot ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'
                        }`}>
                          {slot.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {slot.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-sm text-neutral-500">{slot.label}</p>
                      </div>
                      {selectedSlot === slot && (
                        <Check className="w-5 h-5 text-primary-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button
              onClick={handleSchedule}
              disabled={!selectedSlot || scheduling}
              className="btn-primary flex-[2] disabled:opacity-50"
            >
              {scheduling ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Planifier
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TimeBlockingModal;
