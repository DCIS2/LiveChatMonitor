const { app, BrowserWindow, ipcMain } = require('electron');
const { TikTokLiveConnection } = require('tiktok-live-connector');

let connections = {};
let buffers = {};

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
