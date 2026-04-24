import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { rollcallApi, scoreApi } from '@/lib/api'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import type { Student } from '@/types'
import { AnimationView, type AnimationViewHandle } from '@/components/rollcall/BallMachineView'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dices, Users, Settings, Plus, Minus } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { classes, currentClass, setCurrentClass, students, config,
    setAdminAuthenticated, loadStudents } = useAppStore()
  const [count, setCount] = useState('1')
  const [rolling, setRolling] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [result, setResult] = useState<Student[]>([])
  const [showResult, setShowResult] = useState(false)
  const [scoreDelta, setScoreDelta] = useState(1)
  const animViewRef = useRef<AnimationViewHandle>(null)

  const activeStudents = students.filter((s) => s.status === 'active')
  const animDuration = config?.feature.enableAnimation ? (config.feature.animationDuration || 5) * 1000 : 500

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1200
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#818cf8', '#c084fc', '#f472b6'] })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#818cf8', '#c084fc', '#f472b6'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  const handleAnimComplete = useCallback(async (ids: number[]) => {
    if (!currentClass) return
    fireConfetti()
    try {
      const studs = await rollcallApi.reportResult(currentClass.id, ids)
      setResult(studs || [])
      setShowResult(true)
    } catch (e: any) {
      toast.error(e?.message || '上报结果失败')
    }
    setRolling(false)
  }, [currentClass, fireConfetti])

  const handleStart = useCallback(async () => {
    if (!currentClass || activeStudents.length === 0) {
      toast.error('没有可用的学生')
      return
    }
    setResult([])
    setShowResult(false)
    setSelectedIds([])

    const engine = animViewRef.current?.engine()

    const startTime = performance.now()
    engine?.beginSpin()
    setRolling(true)

    try {
      const selected = await rollcallApi.doRollCall(currentClass.id, Number(count))
      if (selected && selected.length > 0) {
        const ids = selected.map((s) => s.id)
        setSelectedIds(ids)
        const elapsed = performance.now() - startTime
        const remaining = Math.max(2000, animDuration - elapsed)
        engine?.setTargets(ids, remaining)
      } else {
        engine?.reset()
        setRolling(false)
      }
    } catch (e: any) {
      toast.error(e?.message || '点名失败')
      engine?.reset()
      setRolling(false)
    }
  }, [currentClass, activeStudents, count, animDuration])

  const handleScoreOne = async (studentId: number, delta: number) => {
    const student = result.find((s) => s.id === studentId)
    try {
      await scoreApi.add(studentId, delta, delta > 0 ? '课堂加分' : '课堂扣分')
      setResult((prev) => prev.map((s) => s.id === studentId ? { ...s, score: s.score + delta } : s))
      if (currentClass) loadStudents(currentClass.id)
      toast.success(`为 ${student?.name ?? '学生'} ${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} 积分`)
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleScoreBatch = async (delta: number) => {
    if (result.length === 0) return
    try {
      await scoreApi.batchAdd(result.map((s) => s.id), delta, delta > 0 ? '课堂批量加分' : '课堂批量扣分')
      setResult((prev) => prev.map((s) => ({ ...s, score: s.score + delta })))
      if (currentClass) loadStudents(currentClass.id)
      toast.success(`为 ${result.length} 位同学${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} 积分`)
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleCloseResult = () => {
    setShowResult(false)
    setResult([])
    setSelectedIds([])
    setRolling(false)
    animViewRef.current?.engine()?.reset()
  }

  const handleAdminClick = () => {
    setAdminAuthenticated(false)
    navigate('/admin/classes')
  }

  const modeLabel: Record<string, string> = { fair: '公平模式', random: '纯随机', weighted: '积分权重' }

  if (!currentClass) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-muted-foreground bg-background">
        <Dices className="h-16 w-16 opacity-30" />
        <p className="text-lg">请先选择或创建一个班级</p>
        <Button onClick={handleAdminClick}>进入管理后台</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Select value={currentClass.id.toString()}
            onValueChange={(v) => { const c = classes.find((cls) => cls.id.toString() === v); if (c) setCurrentClass(c) }}>
            <SelectTrigger className="w-32 h-8 text-sm bg-white/10 border-white/20 text-white">
              <SelectValue>{currentClass.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>{classes.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
          </Select>
          <Badge variant="outline" className="border-white/20 text-white/80">
            <Users className="mr-1 h-3 w-3" />{activeStudents.length} 人
          </Badge>
          <Badge className="bg-white/10 text-white/80 hover:bg-white/15">
            {modeLabel[config?.random.mode ?? 'fair'] ?? '公平模式'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">抽取人数：</span>
          <Select value={count} onValueChange={(v) => v && setCount(v)}>
            <SelectTrigger className="w-20 h-8 text-sm bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (<SelectItem key={n} value={n.toString()}>{n}</SelectItem>))}</SelectContent>
          </Select>
          <Button disabled={rolling || activeStudents.length === 0} onClick={handleStart}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-105">
            <Dices className="mr-2 h-4 w-4" />{rolling ? '抽取中...' : '开始点名'}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        {activeStudents.length > 0 ? (
          <AnimationView
            ref={animViewRef}
            students={activeStudents}
            count={Number(count)}
            onComplete={handleAnimComplete}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">暂无学生，请先添加学生数据</div>
        )}
        <Button variant="ghost" size="icon"
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur transition-all duration-300 hover:scale-110"
          onClick={handleAdminClick}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showResult} onOpenChange={(v) => { if (!v) handleCloseResult() }} disablePointerDismissal>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">点名结果</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overlay-scroll py-4">
            <div className="flex flex-wrap justify-center gap-5">
              {result.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-2 w-28">
                  <div className="relative group">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105">
                      {s.name.slice(0, 1)}
                    </div>
                    <Badge variant="secondary" className="absolute -bottom-1 -right-1 min-w-[1.75rem] justify-center text-xs px-1.5">
                      {s.score}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium text-center truncate w-full">{s.name}</span>
                  {s.student_no && (
                    <span className="text-xs text-muted-foreground">{s.student_no.slice(-4)}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleScoreOne(s.id, scoreDelta)}><Plus className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => handleScoreOne(s.id, -scoreDelta)}><Minus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 border-t pt-4">
            <div className="flex items-center gap-2 flex-1">
              <Input type="number" min={1} value={scoreDelta}
                onChange={(e) => setScoreDelta(Math.max(1, Number(e.target.value)))}
                className="w-16 h-8 text-sm text-center" />
              <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => handleScoreBatch(scoreDelta)}>全部 +{scoreDelta}</Button>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => handleScoreBatch(-scoreDelta)}>全部 -{scoreDelta}</Button>
            </div>
            <Button onClick={handleCloseResult}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
