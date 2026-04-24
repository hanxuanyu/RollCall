import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { GraduationCap, Users, Trophy, Settings, ArrowLeft, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { versionApi } from '@/lib/api'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
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
  const { classes, currentClass, setCurrentClass, adminAuthenticated, setAdminAuthenticated, config } = useAppStore()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [versionInfo, setVersionInfo] = useState<{ version: string; commitId: string } | null>(null)
  const navigationMode = config?.app.navigationMode ?? 'bottom'

  useEffect(() => {
    if (!adminAuthenticated) {
      navigate('/')
    }
  }, [adminAuthenticated, navigate])

  const handleAbout = async () => {
    try {
      const info = await versionApi.get() as { version: string; commitId: string }
      setVersionInfo(info)
    } catch {
      setVersionInfo({ version: 'unknown', commitId: 'unknown' })
    }
    setAboutOpen(true)
  }

  if (!adminAuthenticated) return null

  const navigation = (
    <nav className="flex items-center gap-1">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 rounded-md text-sm font-medium transition-all duration-200',
              'px-3 py-1.5',
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
  )

  const adminBar = (
    <div className={cn(
      'flex h-14 items-center justify-between px-6 bg-background/80 backdrop-blur shrink-0',
      navigationMode === 'bottom' ? 'border-t' : 'border-b'
    )}>
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

      {navigation}

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAbout}>
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setAdminAuthenticated(false); navigate('/') }}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回点名
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-background">
      {navigationMode === 'top' && adminBar}

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

      {navigationMode === 'bottom' && adminBar}

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">RC</div>
              课堂点名
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本</span>
              <span className="font-mono">{versionInfo?.version ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commit</span>
              <span className="font-mono">{versionInfo?.commitId ?? '-'}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
