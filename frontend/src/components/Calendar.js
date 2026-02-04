import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTasks } from '../hooks/useTasks';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const Calendar = () => {
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  // Mock events for demo
  const events = [
    { id: 1, title: 'Réunion équipe', time: '10:00', type: 'meeting' },
    { id: 2, title: 'Méditation', time: '08:00', type: 'wellness' },
    { id: 3, title: 'Pause déjeuner', time: '12:30', type: 'break' },
  ];

  const todayTasks = tasks.filter(t => !t.completed).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Calendrier 📅
          </h1>
          <p className="text-neutral-500">Planifie ta semaine avec des buffers de récupération</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="card">
              {/* Month Navigation */}
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevMonth}
                    className="btn-icon"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="font-display font-semibold text-lg text-neutral-900 dark:text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={nextMonth}
                    className="btn-icon"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="card-body">
                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-neutral-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => (
                    <button
                      key={index}
                      onClick={() => date && setSelectedDate(date)}
                      disabled={!date}
                      className={`
                        aspect-square p-2 rounded-xl text-sm font-medium transition-all
                        ${!date ? 'invisible' : ''}
                        ${isToday(date) ? 'bg-primary-500 text-white' : ''}
                        ${isSelected(date) && !isToday(date) ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''}
                        ${!isToday(date) && !isSelected(date) ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300' : ''}
                      `}
                    >
                      {date?.getDate()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  Aujourd'hui
                </h3>
              </div>
              <div className="card-body space-y-3">
                {events.map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800"
                  >
                    <div className="text-sm font-medium text-neutral-500 w-14">
                      {event.time}
                    </div>
                    <div className={`w-1 h-8 rounded-full ${
                      event.type === 'meeting' ? 'bg-blue-500' :
                      event.type === 'wellness' ? 'bg-green-500' :
                      'bg-amber-500'
                    }`} />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {event.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Add */}
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-500" />
                Ajouter un événement
              </h3>
              <button className="btn-primary w-full">
                Nouvel événement
              </button>
            </div>

            {/* Tasks to Schedule */}
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  À planifier
                </h3>
              </div>
              <div className="card-body space-y-2">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-accent-500" />
                    <p className="text-sm text-neutral-500">Tout est planifié ! 🎉</p>
                  </div>
                ) : (
                  todayTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-amber-500' :
                        'bg-neutral-400'
                      }`} />
                      <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-300 truncate">
                        {task.text}
                      </span>
                      <Plus className="w-4 h-4 text-neutral-400" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="card p-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">💡 Astuce TDAH</h3>
              <p className="text-sm text-neutral-500">
                Ajoute toujours 15-30 min de "buffer" entre les événements. 
                Ton cerveau a besoin de transitions douces !
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Calendar;
