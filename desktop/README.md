# Assistant TDAH - Application Desktop

Application desktop pour la détection du wake word "Hey Assistant" en arrière-plan.

## Fonctionnalités

- 🎤 **Écoute en arrière-plan** : L'application tourne dans la barre système et écoute en permanence
- 🗣️ **Wake word "Hey Assistant"** : Dites "Hey Assistant" pour ouvrir l'application web
- 🔔 **Notifications** : Recevez une notification quand le wake word est détecté
- 💻 **Multi-plateforme** : Fonctionne sur Windows, macOS et Linux

## Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation des dépendances
```bash
cd desktop
npm install
```

### Lancer l'application en mode développement
```bash
npm start
```

### Créer un exécutable
```bash
# Pour votre plateforme actuelle
npm run build

# Pour une plateforme spécifique
npm run build:mac
npm run build:win
npm run build:linux
```

## Configuration

L'application utilise Picovoice Porcupine pour la détection du wake word.
- Clé API Picovoice déjà configurée
- Wake word personnalisé "Hey Assistant" en français inclus

## Utilisation

1. Lancez l'application
2. Elle se minimise automatiquement dans la barre système
3. Dites "Hey Assistant" 
4. L'application web s'ouvre automatiquement sur la page de capture vocale

## Architecture

```
desktop/
├── main.js          # Process principal Electron
├── preload.js       # Bridge sécurisé
├── index.html       # Interface utilisateur
├── styles.css       # Styles
├── porcupine/       # Fichiers wake word
│   ├── hey-assistant_fr.ppn
│   └── porcupine_params_fr.pv
└── assets/          # Icônes
```

## Notes

- L'application nécessite l'accès au microphone
- Fonctionne même quand l'application web est fermée
- Consomme peu de ressources (détection locale avec Porcupine)
