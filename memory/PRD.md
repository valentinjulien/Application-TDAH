# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH et créer une communauté TDAH. Amélioration d'un projet GitHub existant avec focus sur l'UX et les fonctionnalités adaptées TDAH.

## 🎯 Vision
Une application bienveillante et non-jugeante qui aide les personnes atteintes de TDAH à organiser leur quotidien grâce à l'IA et la voix, tout en créant une communauté de soutien.

---

## 📱 APPLICATION MOBILE NATIVE (Expo) - EN COURS

### ✅ Complété (4 Février 2026)

#### 1. Configuration Supabase ✅
- Client Supabase configuré avec credentials utilisateur
- URL: `https://fkkjlkliksnujqsujzae.supabase.co`
- Persistance de session avec `@react-native-async-storage/async-storage`
- Types et helpers pour les opérations CRUD sur les tâches

#### 2. Navigation Principale (expo-router) ✅
- Layout racine avec gestion d'authentification automatique
- Redirection vers login si non authentifié
- Tab navigation avec 3 onglets: "Maintenant", "Matrice", "Profil"
- Icons personnalisés pour chaque onglet

#### 3. Écran "Now" (Maintenant) ✅
- Affichage de la tâche prioritaire unique (Quadrant 1 d'abord)
- Bouton "Terminé" avec feedback haptique
- Pull-to-refresh pour actualiser
- État vide avec message de félicitations
- Compteur de tâches terminées aujourd'hui

#### 4. Système d'Authentification ✅
- Écran de connexion avec email/mot de passe
- Écran d'inscription avec validation
- Persistance de session automatique
- Design TDAH-friendly (dark mode, couleurs douces)

#### 5. Push Notifications ✅ (NOUVEAU)
- **Hook useNotifications** - Gestion complète des permissions et tokens
- **Canaux Android** - "default", "reminders", "pomodoro" 
- **Rappels de tâches** - Programmation lors de la création (option "Me rappeler dans X minutes")
- **Notifications Pomodoro** - Fin de session focus/pause
- **Motivation quotidienne** - Message d'encouragement chaque matin (activable)
- **Test de notification** - Bouton dans le profil pour vérifier le fonctionnement
- **Interface utilisateur** - Toggle pour activer/désactiver dans le profil

### 📂 Structure des Fichiers Mobile
```
/app/mobile/
├── app/
│   ├── _layout.tsx              # Layout racine + auth + notifications init
│   ├── (auth)/
│   │   ├── _layout.tsx          # Layout auth
│   │   ├── login.tsx            # Écran connexion
│   │   └── register.tsx         # Écran inscription
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigator
│       ├── index.tsx            # Écran "Maintenant"
│       ├── matrix.tsx           # Matrice Eisenhower
│       └── profile.tsx          # Profil + paramètres notifications
├── components/
│   ├── TaskCard.tsx             # Carte de tâche avec haptics
│   └── QuickCaptureButton.tsx   # FAB + modal création + rappel
├── constants/
│   └── theme.ts                 # Design system TDAH-friendly
├── hooks/
│   └── useNotifications.ts      # Hook notifications push
├── lib/
│   ├── supabase.ts              # Client + helpers
│   └── database.types.ts        # Types Supabase
└── supabase_schema.sql          # Script création tables
```

### 🔔 Fonctionnalités Notifications
| Fonctionnalité | Description |
|----------------|-------------|
| Rappel de tâche | Notification programmée X minutes après création |
| Motivation quotidienne | Message d'encouragement à 9h (activable) |
| Fin session Pomodoro | Notification "Pause méritée !" |
| Fin pause Pomodoro | Notification "Prêt à reprendre ?" |
| Test | Bouton pour vérifier que tout fonctionne |

### ⚠️ ATTENTION - Tables Supabase
L'utilisateur souhaite utiliser les tables existantes de son Supabase.
**Tables attendues** : à confirmer par l'utilisateur.
Si les tables n'existent pas, le script `/app/mobile/supabase_schema.sql` peut être utilisé.

### ⏳ Tâches Restantes Mobile

#### P1 - Fonctionnalités Principales
- [ ] **Quick Capture Vocale**: Intégrer `expo-speech` dans le FAB
- [ ] **Synchronisation temps réel**: Activer Supabase realtime
- [ ] **Adapter aux tables existantes**: Selon schéma Supabase de l'utilisateur

#### P2 - Polish UX
- [ ] Animations d'entrée sur les écrans
- [ ] Transitions entre les tâches
- [ ] Onboarding pour nouveaux utilisateurs

---

## 🌐 APPLICATION WEB (Legacy Context)

### ✅ Fonctionnalités Implémentées
- Authentification Emergent Google OAuth
- Dashboard avec Quick Capture IA
- Matrice Eisenhower avec décomposition IA
- Timer Pomodoro
- Calendrier
- Suivi d'humeur
- Communauté / Feed social
- Assistant Vocal IA (route /assist)
- PWA avec notifications

---

## 🚀 Backlog Global

### P0 - À confirmer
- [ ] Schéma des tables Supabase existantes

### P1 - Fonctionnalités Additionnelles
- [ ] Quick Capture vocale (expo-speech)
- [ ] Intégration Google Calendar
- [ ] Gamification (badges, streaks)

### P2 - Nice to have
- [ ] Mode hors-ligne complet
- [ ] Export données
- [ ] Widget iOS/Android

---
*Dernière mise à jour: 4 Février 2026 - Push Notifications implémentées*
