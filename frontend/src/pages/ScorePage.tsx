import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { scoreApi } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { ScoreLog } from '@/types'
import { Plus, Minus, History, ArrowUpDown, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function ScorePage() {
  const { currentClass, students, loadStudents } = useAppStore()
  const [logs, setLogs] = useState<ScoreLog[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [delta, setDelta] = useState(1)
  const [reason, setReason] = useState('')
  const [sortByScore, setSortByScore] = useState<'none' | 'asc' | 'desc'>('none')
  const [editingScoreId, setEditingScoreId] = useState<number | null>(null)
  const [editingScoreVal, setEditingScoreVal] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [logPageSize, setLogPageSize] = useState(20)

  useEffect(() => {
    if (currentClass) {
      loadStudents(currentClass.id)
      loadLogs()
    }
  }, [currentClass])

  const loadLogs = async () => {
    if (!currentClass) return
    const data = await scoreApi.getLogsByClass(currentClass.id)
    setLogs(data || [])
  }

  const handleQuickScore = async (studentId: number, d: number) => {
    const student = students.find((s) => s.id === studentId)
    try {
      await scoreApi.add(studentId, d, d > 0 ? '加分' : '减分')
      if (currentClass) await loadStudents(currentClass.id)
      await loadLogs()
      toast.success(`为 ${student?.name ?? '学生'} ${d > 0 ? '增加' : '减少'} ${Math.abs(d)} 积分`)
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleScoreEdit = async (studentId: number, currentScore: number) => {
    const newScore = parseInt(editingScoreVal, 10)
    setEditingScoreId(null)
    if (isNaN(newScore) || newScore === currentScore) return
    const d = newScore - currentScore
    const student = students.find((s) => s.id === studentId)
    try {
      await scoreApi.add(studentId, d, '手动修改积分')
      if (currentClass) await loadStudents(currentClass.id)
      await loadLogs()
      toast.success(`已将 ${student?.name ?? '学生'} 的积分修改为 ${newScore}`)
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleBatchScore = async () => {
    if (selectedIds.length === 0) return
    try {
      await scoreApi.batchAdd(selectedIds, delta, reason || (delta > 0 ? '批量加分' : '批量减分'))
      if (currentClass) await loadStudents(currentClass.id)
      await loadLogs()
      toast.success(`已为 ${selectedIds.length} 名学生${delta > 0 ? '加' : '减'} ${Math.abs(delta)} 分`)
      setDialogOpen(false)
      setSelectedIds([])
      setReason('')
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleUndo = async (logId: number) => {
    try {
      await scoreApi.undo(logId)
      if (currentClass) await loadStudents(currentClass.id)
      await loadLogs()
      toast.success('已撤销')
    } catch (e: any) {
      toast.error(e?.message || '撤销失败')
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  if (!currentClass) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请先选择或创建一个班级
      </div>
    )
  }

  const activeStudents = students.filter((s) => s.status === 'active')

  const sortedStudents = useMemo(() => {
    if (sortByScore === 'none') return activeStudents
    return [...activeStudents].sort((a, b) =>
      sortByScore === 'asc' ? a.score - b.score : b.score - a.score
    )
  }, [activeStudents, sortByScore])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">积分管理</h1>
          <p className="text-muted-foreground">{currentClass.name}</p>
        </div>
        <Button onClick={() => { setDelta(1); setDialogOpen(true) }} disabled={selectedIds.length === 0}>
          批量操作 ({selectedIds.length})
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(activeStudents.map((s) => s.id))}>全选</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(activeStudents.filter((s) => !selectedIds.includes(s.id)).map((s) => s.id))}>反选</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>清空</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">学生列表</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSortByScore((prev) => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}>
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                积分{sortByScore === 'desc' ? '↓' : sortByScore === 'asc' ? '↑' : ''}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {sortedStudents.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer ${
                      selectedIds.includes(s.id) ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleSelect(s.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded"
                      />
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingScoreId === s.id ? (
                        <Input
                          type="number"
                          value={editingScoreVal}
                          onChange={(e) => setEditingScoreVal(e.target.value)}
                          onBlur={() => handleScoreEdit(s.id, s.score)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleScoreEdit(s.id, s.score); if (e.key === 'Escape') setEditingScoreId(null) }}
                          className="h-7 w-16 text-sm text-center"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <Badge
                          variant="secondary"
                          className="min-w-[3rem] justify-center cursor-pointer hover:bg-secondary/80"
                          onClick={(e) => { e.stopPropagation(); setEditingScoreId(s.id); setEditingScoreVal(String(s.score)) }}
                        >
                          {s.score}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleQuickScore(s.id, 1) }}>
                        <Plus className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleQuickScore(s.id, -1) }}>
                        <Minus className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> 积分记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[440px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>变动</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice((logPage - 1) * logPageSize, logPage * logPageSize).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.student_name}</TableCell>
                      <TableCell>
                        <Badge variant={log.delta > 0 ? 'default' : 'destructive'}>
                          {log.delta > 0 ? `+${log.delta}` : log.delta}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.reason || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{log.created_at}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUndo(log.id)}>
                          <Undo2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">暂无积分记录</div>
              )}
            </ScrollArea>
            {logs.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>每页</span>
                  <Select value={logPageSize.toString()} onValueChange={(v) => { setLogPageSize(Number(v)); setLogPage(1) }}>
                    <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span>{logPage}/{Math.ceil(logs.length / logPageSize) || 1}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>上一页</Button>
                  <Button variant="ghost" size="sm" className="h-7" disabled={logPage >= Math.ceil(logs.length / logPageSize)} onClick={() => setLogPage(logPage + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量加减分</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>分值</Label>
              <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>原因（可选）</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入原因" />
            </div>
            <p className="text-sm text-muted-foreground">
              将为 {selectedIds.length} 名学生{delta >= 0 ? '加' : '减'} {Math.abs(delta)} 分
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleBatchScore}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
