import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import { useTasks } from '../hooks/useTasks';
import { useAIClassification } from '../hooks/useAI';
import TimeBlockingModal from './TimeBlockingModal';
import {
  Sparkles,
  Send,
  Mic,
  CheckCircle,
  Clock,
  Flame,
  Target,
  TrendingUp,
  ArrowRight,
  Zap,
  Calendar,
  AlertTriangle,
  Plus,
  Brain,
  Keyboard
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  const { tasks, addTask, updateTask } = useTasks();
  const { classify, loading: classifyLoading } = useAIClassification();

  // Statistiques
  const todayTasks = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.created_at?.startsWith(today);
  });
  const completedTasks = tasks.filter(t => t.completed);
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && !t.completed);

  // Message d'accueil personnalisé
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || classifyLoading) return;

    try {
      const classification = await classify(input);
      
      const taskData = {
        text: input,
        priority: classification.priority || 'medium',
        quadrant: classification.quadrant || 1,
        user_id: user?.id,
      };

      await addTask(taskData);

      setLastAction({
        type: 'success',
        message: `Ajouté au quadrant ${classification.quadrant} ✨`
      });
      setInput('');
      setTimeout(() => setLastAction(null), 3000);
    } catch (error) {
      setLastAction({
        type: 'error',
        message: 'Erreur lors de l\'ajout'
      });
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleTimeBlockScheduled = async (taskWithSchedule) => {
    try {
      await updateTask(taskWithSchedule.id, {
        scheduled_at: taskWithSchedule.scheduled_at,
        estimated_total_minutes: taskWithSchedule.estimated_total_minutes,
        energy_required: taskWithSchedule.energy_required,
      });
      setLastAction({
        type: 'success',
        message: 'Tâche planifiée ! 📅'
      });
      setTimeout(() => setLastAction(null), 3000);
    } catch (error) {
      console.error('Error scheduling task:', error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            {getGreeting()} ! 👋
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Prêt à conquérir cette journée ? L'IA est là pour t'aider.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Target}
            label="Aujourd'hui"
            value={todayTasks.length}
            color="primary"
          />
          <StatCard
            icon={CheckCircle}
            label="Complétées"
            value={completedTasks.length}
            color="success"
          />
          <StatCard
            icon={AlertTriangle}
            label="Urgentes"
            value={highPriorityTasks.length}
            color="warning"
          />
          <StatCard
            icon={Flame}
            label="Streak"
            value="3 jours"
            color="danger"
          />
        </motion.div>

        {/* Quick Capture - Zone principale */}
        <motion.div variants={itemVariants} className="card mb-8">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-neutral-900 dark:text-white">
                  Quick Capture
                </h2>
                <p className="text-sm text-neutral-500">
                  Tape ce qui te passe par la tête, l'IA organise pour toi
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Feedback message */}
            {lastAction && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 ${
                  lastAction.type === 'success' ? 'alert-success' : 'alert-error'
                }`}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{lastAction.message}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: Rappeler médecin demain, finir rapport urgent, acheter lait..."
                  className="input min-h-[120px] resize-none pr-24"
                  data-testid="quick-capture-input"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-icon"
                    title="Dictée vocale"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || classifyLoading}
                    className="btn-primary !py-2 !px-4"
                    data-testid="quick-capture-submit"
                  >
                    {classifyLoading ? (
                      <span className="loading-spinner" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <QuickActionCard
            to="/pomodoro"
            icon={Clock}
            title="Mode Focus"
            description="Démarrer une session Pomodoro"
            color="red"
          />
          <QuickActionCard
            to="/matrix"
            icon={Target}
            title="Matrice Eisenhower"
            description="Organiser mes priorités"
            color="amber"
          />
          <QuickActionCard
            to="/mood"
            icon={TrendingUp}
            title="Check-in Humeur"
            description="Comment tu te sens ?"
            color="pink"
          />
        </motion.div>

        {/* Tâches prioritaires */}
        <motion.div variants={itemVariants} className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-display font-semibold text-neutral-900 dark:text-white">
                À faire maintenant
              </h3>
            </div>
            <Link 
              to="/matrix" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="card-body">
            {highPriorityTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-accent-500" />
                </div>
                <p className="text-neutral-500">Aucune tâche urgente ! 🎉</p>
                <p className="text-sm text-neutral-400 mt-1">Tu gères super bien</p>
              </div>
            ) : (
              <div className="space-y-3">
                {highPriorityTasks.slice(0, 3).map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTimeBlocking(true);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="flex-1 text-neutral-700 dark:text-neutral-300">
                      {task.text}
                    </span>
                    <span className="badge-danger">Urgent</span>
                    <button 
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        setShowTimeBlocking(true);
                      }}
                      title="Planifier"
                    >
                      <Calendar className="w-4 h-4 text-primary-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Floating Action Button - Unified Capture */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/capture')}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center z-40 group"
        data-testid="unified-capture-fab"
        title="Capture rapide (Texte + Voix)"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-500 flex items-center justify-center">
          <Mic className="w-2.5 h-2.5 text-white" />
        </span>
      </motion.button>

      {/* Time Blocking Modal */}
      <AnimatePresence>
        {showTimeBlocking && selectedTask && (
          <TimeBlockingModal
            task={selectedTask}
            onClose={() => {
              setShowTimeBlocking(false);
              setSelectedTask(null);
            }}
            onScheduled={handleTimeBlockScheduled}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Composant StatCard
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600',
    success: 'bg-accent-50 dark:bg-accent-900/20 text-accent-600',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

// Composant QuickActionCard
const QuickActionCard = ({ to, icon: Icon, title, description, color }) => {
  const colorClasses = {
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <Link to={to} className="card card-hover p-5 group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </Link>
  );
};

export default Dashboard;
