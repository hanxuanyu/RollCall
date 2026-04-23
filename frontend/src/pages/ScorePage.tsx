import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { scoreApi } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { ScoreLog } from '@/types'
import { Plus, Minus, History } from 'lucide-react'
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

export default function ScorePage() {
  const { currentClass, students, loadStudents } = useAppStore()
  const [logs, setLogs] = useState<ScoreLog[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [delta, setDelta] = useState(1)
  const [reason, setReason] = useState('')

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
    try {
      await scoreApi.add(studentId, d, d > 0 ? '加分' : '减分')
      if (currentClass) await loadStudents(currentClass.id)
      await loadLogs()
      toast.success(d > 0 ? '+1 分' : '-1 分')
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">学生列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {activeStudents.map((s, i) => (
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
                      <Badge variant="secondary" className="min-w-[3rem] justify-center">{s.score}</Badge>
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
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>变动</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.student_name}</TableCell>
                      <TableCell>
                        <Badge variant={log.delta > 0 ? 'default' : 'destructive'}>
                          {log.delta > 0 ? `+${log.delta}` : log.delta}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.reason || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{log.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">暂无积分记录</div>
              )}
            </ScrollArea>
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
