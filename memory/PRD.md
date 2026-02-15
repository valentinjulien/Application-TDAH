# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application TDAH avec UX cognitive optimisée, rituels quotidiens, et système d'immersion totale pour l'hyperfocus.

## 🎯 Vision
Un sanctuaire numérique bienveillant qui protège l'attention des personnes TDAH avec des outils de focus immersif et un feedback gratifiant.

---

## 📱 APPLICATION MOBILE NATIVE (Expo) - COMPLÈTE

### ✅ Toutes les Fonctionnalités (4 Février 2026)

#### 🛸 Système d'Immersion Totale "Deep Work" ✅ (NOUVEAU)

**1. Sélecteur de Chronos (Triple Mode)**
| Mode | Durée | Emoji | Usage |
|------|-------|-------|-------|
| Démarrage Rapide | 15 min | ⚡ | Anti-procrastination |
| Classique | 25 min | 🍅 | Pomodoro standard |
| Immersion | 50 min | 🧘 | Hyperfocus profond |

**2. Mode "Cinéma" (Isolation Visuelle)**
- StatusBar masquée en mode focus
- UI immersive centrée sur le timer
- Background `#0a0a12` (slate-950)
- Animation pulse lumineux lent sur le contour
- Glow animé avec interpolation de couleurs

**3. Isolation Auditive (Bruit Blanc Intégré)**
| Son | Emoji | Description |
|-----|-------|-------------|
| Pluie | 🌧️ | Bruit de pluie apaisant |
| Bruit Brun | 🔊 | Fréquences basses relaxantes |
| Café | ☕ | Ambiance coffee shop |

- Volume indépendant avec slider
- Fade-in 2 secondes au démarrage
- Fade-out 2 secondes à la fin
- Lecture en boucle continue

**4. Sécurité & Engagement (Nudging)**
- **Wake Lock** : `expo-keep-awake` empêche l'écran de s'éteindre
- **Interception sortie** : Alert bienveillante "Le tunnel est toujours ouvert..."
- **Célébration** : Confettis + haptics à 00:00
- **Auto-close** : Fermeture automatique après célébration

**5. Persistance & Statistiques**
- Sauvegarde dans `pomodoro_sessions` (Supabase)
- Log dans `daily_logs` avec type `focus_session`
- Compteur de sessions pour le streak

---

### 📂 Structure Complète
```
/app/mobile/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── index.tsx            # Now + Gazette + Review
│       ├── matrix.tsx           # Matrice + DeepFocus
│       └── profile.tsx          # Settings + Rituels
├── components/
│   ├── ConfettiCannon.tsx       # Célébration native
│   ├── DeepFocus.tsx            # 🆕 Système immersion totale
│   ├── EveningReview.tsx        # Revue du soir
│   ├── MorningGazette.tsx       # Gazette du matin
│   ├── PomodoroTimer.tsx        # Timer simple (legacy)
│   ├── QuickCaptureButton.tsx   # FAB + Voice + AI
│   ├── TaskBreakdown.tsx        # Micro-étapes
│   └── TaskCard.tsx             # Carte tâche
├── hooks/
│   ├── useDailyTriggers.ts      # Détection horaire
│   ├── useNotifications.ts      # Push notifications
│   ├── useSpeechToText.ts       # Whisper transcription
│   └── useTimer.ts              # Timer robuste
├── services/
│   ├── aiService.ts             # Task breakdown
│   └── dailyAIService.ts        # Gazette + Review
└── lib/
    └── supabase.ts              # Client + helpers
```

### 🎨 UX Deep Focus
```
┌─────────────────────────────────────┐
│            MODE FOCUS               │
│                                     │
│           🎯 Focus actuel           │
│     "Terminer le rapport Q4"        │
│                                     │
│         ┌───────────────┐           │
│         │      🍅       │           │
│         │    24:35      │           │
│         │ En immersion  │           │
│         └───────────────┘           │
│              (pulse)                │
│                                     │
│      [ ⏸️ Pause / ▶️ Reprendre ]     │
│                                     │
│   🔉 ━━━━━━━━━━━━━━━━━━━ 🔊        │
│                                     │
│        Quitter le tunnel            │
└─────────────────────────────────────┘
```

### 📊 Toutes les Tables Supabase
- `tasks` - Tâches avec JSONB `steps`
- `daily_logs` - Gazette, Review, Focus sessions
- `pomodoro_sessions` - Historique des sessions focus

---

## 🎯 Application 100% Complète

### Features Actives
- ✅ Capture vocale (Whisper)
- ✅ Décomposition IA
- ✅ Matrice interactive (drag & drop)
- ✅ Gazette du Matin (7h-10h)
- ✅ Revue du Soir (21h-23h)
- ✅ Push Notifications
- ✅ **Deep Focus avec isolation totale**
- ✅ **Bruit blanc intégré (3 sons)**
- ✅ **Wake Lock (écran toujours allumé)**
- ✅ **Nudging anti-distraction**

---

## 📦 Backlog Optionnel

### P3 - Nice to have
- [ ] Mode hors-ligne avec sync
- [ ] Widget iOS/Android
- [ ] Statistiques graphiques avancées
- [ ] Intégration calendrier
- [ ] Thèmes personnalisables
- [ ] Plus de sons ambiants

---
*Dernière mise à jour: 4 Février 2026 - Deep Focus Immersion Totale*
