import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
});

const THEME_STORAGE_KEY = 'stegoshield-theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  const applyThemeToDOM = () => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
    root.setAttribute('data-theme', 'dark');
  };

  useEffect(() => {
    applyThemeToDOM();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } catch (e) {
      // ignore
    }
  }, []);

  const setTheme = (newTheme) => {
    setThemeState('dark');
    applyThemeToDOM();
  };

  const toggleTheme = () => {
    setThemeState('dark');
    applyThemeToDOM();
  };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme, toggleTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
