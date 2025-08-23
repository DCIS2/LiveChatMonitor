const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = process.cwd();
const dirs = ['src', 'src/main', 'src/renderer', 'public', 'logs'];

dirs.forEach(dir => {
  const fullPath = path.join(root, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

execSync('npm init -y', { stdio: 'inherit' });

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath));
pkg.main = 'src/main/index.js';
pkg.scripts = {
  start: 'npx concurrently "vite" "electron src/main/index.js"',
  build: 'electron-builder'
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

execSync('npm install react react-dom tiktok-live-connector', { stdio: 'inherit' });
execSync('npm install --save-dev electron vite @vitejs/plugin-react electron-builder concurrently electron-is-dev', { stdio: 'inherit' });

fs.writeFileSync('src/main/index.js', `const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
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

  const startUrl = isDev
    ? 'http://localhost:5173'
    : \`file://\${path.join(__dirname, '../../dist/index.html')}\`;

  win.loadURL(startUrl);
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
`);
