import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SetupScreen } from '@/pages/SetupScreen'
import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { PersonDashboard } from '@/pages/PersonDashboard'
import { SubjectDetail } from '@/pages/SubjectDetail'
import { Compare } from '@/pages/Compare'
import { Totals } from '@/pages/Totals'

export function App() {
  if (!isSupabaseConfigured) {
    return <SetupScreen />
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/u/:name" element={<PersonDashboard />} />
          <Route path="/u/:name/:subject" element={<SubjectDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/totals" element={<Totals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
