# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH et créer une communauté TDAH. Focus sur l'UX cognitive et les fonctionnalités anti-paralysie.

## 🎯 Vision
Une application bienveillante qui aide les personnes TDAH à briser la paralysie de l'action grâce à l'IA, des micro-étapes et un feedback visuel gratifiant.

---

## 📱 APPLICATION MOBILE NATIVE (Expo)

### ✅ Complété (4 Février 2026)

#### 1. Configuration Supabase ✅
- Client Supabase configuré avec credentials utilisateur
- Persistance de session avec AsyncStorage
- Types et helpers CRUD pour les tâches

#### 2. Navigation (expo-router) ✅
- Tab navigation: "Maintenant", "Matrice", "Profil"
- Authentification automatique avec redirection

#### 3. Écran "Now" ✅
- Affichage tâche prioritaire unique
- Bouton "Terminé" avec haptics
- Pull-to-refresh

#### 4. Authentification ✅
- Login/Register avec email/password
- Design TDAH-friendly (dark mode)

#### 5. Push Notifications ✅
- Hook useNotifications
- Rappels de tâches programmables
- Motivation quotidienne
- Notifications Pomodoro

#### 6. 🆕 Micro-planification IA ✅ (NOUVEAU)
- **Service AI** (`/services/aiService.ts`)
  - Appel OpenAI GPT-4o via Emergent LLM Key
  - System prompt expert TDAH
  - Décomposition en Étape 0 (< 30 sec) + 3-5 micro-étapes
  - Format JSON structuré

- **Composant TaskBreakdown** (`/components/TaskBreakdown.tsx`)
  - Barre de progression animée (indigo → teal → emerald)
  - Effet glow néon sur la barre
  - Checklist interactive avec cases à cocher
  - Highlight "⚡ COMMENCE ICI" sur l'étape 0
  - Synchronisation Supabase (colonne JSONB `steps`)

- **Effet de Récompense (Dopamine Loop)**
  - Confettis natifs React Native à 100%
  - Pattern haptique iOS/Android
  - Message "Bravo ! Mission accomplie !"

- **Intégration TaskCard**
  - Bouton "✨ Décomposer avec IA"
  - Affichage progression dans la carte
  - Toggle pour masquer/afficher les étapes

### 📂 Structure des Fichiers
```
/app/mobile/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── index.tsx          # Écran "Maintenant"
│       ├── matrix.tsx         # Matrice Eisenhower
│       └── profile.tsx        # Profil + notifications
├── components/
│   ├── TaskCard.tsx           # Carte avec bouton IA
│   ├── TaskBreakdown.tsx      # Micro-planification
│   ├── QuickCaptureButton.tsx # FAB + rappels
│   └── ConfettiCannon.tsx     # Animation célébration
├── services/
│   └── aiService.ts           # Appel OpenAI pour décomposition
├── hooks/
│   └── useNotifications.ts
├── constants/
│   └── theme.ts
└── lib/
    └── supabase.ts            # Client + types (avec steps JSONB)
```

### 🎨 Design System
- Palette "Twilight Calm" (basse stimulation)
- Dark mode par défaut
- Touch targets: min 48px
- Barre de progression néon avec gradient

### 🔔 Notifications
| Type | Description |
|------|-------------|
| Rappel tâche | X minutes après création |
| Motivation | Message quotidien à 9h |
| Pomodoro | Fin focus / fin pause |

### 🤖 Micro-planification IA
| Élément | Description |
|---------|-------------|
| Étape 0 | Action < 30 sec pour briser l'inertie |
| Micro-étapes | 3-5 actions (max 15 min chacune) |
| Progression | Barre animée avec glow |
| Célébration | Confettis + haptics à 100% |

### ⚠️ Prérequis Supabase
La table `tasks` doit avoir une colonne `steps JSONB`:
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT NULL;
```

### ⏳ Tâches Restantes

#### P1 - Fonctionnalités
- [ ] Quick Capture Vocale (`expo-speech`)
- [ ] Synchronisation temps réel Supabase
- [ ] Timer Pomodoro intégré

#### P2 - Polish
- [ ] Animations d'entrée écrans
- [ ] Onboarding utilisateur
- [ ] Statistiques et graphiques

---

## 🌐 APPLICATION WEB (Legacy)
- Auth Google OAuth
- Dashboard + Quick Capture IA
- Matrice Eisenhower
- Timer Pomodoro
- Calendrier
- Communauté
- Assistant vocal /assist
- PWA

---
*Dernière mise à jour: 4 Février 2026 - Micro-planification IA implémentée*
