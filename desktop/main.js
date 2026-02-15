const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const { Porcupine, BuiltinKeyword } = require('@picovoice/porcupine-node');

// Configuration
const PICOVOICE_ACCESS_KEY = 'v5Kza3KFpiORFUdA9RwBx4ailO4eqUY2JOBQAfXY/Ba+L2CtdKv4JQ==';
const WEB_APP_URL = 'https://adhd-assistant-12.preview.emergentagent.com';
const CUSTOM_KEYWORD_PATH = path.join(__dirname, 'porcupine', 'hey-assistant_fr.ppn');
const FRENCH_MODEL_PATH = path.join(__dirname, 'porcupine', 'porcupine_params_fr.pv');

let tray = null;
let mainWindow = null;
let porcupine = null;
let isListening = false;
let audioRecorder = null;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    show: false,
    frame: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  // Create a simple tray icon (will be replaced with actual icon)
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Create a default icon if file doesn't exist
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🎤 Écoute active',
      type: 'checkbox',
      checked: isListening,
      click: (menuItem) => {
        if (menuItem.checked) {
          startListening();
        } else {
          stopListening();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🌐 Ouvrir Assistant TDAH',
      click: () => {
        shell.openExternal(WEB_APP_URL);
      }
    },
    {
      label: '⚙️ Paramètres',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Quitter',
      click: () => {
        app.isQuitting = true;
        stopListening();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Assistant TDAH - En attente de "Hey Assistant"');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Initialize Porcupine wake word detection
async function initPorcupine() {
  try {
    const fs = require('fs');
    
    // Check if custom keyword file exists
    let keywordPaths = [];
    let modelPath = undefined;
    
    if (fs.existsSync(CUSTOM_KEYWORD_PATH) && fs.existsSync(FRENCH_MODEL_PATH)) {
      console.log('Using custom French wake word: hey-assistant_fr.ppn');
      keywordPaths = [CUSTOM_KEYWORD_PATH];
      modelPath = FRENCH_MODEL_PATH;
      
      porcupine = new Porcupine(
        PICOVOICE_ACCESS_KEY,
        keywordPaths,
        [0.5], // sensitivity
        modelPath
      );
    } else {
      // Fallback to built-in keyword
      console.log('Custom keyword not found, using built-in "Hey Google"');
      porcupine = new Porcupine(
        PICOVOICE_ACCESS_KEY,
        [BuiltinKeyword.HEY_GOOGLE],
        [0.5]
      );
    }
    
    console.log('Porcupine initialized successfully');
    console.log('Frame length:', porcupine.frameLength);
    console.log('Sample rate:', porcupine.sampleRate);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Porcupine:', error);
    return false;
  }
}

// Start listening for wake word
async function startListening() {
  if (isListening) return;
  
  if (!porcupine) {
    const initialized = await initPorcupine();
    if (!initialized) {
      showNotification('Erreur', 'Impossible d\'initialiser la détection vocale');
      return;
    }
  }

  try {
    const { PvRecorder } = require('@picovoice/pvrecorder-node');
    
    // Get available audio devices
    const devices = PvRecorder.getAvailableDevices();
    console.log('Available audio devices:', devices);
    
    // Use default device (index -1)
    audioRecorder = new PvRecorder(porcupine.frameLength, -1);
    audioRecorder.start();
    
    isListening = true;
    updateTrayMenu();
    showNotification('Assistant TDAH', 'Écoute active - Dites "Hey Assistant"');
    
    console.log('Started listening for wake word...');
    
    // Process audio in loop
    processAudio();
    
  } catch (error) {
    console.error('Failed to start listening:', error);
    showNotification('Erreur', 'Impossible d\'accéder au microphone');
    isListening = false;
  }
}

// Process audio frames
async function processAudio() {
  if (!isListening || !audioRecorder || !porcupine) return;
  
  try {
    const pcm = await audioRecorder.read();
    const keywordIndex = porcupine.process(pcm);
    
    if (keywordIndex >= 0) {
      console.log('Wake word detected!');
      onWakeWordDetected();
    }
    
    // Continue processing if still listening
    if (isListening) {
      setImmediate(processAudio);
    }
  } catch (error) {
    console.error('Audio processing error:', error);
    if (isListening) {
      // Retry after a short delay
      setTimeout(processAudio, 100);
    }
  }
}

// Stop listening
function stopListening() {
  isListening = false;
  
  if (audioRecorder) {
    try {
      audioRecorder.stop();
      audioRecorder.release();
    } catch (e) {}
    audioRecorder = null;
  }
  
  updateTrayMenu();
  console.log('Stopped listening');
}

// Handle wake word detection
function onWakeWordDetected() {
  console.log('Opening web app...');
  
  // Show notification
  showNotification('Hey Assistant!', 'Ouverture de l\'assistant...');
  
  // Play a sound feedback (optional)
  // shell.beep();
  
  // Open the web app
  shell.openExternal(WEB_APP_URL + '/capture');
  
  // Optionally pause listening briefly to avoid multiple triggers
  stopListening();
  setTimeout(() => {
    if (!isListening) {
      startListening();
    }
  }, 3000);
}

// Show system notification
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      silent: true
    }).show();
  }
}

// Update tray menu to reflect current state
function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isListening ? '🎤 Écoute active' : '🔇 Écoute inactive',
      type: 'checkbox',
      checked: isListening,
      click: (menuItem) => {
        if (menuItem.checked) {
          startListening();
        } else {
          stopListening();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🌐 Ouvrir Assistant TDAH',
      click: () => {
        shell.openExternal(WEB_APP_URL);
      }
    },
    {
      label: '⚙️ Paramètres',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Quitter',
      click: () => {
        app.isQuitting = true;
        stopListening();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(isListening ? 'Assistant TDAH - Écoute "Hey Assistant"' : 'Assistant TDAH - Écoute inactive');
}

// IPC handlers for renderer process
ipcMain.handle('get-status', () => {
  return { isListening, webAppUrl: WEB_APP_URL };
});

ipcMain.handle('start-listening', async () => {
  await startListening();
  return isListening;
});

ipcMain.handle('stop-listening', () => {
  stopListening();
  return isListening;
});

ipcMain.handle('open-webapp', () => {
  shell.openExternal(WEB_APP_URL);
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();
  
  // Auto-start listening
  setTimeout(async () => {
    await startListening();
  }, 1000);
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows are closed
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopListening();
  if (porcupine) {
    porcupine.release();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
