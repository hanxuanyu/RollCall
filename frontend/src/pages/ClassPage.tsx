import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { classApi } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Class } from '@/types'
import { Plus, Pencil, Trash2, Star, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClassPage() {
  const { classes, loadClasses, currentClass, setCurrentClass } = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [deletingClass, setDeletingClass] = useState<Class | null>(null)
  const [name, setName] = useState('')
  const [counts, setCounts] = useState<Record<number, number>>({})

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    classes.forEach(async (c) => {
      const count = await classApi.studentCount(c.id)
      setCounts((prev) => ({ ...prev, [c.id]: count }))
    })
  }, [classes])

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      if (editingClass) {
        await classApi.update(editingClass.id, name.trim())
        toast.success('班级已更新')
      } else {
        await classApi.create(name.trim())
        toast.success('班级已创建')
      }
      await loadClasses()
      setDialogOpen(false)
      setName('')
      setEditingClass(null)
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deletingClass) return
    try {
      await classApi.delete(deletingClass.id)
      toast.success('班级已删除')
      await loadClasses()
      setDeleteOpen(false)
      setDeletingClass(null)
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  const handleSetDefault = async (c: Class) => {
    try {
      await classApi.setDefault(c.id)
      setCurrentClass(c)
      await loadClasses()
      toast.success(`已设为默认班级: ${c.name}`)
    } catch (e: any) {
      toast.error(e?.message || '设置失败')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">班级管理</h1>
          <p className="text-muted-foreground">管理你的班级信息</p>
        </div>
        <Button onClick={() => { setEditingClass(null); setName(''); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> 新建班级
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`relative transition-all duration-200 hover:shadow-md ${
              currentClass?.id === c.id ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                  {c.is_default && <Badge variant="secondary">默认</Badge>}
                </div>
                <CardDescription>{counts[c.id] ?? 0} 名学生</CardDescription>
              </CardHeader>
              <CardFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleSetDefault(c)}>
                  <Star className="mr-1 h-3.5 w-3.5" /> 设为默认
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingClass(c); setName(c.name); setDialogOpen(true)
                }}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => { setDeletingClass(c); setDeleteOpen(true) }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mb-4 opacity-50" />
          <p>还没有班级，点击上方按钮创建</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? '编辑班级' : '新建班级'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>班级名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="请输入班级名称" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
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
            <AlertDialogDescription>
              确定要删除班级「{deletingClass?.name}」吗？该操作将同时删除班级下的所有学生数据，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
