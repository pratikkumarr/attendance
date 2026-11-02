import React, { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from '@/ThemeContext'
import { getAuthToken, logout, getStudentProfileInfo } from '@/lib/api'
import { UserDetails, RegisteredCourse } from '@/types/bunkbook'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar, TabKey } from '@/components/layout/BottomTabBar'
import { Home } from '@/pages/Home'
import { TodayAttendance } from '@/pages/TodayAttendance'
import { Login } from '@/pages/Login'
import { CourseDetailsModal } from '@/components/course/CourseDetailsModal'
import { AdminModal } from '@/components/admin/AdminModal'
import {
  fetchSubjectMappingsFromSupabase,
  initSubjectMappingsRealtime,
} from '@/lib/subjectMappingStore'

function BunkBookMain() {
  const { colors, isDark, isBrutalist } = useTheme()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getAuthToken())
  })
  const [user, setUser] = useState<UserDetails | null>(null)
  const [currentTab, setCurrentTab] = useState<TabKey>('home')

  // Modals
  const [selectedCourse, setSelectedCourse] = useState<RegisteredCourse | null>(null)
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false)
  const [adminHighlightCode, setAdminHighlightCode] = useState<string | undefined>()

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  useEffect(() => {
    initSubjectMappingsRealtime()
    fetchSubjectMappingsFromSupabase()

    if (isAuthenticated) {
      getStudentProfileInfo()
        .then(setUser)
        .catch((e) => console.log('Could not load user profile info:', e))
    }
  }, [isAuthenticated, refreshTrigger])

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of Nashta?')) {
      await logout()
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  const handleOpenAdmin = (targetCourseCode?: string) => {
    setAdminHighlightCode(targetCourseCode)
    setIsAdminOpen(true)
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Top Header */}
      <TopHeader
        user={user}
        onRefresh={() => setRefreshTrigger((k) => k + 1)}
        onOpenAdmin={() => handleOpenAdmin()}
        onLogout={handleLogout}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 pb-20">
        {currentTab === 'home' && (
          <Home
            onSelectCourse={(course) => setSelectedCourse(course)}
            onOpenAdmin={handleOpenAdmin}
            onNavigateToTab={(tab) => setCurrentTab(tab as TabKey)}
          />
        )}

        {currentTab === 'today' && <TodayAttendance />}
      </main>

      {/* Course Details Modal (with Remaining Classes & 75% / 86% calculation) */}
      <CourseDetailsModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onOpenAdmin={(code) => {
          setSelectedCourse(null)
          handleOpenAdmin(code)
        }}
      />

      {/* Admin Subject Class Mapping Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        highlightCourseCode={adminHighlightCode}
      />

      {/* Bottom Navigation Bar */}
      <BottomTabBar currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <BunkBookMain />
    </ThemeProvider>
  )
}

export default App
