import React, { useState, useEffect, useRef } from 'react';

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

  const startMonitoring = () => {
    setEvents([]);
    setBuffer([]);
    setPinned(null);
    window.electronAPI.startMonitor(username);
  };

  const togglePause = () => {
    if (paused) {
      setEvents(prev => [...prev, ...buffer]);
      setBuffer([]);
    }
    setPaused(!paused);
  };

  const pinComment = (msg, index) => {
	setPinned({ index, data: msg.data });
	};

  const formatEvent = (e) => {
    const name = e.nickname || e.user?.nickname || "Unknown";
    const id = e.uniqueId || e.user?.uniqueId || "Unknown";
    if (e.comment) return `${id} |  ${name} |  ${e.comment}`;
    if (e.common?.describe) return `${id} |  ${name} |  sent "${e.common.describe}"`;
    return `${id} | ${name} | subscribed!`;
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
            border: '1px solid #888',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <button
              onClick={() => setPinned(null)}
              title="Unpin"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#f39c12',
                fontSize: '20px'
              }}
            >
              <span className="material-icons">close</span>
            </button>
            <strong>Pinned:</strong> {formatEvent(pinned.data)}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} ref={scrollRef}>
	  
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '150px' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th style={{ textAlign: 'left' }}>Type</th>
              <th style={{ textAlign: 'left' }}>Unique ID</th>
              <th style={{ textAlign: 'left' }}>Screen Name</th>
              <th style={{ textAlign: 'left' }}>Message</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const { uniqueId, nickname, comment, common } = e.data;
              const id = uniqueId || e.data.user?.uniqueId || 'unknown';
              const isPinned = pinned?.index === i;
              const message = comment || common?.describe || 'Subscribed!';

              return (
                <tr key={i}>
                  <td>
                    <button
                      onClick={() => pinComment(e, i)}
                      title={isPinned ? 'Unpin comment' : 'Pin comment'}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: isPinned ? '#f39c12' : '#3498db',
                        fontSize: '20px',
                        transform: isPinned ? 'rotate(45deg)' : 'none',
                        transition: 'transform 0.2s ease, color 0.2s ease'
                      }}
                    >
                      <span className="material-icons">push_pin</span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'left' }}>{e.type}</td>
                  <td style={{ textAlign: 'left' }}>{id}</td>
                  <td style={{ textAlign: 'left' }}>{nickname || e.data.user?.nickname || 'Unknown'}</td>
                  <td style={{ textAlign: 'left' }}>{message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
