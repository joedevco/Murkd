import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  danger: string;
  nav: string;
  navBorder: string;
  card: string;
  skeleton: string;
}

const light: ThemeColors = {
  bg: '#E8EDE8',
  surface: '#F0F5F0',
  text: '#2E4A3E',
  textMuted: '#8B8B8B',
  accent: '#2E4A3E',
  accentMuted: '#8FAF9F',
  danger: '#C0392B',
  nav: '#F0F5F0',
  navBorder: 'rgba(46, 74, 62, 0.1)',
  card: '#F0F5F0',
  skeleton: '#2E4A3E',
};

const dark: ThemeColors = {
  bg: '#121212',
  surface: '#1E1E1E',
  text: '#F0F0F0',
  textMuted: '#9E9E9E',
  accent: '#8FAF9F',
  accentMuted: '#5A7A6A',
  danger: '#E83D3D',
  nav: '#1C1C1C',
  navBorder: 'rgba(255, 255, 255, 0.08)',
  card: '#1E1E1E',
  skeleton: '#8FAF9F',
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: light,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => { if (val === 'dark' || val === 'light') setTheme(val); });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colors: theme === 'light' ? light : dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
