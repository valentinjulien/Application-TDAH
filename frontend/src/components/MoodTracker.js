import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../App';
import {
  Smile,
  Meh,
  Frown,
  Zap,
  Battery,
  BatteryLow,
  BatteryFull,
  Calendar,
  TrendingUp,
  Edit3,
  Check
} from 'lucide-react';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Difficile', color: 'bg-red-100 border-red-300 text-red-700' },
  { value: 2, emoji: '😕', label: 'Bof', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  { value: 3, emoji: '😐', label: 'Neutre', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 4, emoji: '🙂', label: 'Bien', color: 'bg-green-100 border-green-300 text-green-700' },
  { value: 5, emoji: '😊', label: 'Super', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
];

const ENERGY_LEVELS = [
  { value: 1, icon: BatteryLow, label: 'Épuisé', color: 'text-red-500' },
  { value: 2, icon: Battery, label: 'Fatigué', color: 'text-orange-500' },
  { value: 3, icon: Battery, label: 'Normal', color: 'text-yellow-500' },
  { value: 4, icon: BatteryFull, label: 'Énergique', color: 'text-green-500' },
  { value: 5, icon: Zap, label: 'Plein d\'énergie', color: 'text-emerald-500' },
];

const MoodTracker = () => {
  const { user } = useUser();
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedEnergy, setSelectedEnergy] = useState(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  // Charger l'historique mock
  useEffect(() => {
    const mockHistory = [
      { date: 'Aujourd\'hui', mood: 4, energy: 3 },
      { date: 'Hier', mood: 3, energy: 2 },
      { date: 'Avant-hier', mood: 5, energy: 4 },
      { date: 'Il y a 3 jours', mood: 2, energy: 2 },
      { date: 'Il y a 4 jours', mood: 4, energy: 4 },
      { date: 'Il y a 5 jours', mood: 3, energy: 3 },
      { date: 'Il y a 6 jours', mood: 4, energy: 5 },
    ];
    setHistory(mockHistory);
  }, []);

  const handleSave = () => {
    if (!selectedMood || !selectedEnergy) return;
    
    // Simuler la sauvegarde
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    
    // Ajouter à l'historique
    setHistory([{
      date: 'Maintenant',
      mood: selectedMood,
      energy: selectedEnergy,
      notes
    }, ...history]);
  };

  const getAverageMood = () => {
    if (history.length === 0) return 0;
    return (history.reduce((sum, h) => sum + h.mood, 0) / history.length).toFixed(1);
  };

  const getAverageEnergy = () => {
    if (history.length === 0) return 0;
    return (history.reduce((sum, h) => sum + h.energy, 0) / history.length).toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Comment tu te sens ? 💭
          </h1>
          <p className="text-neutral-500">
            Suivre ton humeur aide à mieux te comprendre
          </p>
        </div>

        {/* Success message */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert-success mb-6"
          >
            <Check className="w-5 h-5" />
            <span>Check-in enregistré ! Continue comme ça 💪</span>
          </motion.div>
        )}

        {/* Mood Selection */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Smile className="w-5 h-5 text-amber-500" />
            Mon humeur
          </h2>
          <div className="flex justify-between gap-2">
            {MOODS.map((mood) => (
              <motion.button
                key={mood.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMood(mood.value)}
                className={`flex-1 py-4 rounded-xl border-2 transition-all ${
                  selectedMood === mood.value
                    ? mood.color + ' border-2'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-transparent hover:bg-neutral-100'
                }`}
                data-testid={`mood-${mood.value}`}
              >
                <span className="text-3xl">{mood.emoji}</span>
                <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                  {mood.label}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Energy Selection */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Mon énergie
          </h2>
          <div className="flex justify-between gap-2">
            {ENERGY_LEVELS.map((energy) => {
              const Icon = energy.icon;
              return (
                <motion.button
                  key={energy.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedEnergy(energy.value)}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all ${
                    selectedEnergy === energy.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-transparent hover:bg-neutral-100'
                  }`}
                  data-testid={`energy-${energy.value}`}
                >
                  <Icon className={`w-8 h-8 mx-auto ${energy.color}`} />
                  <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                    {energy.label}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary-500" />
            Notes (optionnel)
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comment s'est passée ta journée ? Qu'est-ce qui t'a aidé ou compliqué les choses ?"
            className="input min-h-[100px] resize-none"
            data-testid="mood-notes"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!selectedMood || !selectedEnergy}
          className="btn-primary w-full mb-8"
          data-testid="save-mood-btn"
        >
          <Check className="w-5 h-5 mr-2" />
          Enregistrer mon check-in
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-3xl mb-1">
              {MOODS.find(m => m.value === Math.round(getAverageMood()))?.emoji || '😐'}
            </p>
            <p className="text-sm text-neutral-500">Humeur moyenne</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {getAverageMood()}/5
            </p>
          </div>
          <div className="card p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-1 text-amber-500" />
            <p className="text-sm text-neutral-500">Énergie moyenne</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {getAverageEnergy()}/5
            </p>
          </div>
        </div>

        {/* History */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Historique récent
            </h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {history.slice(0, 7).map((entry, index) => (
              <div key={index} className="px-6 py-3 flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {entry.date}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-xl">
                    {MOODS.find(m => m.value === entry.mood)?.emoji}
                  </span>
                  <div className="flex items-center gap-1">
                    <Zap className={`w-4 h-4 ${
                      ENERGY_LEVELS.find(e => e.value === entry.energy)?.color
                    }`} />
                    <span className="text-sm text-neutral-500">{entry.energy}/5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 card p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">💡 Astuce</h3>
          <p className="text-sm text-neutral-500">
            Faire un check-in régulier t'aide à identifier des patterns. 
            Tu remarqueras peut-être que certains jours ou moments sont plus difficiles que d'autres.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MoodTracker;
