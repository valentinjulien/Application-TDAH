# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH et créer une communauté TDAH. Amélioration d'un projet GitHub existant avec focus sur l'UX et les fonctionnalités adaptées TDAH.

## 🎯 Vision
Une application bienveillante et non-jugeante qui aide les personnes atteintes de TDAH à organiser leur quotidien grâce à l'IA, tout en créant une communauté de soutien.

## 👥 User Personas
1. **Marie, 28 ans** - Diagnostiquée TDAH adulte, travaille en marketing, cherche à mieux gérer ses tâches
2. **Alex, 16 ans** - Étudiant avec TDAH, besoin de structure pour les devoirs et révisions
3. **Léa, 35 ans** - Mère de famille TDAH, jongle entre travail et vie personnelle

## ✅ Fonctionnalités Implémentées (Février 2026)

### Core Features
- ✅ **Authentification** - Google OAuth + Email via Supabase
- ✅ **Dashboard** - Quick Capture avec IA, stats rapides, accès rapide aux fonctionnalités
- ✅ **Matrice Eisenhower** - 4 quadrants colorés avec décomposition IA des tâches
- ✅ **Timer Pomodoro** - Sessions focus/pause avec progression visuelle
- ✅ **Calendrier** - Vue mensuelle avec événements et tâches à planifier
- ✅ **Suivi d'humeur** - Tracking quotidien humeur + énergie avec historique
- ✅ **Communauté** - Feed social avec posts, likes, catégories (astuces, victoires, soutien)
- ✅ **Paramètres** - Mode sombre, notifications, profil

### UX/Design TDAH
- ✅ Design apaisant avec couleurs douces (palette primary/secondary/accent)
- ✅ Mode sombre pour réduire la fatigue visuelle
- ✅ Animations douces (framer-motion)
- ✅ Hiérarchie visuelle claire
- ✅ Feedback immédiat sur les actions
- ✅ Navigation simplifiée (sidebar desktop, bottom nav mobile)
- ✅ Astuces TDAH contextuelles sur chaque page

### Backend API
- ✅ FastAPI avec MongoDB
- ✅ CRUD Tasks, Moods, Pomodoro sessions, Community posts
- ✅ Health check endpoint

## 🔧 Stack Technique
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: FastAPI, MongoDB
- **Auth**: Supabase (Google OAuth + Email)
- **IA**: OpenRouter API (Gemini pour classification)

## 📊 Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI API
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main app avec routing
│   │   ├── components/    # Dashboard, Pomodoro, Community, etc.
│   │   ├── hooks/         # useTasks, useAI, etc.
│   │   └── services/      # Supabase client
│   ├── tailwind.config.js
│   └── package.json
└── design_guidelines.json  # UI/UX specs
```

## 🚀 Prochaines Étapes (Backlog)

### P0 - Critique
- [ ] Intégration complète Google Calendar
- [ ] Notifications push PWA

### P1 - Important
- [ ] Gamification (badges, streaks, récompenses)
- [ ] Statistiques avancées (graphiques humeur/productivité)
- [ ] Chat en temps réel dans la communauté

### P2 - Nice to have
- [ ] Assistant vocal (dictée de tâches)
- [ ] Mode hors-ligne complet
- [ ] Export données (PDF, CSV)
- [ ] Thèmes personnalisables

## 📱 URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api
- **Supabase**: https://rmqkvglixdiwlunqaoue.supabase.co

---
*Dernière mise à jour: 4 Février 2026*
