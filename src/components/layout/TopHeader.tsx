import React from 'react'
import { useTheme } from '@/ThemeContext'
import { UserDetails } from '@/types/bunkbook'
import { SamosaIcon } from '@/components/common/SamosaIcon'
import {
  Sun,
  Moon,
  Zap,
  Shield,
  RefreshCw,
  LogOut,
  Calendar,
  Sparkles,
} from 'lucide-react'

interface TopHeaderProps {
  user: UserDetails | null
  onRefresh: () => void
  onOpenAdmin: () => void
  onLogout: () => void
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  onRefresh,
  onOpenAdmin,
  onLogout,
}) => {
  const { mode, cycleTheme, isDark, isBrutalist, colors } = useTheme()

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors border-b backdrop-blur-md ${
        isBrutalist
          ? 'bg-white dark:bg-black border-b-4 border-black dark:border-white'
          : isDark
          ? 'bg-slate-900/85 border-slate-800'
          : 'bg-white/90 border-slate-200/90'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand & User Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:rotate-6 ${
              isBrutalist
                ? 'bg-[#FFD166] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : isDark
                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60 shadow-md shadow-amber-950/20'
                : 'bg-amber-100 text-amber-900 border border-amber-200 shadow-md shadow-amber-500/10'
            }`}
          >
            <SamosaIcon className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-tight truncate">
                Nashta
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded font-mono ${
                  isBrutalist
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                KIET
              </span>
            </div>
            <p className="text-xs truncate font-medium" style={{ color: colors.subText }}>
              Hello, <strong className="font-bold" style={{ color: colors.text }}>{user?.fullName?.split(' ')[0] || user?.fullName || 'Student'}</strong>
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Admin Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              isBrutalist
                ? 'bg-[#FFD166] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-mono uppercase'
                : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}
            title="Configure Subject Class Mappings"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Admin Mode</span>
          </button>

          {/* Theme Cycler (Light -> Dark -> Neo-Brutalist) */}
          <button
            type="button"
            onClick={cycleTheme}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              isBrutalist
                ? 'bg-[#06D6A0] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-mono uppercase'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title={`Current theme: ${mode}. Click to cycle.`}
          >
            {mode === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : mode === 'dark' ? (
              <Zap className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-black" />
            )}
            <span className="text-[11px] font-mono hidden md:inline capitalize">{mode}</span>
          </button>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Attendance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
