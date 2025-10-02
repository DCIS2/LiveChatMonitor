const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { TikTokLiveConnection } = require('tiktok-live-connector');

let connections = {};
let buffers = {};
let currentPinnedItems = [];
let pinnedWindow = null;
let userManuallyOpenedPinnedWindow = false;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, '../../assets/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `${path.join(__dirname, '../../dist/index.html')}`;

  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(startUrl);
  }
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-fail-load', (_event, _code, description) => {
    console.error('Main window failed to load:', description);
  });
}


function createPinnedWindow() {
  if (pinnedWindow) {
    pinnedWindow.focus();
    return;
  }

  pinnedWindow = new BrowserWindow({
    width: 750,
    height: 450,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const pinnedUrl = isDev
    ? 'http://localhost:5173/pinned.html'
    : `${path.join(__dirname, '../../dist/pinned.html')}`;

  pinnedWindow.loadURL(pinnedUrl);

  pinnedWindow.on('closed', () => {
    userManuallyOpenedPinnedWindow = false;
    pinnedWindow = null;
  });

  pinnedWindow.webContents.once('did-finish-load', () => {
    pinnedWindow.webContents.send('pinned-items-updated', currentPinnedItems);
  });
}

app.whenReady().then(createWindow);


ipcMain.on('open-pinned-window', () => {
  userManuallyOpenedPinnedWindow = true;

  if (!pinnedWindow || pinnedWindow.isDestroyed()) {
    createPinnedWindow();
  } else {
    pinnedWindow.show();
  }
});

ipcMain.on('pin-item', (_event, item) => {
  const itemId = item.event?.data?.uniqueId || item.event?.uniqueId;
  const alreadyPinned = currentPinnedItems.some(p => {
    const pId = p.event?.data?.uniqueId || p.event?.uniqueId;
    return pId === itemId;
  });

  if (!alreadyPinned) {
    currentPinnedItems.push(item);
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('pinned-items-updated', currentPinnedItems);
      }
    });
  }
});

ipcMain.on('unpin-item', (_event, index) => {
  currentPinnedItems.splice(index, 1);

  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('pinned-items-updated', currentPinnedItems);
    }
  });

  if (currentPinnedItems.length === 0 && !userManuallyOpenedPinnedWindow) {
    if (pinnedWindow && !pinnedWindow.isDestroyed()) {
      pinnedWindow.close();
    }
  }
});

ipcMain.on('update-pinned-items', (_event, updatedItems) => {
  currentPinnedItems = updatedItems;

  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('pinned-items-updated', updatedItems);
    }
  });

  if (updatedItems.length === 0 && !userManuallyOpenedPinnedWindow) {
    if (pinnedWindow && !pinnedWindow.isDestroyed()) {
      pinnedWindow.close();
    }
  }
});

ipcMain.on('start-monitor', (event, username) => {
  if (connections[username]) return;

  const connection = new TikTokLiveConnection(username);
  buffers[username] = [];
  connections[username] = connection;

  const forward = (type, data) => {
    const msg = { 
      type, 
      data, 
      timestamp: new Date().toISOString()
    };
    buffers[username].push(msg);
    event.sender.send('new-event', { username, msg });
  };

  connection.on('chat', data => forward('COMMENT', data));
  connection.on('gift', data => forward('GIFT', data));
  connection.on('subscribed', data => forward('SUBSCRIPTION', data));

  connection.connect().catch(err => {
    console.error('Connection error:', err);
    event.sender.send('new-event', { username, msg: { type: 'invalid_user' } });
  });
});

ipcMain.on('stop-monitor', (_event, username) => {
  if (connections[username]) {
    connections[username].disconnect();
    delete connections[username];
    delete buffers[username];
  }
});

// NEW: forward username to iPhone window
ipcMain.on('monitor:set-user', (_event, username) => {
  if (iphoneWindow && !iphoneWindow.isDestroyed()) {
    console.log("Main forwarding username to iPhone:", username);
    iphoneWindow.webContents.send('iphone:update-user', username);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
