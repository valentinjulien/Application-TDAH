# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application TDAH avec UX cognitive optimisée, rituels quotidiens, et système d'immersion totale pour l'hyperfocus.

## 🎯 Vision
Un sanctuaire numérique bienveillant qui protège l'attention des personnes TDAH avec des outils de focus immersif et un feedback gratifiant.

---

## ✅ Fonctionnalités Implémentées (App Web)

### 15 Février 2026 - Portage Mobile → Web

#### 1. Ghost UI - Capture Rapide (/capture)
- **Interface minimaliste** : Fond blur, aucun menu
- **Auto-focus immédiat** : Curseur prêt à écrire
- **Placeholders dynamiques** : Rotation de suggestions
- **Raccourcis** : Entrée = capturer, Échap = annuler
- **Traitement IA** : Classification automatique Eisenhower

#### 2. Daily Rituals - Rituels Quotidiens
- **Morning Gazette** : Briefing du matin (7h-11h)
  - Aperçu des tâches urgentes/importantes
  - Définition d'objectif quotidien
  - Suggestions IA personnalisées
- **Evening Review** : Bilan du soir (20h-24h)
  - Résumé des accomplissements
  - Sélecteur d'humeur
  - Brain dump pour vider l'esprit

#### 3. Time-Blocking Modal
- **Calculateur de charge cognitive IA**
  - Durée estimée +20% marge TDAH
  - Niveau d'énergie (low/medium/high)
  - Sous-tâches cachées détectées
- **Suggestions de créneaux intelligentes**
  - Deep Work → Matins (8h-11h)
  - Tâches légères → Fin de journée
- **Intégration** : Dashboard + Matrice Eisenhower

#### 4. Deep Focus Mode (Pomodoro++)
- **3 modes de durée** : 15/25/50 minutes
- **Son ambiant** : Pluie, Café, Vent
- **Anti-distraction** : Notifications quand l'utilisateur quitte
- **Compteur d'interruptions** visible
- **Messages bienveillants** au retour

#### 5. Navigation Enrichie
- **Bouton Capture Rapide** dans la sidebar
- **FAB flottant** sur le Dashboard
- **Routes protégées** avec redirection login

---

## 🔧 Architecture Technique

### Backend (FastAPI)
```
/app/backend/server.py
  - /api/auth/* : Authentification Emergent Google Auth
  - /api/tasks/* : CRUD tâches
  - /api/ai/chat : Assistant conversationnel
  - /api/ai/classify : Classification Eisenhower
  - /api/ai/decompose : Décomposition en micro-étapes
  - /api/ai/task-weight : Calcul charge cognitive
```

### Frontend (React)
```
/app/frontend/src/
  ├── App.js : Routes + Daily Rituals
  ├── components/
  │   ├── GhostCapture.js : Interface capture rapide
  │   ├── DailyRituals.js : Morning/Evening modals
  │   ├── TimeBlockingModal.js : Planification IA
  │   ├── Pomodoro.js : Deep Focus Mode
  │   ├── EisenhowerMatrix.js : Matrice + décomposition
  │   ├── Dashboard.js : Page principale + FAB
  │   └── Navigation.js : Sidebar enrichie
  ├── hooks/
  │   └── useAI.js : Hooks IA centralisés
  └── services/
      └── captureService.js : Logique capture
```

### Mobile (Expo - Non modifié cette session)
```
/app/mobile/ : Application React Native complète
```

---

## 🗄️ Base de Données

### Supabase (User-managed)
- URL: `https://fkkjlkliksnujqsujzae.supabase.co`
- Tables: tasks, daily_logs, pomodoro_sessions, moods

### MongoDB (Backend local)
- users, user_sessions, tasks, chat_history

---

## 📦 Backlog

### P1 - À faire
- [ ] Authentification complète mobile (Supabase Auth)
- [ ] Sync bidirectionnelle Google Calendar
- [ ] Capture vocale web (Web Speech API)

### P2 - Nice to have
- [ ] Mode hors-ligne avec sync
- [ ] Widget iOS/Android
- [ ] Statistiques graphiques avancées
- [ ] Suggestions IA basées sur historique focus

---

## 🔗 Intégrations

| Service | Statut | Clé |
|---------|--------|-----|
| OpenAI GPT-4o | ✅ Actif | Emergent LLM Key |
| Supabase | ✅ Actif | User API Key |
| Google Calendar | ⏳ Mobile only | OAuth |

---

*Dernière mise à jour: 15 Février 2026 - Portage complet Mobile → Web*
