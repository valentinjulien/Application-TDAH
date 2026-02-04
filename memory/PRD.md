# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH et créer une communauté TDAH. Amélioration d'un projet GitHub existant avec focus sur l'UX et les fonctionnalités adaptées TDAH.

## 🎯 Vision
Une application bienveillante et non-jugeante qui aide les personnes atteintes de TDAH à organiser leur quotidien grâce à l'IA et la voix, tout en créant une communauté de soutien.

## 👥 User Personas
1. **Marie, 28 ans** - Diagnostiquée TDAH adulte, travaille en marketing, cherche à mieux gérer ses tâches
2. **Alex, 16 ans** - Étudiant avec TDAH, besoin de structure pour les devoirs et révisions
3. **Léa, 35 ans** - Mère de famille TDAH, jongle entre travail et vie personnelle

## ✅ Fonctionnalités Implémentées (Février 2026)

### Core Features
- ✅ **Authentification** - Emergent Google OAuth (connexion en 1 clic)
- ✅ **Dashboard** - Quick Capture avec IA, stats rapides, accès rapide aux fonctionnalités
- ✅ **Matrice Eisenhower** - 4 quadrants colorés avec décomposition IA des tâches
- ✅ **Timer Pomodoro** - Sessions focus/pause avec progression visuelle circulaire
- ✅ **Calendrier** - Vue mensuelle avec événements et tâches à planifier
- ✅ **Suivi d'humeur** - Tracking quotidien humeur + énergie avec historique
- ✅ **Communauté** - Feed social avec posts, likes, catégories (astuces, victoires, soutien)
- ✅ **Paramètres** - Mode sombre, notifications, profil, déconnexion

### NEW: Assistant Vocal (v1.1.0)
- ✅ **Route /assist** - "Porte d'entrée" pour lancement externe
- ✅ **Paramètres URL** - `/assist?action=task` pour mode création de tâche
- ✅ **Auto-démarrage micro** - Demande permission et lance l'écoute automatiquement
- ✅ **Interface Flash** - Design minimaliste (fond noir, onde sonore, texte transcrit)
- ✅ **Web Speech API** - Reconnaissance vocale en français
- ✅ **Synthèse vocale** - Feedback audio pour confirmer les actions
- ✅ **Guide intégration** - Instructions Siri (Mac/iPhone), Windows, Android dans les paramètres

### UX/Design TDAH
- ✅ Design apaisant avec couleurs douces
- ✅ Mode sombre pour réduire la fatigue visuelle
- ✅ Animations douces (framer-motion)
- ✅ Interface vocale pour capture instantanée
- ✅ Navigation simplifiée

## 🔧 Stack Technique
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Lucide Icons, Web Speech API
- **Backend**: FastAPI, MongoDB, httpx
- **Auth**: Emergent Google OAuth
- **Voice**: Web Speech API (reconnaissance + synthèse)

## 📊 Architecture

```
/app
├── backend/
│   └── server.py          # FastAPI API avec Emergent Auth
├── frontend/
│   └── src/
│       ├── App.js         # Main app + route /assist
│       └── components/
│           ├── VoiceAssistant.js  # NEW: Assistant vocal
│           ├── Dashboard.js
│           ├── Settings.js        # Guide Siri/raccourcis
│           └── ...
```

## 🎤 Configuration Assistant Vocal

### URLs disponibles
- `/assist` - Mode général
- `/assist?action=task` - Mode création de tâche
- `/assist?action=question` - Mode question

### Intégration Siri (Mac/iPhone)
1. App Raccourcis → Nouveau → "Assistant TDAH"
2. Action "Ouvrir l'URL" → coller le lien
3. Dire "Dis Siri, Assistant TDAH"

### Intégration Windows
1. Nouveau raccourci Bureau → coller l'URL
2. Propriétés → Touche de raccourci → Ctrl+Alt+V

### Intégration Android
1. Google → Paramètres → Routines
2. Déclencheur vocal + Action "Ouvrir site web"

## 🚀 Prochaines Étapes (Backlog)

### P0 - Critique
- [ ] Intégration complète Google Calendar
- [ ] Notifications push PWA

### P1 - Important
- [ ] Gamification (badges, streaks, récompenses visuelles)
- [ ] Statistiques avancées
- [ ] IA conversationnelle pour l'assistant vocal

### P2 - Nice to have
- [ ] Mode hors-ligne complet
- [ ] Export données
- [ ] Thèmes personnalisables

---
*Dernière mise à jour: 4 Février 2026 - v1.1.0 Voice Assistant*
