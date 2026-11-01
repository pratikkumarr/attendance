import React, { createContext, useContext, useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'brutalist'

export interface ThemeColors {
  background: string
  card: string
  text: string
  subText: string
  primary: string
  border: string
  success: string
  warning: string
  danger: string
  headerBg: string
  tabBar: string
}

export const lightColors: ThemeColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  subText: '#6B7280',
  primary: '#4f46e5',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  headerBg: '#FFFFFF',
  tabBar: '#FFFFFF',
}

export const darkColors: ThemeColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  subText: '#94A3B8',
  primary: '#6366f1',
  border: '#334155',
  success: '#10B981',
  warning: '#FBBF24',
  danger: '#EF4444',
  headerBg: '#1E293B',
  tabBar: '#1E293B',
}

export const brutalistColors: ThemeColors = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#000000',
  subText: '#18181B',
  primary: '#FFD166', // Retro Yellow accent
  border: '#000000',
  success: '#06D6A0', // Mint green
  warning: '#FFD166',
  danger: '#EF476F', // Hot Pink
  headerBg: '#118AB2', // Cyan
  tabBar: '#FFFFFF',
}

interface ThemeContextType {
  mode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  cycleTheme: () => void
  isDark: boolean
  isBrutalist: boolean
  colors: ThemeColors
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'bunkbook_theme_mode'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'brutalist') {
        return saved
      }
    } catch {
      // ignore
    }
    return 'light'
  })

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // ignore
    }

    const root = document.documentElement
    root.classList.remove('dark', 'brutalist')
    if (mode === 'dark') {
      root.classList.add('dark')
    } else if (mode === 'brutalist') {
      root.classList.add('brutalist')
    }
  }, [mode])

  const cycleTheme = () => {
    setMode((prev) => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'brutalist'
      return 'light'
    })
  }

  const isDark = mode === 'dark'
  const isBrutalist = mode === 'brutalist'
  const colors = isBrutalist ? brutalistColors : isDark ? darkColors : lightColors

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setThemeMode: setMode,
        cycleTheme,
        isDark,
        isBrutalist,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
