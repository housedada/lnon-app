'use client';

import { useEffect } from 'react';

const INTERACTIVE_SELECTOR =
  'button:not(:disabled), [role="button"], a[href], input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled), .cursor-pointer';

export default function ClickPulseEffect({ color }: { color?: string }) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest?.(INTERACTIVE_SELECTOR);
      if (!target) return;

      const pulse = document.createElement('span');
      pulse.className = 'click-pulse';
      pulse.style.left = `${e.clientX}px`;
      pulse.style.top = `${e.clientY}px`;
      if (color) pulse.style.setProperty('--pulse-color', color);
      document.body.appendChild(pulse);
      pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [color]);

  return null;
}
