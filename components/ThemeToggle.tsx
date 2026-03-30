'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-14 h-8" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        relative w-14 h-8 rounded-full transition-all duration-300
        flex items-center px-1
        ${isDark
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-amber-100 border border-amber-200'
        }
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sliding knob */}
      <div
        className={`
          absolute w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-sm
          ${isDark
            ? 'left-[calc(100%-1.75rem)] bg-gray-700'
            : 'left-1 bg-amber-200'
          }
        `}
      >
        {isDark ? '🌙' : '☀️'}
      </div>
    </button>
  );
}
