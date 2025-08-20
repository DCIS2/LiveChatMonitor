const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { TikTokLiveConnection } = require('tiktok-live-connector');

let connections = {};
let buffers = {};

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  win.loadURL('http://localhost:5173');
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

  connection.connect().catch(err => console.error("Connection error:", err));
});

ipcMain.on('get-buffer', (event, username) => {
  event.sender.send('buffered-events', { username, events: buffers[username] || [] });
});
