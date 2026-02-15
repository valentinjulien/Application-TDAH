# Assistant TDAH - Product Requirements Document

## 📋 Original Problem Statement
Application TDAH avec UX cognitive optimisée, rituels quotidiens, et système d'immersion totale pour l'hyperfocus.

## 🎯 Vision
Un sanctuaire numérique bienveillant qui protège l'attention des personnes TDAH avec des outils de focus immersif et un feedback gratifiant.

---

## ✅ Fonctionnalités Implémentées (App Web)

### 15 Février 2026 - Application Desktop + Wake Word

#### Application Desktop Electron (/app/desktop)
- **Écoute en arrière-plan** : Tourne dans la barre système (system tray)
- **Wake Word "Hey Assistant"** : Détection avec Picovoice Porcupine (français)
- **Ouverture automatique** : Ouvre l'app web quand wake word détecté
- **Multi-plateforme** : Windows, macOS, Linux
- **Notifications système** : Feedback visuel lors de la détection

#### Unified Capture (/capture)
- **Mode Texte** : Saisie rapide avec placeholders dynamiques
- **Mode Voix** : Reconnaissance vocale avec synthèse pour feedback
- **Wake Word "Hey Assistant"** : Détection via Web Speech API (dans l'app)
- **Popup permission microphone** : Demande explicite avec explication vie privée
- **Toggle Texte/Voix** : Basculement fluide entre les deux modes
- **Analyse IA** : Classification Eisenhower, énergie, durée estimée
- **Commandes vocales** : "Terminé", "Stop", "Envoie" pour finaliser
- **Auto-envoi** : Envoi automatique après 3 secondes de silence

**Anciens composants fusionnés :**
- ~~GhostCapture.js~~ → UnifiedCapture.js
- ~~VoiceAssistant.js~~ → UnifiedCapture.js
- Route `/assist` supprimée → Tout via `/capture`

### Portage Mobile → Web (Session précédente)

#### 1. Daily Rituals - Rituels Quotidiens
- **Morning Gazette** : Briefing du matin (7h-11h)
- **Evening Review** : Bilan du soir (20h-24h)

#### 2. Time-Blocking Modal
- **Calculateur de charge cognitive IA**
- **Suggestions de créneaux intelligentes**

#### 3. Deep Focus Mode (Pomodoro++)
- **3 modes de durée** : 15/25/50 minutes
- **Son ambiant** : Pluie, Café, Vent
- **Anti-distraction** avec compteur d'interruptions

#### 4. Navigation Enrichie
- **Un seul bouton "Capture Rapide"** avec icônes texte+micro
- **FAB flottant** sur Dashboard avec badge micro

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
  ├── App.js : Routes (plus de /assist)
  ├── components/
  │   ├── UnifiedCapture.js : ⭐ NOUVEAU - Capture Texte+Voix+WakeWord
  │   ├── DailyRituals.js : Morning/Evening modals
  │   ├── TimeBlockingModal.js : Planification IA
  │   ├── Pomodoro.js : Deep Focus Mode
  │   ├── EisenhowerMatrix.js : Matrice + décomposition
  │   ├── Dashboard.js : Page principale + FAB unifié
  │   └── Navigation.js : Sidebar avec bouton capture unifié
  ├── hooks/useAI.js : Hooks IA centralisés
  └── services/captureService.js : Logique capture
```

### Fichiers obsolètes (à supprimer si nécessaire)
- `/app/frontend/src/components/GhostCapture.js`
- `/app/frontend/src/components/VoiceAssistant.js`

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
- [ ] Améliorer la détection wake word (sensibilité, feedback visuel)

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
| Web Speech API | ✅ Actif | Navigateur |

---

*Dernière mise à jour: 15 Février 2026 - Fusion Capture Unifiée (Texte + Voix + Wake Word)*
