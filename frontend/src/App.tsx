import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAppStore } from '@/store/appStore'
import HomePage from '@/pages/HomePage'
import ClassPage from '@/pages/ClassPage'
import StudentPage from '@/pages/StudentPage'
import ScorePage from '@/pages/ScorePage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/classes" element={<ClassPage />} />
          <Route path="/admin/students" element={<StudentPage />} />
          <Route path="/admin/scores" element={<ScorePage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="bottom-left" />
    </BrowserRouter>
  )
}
