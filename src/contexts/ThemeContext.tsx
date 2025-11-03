import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';
type FontSize = 'small' | 'medium' | 'large';

type ThemeContextType = {
  theme: Theme;
  fontSize: FontSize;
  toggleTheme: () => void;
  setFontSize: (size: FontSize) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProperties = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProperties) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('fontSize');
    return (saved as FontSize) || 'medium';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Apply theme
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);

    // Apply font size
    root.dataset.fontSize = fontSize;
    localStorage.setItem('fontSize', fontSize);
  }, [theme, fontSize]);

  const toggleTheme = () => {
    setTheme(previous => previous === 'dark' ? 'light' : 'dark');
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <ThemeContext.Provider value={{ theme, fontSize, toggleTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
