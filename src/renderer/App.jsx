import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [username, setUsername]       = useState('');
  const [paused, setPaused]           = useState(false);
  const [buffer, setBuffer]           = useState([]);
  const [events, setEvents]           = useState([]);
  const [theme, setTheme]             = useState('dark');
  const [pinnedItems, setPinnedItems] = useState([]);
  const [slowMode, setSlowMode]       = useState(false);
  const [slowBuffer, setSlowBuffer]   = useState([]);
  const scrollRef                      = useRef(null);

  const toggleTheme = () =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // 1) Handle incoming events
  useEffect(() => {
    const handleNewEvent = ({ username, msg }) => {
      if (paused) {
        // paused: stash in pause-buffer
        setBuffer(b => [...b, msg]);
      }
      else if (slowMode) {
        // slowMode on: queue into slowBuffer
        setSlowBuffer(q => [...q, msg]);
      }
      else {
        // normal speed: render immediately
        setEvents(ev => [...ev, msg]);
        scrollToBottom();
      }
    };

    window.electronAPI.removeNewEventListener();
    window.electronAPI.onNewEvent(handleNewEvent);
    return () => window.electronAPI.removeNewEventListener();
  }, [paused, slowMode]);

  // 2) If slowMode is on and slowBuffer has items, drip them out every up to 3.25s
  useEffect(() => {
    if (!slowMode || slowBuffer.length === 0) return;

    const timer = setTimeout(() => {
      const next = slowBuffer[0];
      setEvents(ev => {
        const updated = [...ev, next];
        scrollToBottom();
        return updated;
      });
      setSlowBuffer(q => q.slice(1));
    }, 3250);

    return () => clearTimeout(timer);
  }, [slowBuffer, slowMode]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const startMonitoring = () => {
    setEvents([]);
    setBuffer([]);
    setSlowBuffer([]);
    setPinnedItems([]);
    setPaused(false);
    setSlowMode(false);
    window.electronAPI.startMonitor(username);
  };

  const togglePause = () => {
    if (paused) {
      // resuming: flush pause-buffer
      setEvents(ev => [...ev, ...buffer]);
      setBuffer([]);
      scrollToBottom();
    }
    setPaused(p => !p);
  };

  const toggleSlowMode = () => {
    setSlowMode(on => {
      if (on) {
        // turning OFF slow mode → flush any queued items at once
        setEvents(ev => [...ev, ...slowBuffer]);
        setSlowBuffer([]);
        scrollToBottom();
      }
      return !on;
    });
  };

  // pin/unpin logic unchanged
  const pinComment = (msg, index) => {
    setPinnedItems(prev => {
      const exists = prev.some(x => x.index === index);
      if (exists) return prev.filter(x => x.index !== index);
      return [...prev, { index, data: msg.data }];
    });
  };

  const formatEvent = e => {
    const name = e.nickname || e.user?.nickname || 'Unknown';
    const id   = e.uniqueId || e.user?.uniqueId   || 'Unknown';
    if (e.comment) return `${id} | ${name} | ${e.comment}`;
    if (e.common?.describe)
      return `${id} | ${name} | sent "${e.common.describe}"`;
    return `${id} | ${name} | subscribed!`;
  };

  return (
    <div
      style={{
        height:          '100vh',
        display:         'flex',
        flexDirection:   'column',
        fontFamily:      'sans-serif',
        backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5',
        color:           theme === 'dark' ? '#e0e0e0' : '#000'
      }}
    >
      {/* HEADER & CONTROLS */}
      <div
        style={{
          padding:         '1rem',
          borderBottom:    '1px solid #ccc',
          position:        'sticky',
          top:             0,
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
          zIndex:          10
        }}
      >
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

        <button onClick={toggleSlowMode} style={{ marginLeft: '0.5rem' }}>
          {slowMode ? 'Normal Speed' : 'Slow Mode'}
        </button>

        <button onClick={toggleTheme} style={{ marginLeft: '0.5rem' }}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Pinned Items + Copy Button */}
        {pinnedItems.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              display:   'flex',
              flexWrap:  'wrap',
              gap:       '0.5rem'
            }}
          >
            {pinnedItems.map(pin => (
              <div
                key={pin.index}
                style={{
                  padding:         '0.5rem',
                  backgroundColor: theme === 'dark' ? '#333' : '#eee',
                  border:          '1px solid #888',
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '0.5rem'
                }}
              >
                {/* Unpin */}
                <button
                  onClick={() =>
                    setPinnedItems(prev =>
                      prev.filter(x => x.index !== pin.index)
                    )
                  }
                  title="Unpin"
                  style={{
                    background: 'none',
                    border:     'none',
                    padding:    0,
                    cursor:     'pointer',
                    color:      '#f39c12',
                    fontSize:   '20px'
                  }}
                >
                  <span className="material-icons">close</span>
                </button>

                {/* Pinned Text */}
                <span>{formatEvent(pin.data)}</span>

                {/* Copy */}
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(formatEvent(pin.data))
                  }
                  title="Copy pinned text"
                  style={{
                    background: 'none',
                    border:     'none',
                    padding:    0,
                    cursor:     'pointer',
                    color:      '#3498db',
                    fontSize:   '18px'
                  }}
                >
                  <span className="material-icons">content_copy</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EVENTS TABLE */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}
        ref={scrollRef}
      >
        <table
          style={{
            width:          '100%',
            borderCollapse: 'collapse',
            tableLayout:    'fixed'
          }}
        >
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
              const id       = uniqueId || e.data.user?.uniqueId || 'unknown';
              const isPinned = pinnedItems.some(p => p.index === i);
              const message  = comment || common?.describe || 'Subscribed!';

              return (
                <tr key={i}>
                  <td>
                    <button
                      onClick={() => pinComment(e, i)}
                      title={isPinned ? 'Unpin comment' : 'Pin comment'}
                      style={{
                        background: 'none',
                        border:     'none',
                        padding:    0,
                        cursor:     'pointer',
                        color:      isPinned ? '#f39c12' : '#3498db',
                        fontSize:   '20px',
                        transform:  isPinned ? 'rotate(45deg)' : 'none',
                        transition: 'transform 0.2s ease, color 0.2s ease'
                      }}
                    >
                      <span className="material-icons">push_pin</span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'left' }}>{e.type}</td>
                  <td style={{ textAlign: 'left' }}>{id}</td>
                  <td style={{ textAlign: 'left' }}>
                    {nickname || e.data.user?.nickname || 'Unknown'}
                  </td>
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
