import React from 'react';
import { ArrowPathIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { usePWA } from '../hooks/usePWA';

const UpdatePrompt = () => {
  const { isUpdateAvailable, updateApp, isOffline } = usePWA();

  const handleUpdate = () => {
    updateApp();
  };

  const handleDismiss = () => {
    // Pour l'instant, on cache simplement le prompt
    // Dans une vraie app, on pourrait stocker cette préférence
    window.location.reload();
  };

  // Ne rien afficher si pas de mise à jour disponible ou si hors ligne
  if (!isUpdateAvailable || isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-accent-500 to-primary-500 rounded-2xl shadow-large border border-white/20 p-4 text-white">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-semibold mb-1">
              Mise à jour disponible
            </h3>
            <p className="text-sm opacity-90 mb-3">
              Une nouvelle version de TDAH Assistant est disponible avec des améliorations et corrections.
            </p>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpdate}
                className="bg-white text-primary-600 hover:bg-white/90 px-4 py-2 rounded-lg font-medium flex-1 flex items-center justify-center space-x-2 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Mettre à jour</span>
              </button>

              <button
                onClick={handleDismiss}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Plus tard"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Indicateur de progression */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="flex items-center justify-center space-x-4 text-xs opacity-75">
            <div className="flex items-center space-x-1">
              <ArrowPathIcon className="w-3 h-3" />
              <span>Mise à jour automatique</span>
            </div>
            <div className="flex items-center space-x-1">
              <SparklesIcon className="w-3 h-3" />
              <span>Nouvelles fonctionnalités</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;