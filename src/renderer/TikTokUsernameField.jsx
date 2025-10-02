import React, { useState, useEffect, useRef } from 'react';

export default function TikTokUsernameField({ value, onChange }) {
  const [savedUsernames, setSavedUsernames] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Load saved usernames from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('tiktokUsernames') || '[]');
    setSavedUsernames(stored);
  }, []);

  // Save new username when input loses focus
  const handleBlur = () => {
    if (value && !savedUsernames.includes(value)) {
      const updated = [...savedUsernames, value];
      setSavedUsernames(updated);
      localStorage.setItem('tiktokUsernames', JSON.stringify(updated));
    }
  };

  // Delete a username from the list
  const handleDelete = (name) => {
    const updated = savedUsernames.filter(u => u !== name);
    setSavedUsernames(updated);
    localStorage.setItem('tiktokUsernames', JSON.stringify(updated));
    if (value === name) {
      onChange('');
    }
  };

  // Select a username from the dropdown
  const handleSelect = (name) => {
    onChange(name);
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fieldStyle = {
    padding: '6px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '14px',
    outline: 'none',
    height: '25px',
    boxSizing: 'border-box',
    color: '#000'
  };

  return (
<div
  ref={containerRef}
  style={{
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  }}
>
  {/* Combined input + dropdown button wrapper */}
<div
  style={{
    display: 'flex',
    width: '255px', // was 250px, now extended by 20px
    position: 'relative'
  }}
>
  {/* Input wrapper for dropdown anchoring */}
  <div style={{ position: 'relative', flex: '1 1 auto' }}>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="Enter TikTok username"
      style={{ ...fieldStyle, width: '100%' }}
      onFocus={() => setDropdownOpen(false)}
    />

    {dropdownOpen && (
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          maxHeight: '150px',
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}
      >
        {savedUsernames.length === 0 && (
          <div style={{ padding: '6px 10px', color: '#555' }}>No saved usernames</div>
        )}
        {[...savedUsernames].reverse().map((name, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px'
            }}
          >
            <span
              style={{ cursor: 'pointer', color: '#000' }}
              onClick={() => handleSelect(name)}
            >
              {name}
            </span>
            <span
              className="material-icons"
              style={{ color: '#d00', cursor: 'pointer' }}
              title="Delete username"
              onClick={() => handleDelete(name)}
            >
              delete
            </span>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Dropdown toggle button */}
  <button
    type="button"
    onClick={() => setDropdownOpen(!dropdownOpen)}
    style={{
      ...fieldStyle,
      cursor: 'pointer',
      width: '40px',
      textAlign: 'center',
      borderRadius: '0 4px 4px 0'
    }}
  >
    ▼
  </button>
</div>
</div>

  );
}
