// Quick Actions Hook - Home Screen Shortcuts
// Allows users to quickly access capture or focus mode from app icon long-press

import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router, useRouter } from 'expo-router';

// Define available quick actions
const QUICK_ACTIONS: QuickActions.Action[] = [
  {
    id: 'capture',
    title: 'Capture rapide',
    subtitle: 'Vider l\'esprit',
    icon: 'compose', // SF Symbol for iOS, will use default on Android
    params: { route: '/capture' },
  },
  {
    id: 'focus',
    title: 'Deep Focus',
    subtitle: 'Démarrer une session',
    icon: 'timer', // SF Symbol for iOS
    params: { route: '/(tabs)/matrix', action: 'focus' },
  },
  {
    id: 'new_task',
    title: 'Nouvelle tâche',
    subtitle: 'Ajouter avec détails',
    icon: 'plus.circle', // SF Symbol for iOS
    params: { route: '/(tabs)', action: 'new_task' },
  },
];

export function useQuickActions() {
  const routerInstance = useRouter();

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
          // Navigate to Ghost UI capture
          router.push('/capture');
          break;
        case 'focus':
          // Navigate to matrix and trigger focus mode
          router.replace('/(tabs)/matrix');
          // The matrix screen will need to check for this param
          break;
        case 'new_task':
          // Navigate to home
          router.replace('/(tabs)');
          break;
        default:
          // Handle custom params if present
          if (action.params?.route) {
            router.push(action.params.route as any);
          }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check if app was launched from a quick action
  useEffect(() => {
    const checkInitialAction = async () => {
      const initialAction = await QuickActions.getInitialAction();
      if (initialAction) {
        console.log('App launched from quick action:', initialAction.id);
        
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          switch (initialAction.id) {
            case 'capture':
              router.push('/capture');
              break;
            case 'focus':
              router.replace('/(tabs)/matrix');
              break;
            case 'new_task':
              router.replace('/(tabs)');
              break;
          }
        }, 100);
      }
    };

    checkInitialAction();
  }, []);

  return {
    setQuickActions: QuickActions.setItems,
    clearQuickActions: () => QuickActions.setItems([]),
  };
}

export default useQuickActions;
