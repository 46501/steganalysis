import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSwitcher({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';
  const isDark = theme === 'dark';

  return (
    <div
      role="group"
      aria-label="Theme mode switcher"
      className={`inline-flex items-center p-0.5 rounded-lg bg-[#151515] border border-[#292929] shadow-inner select-none transition-colors duration-200 ${className}`}
    >
      {/* Light Mode Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={isLight}
        title="Light Mode (White background, light cards)"
        className={`flex items-center justify-center p-1.5 rounded-md text-xs transition-all duration-200 ${
          isLight
            ? 'bg-white text-black shadow-sm font-medium scale-[1.02]'
            : 'text-[#777777] hover:text-white hover:bg-[#1F1F1F]'
        }`}
      >
        <Sun className="w-3.5 h-3.5 stroke-[2.2]" />
        <span className="sr-only">Switch to Light Theme</span>
      </button>

      {/* Dark Mode Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={isDark}
        title="Dark Mode (Near-black background, charcoal cards)"
        className={`flex items-center justify-center p-1.5 rounded-md text-xs transition-all duration-200 ${
          isDark
            ? 'bg-[#242424] text-white shadow-sm border border-[#383838] font-medium scale-[1.02]'
            : 'text-[#777777] hover:text-white hover:bg-[#1F1F1F]'
        }`}
      >
        <Moon className="w-3.5 h-3.5 stroke-[2.2]" />
        <span className="sr-only">Switch to Dark Theme</span>
      </button>
    </div>
  );
}

