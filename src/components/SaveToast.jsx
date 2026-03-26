// src/components/SaveToast.jsx
import { useEffect, useState } from 'react';

export default function SaveToast({ trigger }) {
  // `trigger` is a number that increments each time a save happens.
  // Every time trigger changes (and is > 0), show the toast.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0px' : '16px'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, #D4A843, #B8860B)',
        color: '#fff',
        padding: '10px 22px',
        borderRadius: '999px',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 4px 24px rgba(212,168,67,0.5)',
        border: '1px solid rgba(255,255,255,0.25)',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span>✝</span>
      <span>Saved to your journal</span>
    </div>
  );
}
