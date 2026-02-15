# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application TDAH avec UX cognitive optimisée, rituels quotidiens, et fonctionnalités anti-paralysie.

## 🎯 Vision
Une application bienveillante qui accompagne les personnes TDAH 24h/24 avec des rituels, un coach IA, et un feedback gratifiant.

---

## 📱 APPLICATION MOBILE NATIVE (Expo) - FONCTIONNELLE

### ✅ Toutes les Fonctionnalités Actives (4 Février 2026)

#### 1. 🎤 Capture Vocale Fonctionnelle ✅
- **Hook `useSpeechToText.ts`** avec OpenAI Whisper
- Enregistrement audio via `expo-av`
- Transcription en français automatique
- Animation pulse pendant l'écoute
- Gestion des erreurs de permission micro
- Insertion automatique du texte transcrit

#### 2. 🍅 Timer Pomodoro Réel ✅
- **Hook `useTimer.ts`** robuste
- Fonctionne en arrière-plan (timestamp de fin)
- Modes: Focus (25min), Pause (5min), Longue pause (15min)
- Notifications programmées à la fin
- Confettis + haptics à 00:00
- Sauvegarde des sessions dans `pomodoro_sessions`
- Compteur de sessions 🍅

#### 3. 📊 Matrice Eisenhower Interactive ✅
- **Long press** pour déplacer une tâche
- Modal de sélection du nouveau quadrant
- **Optimistic UI** : mise à jour instantanée
- Synchronisation avec Supabase en arrière-plan
- Rollback automatique en cas d'erreur

#### 4. ✨ Découpage de Tâches IA Opérationnel ✅
- Toggle "Décomposer avec IA" dans QuickCapture
- Génération des micro-étapes au moment de la création
- Barre de progression animée
- Checkbox interactive pour chaque étape
- Confettis à 100% de progression

#### 5. 🌅 Gazette du Matin (7h-10h) ✅
- Détection automatique de la fenêtre horaire
- Sélection IA de la "Victoire du Jour"
- Proposition "Étape 0" de 30 secondes
- Bouton "🚀 Lancer l'Étape 0"

#### 6. 🌙 Revue du Soir (21h-23h) ✅
- Mode sombre profond
- Questions apaisantes pour "Brain Dump"
- Transformation en tâches pour demain
- Bouton "😴 Tout est noté, dors bien"

### 📂 Structure Complète
```
/app/mobile/
├── app/
│   ├── _layout.tsx              # Auth + Notifications init
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── index.tsx            # Now + Gazette + Review
│       ├── matrix.tsx           # Matrice interactive + Pomodoro
│       └── profile.tsx          # Notifications + Rituels
├── components/
│   ├── ConfettiCannon.tsx       # Célébration native
│   ├── EveningReview.tsx        # Revue du soir
│   ├── MorningGazette.tsx       # Gazette du matin
│   ├── PomodoroTimer.tsx        # Timer modal
│   ├── QuickCaptureButton.tsx   # FAB + Voice + AI
│   ├── TaskBreakdown.tsx        # Micro-étapes
│   └── TaskCard.tsx             # Carte tâche + AI
├── hooks/
│   ├── useDailyTriggers.ts      # Détection horaire
│   ├── useNotifications.ts      # Push notifications
│   ├── useSpeechToText.ts       # 🆕 Whisper transcription
│   └── useTimer.ts              # 🆕 Pomodoro timer
├── services/
│   ├── aiService.ts             # Task breakdown
│   └── dailyAIService.ts        # Gazette + Review
└── lib/
    └── supabase.ts              # Client + helpers
```

### 🔧 Fonctionnalités UI/UX
| Composant | Feedback Visuel |
|-----------|-----------------|
| Voice Input | Pulse animation + "Parlez maintenant..." |
| Task Creation | Spinner sur bouton pendant chargement |
| Task Move | Overlay modal + "Déplacer vers" |
| Pomodoro End | Confettis + Haptics + Notification |
| Task Complete | Optimistic update + Revert on error |

### 📊 Tables Supabase Utilisées
- `tasks` - Tâches avec JSONB `steps`
- `daily_logs` - Gazette + Review historique
- `pomodoro_sessions` - Sessions de focus

### ⚠️ Gestion des Erreurs
- **Micro bloqué** : Message "Autorisation du micro nécessaire"
- **API IA fail** : Fallback avec tâches génériques
- **Sync fail** : Optimistic UI + rollback automatique

---

## 🎯 Application 100% Fonctionnelle

L'application est maintenant **entièrement opérationnelle** :
- ✅ Capture vocale avec Whisper
- ✅ Timer Pomodoro robuste
- ✅ Matrice drag & drop
- ✅ Décomposition IA
- ✅ Gazette du Matin
- ✅ Revue du Soir
- ✅ Push Notifications
- ✅ Authentification Supabase

---

## 📦 Backlog Restant

### P2 - Nice to have
- [ ] Mode hors-ligne avec sync
- [ ] Widget iOS/Android
- [ ] Statistiques graphiques
- [ ] Intégration calendrier
- [ ] Thèmes personnalisables

---
*Dernière mise à jour: 4 Février 2026 - Application 100% fonctionnelle*
