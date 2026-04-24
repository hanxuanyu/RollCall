import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { studentApi } from '@/lib/api'
import type { Student } from '@/types'
import { Trash2, Plus, AlertTriangle, Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  classID: number
  open: boolean
  existingStudents: Student[]
  onClose: () => void
  onSuccess: () => void
}

interface PreviewRow {
  name: string
  student_no: string
  gender: string
  score: number
}

interface DuplicateInfo {
  row: PreviewRow
  existing: Student
}

const ACCEPT_EXTS = '.csv,.xlsx,.xls'

function toRows(data: Student[]): PreviewRow[] {
  return data.map((s) => ({ name: s.name, student_no: s.student_no || '', gender: s.gender || '', score: s.score || 0 }))
}

export function ImportDialog({ classID, open, existingStudents, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [dupDialogOpen, setDupDialogOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PreviewRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [csvText, setCsvText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileData = useCallback(async (data: Student[] | null) => {
    if (!data || data.length === 0) {
      toast.info('文件中没有有效数据')
      return
    }
    setRows(toRows(data))
    setParsed(true)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    try {
      const data = await (studentApi as any).previewImportFile
        ? (studentApi as any).previewImportFile(file)
        : studentApi.previewImport()
      handleFileData(data)
    } catch (e: any) {
      toast.error(e?.message || '解析文件失败')
    }
  }, [handleFileData])

  const handleSelectFile = async () => {
    try {
      const data = await studentApi.previewImport()
      handleFileData(data)
    } catch (e: any) {
      toast.error(e?.message || '解析文件失败')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const ext = file.name.toLowerCase().split('.').pop()
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('仅支持 CSV、Excel 文件')
      return
    }
    handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleParseText = async () => {
    const text = csvText.trim()
    if (!text) {
      toast.error('请输入内容')
      return
    }
    try {
      const data = await (studentApi as any).previewImportText(text)
      handleFileData(data)
    } catch (e: any) {
      toast.error(e?.message || '解析文本失败')
    }
  }

  const handleUpdateRow = (index: number, field: keyof PreviewRow, value: string | number) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddRow = () => {
    setRows((prev) => [...prev, { name: '', student_no: '', gender: '', score: 0 }])
  }

  const validCount = rows.filter((r) => r.name.trim()).length

  const handleConfirm = async () => {
    const valid = rows.filter((r) => r.name.trim())
    if (valid.length === 0) {
      toast.error('没有有效的学生数据')
      return
    }

    const dups: DuplicateInfo[] = []
    const nonDups: PreviewRow[] = []
    for (const r of valid) {
      const existing = existingStudents.find((s) => s.name === r.name.trim() && s.student_no === r.student_no.trim())
      if (existing) {
        dups.push({ row: r, existing })
      } else {
        nonDups.push(r)
      }
    }

    if (dups.length > 0) {
      setDuplicates(dups)
      setPendingImport(nonDups)
      setDupDialogOpen(true)
      return
    }

    await doImport(valid)
  }

  const doImport = async (toImport: PreviewRow[]) => {
    if (toImport.length === 0) {
      toast.info('没有需要导入的数据')
      return
    }
    setLoading(true)
    try {
      const students = toImport.map((r) => ({
        id: 0, class_id: classID, name: r.name.trim(), student_no: r.student_no.trim(), gender: r.gender,
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

  const handleDupSkip = async () => {
    setDupDialogOpen(false)
    await doImport(pendingImport)
  }

  const handleDupOverwrite = async () => {
    setDupDialogOpen(false)
    const all = [...pendingImport, ...duplicates.map((d) => d.row)]
    // Update existing students with new data
    for (const dup of duplicates) {
      try {
        await studentApi.update({
          ...dup.existing,
          gender: dup.row.gender || dup.existing.gender,
          score: dup.row.score,
          student_no: dup.row.student_no.trim(),
        })
      } catch { /* ignore */ }
    }
    await doImport(pendingImport)
  }

  const handleClose = () => {
    setRows([])
    setParsed(false)
    setDuplicates([])
    setPendingImport([])
    setCsvText('')
    setDragging(false)
    onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>导入学生</DialogTitle>
          <DialogDescription>
            支持 CSV、Excel（.xlsx）格式，列顺序：姓名、学号（可选）、性别（可选）、积分（可选）
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <Tabs defaultValue="file" className="w-full min-h-0 flex-1 flex flex-col">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="file"><Upload className="mr-1 h-3.5 w-3.5" />文件导入</TabsTrigger>
              <TabsTrigger value="text"><FileText className="mr-1 h-3.5 w-3.5" />文本粘贴</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="min-h-0">
              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
                  dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`h-10 w-10 ${dragging ? 'text-primary' : 'text-muted-foreground/50'}`} />
                <div className="text-center">
                  <p className="text-sm font-medium">{dragging ? '松开以上传文件' : '拖拽文件到此处'}</p>
                  <p className="text-xs text-muted-foreground mt-1">或点击选择文件（支持 .csv .xlsx .xls）</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_EXTS}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            </TabsContent>
            <TabsContent value="text" className="min-h-0 flex-1 flex flex-col">
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                <Textarea
                  placeholder={"姓名,学号,性别,积分\n张三,2024001,男,0\n李四,2024002,女,0"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-sm min-h-0 flex-1 max-h-[40vh] resize-none"
                />
                <Button onClick={handleParseText} disabled={!csvText.trim()} className="self-end shrink-0">
                  解析内容
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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
                    <TableHead className="w-28">学号</TableHead>
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
                        <Input
                          value={row.student_no}
                          onChange={(e) => handleUpdateRow(i, 'student_no', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="学号"
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

    <AlertDialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
      <AlertDialogContent className="!max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> 发现重复学生
          </AlertDialogTitle>
          <AlertDialogDescription>
            以下 {duplicates.length} 名学生已存在（学号+姓名匹配），请选择处理方式：
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-48 overflow-auto rounded-md border text-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>学号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicates.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.row.name}</TableCell>
                  <TableCell>{d.row.student_no || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AlertDialogFooter className="flex-wrap">
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="outline" onClick={handleDupSkip}>
            跳过重复 ({pendingImport.length})
          </AlertDialogAction>
          <AlertDialogAction onClick={handleDupOverwrite}>
            覆盖并导入全部
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
