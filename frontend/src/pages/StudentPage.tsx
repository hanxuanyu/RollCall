import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { studentApi } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Student } from '@/types'
import { Plus, Search, Upload, Download, Pencil, Trash2, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ImportDialog } from '@/components/student/ImportDialog'

export default function StudentPage() {
  const { currentClass, students, loadStudents } = useAppStore()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [form, setForm] = useState({ name: '', student_no: '', gender: '', status: 'active' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (currentClass) loadStudents(currentClass.id)
  }, [currentClass, loadStudents])

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const q = search.trim()
    return students.filter((s) => s.name.includes(q) || s.student_no?.includes(q))
  }, [students, search])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    return [...filtered].sort((a, b) => {
      const va = (a as any)[sortField]
      const vb = (b as any)[sortField]
      if (typeof va === 'string') {
        const cmp = (va || '').localeCompare(vb || '', 'zh-CN')
        return sortDir === 'asc' ? cmp : -cmp
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [filtered, sortField, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  useEffect(() => { setPage(1) }, [search, students, pageSize])

  const handleSave = async () => {
    if (!currentClass || !form.name.trim()) return
    try {
      if (editing) {
        const dup = students.find((s) => s.id !== editing.id && s.name === form.name.trim() && s.student_no === form.student_no.trim())
        if (dup) {
          toast.error(`已存在同名同学号的学生「${dup.name}」(${dup.student_no || '无学号'})`)
          return
        }
        await studentApi.update({ ...editing, name: form.name.trim(), student_no: form.student_no.trim(), gender: form.gender, status: form.status })
        toast.success('学生已更新')
      } else {
        const dup = students.find((s) => s.name === form.name.trim() && s.student_no === form.student_no.trim())
        if (dup) {
          toast.error(`已存在同名同学号的学生「${dup.name}」(${dup.student_no || '无学号'})`)
          return
        }
        await studentApi.create(currentClass.id, form.name.trim(), form.student_no.trim(), form.gender)
        toast.success('学生已添加')
      }
      await loadStudents(currentClass.id)
      setDialogOpen(false)
      setEditing(null)
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleting || !currentClass) return
    try {
      await studentApi.delete(deleting.id)
      toast.success('学生已删除')
      await loadStudents(currentClass.id)
      setDeleteOpen(false)
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  const handleExport = async () => {
    if (!currentClass) return
    try {
      await studentApi.export_(currentClass.id)
      toast.success('导出成功')
    } catch (e: any) {
      toast.error(e?.message || '导出失败')
    }
  }

  if (!currentClass) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请先选择或创建一个班级
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">学生管理</h1>
          <p className="text-muted-foreground">{currentClass.name} · {students.length} 名学生</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> 导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" /> 导出
          </Button>
          <Button size="sm" onClick={() => {
            setEditing(null); setForm({ name: '', student_no: '', gender: '', status: 'active' }); setDialogOpen(true)
          }}>
            <Plus className="mr-1 h-4 w-4" /> 添加学生
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="搜索姓名或学号..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex-1 min-h-0 rounded-lg border overflow-auto [&_[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('student_no')}>
                <span className="inline-flex items-center gap-1">学号 {sortField === 'student_no' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                <span className="inline-flex items-center gap-1">姓名 {sortField === 'name' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('gender')}>
                <span className="inline-flex items-center gap-1">性别 {sortField === 'gender' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('score')}>
                <span className="inline-flex items-center gap-1">积分 {sortField === 'score' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="inline-flex items-center gap-1">状态 {sortField === 'status' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <TableCell className="text-muted-foreground">{(page - 1) * pageSize + i + 1}</TableCell>
                <TableCell className="text-muted-foreground">{s.student_no || '-'}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.gender || '-'}</TableCell>
                <TableCell>
                  <Badge variant={s.score >= 0 ? 'secondary' : 'destructive'}>{s.score}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === 'active' ? 'default' : 'outline'}>
                    {s.status === 'active' ? '正常' : '禁用'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                      const newStatus = s.status === 'active' ? 'disabled' : 'active'
                      await studentApi.update({ ...s, status: newStatus })
                      loadStudents(currentClass.id)
                    }}>
                      {s.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditing(s); setForm({ name: s.name, student_no: s.student_no || '', gender: s.gender, status: s.status }); setDialogOpen(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      setDeleting(s); setDeleteOpen(true)
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">暂无学生数据</div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span>每页</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>条</span>
          </div>
          <span>第 {page}/{totalPages || 1} 页，共 {sorted.length} 条</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑学生' : '添加学生'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入姓名" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            </div>
            <div className="space-y-2">
              <Label>学号</Label>
              <Input value={form.student_no} onChange={(e) => setForm({ ...form, student_no: e.target.value })}
                placeholder="请输入学号（可选）" />
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select value={form.gender} onValueChange={(v) => v && setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除学生「{deleting?.name}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        classID={currentClass.id}
        open={importOpen}
        existingStudents={students}
        onClose={() => setImportOpen(false)}
        onSuccess={() => loadStudents(currentClass.id)}
      />
    </div>
  )
}
