import React from 'react'
import { useTheme } from '@/ThemeContext'
import { Home, CalendarCheck } from 'lucide-react'

export type TabKey = 'home' | 'today'

interface BottomTabBarProps {
  currentTab: TabKey
  onSelectTab: (tab: TabKey) => void
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { colors, isDark, isBrutalist } = useTheme()

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'today', label: "Today's Attendance", icon: CalendarCheck },
  ]

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 transition-colors border-t pb-safe ${
        isBrutalist
          ? 'bg-white dark:bg-black border-t-4 border-black dark:border-white shadow-[0px_-4px_0px_#000] dark:shadow-[0px_-4px_0px_#fff]'
          : isDark
          ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md shadow-2xl'
          : 'bg-white/95 border-slate-200 backdrop-blur-md shadow-xl'
      }`}
    >
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-4">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key
          const IconComponent = tab.icon

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all relative active:scale-95 ${
                isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive
                    ? isBrutalist
                      ? 'bg-[#FFD166] text-black border border-black'
                      : 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <span
                className={`text-xs tracking-tight ${
                  isActive
                    ? isBrutalist
                      ? 'font-black uppercase text-black dark:text-white'
                      : 'font-bold text-indigo-600 dark:text-indigo-400'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {isActive && !isBrutalist && (
                <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
