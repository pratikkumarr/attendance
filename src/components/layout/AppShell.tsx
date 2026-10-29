import * as React from "react"
import { Link, NavLink } from "react-router-dom"
import {
  CalendarDays,
  Users,
  GitCompare,
  Settings,
  Moon,
  Sun,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiveIndicator } from "@/components/attendance/LiveIndicator"
import { useRealtime } from "@/hooks/useRealtime"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isConnected, lastEventAt } = useRealtime()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-base hover:opacity-90">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline-block font-extrabold tracking-tight">
                Attendance Planner
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                People
              </NavLink>
              <NavLink
                to="/compare"
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                Compare
              </NavLink>
              <NavLink
                to="/totals"
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md transition-colors",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                Subject Totals
              </NavLink>
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            <LiveIndicator isConnected={isConnected} lastEventAt={lastEventAt} />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle light/dark theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Attendance Planner — Shared college group dashboard with instant live sync.
      </footer>
    </div>
  )
}
