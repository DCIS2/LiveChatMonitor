import React, { useState, useEffect } from 'react';

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
