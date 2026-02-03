import React from 'react';
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { usePWA } from '../hooks/usePWA';

const OfflineIndicator = () => {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">Mode hors ligne</span>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default OfflineIndicator;