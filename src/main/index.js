const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { TikTokLiveConnection } = require('tiktok-live-connector');

let connections = {};
let buffers = {};

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
	 icon: path.join(__dirname, '../../assets/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const isDev = require('electron-is-dev');
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../dist/index.html')}`;

  win.loadURL(startUrl);

  /* // Open DevTools after the page finishes loading
  win.webContents.on('did-finish-load', () => {
    win.webContents.openDevTools();
  });
 */
  // Optional: handle failed loads
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
  });
}

app.whenReady().then(createWindow);

ipcMain.on('start-monitor', (event, username) => {
  if (connections[username]) return;

  const connection = new TikTokLiveConnection(username);
  buffers[username] = [];
  connections[username] = connection;

  connection.on('chat', data => {
    const msg = { type: 'COMMENT', data };
    buffers[username].push(msg);
    event.sender.send('new-event', { username, msg });
  });

  connection.on('gift', data => {
    const msg = { type: 'GIFT', data };
    buffers[username].push(msg);
    event.sender.send('new-event', { username, msg });
  });

  connection.on('subscribed', data => {
    const msg = { type: 'SUBSCRIPTION', data };
    buffers[username].push(msg);
    event.sender.send('new-event', { username, msg });
  });

  connection.connect().catch(err => {
    console.error("Connection error:", err);
    event.sender.send('new-event', { username, msg: { type: 'invalid_user' } });
  });
});

ipcMain.on('stop-monitor', (event, username) => {
  if (connections[username]) {
    connections[username].disconnect();
    delete connections[username];
    delete buffers[username];
  }
});
