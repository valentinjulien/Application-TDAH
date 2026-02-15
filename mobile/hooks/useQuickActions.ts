// Quick Actions Hook - Home Screen Shortcuts
// Allows users to quickly access capture or focus mode from app icon long-press

import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';

// Define available quick actions
const QUICK_ACTIONS: QuickActions.Action[] = [
  {
    id: 'capture',
    title: 'Capture rapide',
    subtitle: 'Vider l\'esprit',
    icon: 'compose',
    params: { route: '/capture' },
  },
  {
    id: 'focus',
    title: 'Deep Focus',
    subtitle: 'Démarrer une session',
    icon: 'timer',
    params: { route: '/(tabs)/matrix', action: 'focus' },
  },
  {
    id: 'new_task',
    title: 'Nouvelle tâche',
    subtitle: 'Ajouter avec détails',
    icon: 'plus.circle',
    params: { route: '/(tabs)', action: 'new_task' },
  },
];

export function useQuickActions() {
  useEffect(() => {
    // Set up quick actions on app load
    QuickActions.setItems(QUICK_ACTIONS);
  }, []);

  useEffect(() => {
    // Handle quick action selection
    const subscription = QuickActions.addListener((action) => {
      if (!action) return;

      console.log('Quick action triggered:', action.id);

      switch (action.id) {
        case 'capture':
          router.push('/capture' as any);
          break;
        case 'focus':
          router.replace('/(tabs)/matrix');
          break;
        case 'new_task':
          router.replace('/(tabs)');
          break;
        default:
          if (action.params?.route) {
            router.push(action.params.route as any);
          }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    setQuickActions: QuickActions.setItems,
    clearQuickActions: () => QuickActions.setItems([]),
  };
}

export default useQuickActions;
