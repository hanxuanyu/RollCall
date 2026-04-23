import { useState } from 'react'
import { toast } from 'sonner'
import { studentApi } from '@/lib/api'
import type { Student } from '@/types'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  classID: number
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PreviewRow {
  name: string
  gender: string
  score: number
}

export function ImportDialog({ classID, open, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(false)

  const handleSelectFile = async () => {
    try {
      const data = await studentApi.previewImport()
      if (!data || data.length === 0) {
        toast.info('文件中没有有效数据')
        return
      }
      setRows(data.map((s: Student) => ({ name: s.name, gender: s.gender || '', score: s.score || 0 })))
      setParsed(true)
    } catch (e: any) {
      toast.error(e?.message || '解析文件失败')
    }
  }

  const handleUpdateRow = (index: number, field: keyof PreviewRow, value: string | number) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddRow = () => {
    setRows((prev) => [...prev, { name: '', gender: '', score: 0 }])
  }

  const validCount = rows.filter((r) => r.name.trim()).length

  const handleConfirm = async () => {
    const valid = rows.filter((r) => r.name.trim())
    if (valid.length === 0) {
      toast.error('没有有效的学生数据')
      return
    }
    setLoading(true)
    try {
      const students = valid.map((r) => ({
        id: 0, class_id: classID, name: r.name.trim(), gender: r.gender,
        score: r.score, status: 'active', created_at: '',
      }))
      const count = await studentApi.confirmImport(classID, students)
      toast.success(`成功导入 ${count} 名学生`)
      handleClose()
      onSuccess()
    } catch (e: any) {
      toast.error(e?.message || '导入失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setRows([])
    setParsed(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>导入学生</DialogTitle>
          <DialogDescription>
            支持 CSV、Excel（.xlsx）格式，列顺序：姓名、性别（可选）、积分（可选）
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">选择文件后将预览导入内容，确认后再保存</p>
            <Button onClick={handleSelectFile}>选择文件</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">共 {rows.length} 条</Badge>
                {validCount !== rows.length && (
                  <span className="text-xs text-muted-foreground">（有效 {validCount} 条）</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleAddRow}>
                <Plus className="mr-1 h-3.5 w-3.5" /> 添加行
              </Button>
            </div>
            <div className="flex-1 min-h-0 max-h-[50vh] rounded-md border overlay-scroll">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead className="w-24">性别</TableHead>
                    <TableHead className="w-20">积分</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) => handleUpdateRow(i, 'name', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="姓名"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={row.gender} onValueChange={(v) => v !== null && handleUpdateRow(i, 'gender', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="男">男</SelectItem>
                            <SelectItem value="女">女</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.score}
                          onChange={(e) => handleUpdateRow(i, 'score', Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteRow(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          {parsed && (
            <Button variant="outline" onClick={() => { setRows([]); setParsed(false) }}>
              重新选择
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>取消</Button>
          {parsed && (
            <Button onClick={handleConfirm} disabled={loading || validCount === 0}>
              {loading ? '导入中...' : `确认导入 (${validCount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
