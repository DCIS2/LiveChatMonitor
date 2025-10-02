import { useEffect, useRef, useState } from 'react';

export default function ScrollContainer({ children }) {
  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const el = containerRef.current;
    const scrollOffset = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(scrollOffset < 3); // Allow small tolerance
  };

  useEffect(() => {
    const el = containerRef.current;
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [children, isAtBottom]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      {children}
    </div>
  );
}
