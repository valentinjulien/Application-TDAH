# TDAH Companion - Product Requirements Document

## 📋 Original Problem Statement
Application pour structurer la vie quotidienne des personnes TDAH. Focus sur l'UX cognitive, les micro-actions et les rituels quotidiens pour briser la paralysie de l'action.

## 🎯 Vision
Une application bienveillante qui accompagne les personnes TDAH du réveil au coucher avec des rituels adaptés, une IA coach et un feedback gratifiant.

---

## 📱 APPLICATION MOBILE NATIVE (Expo)

### ✅ Complété (4 Février 2026)

#### 1. Core Features ✅
- Configuration Supabase avec persistance de session
- Navigation expo-router (tabs: Maintenant, Matrice, Profil)
- Authentification email/password
- Design system TDAH-friendly (dark mode, touch targets 48px+)

#### 2. Micro-planification IA ✅
- Décomposition de tâches en Étape 0 + micro-étapes
- Barre de progression néon avec gradient
- Confettis et haptics à 100%
- Persistance JSONB dans Supabase

#### 3. Push Notifications ✅
- Hook useNotifications complet
- Rappels de tâches programmables
- Motivation quotidienne
- Notifications Pomodoro

#### 4. 🆕 Gazette du Matin (7h - 10h) ✅
**Logique :**
- Détection automatique de la fenêtre horaire
- Analyse des tâches par l'IA
- Sélection de la "Victoire du Jour"
- Proposition d'une "Étape 0" de 30 secondes
- Flag `has_seen_gazette` pour éviter la répétition

**UI :**
- Modal plein écran avec gradient "Aurore"
- Animation fade-in et slide
- Carte dorée pour la Victoire du Jour
- Bouton "🚀 Lancer l'Étape 0"

**Prompt système :**
```
"Agis comme un coach TDAH. Analyse les tâches. Choisis UNE seule 'Victoire du Jour'. 
Propose une 'Étape 0' de 30 secondes. Sois bref et encourageant. Format : JSON."
```

#### 5. 🆕 Revue du Soir (21h - 23h) ✅
**Logique :**
- Fenêtre de déclenchement nocturne
- Questions apaisantes pour le "Brain Dump"
- Transformation des pensées en tâches pour demain
- Célébration des petites victoires

**UI :**
- Mode sombre profond (Night Mode)
- Animation lune pulsante
- Zone de saisie "Mains libres"
- Bouton "😴 Tout est noté, dors bien"

**Prompt système :**
```
"Aide l'utilisateur à vider son esprit. Pose des questions : 'Qu'est-ce qui te trotte dans la tête ?',
'De quoi es-tu fier aujourd'hui ?'. Transforme ses réponses en tâches pour demain. Sois apaisant."
```

### 📂 Structure des Fichiers
```
/app/mobile/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── index.tsx          # + Gazette + Review intégrés
│       ├── matrix.tsx
│       └── profile.tsx        # + Section Rituels
├── components/
│   ├── MorningGazette.tsx     # 🆕 Gazette du Matin
│   ├── EveningReview.tsx      # 🆕 Revue du Soir
│   ├── TaskCard.tsx
│   ├── TaskBreakdown.tsx
│   ├── QuickCaptureButton.tsx
│   └── ConfettiCannon.tsx
├── services/
│   ├── aiService.ts           # Micro-planification
│   └── dailyAIService.ts      # 🆕 Gazette + Review IA
├── hooks/
│   ├── useNotifications.ts
│   └── useDailyTriggers.ts    # 🆕 Déclenchement temporel
└── lib/
    └── supabase.ts            # + DailyLog type + helpers
```

### 🕐 Déclenchement Temporel
| Module | Fenêtre | Comportement |
|--------|---------|--------------|
| Gazette du Matin | 7h - 10h | Auto au lancement, 1x/jour |
| Revue du Soir | 21h - 23h | Auto au lancement, 1x/jour |

### 📊 Table daily_logs (Supabase)
```sql
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE,
  type TEXT ('morning_gazette' | 'evening_review'),
  content JSONB,
  created_at TIMESTAMP,
  UNIQUE(user_id, date, type)
);
```

### ⏳ Tâches Restantes

#### P1 - Fonctionnalités
- [ ] Quick Capture Vocale (`expo-speech`)
- [ ] Timer Pomodoro intégré
- [ ] Synchronisation temps réel Supabase

#### P2 - Polish
- [ ] Onboarding utilisateur
- [ ] Statistiques graphiques
- [ ] Widget iOS/Android

---

## 🌐 APPLICATION WEB (Legacy)
- Auth Google OAuth
- Dashboard + Quick Capture IA
- Matrice Eisenhower + Pomodoro
- Communauté + Assistant vocal /assist
- PWA

---
*Dernière mise à jour: 4 Février 2026 - Gazette du Matin + Revue du Soir implémentées*
