import React, { useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

function PinnedRenderer() {
  const [items, setItems] = useState([]);

  // NEW: Search states
  const [searchText, setSearchText] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterMode, setFilterMode] = useState(false);

  useEffect(() => {
    window.electronAPI?.onPinnedItemsUpdated((data) => {
      setItems(prev => {
        const newData = JSON.stringify(data || []);
        const oldData = JSON.stringify(prev || []);
        return newData !== oldData ? data || [] : prev;
      });
    });
  }, []);

  
  
  
  const normalize = s => (s || '').toString().toLowerCase();

  const renderHighlighted = (text, query) => {
    const s = text ?? '';
    const q = query?.trim();
    if (!q) return s;
    try {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      const parts = s.split(regex);
      return parts.map((part, idx) =>
        regex.test(part) ? (
          <mark key={idx} style={{ backgroundColor: '#ffc107', color: '#000', padding: '0 2px', borderRadius: '2px' }}>
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{
      margin: 0,
      backgroundColor: '#1e1e1e',
      color: '#fff',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Sticky Title Bar */}
      <div
        style={{
          backgroundColor: '#333',
          color: '#fff',
          padding: '0.5rem 1rem',
          fontWeight: 'bold',
          WebkitAppRegion: 'drag',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
        Pinned Messages
        <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* NEW: Search controls */}
          <input
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            placeholder="Search user"
            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#1e1e1e', color: '#fff' }}
          />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search text"
            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#1e1e1e', color: '#fff' }}
          />
          <span
  className="material-icons"
  style={{
    fontSize: '35px',
    cursor: 'pointer',
    color: filterMode ? '#FFA500' : '#007BFF'
  }}
  onClick={() => setFilterMode(m => !m)}
  title="Toggle filter mode"
>
  filter_list
</span>
          <Suspense fallback={<span style={{ fontSize: '1.2rem' }}>❌</span>}>
            <button
              onClick={() => window.close()}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
              title="Close"
            >
              ❌
            </button>
          </Suspense>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem'
      }}>
        {items.length === 0 ? (
          <div style={{ color: '#ccc', textAlign: 'center', marginTop: '2rem' }}>
            No pinned messages yet.
          </div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: '5px 6px' }}>
            <colgroup>
              <col style={{ width: '45px' }} />  {/* Unpin */}
              <col />                            {/* Unique ID */}
              <col />                            {/* Screen Name */}
              <col style={{ minWidth: '300px' }} /> {/* Message */}
              <col style={{ width: '60px' }} />  {/* Copy Button */}
            </colgroup>
            <thead>
              <tr style={{
                backgroundColor: '#800080',
                color: '#fff',
                position: 'sticky',
                top: 0,
                zIndex: 999
              }}>
                <th></th>
                <th>Unique ID</th>
                <th>Screen Name</th>
                <th>Message</th>
                <th>Copy</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pin, i) => {
                try {
                  const data = pin.event?.data || pin.event || {};
                  if (!data) return null;

                  const id = data.uniqueId || data.user?.uniqueId || pin.event?.uniqueId || 'Unknown';
				  const name = data.nickname || data.user?.nickname || pin.event?.nickname || 'Unknown';
                  let comment =
                    data.comment ||
                    data.rawComment ||
                    data.giftName ||
                    data.gift?.giftName ||
                    data.gift?.name ||
                    data.common?.giftName ||
                    data.common?.describe ||
                    data.label ||
                    data.description ||
                    data.message ||
                    data.subInfo?.describe ||
                    data.subInfo?.subLevelName ||
                    '—';

                  if ((pin.event?.type || data.type)?.toLowerCase() === 'gift') {
                    const giftName =
                      data.giftName ||
                      data.gift?.giftName ||
                      data.gift?.name ||
                      data.common?.giftName ||
                      data.common?.describe ||
                      data.label ||
                      data.description ||
                      'Unknown Gift';
                    const qty = data.gift?.repeatCount || data.repeatCount || 1;
                    comment = `sent "${giftName}" x "${qty}"`;
                  }

                  const giftImage =
                    data.gift?.image?.url ||
                    data.gift?.image?.src ||
                    (Array.isArray(data.gift?.image?.urls) ? data.gift.image.urls[0] : '') ||
                    (Array.isArray(data.gift?.image?.url_list) ? data.gift.image.url_list[0] : '') ||
                    data.giftPictureUrl ||
                    '';

                  // FIXED: formatted copy string
                  const formatted = giftImage
                    ? `${id} | ${name} | ${comment} | ${giftImage}`
                    : `${id} | ${name} | ${comment}`;

                  // NEW: Filter mode logic
                  if (filterMode) {
				  const userQuery = searchUser.trim();
				  const textQuery = searchText.trim();

				  const userHit = userQuery
					? normalize(id).includes(normalize(userQuery)) || normalize(name).includes(normalize(userQuery))
					: false;

				  const textHit = textQuery
					? normalize(comment).includes(normalize(textQuery))
					: false;

				  // If either query is provided and neither matches, hide the row
				  if ((userQuery || textQuery) && !userHit && !textHit) {
					return null;
				  }
				}



                  return (
                    <tr key={`${id}-${i}`} style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>
                      {/* Unpin button */}
                      <td>
                        <Suspense fallback={<span style={{ fontSize: '1.2rem' }}>📌</span>}>
                          <button
                            onClick={() => {
                              const updated = items.filter((_, index) => index !== i);
                              setItems(updated);
                              window.electronAPI?.send('update-pinned-items', updated);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#FFA500'
                            }}
                          >
                            <span className="material-icons">push_pin</span>
                          </button>
                        </Suspense>
                      </td>

                      {/* Unique ID */}
                      <td>{renderHighlighted(id, searchUser)}</td>

                      {/* Screen Name */}
                      <td>{renderHighlighted(name, searchUser)}</td>

                       {/* Message + optional gift image */}
                      <td style={{ wordBreak: 'break-word' }}>
                        {renderHighlighted(comment, searchText)}
                        {giftImage && (
                          <div style={{ marginTop: '4px' }}>
                            <img
                              src={giftImage}
                              alt={data.giftName || 'Gift'}
                              style={{ maxHeight: '40px', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Copy button */}
                      <td>
						  <Suspense fallback={<span className="material-icons" style={{ color: '#00FF00' }}>content_copy</span>}>
							<button
							  onClick={() => handleCopy(formatted)}
							  style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								color: '#00FF00',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							  }}
							  title="Copy to clipboard"
							>
							  <span className="material-icons">content_copy</span>
							</button>
						  </Suspense>
						</td>
                    </tr>
                  );
                } catch (err) {
                  console.error('Error rendering pinned item:', err);
                  return null;
                }
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PinnedRenderer />);