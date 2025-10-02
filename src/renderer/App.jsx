import React, { useState, useEffect, useRef } from 'react';
import TikTokUsernameField from './TikTokUsernameField';

export default function App() {
  console.log('App.jsx mounted');
  const [username, setUsername] = useState('');
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState([]);
  const [events, setEvents] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [pinnedItems, setPinnedItems] = useState([]);
  const [slowMode, setSlowMode] = useState(false);
  const [slowBuffer, setSlowBuffer] = useState([]);
  const [showPinsDialog, setShowPinsDialog] = useState(false);
  const [userClosedDialog, setUserClosedDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 100, y: 100 });
  const dragRef = useRef(null);

  // Scroll handling
  const scrollRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [pendingScroll, setPendingScroll] = useState(false);

  const [filters, setFilters] = useState({
    comment: true,
    gift: true,
    subscription: true
  });

  const [searchText, setSearchText] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterMode, setFilterMode] = useState(false);

  const buttonStyle = {
    padding: '0.4rem .5rem',
    backgroundColor: '#800080',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    marginTop: '0.5rem',
    fontSize: '.9rem'
  };

  const toggleTheme = () => {
    setTheme(t => {
      const newTheme = t === 'dark' ? 'light' : 'dark';
      window.electronAPI?.updatePinnedTheme?.(newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    const stopElectronMonitor = () => {
      window.electronAPI?.stopMonitor?.();
    };
    window.addEventListener('beforeunload', stopElectronMonitor);
    return () => {
      window.removeEventListener('beforeunload', stopElectronMonitor);
      stopElectronMonitor();
    };
  }, []);

  useEffect(() => {
    console.log('Registering pinned-items-updated listener');
    window.electronAPI?.onPinnedItemsUpdated((data) => {
      console.log('App.jsx received pinned-items-updated:', data);
      setPinnedItems(prev => {
        const newData = JSON.stringify(data || []);
        const oldData = JSON.stringify(prev || []);
        return newData !== oldData ? data || [] : prev;
      });
    });
  }, []);

  // New events feed
  useEffect(() => {
    const handleNewEvent = ({ username, msg }) => {
      if (paused) {
        setBuffer(b => [...b, msg]);
      } else if (slowMode) {
        setSlowBuffer(q => [...q, msg]);
      } else {
        setEvents(e => [...e, msg]);
        if (isAtBottomRef.current) {
          setPendingScroll(true);
        }
      }
    };

    window.electronAPI?.removeNewEventListener?.();
    window.electronAPI?.onNewEvent?.(handleNewEvent);

    return () => {
      window.electronAPI?.removeNewEventListener?.();
    };
  }, [paused, slowMode]);

  // Slow mode drain
  useEffect(() => {
    if (!slowMode || slowBuffer.length === 0) return;

    const timer = setTimeout(() => {
      const next = slowBuffer[0];
      setEvents(e => [...e, next]);
      if (isAtBottomRef.current) {
        setPendingScroll(true);
      }
      setSlowBuffer(q => q.slice(1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [slowBuffer, slowMode]);

  // Perform scroll-to-bottom when flagged
  useEffect(() => {
    if (pendingScroll && scrollRef.current) {
      // Use RAF to avoid jank and jumpiness; set to exact bottom
      const el = scrollRef.current;
      const run = () => {
        el.scrollTop = el.scrollHeight - el.clientHeight;
        setPendingScroll(false);
      };
      // Two RAFs to ensure layout/paint has settled
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(run);
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [events, pendingScroll]);

  useEffect(() => {
    if (pinnedItems.length > 0 && !showPinsDialog && !userClosedDialog) {
      setShowPinsDialog(true);
    }
    if (pinnedItems.length === 0 && showPinsDialog) {
      setShowPinsDialog(false);
      setUserClosedDialog(false);
    }
  }, [pinnedItems, showPinsDialog, userClosedDialog]);

  useEffect(() => {
    window.electronAPI?.updatePinnedItems?.(pinnedItems);
  }, [pinnedItems]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragRef.current) {
        setDialogPosition(prev => ({
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

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    const scrollHeight = el.scrollHeight;

    // Increased tolerance to absorb tiny layout changes and sticky header offsets
    const atBottom = Math.abs(scrollTop + clientHeight - scrollHeight) <= 20;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const getRowHeight = () => {
    const row = scrollRef.current?.querySelector('tbody tr');
    return row?.offsetHeight || 40;
  };

  const scrollToBottom = () => {
    // Only perform if user is at bottom; use ref to avoid stale state
    if (isAtBottomRef.current && scrollRef.current) {
      const el = scrollRef.current;
      // Use RAF for smoothness; target exact bottom
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - el.clientHeight;
      });
    }
  };

	  const startMonitoring = () => {
	  setEvents([]);
	  setBuffer([]);
	  setSlowBuffer([]);
	  setPinnedItems([]);
	  setPaused(false);
	  setSlowMode(false);
	  window.electronAPI?.startMonitor?.(username);
	  // 👆 removed setIphoneUser call
	  // After reset, ensure we consider ourselves at bottom
	  isAtBottomRef.current = true;
	  setIsAtBottom(true);
	  setPendingScroll(true);
	};


  const togglePause = () => {
    if (paused) {
      setEvents(e => [...e, ...buffer]);
      setBuffer([]);
      // Will only scroll if user is at bottom
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
        setUserClosedDialog(false);
        window.electronAPI?.openPinnedWindow?.();
        setTimeout(() => {
          window.electronAPI?.updatePinnedItems?.(updated);
        }, 500);
      } else {
        window.electronAPI?.updatePinnedItems?.(updated);
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
    ) return 'subscription';

    if (describe) return 'gift';
    if (comment) return 'comment';
    return 'comment';
  };

  const formatEvent = e => {
    const data = e.data || e;
    const name = data.nickname || data.user?.nickname || 'Unknown';
    const id = data.uniqueId || data.user?.uniqueId || 'Unknown';

    let comment = data.comment || data.rawComment || '';

    let giftImage = '';
    const isGift = e.type?.toLowerCase() === 'gift';

    if (isGift) {
      const giftName =
        (data.giftName && data.giftName.trim()) ||
        (data.gift?.giftName && data.gift?.giftName.trim()) ||
        (data.gift?.name && data.gift?.name.trim()) ||
        (data.common?.giftName && data.common?.giftName.trim()) ||
        (data.common?.describe && data.common?.describe.trim()) ||
        (data.label && data.label.trim()) ||
        (data.description && data.description.trim()) ||
        (data.gift?.id && `Gift ID: ${data.gift.id}`) ||
        'Unknown Gift';

      const qty = data.gift?.repeatCount || data.repeatCount || 1;
      comment = `${giftName} x ${qty}`;

      giftImage =
        data.gift?.image?.url ||
        data.gift?.image?.src ||
        (Array.isArray(data.gift?.image?.urls) ? data.gift.image.urls[0] : '') ||
        (Array.isArray(data.gift?.image?.url_list) ? data.gift.image.url_list[0] : '') ||
        data.giftPictureUrl ||
        '';
    }

    if (e.type?.toLowerCase() === 'subscription') {
      comment =
        comment.trim() ||
        data.subInfo?.describe ||
        data.subInfo?.subLevelName ||
        'New subscription';
    }

    if (!comment || !comment.trim()) {
      comment = '[No message content]';
    }

    return { id, name, comment, giftImage };
  };

  const handleFilterChange = type => {
    const active = Object.values(filters).filter(Boolean).length;
    if (filters[type] && active === 1) return;
    setFilters(f => ({ ...f, [type]: !f[type] }));
  };

  const normalize = s => (s || '').toString().toLowerCase();

  const matchesUser = (event, q) => {
    if (!q) return false;
    const { id, name } = formatEvent(event);
    const needle = normalize(q);
    return normalize(id).includes(needle) || normalize(name).includes(needle);
  };

  const matchesText = (event, q) => {
    if (!q) return false;
    const { comment } = formatEvent(event);
    const needle = normalize(q);
    return normalize(comment).includes(needle);
  };

  const renderHighlighted = (text, query) => {
    const s = text ?? '';
    const q = query?.trim();
    if (!q) return s;
    try {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      const parts = s.split(regex);
      return parts.map((part, idx) =>
        regex.test(part) ? (
          <mark
            key={idx}
            style={{
              backgroundColor: '#ffc107',
              color: '#000',
              padding: '0 2px',
              borderRadius: '2px'
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    } catch {
      return s;
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        backgroundColor: theme === 'dark' ? '#121212' : '#f5f5f5',
        color: theme === 'dark' ? '#e0e0e0' : '#000'
      }}
    >
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #ccc',
          position: 'sticky',
          top: 20,
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
          zIndex: 8
        }}
      >
        <h2>TikTok Live Monitor</h2>

        <TikTokUsernameField value={username} onChange={setUsername} />
        <button onClick={startMonitoring} style={buttonStyle}>Start</button>
        <button onClick={togglePause} style={buttonStyle}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleSlowMode} style={buttonStyle}>
          {slowMode ? 'Normal Speed' : 'Slow Mode'}
        </button>
        <button onClick={toggleTheme} style={buttonStyle}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={() => window.electronAPI?.openPinnedWindow?.()}
          style={buttonStyle}
        >
          View Pinned Items
        </button>

        <div style={{ marginTop: '1rem' }}>
          <strong>Filter:</strong>
          {['comment', 'gift', 'subscription'].map(type => (
            <label key={type} style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                checked={filters[type]}
                onChange={() => handleFilterChange(type)}
                style={{ marginRight: '0.25rem' }}
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          <input
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            placeholder="Search user (ID or name)"
            style={{
              marginRight: '0.25rem',
              padding: '.25rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '150px'
            }}
          />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search text"
            style={{
              marginRight: '0.25rem',
              padding: '0.25rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '150px'
            }}
          />
          <span
            className="material-icons"
            style={{
              fontSize: '30px',
              cursor: 'pointer',
              color: filterMode ? '#FFA500' : '#007BFF'
            }}
            onClick={() => setFilterMode(m => !m)}
            title="Toggle filter mode"
          >
            filter_list
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: 'calc(100vh - 220px)',
          overflowY: 'auto',
          border: '1px solid #444',
          borderRadius: '6px',
          padding: '.4rem',
          position: 'relative',
          zIndex: 3,
          // Prevent browser scroll anchoring (which can cause jumpiness)
          overflowAnchor: 'none'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '5px 6px'
          }}
        >
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '50%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead
            style={{
              position: 'sticky',
              top: 14,
              backgroundColor: theme === 'dark' ? '#1e1e1e' : '#eee',
              color: theme === 'dark' ? '#fff' : '#000',
              fontWeight: 'bold',
              zIndex: 5,
              boxShadow:
                theme === 'dark'
                  ? '0 2px 4px rgba(0,0,0,0.6)'
                  : '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <tr
              style={{
                height: '48px',
                backgroundColor: '#800080',
                color: '#fff'
              }}
            >
              <td style={{ textAlign: 'center' }}></td>
              <td style={{ textAlign: 'left' }}>User ID</td>
              <td style={{ textAlign: 'left' }}>Screen Name</td>
              <td style={{ textAlign: 'left' }}>Comment / Event</td>
              <td style={{ textAlign: 'left' }}>Time</td>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const type = getEventType(e);
              if (!filters[type]) return null;

              const { id, name, comment, giftImage } = formatEvent(e);

              if (filterMode) {
                const userHit = matchesUser(e, searchUser);
                const textHit = matchesText(e, searchText);
                const anyQuery = searchUser?.trim() || searchText?.trim();
                if (anyQuery && !userHit && !textHit) return null;
              }

              const isPinned = pinnedItems.some(p => p.index === i);

              return (
                <tr
                  key={`${id}-${i}`}
                  style={{
                    height: '40px',
                    textAlign: 'left',
                    marginBottom: '-4px',
                    borderBottom: '1px solid #444',
                    backgroundColor: theme === 'dark' ? '#373737' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                    <button
                      onClick={() => pinComment(e, i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transform: isPinned ? 'rotate(45deg)' : 'none',
                        color: isPinned ? '#FFA500' : '#007BFF',
                        fontSize: '20px'
                      }}
                    >
                      <span className="material-icons">push_pin</span>
                    </button>
                  </td>
                  <td style={{ padding: '0.25rem' }}>
                    {renderHighlighted(id, searchUser)}
                  </td>
                  <td style={{ padding: '0.25rem' }}>
                    {renderHighlighted(name, searchUser)}
                  </td>
                  <td style={{ padding: '0.25rem' }}>
                    {renderHighlighted(comment, searchText)}
                    {giftImage && (
                      <div style={{ marginTop: '4px' }}>
                        <img
                          src={giftImage}
                          alt={e.data?.giftName || 'Gift'}
                          style={{ maxHeight: '40px', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.25rem' }}>
                    {formatTimestamp(e.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
