# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application TDAH avec UX cognitive optimisée, rituels quotidiens, et système d'immersion totale pour l'hyperfocus.

## 🎯 Vision
Un sanctuaire numérique bienveillant qui protège l'attention des personnes TDAH avec des outils de focus immersif et un feedback gratifiant.

---

## 📱 APPLICATION MOBILE NATIVE (Expo)

### ✅ Fonctionnalités Implémentées

#### 🆕 Ghost UI - Capture Ultra-Rapide (15 Février 2026)

**Route `/capture` - Interface minimaliste zéro-friction**
- **Design "Ghost"** : Fond transparent + blur, aucun menu/scroll
- **Auto-focus immédiat** : Le curseur est déjà dans le champ
- **Placeholders dynamiques** : "Vider l'esprit...", "Une idée ?", etc.
- **Raccourcis clavier** : Entrée = envoyer, Retour = annuler

**Traitement IA en arrière-plan (`captureService.ts`)**
| Analyse | Description |
|---------|-------------|
| Classification Eisenhower | Détection automatique du quadrant (Q1-Q4) |
| Score d'énergie | low/medium/high basé sur complexité |
| Estimation temporelle | Minutes + 20% marge de sécurité |
| Extraction de date | "demain", "ce soir" → timestamp ISO |

**Feedback visuel minimaliste**
- Lueur bleue pulsante pendant le traitement
- Coche ✓ éphémère au succès
- Fermeture automatique après capture

**Accès**
- Appui long sur le FAB (+) depuis n'importe quel écran
- Route directe : `/capture`

---

#### 🆕 Time-Blocking Intelligent (15 Février 2026)

**1. Calculateur de Charge Cognitive (IA)**
- Analyse automatique des tâches via GPT-4o
- Estimation réaliste de la durée (+20% marge TDAH pour Time Blindness)
- Détection du niveau d'énergie requis (low/medium/high)
- Identification des sous-tâches cachées souvent oubliées

**2. Badges Visuels sur TaskCard**
| Badge | Signification |
|-------|---------------|
| ⚡ Repos | Tâche légère, fin de journée |
| ⚡⚡ Focus | Tâche standard, flexible |
| ⚡⚡⚡ Deep Work | Haute concentration, matin |
| ⏱️ Durée | Temps estimé avec marge |
| 📅 Planifié | Date/heure du créneau |

**3. Suggestion Intelligente de Créneaux**
- Tâches "high" → Créneaux matinaux (8h-11h)
- Tâches "low" → Fin de journée (16h-19h)
- Tâches "medium" → Horaires flexibles
- Évite les conflits avec créneaux occupés

**4. Nouvel Onglet "Planning"**
- Vue timeline par jour (Aujourd'hui, Demain, etc.)
- Toggle entre tâches planifiées et à planifier
- Indicateurs visuels de temps et énergie

**5. Intégration Google Calendar** ⚠️ EN ATTENTE
- Nécessite les credentials OAuth de l'utilisateur
- Sync bidirectionnelle planifiée

---

#### 🛸 Système d'Immersion Totale "Deep Work" ✅

**1. Sélecteur de Chronos (Triple Mode)**
| Mode | Durée | Emoji | Usage |
|------|-------|-------|-------|
| Démarrage Rapide | 15 min | ⚡ | Anti-procrastination |
| Classique | 25 min | 🍅 | Pomodoro standard |
| Immersion | 50 min | 🧘 | Hyperfocus profond |

**2. Mode "Cinéma" (Isolation Visuelle)**
- StatusBar masquée en mode focus
- UI immersive centrée sur le timer
- Animation pulse lumineux lent sur le contour

**3. Isolation Auditive (Bruit Blanc Intégré)**
| Son | Emoji | Description |
|-----|-------|-------------|
| Pluie | 🌧️ | Bruit de pluie apaisant |
| Bruit Brun | 🔊 | Fréquences basses relaxantes |
| Café | ☕ | Ambiance coffee shop |

**4. Sécurité & Engagement (Nudging)**
- **Wake Lock** : `expo-keep-awake` empêche l'écran de s'éteindre
- **Interception sortie** : Alert bienveillante
- **Célébration** : Confettis + haptics à 00:00

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
│       ├── schedule.tsx         # 🆕 Planning Timeline
│       ├── matrix.tsx           # Matrice + DeepFocus
│       └── profile.tsx          # Settings + Rituels
├── components/
│   ├── ConfettiCannon.tsx       # Célébration native
│   ├── DeepFocus.tsx            # Système immersion totale
│   ├── EveningReview.tsx        # Revue du soir
│   ├── MorningGazette.tsx       # Gazette du matin
│   ├── PomodoroTimer.tsx        # Timer simple (legacy)
│   ├── QuickCaptureButton.tsx   # FAB + Voice + AI
│   ├── TaskBreakdown.tsx        # Micro-étapes
│   ├── TaskCard.tsx             # Carte tâche + Time-Blocking
│   └── TimeBlockingModal.tsx    # 🆕 Planification intelligente
├── hooks/
│   ├── useDailyTriggers.ts      # Détection horaire
│   ├── useNotifications.ts      # Push notifications
│   ├── useSpeechToText.ts       # Whisper transcription
│   └── useTimer.ts              # Timer robuste
├── services/
│   ├── aiService.ts             # Task breakdown
│   ├── captureService.ts        # 🆕 Ghost UI AI processing
│   ├── dailyAIService.ts        # Gazette + Review
│   └── timeBlockingService.ts   # Calcul charge cognitive
└── lib/
    └── supabase.ts              # Client + helpers
```

### 📊 Tables Supabase (avec colonnes Time-Blocking)
```sql
-- Table tasks (avec nouvelles colonnes)
tasks:
  - id, user_id, text, priority, quadrant, completed
  - steps (JSONB) - Micro-étapes AI
  - estimated_total_minutes (INT) - Durée estimée
  - energy_required (TEXT) - 'low'|'medium'|'high'
  - scheduled_at (TIMESTAMP) - Créneau planifié
  - calendar_event_id (TEXT) - ID Google Calendar
  - hidden_subtasks (JSONB) - Sous-tâches cachées

-- Autres tables
daily_logs, pomodoro_sessions, moods
```

---

## 🔴 ACTION REQUISE - BASE DE DONNÉES

⚠️ **Le script SQL doit être exécuté dans Supabase :**
1. Aller sur https://supabase.com/dashboard
2. Ouvrir le projet → SQL Editor
3. Coller le contenu de `/app/mobile/supabase_schema.sql`
4. Exécuter

---

## 📦 Backlog

### P1 - À faire
- [ ] Intégration Google Calendar (credentials OAuth requis)
- [ ] Flux d'authentification complet

### P2 - Nice to have
- [ ] Capture vocale fonctionnelle
- [ ] Mode hors-ligne avec sync
- [ ] Widget iOS/Android
- [ ] Statistiques graphiques avancées

---
*Dernière mise à jour: 15 Février 2026 - Time-Blocking Intelligent*
