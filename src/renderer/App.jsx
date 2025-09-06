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
  const [showPinsDialog, setShowPinsDialog] = useState(false);
  const [userClosedDialog, setUserClosedDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 100, y: 100 });
  const dragRef = useRef(null);

  const [filters, setFilters]         = useState({
    comment: true,
    gift: true,
    subscription: true
  });
  const scrollRef = useRef(null);

  const toggleTheme = () =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    const stopElectronMonitor = () => {
      if (window.electronAPI?.stopMonitor) {
        window.electronAPI.stopMonitor();
      }
    };
    window.addEventListener('beforeunload', stopElectronMonitor);
    return () => {
      window.removeEventListener('beforeunload', stopElectronMonitor);
      stopElectronMonitor();
    };
  }, []);

  useEffect(() => {
    const handleNewEvent = ({ username, msg }) => {
      if (paused) {
        setBuffer(b => [...b, msg]);
      } else if (slowMode) {
        setSlowBuffer(q => [...q, msg]);
      } else {
        setEvents(e => [...e, msg]);
        scrollToBottom();
      }
    };
    window.electronAPI.removeNewEventListener();
    window.electronAPI.onNewEvent(handleNewEvent);
    return () => window.electronAPI.removeNewEventListener();
  }, [paused, slowMode]);

  useEffect(() => {
    if (!slowMode || slowBuffer.length === 0) return;
    const timer = setTimeout(() => {
      const next = slowBuffer[0];
      setEvents(e => {
        const updated = [...e, next];
        scrollToBottom();
        return updated;
      });
      setSlowBuffer(q => q.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [slowBuffer, slowMode]);

	useEffect(() => {
	  if (pinnedItems.length > 0 && !showPinsDialog && !userClosedDialog) {
		setShowPinsDialog(true);
	  }
	  if (pinnedItems.length === 0 && showPinsDialog) {
		setShowPinsDialog(false);
		setUserClosedDialog(false); // reset so next pin can reopen
	  }
	}, [pinnedItems, showPinsDialog, userClosedDialog]);

useEffect(() => {
  const handleMouseMove = (e) => {
    if (dragRef.current) {
      setDialogPosition((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, []);



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
      setEvents(e => [...e, ...buffer]);
      setBuffer([]);
      scrollToBottom();
    }
    setPaused(p => !p);
  };

  const toggleSlowMode = () => {
    setSlowMode(on => {
      if (on) {
        setEvents(e => [...e, ...slowBuffer]);
        setSlowBuffer([]);
        scrollToBottom();
      }
      return !on;
    });
  };

const pinComment = (msg, index) => {
  setPinnedItems(prev => {
    const exists = prev.some(x => x.index === index);
    const updated = exists
      ? prev.filter(x => x.index !== index)
      : [...prev, { index, event: msg }];

    if (!exists) {
      setUserClosedDialog(false); // ✅ Reset manual close flag

      // ✅ Trigger floating dialog if this is the first pin
      if (prev.length === 0) {
        window.electronAPI?.openPinnedDialog?.();
      }
    }

    return updated;
  });
};




  const getEventType = e => {
    const type = e.type?.toLowerCase();
    if (type === 'subscription') return 'subscription';
    if (type === 'gift') return 'gift';
    if (type === 'comment') return 'comment';

    const comment = e.comment || e.data?.comment || '';
    const describe = e.common?.describe || e.data?.common?.describe || '';
    const text = `${comment} ${describe}`.toLowerCase();

    if (
      text.includes('subscribed') ||
      text.includes('became a member') ||
      text.includes('joined') ||
      text.includes('is now a subscriber')
    ) {
      return 'subscription';
    }

    if (describe) return 'gift';
    if (comment) return 'comment';

    return 'comment';
  };

  const formatEvent = e => {
    const data = e.data || e;
    const name = data.nickname || data.user?.nickname || 'Unknown';
    const id   = data.uniqueId || data.user?.uniqueId || 'Unknown';
    const comment  = data.comment;
    const describe = data.common?.describe;
    const type = getEventType(e);

    if (type === 'subscription') return `${id} | ${name} | 🎉 Subscribed!`;
    if (type === 'gift') return `${id} | ${name} | sent "${describe}"`;
    if (type === 'comment') return `${id} | ${name} | ${comment}`;
    return `${id} | ${name} | Event`;
  };

  const handleFilterChange = type => {
    const active = Object.values(filters).filter(Boolean).length;
    if (filters[type] && active === 1) return;
    setFilters(f => ({ ...f, [type]: !f[type] }));
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
        <button onClick={togglePause} style={{ marginLeft: '0.5rem' }}>{paused ? 'Resume' : 'Pause'}</button>
        <button onClick={toggleSlowMode} style={{ marginLeft: '0.5rem' }}>{slowMode ? 'Normal Speed' : 'Slow Mode'}</button>
        <button onClick={toggleTheme} style={{ marginLeft: '0.5rem' }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
        <button onClick={() => setShowPinsDialog(true)} style={{ marginLeft: '0.5rem' }}>
          View Pinned Messages
        </button>

        <div style={{ marginTop: '1rem' }}>
          <strong>Filter:</strong>
          {['comment', 'gift', 'subscription'].map(type => (
            <label key={type} style={{ marginLeft: '1rem' }}>
              <input
                type="checkbox"
                checked={filters[type]}
                onChange={() => handleFilterChange(type)}
              />
              {' '}{type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '1rem', position: 'relative' }}>
        <div
          style={{
            height: 'calc(100vh - 220px)',
            overflowY: 'auto',
            border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc',
            borderRadius: '6px'
          }}
          ref={scrollRef}
        >
          <table
            style={{
              width: '100%',
              tableLayout: 'auto',
              borderCollapse: 'separate',
              borderSpacing: '5px 6px'
            }}
          >
            <colgroup>
              <col style={{ width: '40px' }} />
              <col />
              <col />
              <col style={{ minWidth: '300px' }} />
            </colgroup>

            <thead>
			  <tr style={{
				position: 'sticky',
				top: 0,
				backgroundColor: '#800080',
				zIndex: 5,
				borderBottom: '2px solid #aaa',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
			  }}>
				<th style={{ fontSize: '18px' }}></th>
				<th style={{ textAlign: 'left', fontSize: '18px' }}>Unique ID</th>
				<th style={{ textAlign: 'left', fontSize: '18px' }}>Screen Name</th>
				<th style={{ textAlign: 'left', fontSize: '18px' }}>Message</th>
			  </tr>
			</thead>

            <tbody>
              {events
                .filter(e => filters[getEventType(e)] ?? true)
                .map((e, i) => {
                  const { uniqueId, nickname } = e.data;
                  const id = uniqueId || e.data.user?.uniqueId || 'unknown';
                  const isPinned = pinnedItems.some(p => p.index === i);
                  const message = formatEvent(e);

                  return (
                    <tr
                      key={i}
                      style={{
                        backgroundColor: getEventType(e) === 'subscription'
                          ? (theme === 'dark' ? '#2c3e50' : '#dff9fb')
                          : theme === 'dark' ? '#1a1a1a' : '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        borderRadius: '4px'
                      }}
                    >
                      <td style={{ padding: '10px 6px' }}>
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
                      <td style={{ textAlign: 'left', padding: '10px 6px' }}>{id}</td>
                      <td style={{ textAlign: 'left', padding: '10px 6px' }}>{nickname || e.data.user?.nickname || 'Unknown'}</td>
                      <td style={{ textAlign: 'left', padding: '10px 6px', wordBreak: 'break-word' }}>{message}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pinned Messages Dialog */}
      {showPinsDialog && (
        <div style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxHeight: '70vh',
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
          border: '1px solid #aaa',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          padding: '1rem',
          overflowY: 'auto',
		  resize: 'both',
		  overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
			<h3>Pinned Messages</h3>
			<button onClick={() => {setShowPinsDialog(false); setUserClosedDialog(true); }}>Close</button>
          </div>
		  <div style={{ display: 'flex', justifyContent: 'left', marginBottom: '1rem' }}>
			<button onClick={() => {setPinnedItems([]); }}>Clear All</button>
		  </div>
          <table
            style={{
              width: '100%',
              tableLayout: 'auto',
              borderCollapse: 'separate',
              borderSpacing: '0 6px'
            }}
          >
            <colgroup>
              <col style={{ width: '40px' }} />
              <col />
              <col />
              <col style={{ minWidth: '300px' }} />
            </colgroup>

            <tbody>
              {pinnedItems.map(pin => {
                const { uniqueId, nickname, comment, common, user } = pin.event.data;
                const id = uniqueId || user?.uniqueId || 'unknown';
                const name = nickname || user?.nickname || 'Unknown';
                const type = getEventType(pin.event);
                const message = formatEvent(pin.event);

                return (
                  <tr
                    key={pin.index}
                    style={{
                      backgroundColor: type === 'subscription'
                        ? (theme === 'dark' ? '#2c3e50' : '#dff9fb')
                        : theme === 'dark' ? '#1a1a1a' : '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      borderRadius: '4px'
                    }}
                  >
                    <td style={{ padding: '10px 6px' }}>
                      <button
                        onClick={() => setPinnedItems(prev => prev.filter(x => x.index !== pin.index))}
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
                    </td>
                    <td style={{ textAlign: 'left', padding: '10px 6px' }}>{id}</td>
                    <td style={{ textAlign: 'left', padding: '10px 6px' }}>{name}</td>
                    <td style={{ textAlign: 'left', padding: '10px 6px', wordBreak: 'break-word' }}>{message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
