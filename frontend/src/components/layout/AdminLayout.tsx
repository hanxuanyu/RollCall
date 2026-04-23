import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { GraduationCap, Users, Trophy, Settings, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { adminApi } from '@/lib/api'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PasswordDialog } from '@/components/layout/PasswordDialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const navItems = [
  { to: '/admin/classes', icon: GraduationCap, label: '班级' },
  { to: '/admin/students', icon: Users, label: '学生' },
  { to: '/admin/scores', icon: Trophy, label: '积分' },
  { to: '/admin/settings', icon: Settings, label: '设置' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { classes, currentClass, setCurrentClass, adminAuthenticated, setAdminAuthenticated } = useAppStore()
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (adminAuthenticated) { setChecking(false); return }
    adminApi.hasPassword().then((has) => {
      if (!has) { setAdminAuthenticated(true); setChecking(false) }
      else { setShowPassword(true); setChecking(false) }
    }).catch(() => { setChecking(false) })
  }, [adminAuthenticated, setAdminAuthenticated])

  if (checking) return null

  if (!adminAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <PasswordDialog
          open={showPassword}
          onClose={() => { setShowPassword(false); navigate('/') }}
          onSuccess={() => { setShowPassword(false); setAdminAuthenticated(true) }}
          onVerify={adminApi.verify}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-6 bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              RC
            </div>
            <span className="font-semibold">管理后台</span>
          </div>

          {classes.length > 0 && (
            <Select
              value={currentClass?.id?.toString() ?? ''}
              onValueChange={(v) => {
                const c = classes.find((c) => c.id.toString() === v)
                if (c) setCurrentClass(c)
              }}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue>{currentClass?.name ?? '选择班级'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Button variant="ghost" size="sm" onClick={() => { setAdminAuthenticated(false); navigate('/') }}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回点名
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full overlay-scroll"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
