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
- ✅ **Communauté** - Feed social avec posts, likes, catégories
- ✅ **Paramètres** - Mode sombre, notifications, profil, déconnexion

### Assistant Vocal IA (v1.1.0)
- ✅ **Route /assist** - "Porte d'entrée" pour lancement externe (Siri, raccourcis)
- ✅ **Intégration GPT-4o** - Réponses intelligentes via Emergent LLM Key
- ✅ **Création automatique de tâches** - L'IA détecte et classifie les tâches
- ✅ **Commande vocale "Terminé"** - Dit "Terminé", "Stop", "Fini" pour envoyer
- ✅ **Auto-envoi après silence** - Envoi automatique après 3s de silence
- ✅ **Interface Flash** - Design minimaliste (fond noir, onde sonore animée)
- ✅ **Synthèse vocale** - L'IA répond vocalement
- ✅ **Guide intégration** - Instructions Siri, Windows, Android dans les paramètres

### Notifications Push PWA (v1.1.0)
- ✅ **Service Worker** - Cache offline, background sync
- ✅ **Manifest PWA** - Installable sur mobile/desktop
- ✅ **Shortcuts PWA** - Accès rapide à /assist et /pomodoro
- ✅ **Hook useNotifications** - Gestion permissions et abonnements
- ✅ **Notifications locales** - Rappels pour tâches et sessions

## 🔧 Stack Technique
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Web Speech API
- **Backend**: FastAPI, MongoDB, emergentintegrations
- **Auth**: Emergent Google OAuth
- **IA**: GPT-4o via Emergent LLM Key
- **Voice**: Web Speech API (STT + TTS)
- **PWA**: Service Worker, Push API, Background Sync

## 📊 Architecture

```
/app
├── backend/
│   └── server.py          # FastAPI + AI endpoints (/api/ai/chat, /api/ai/classify)
├── frontend/
│   ├── public/
│   │   ├── sw.js          # Service Worker
│   │   └── manifest.json  # PWA manifest
│   └── src/
│       ├── components/
│       │   └── VoiceAssistant.js  # Assistant vocal IA
│       └── hooks/
│           └── useNotifications.js # Notifications push
```

## 🎤 Commandes Vocales Supportées
- "Terminé" / "Termine" / "Fini" / "Stop" → Envoyer le message
- "Envoyer" / "Envoie" → Envoyer le message
- "C'est tout" → Envoyer le message

## 🚀 Prochaines Étapes (Backlog)

### P0 - Critique
- [ ] Intégration Google Calendar

### P1 - Important
- [ ] Gamification (badges, streaks, confettis)
- [ ] Statistiques avancées avec graphiques
- [ ] Chat communautaire temps réel

### P2 - Nice to have
- [ ] Mode hors-ligne complet
- [ ] Export données
- [ ] Widget iOS/Android

---
*Dernière mise à jour: 4 Février 2026 - v1.1.0 AI Voice Assistant + PWA*
