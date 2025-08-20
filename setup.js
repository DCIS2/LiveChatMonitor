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
  start: 'npx concurrently "vite" "electron ."',
  build: 'electron-builder'
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

execSync('npm install react react-dom tiktok-live-connector', { stdio: 'inherit' });
execSync('npm install --save-dev electron vite @vitejs/plugin-react electron-builder concurrently', { stdio: 'inherit' });

fs.writeFileSync('src/main/index.js', `const { app, BrowserWindow, ipcMain } = require('electron');
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
`);

fs.writeFileSync('src/main/preload.js', `const { contextBridge, ipcRenderer } = require('electron');

let eventListener = null;

contextBridge.exposeInMainWorld('electronAPI', {
  startMonitor: (username) => ipcRenderer.send('start-monitor', username),

  onNewEvent: (callback) => {
    if (eventListener) {
      ipcRenderer.removeListener('new-event', eventListener);
    }
    eventListener = (_event, data) => callback(data);
    ipcRenderer.on('new-event', eventListener);
  },

  removeNewEventListener: () => {
    if (eventListener) {
      ipcRenderer.removeListener('new-event', eventListener);
      eventListener = null;
    }
  },

  getBuffer: (username) => ipcRenderer.send('get-buffer', username),
  onBufferedEvents: (callback) => ipcRenderer.on('buffered-events', (event, data) => callback(data))
});
`);

fs.writeFileSync('src/renderer/App.jsx', `import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [username, setUsername] = useState('');
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState([]);
  const [events, setEvents] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [pinned, setPinned] = useState(null);
  const scrollRef = useRef(null);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const handleNewEvent = ({ username, msg }) => {
      if (paused) {
        setBuffer(prev => [...prev, msg]);
      } else {
        setEvents(prev => [...prev, msg]);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      }
    };

    window.electronAPI.removeNewEventListener();
    window.electronAPI.onNewEvent(handleNewEvent);

    return () => {
      window.electronAPI.removeNewEventListener();
    };
  }, [paused]);

  const startMonitoring = () => window.electronAPI.startMonitor(username);

  const togglePause = () => {
    if (paused) {
      setEvents(prev => [...prev, ...buffer]);
      setBuffer([]);
    }
    setPaused(!paused);
  };

  const pinComment = (msg) => setPinned(msg);

  const formatEvent = (e) => {
    const name = e.nickname || e.user?.nickname || "Unknown";
    const id = e.uniqueId || e.user?.uniqueId || "Unknown";
    if (e.comment) return \`[\${id}] \${name} :: \${e.comment}\`;
    if (e.common?.describe) return \`[\${id}] \${name} :: sent "\${e.common.describe}"\`;
    return \`[\${id}] \${name} :: subscribed!\`;
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5',
      color: theme === 'dark' ? '#e0e0e0' : '#000'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #ccc',
        position: 'sticky',
        top: 0,
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
        zIndex: 10
      }}>
        <h2>TikTok Live Monitor</h2>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="TikTok Username"
          style={{ marginRight: '0.5rem' }}
        />
        <button onClick={startMonitoring}>Start</button>
        <button onClick={togglePause} style={{ marginLeft: '0.5rem' }}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleTheme} style={{ marginLeft: '0.5rem' }}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {pinned && (
          <div style={{
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: theme === 'dark' ? '#333' : '#eee',
            border: '1px solid #888'
          }}>
            <strong>Pinned:</strong> {formatEvent(pinned.data)}
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem'
      }} ref={scrollRef}>
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => pinComment(e)}>📌</button>
              <p style={{ margin: 0 }}>[{e.type}] {formatEvent(e.data)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

fs.writeFileSync('src/renderer/main.jsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

fs.writeFileSync('src/renderer/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>TikTok Live Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
`);

fs.writeFileSync('vite.config.js', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
`);

fs.writeFileSync('electron-builder.json', `{
  "appId": "com.tiktok.monitor",
  "productName": "TikTokLiveMonitor",
  "directories": {
    "buildResources": "assets",
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "src/main/**/*"
  ],
  "extraMetadata": {
    "main": "src/main/index.js"
  },
  "win": {
    "target": "nsis"
  },
  "mac": {
    "target": "dmg"
  },
  "linux": {
    "target": "AppImage"
  }
}`);
