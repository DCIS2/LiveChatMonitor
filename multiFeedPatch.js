const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const indexPath = path.join(srcDir, 'index.js');
const appPath = path.join(srcDir, 'App.jsx');

function validateRepoStructure() {
  if (!fs.existsSync(srcDir) || !fs.existsSync(path.join(rootDir, 'package.json'))) {
    console.error('❌ Error: Please run this script from the root of your LiveChatMonitor repo.');
    process.exit(1);
  }
}

function patchIndexJs() {
  const content = `const { app, BrowserWindow, ipcMain } = require('electron');
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
`;

  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('✅ src/index.js patched.');
}

function patchAppJsx() {
  const content = `import React, { useState, useEffect } from 'react';

function App() {
  const [usernameInput, setUsernameInput] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [userEvents, setUserEvents] = useState({});

  const startMonitoringUser = () => {
    const username = usernameInput.trim();
    if (!username || activeUsers.includes(username)) return;

    window.electronAPI.startMonitor(username);
    setActiveUsers(prev => [...prev, username]);
    setUserEvents(prev => ({ ...prev, [username]: [] }));
    setUsernameInput('');
  };

  const stopMonitoringUser = (username) => {
    window.electronAPI.stopMonitor(username);
    setActiveUsers(prev => prev.filter(u => u !== username));
    setUserEvents(prev => {
      const copy = { ...prev };
      delete copy[username];
      return copy;
    });
  };

  useEffect(() => {
    const handleNewEvent = ({ username, msg }) => {
      setUserEvents(prev => ({
        ...prev,
        [username]: [...(prev[username] || []), msg]
      }));
    };

    window.electronAPI.removeNewEventListener();
    window.electronAPI.onNewEvent(handleNewEvent);

    return () => {
      window.electronAPI.removeNewEventListener();
    };
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Live Chat Monitor</h1>
      <input
        value={usernameInput}
        onChange={e => setUsernameInput(e.target.value)}
        placeholder="Enter TikTok username"
      />
      <button onClick={startMonitoringUser}>Start Monitoring</button>

      {activeUsers.map(username => (
        <div key={username} style={{ marginTop: '2rem' }}>
          <h2>{username}'s Feed</h2>
          <button onClick={() => stopMonitoringUser(username)}>Stop</button>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Content</th>
              </tr>
            </thead>
            <tbody>
              {(userEvents[username] || []).map((event, idx) => (
                <tr key={idx}>
                  <td>{event.type}</td>
                  <td>{JSON.stringify(event.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default App;
`;

  fs.writeFileSync(appPath, content, 'utf8');
  console.log('✅ src/App.jsx patched.');
}

function runPatch() {
  validateRepoStructure();
  patchIndexJs();
  patchAppJsx();
  console.log('🎉 Multi-feed monitoring patch applied successfully!');
}

runPatch();
