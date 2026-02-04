# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH et créer une communauté TDAH. Amélioration d'un projet GitHub existant avec focus sur l'UX et les fonctionnalités adaptées TDAH.

## 🎯 Vision
Une application bienveillante et non-jugeante qui aide les personnes atteintes de TDAH à organiser leur quotidien grâce à l'IA et la voix, tout en créant une communauté de soutien.

## 👥 User Personas
1. **Marie, 28 ans** - Diagnostiquée TDAH adulte, travaille en marketing, cherche à mieux gérer ses tâches
2. **Alex, 16 ans** - Étudiant avec TDAH, besoin de structure pour les devoirs et révisions
3. **Léa, 35 ans** - Mère de famille TDAH, jongle entre travail et vie personnelle

---

## 📱 APPLICATION MOBILE NATIVE (Expo) - EN COURS

### ✅ Actions Prioritaires Complétées (4 Février 2026)

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

### 📂 Structure des Fichiers Mobile
```
/app/mobile/
├── app/
│   ├── _layout.tsx              # Layout racine + auth
│   ├── (auth)/
│   │   ├── _layout.tsx          # Layout auth
│   │   ├── login.tsx            # Écran connexion
│   │   └── register.tsx         # Écran inscription
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigator
│       ├── index.tsx            # Écran "Maintenant"
│       ├── matrix.tsx           # Matrice Eisenhower
│       └── profile.tsx          # Profil utilisateur
├── components/
│   ├── TaskCard.tsx             # Carte de tâche avec haptics
│   └── QuickCaptureButton.tsx   # FAB + modal création
├── constants/
│   └── theme.ts                 # Design system TDAH-friendly
├── lib/
│   ├── supabase.ts              # Client + helpers
│   └── database.types.ts        # Types Supabase
└── supabase_schema.sql          # Script création tables
```

### 🎨 Design System TDAH-Friendly
- **Palette "Twilight Calm"**: Couleurs basse stimulation
- **Dark mode par défaut**: Moins fatigant pour les yeux
- **Touch targets**: Minimum 48px pour faciliter le tap
- **Feedback haptique**: Vibrations sur actions importantes
- **Grandes polices lisibles**: Hiérarchie claire

### ⏳ Tâches Restantes Mobile

#### P1 - Fonctionnalités Principales
- [ ] **Quick Capture Vocale**: Intégrer `expo-speech` dans le FAB
- [ ] **Push Notifications**: Configurer `expo-notifications`
- [ ] **Synchronisation temps réel**: Activer Supabase realtime

#### P2 - Polish UX
- [ ] Animations d'entrée sur les écrans
- [ ] Transitions entre les tâches
- [ ] Onboarding pour nouveaux utilisateurs

### 🔑 IMPORTANT - Setup Supabase
L'utilisateur doit exécuter le script `/app/mobile/supabase_schema.sql` dans son projet Supabase pour créer les tables nécessaires.

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

### 🔧 Stack Technique Web
- **Frontend**: React 18, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, MongoDB
- **Auth**: Emergent Google OAuth
- **IA**: GPT-4o via Emergent LLM Key

---

## 🚀 Backlog Global

### P0 - Mobile App Completion
- [ ] Test complet de l'authentification Supabase
- [ ] Test création/complétion de tâches

### P1 - Fonctionnalités Additionnelles
- [ ] Intégration Google Calendar
- [ ] Gamification (badges, streaks)
- [ ] Chat communautaire

### P2 - Nice to have
- [ ] Mode hors-ligne complet
- [ ] Export données
- [ ] Widget iOS/Android

---
*Dernière mise à jour: 4 Février 2026 - Application Mobile Expo en développement*
