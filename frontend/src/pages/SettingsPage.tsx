import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { configApi, adminApi, rollcallApi } from '@/lib/api'
import { toast } from 'sonner'
import type { AppConfig } from '@/types'
import { Save, Lock, ShieldCheck, ShieldOff, Trash2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function SettingsPage() {
  const { config, loadConfig, currentClass } = useAppStore()
  const [form, setForm] = useState<AppConfig | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ old: '', new_: '', confirm: '' })
  const [clearOpen, setClearOpen] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const [weightData, setWeightData] = useState<{ id: number; name: string; student_no: string; score: number; weight: number; prob: number }[]>([])

  const handleViewWeights = async () => {
    if (!currentClass) return
    try {
      const data = await rollcallApi.getWeightInfo(currentClass.id)
      setWeightData(data || [])
      setWeightOpen(true)
    } catch (e: any) {
      toast.error(e?.message || '获取权重数据失败')
    }
  }

  useEffect(() => {
    if (config) setForm(structuredClone(config))
    adminApi.hasPassword().then(setHasPassword)
  }, [config])

  const handleSave = async () => {
    if (!form) return
    try {
      await configApi.update(form)
      await loadConfig()
      toast.success('配置已保存')
    } catch (e: any) {
      toast.error(e?.message || '保存失败')
    }
  }

  const handleSetPassword = async () => {
    if (pwForm.new_ !== pwForm.confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (pwForm.new_ && pwForm.new_.length < 4) {
      toast.error('密码长度至少 4 位')
      return
    }
    try {
      await adminApi.setPassword(pwForm.old, pwForm.new_)
      toast.success(pwForm.new_ ? '密码已设置' : '密码已清除')
      setPwForm({ old: '', new_: '', confirm: '' })
      setHasPassword(!!pwForm.new_)
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const modeLabel: Record<string, string> = { fair: '公平模式（推荐）', random: '纯随机', weighted: '积分权重' }

  if (!form) return null

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">配置点名系统参数</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>点名模式</CardTitle>
          <CardDescription>选择随机点名的算法模式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>模式</Label>
            <Select
              value={form.random.mode}
              onValueChange={(v) => v && setForm({ ...form, random: { ...form.random, mode: v } })}
            >
              <SelectTrigger>
                <SelectValue>{modeLabel[form.random.mode] ?? form.random.mode}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fair">公平模式（推荐）</SelectItem>
                <SelectItem value="random">纯随机</SelectItem>
                <SelectItem value="weighted">积分权重</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.random.mode === 'fair' && '最近被选中的学生概率降低，长期趋于均衡'}
              {form.random.mode === 'random' && '完全随机，每个学生概率相同'}
              {form.random.mode === 'weighted' && '积分越低的学生被选中概率越高，促进积分均衡'}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>防重复窗口</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={form.random.avoidRepeatWindow}
              onChange={(e) => setForm({
                ...form,
                random: { ...form.random, avoidRepeatWindow: Number(e.target.value) },
              })}
            />
            <p className="text-xs text-muted-foreground">
              最近 N 次点名中被选中的学生权重会降低（0 表示不限制）
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>功能开关</CardTitle>
          <CardDescription>启用或禁用系统功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>积分系统</Label>
              <p className="text-xs text-muted-foreground">启用学生积分功能</p>
            </div>
            <Switch
              checked={form.feature.enableScore}
              onCheckedChange={(v) => setForm({ ...form, feature: { ...form.feature, enableScore: v } })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>动画效果</Label>
              <p className="text-xs text-muted-foreground">启用点名动画</p>
            </div>
            <Switch
              checked={form.feature.enableAnimation}
              onCheckedChange={(v) => setForm({ ...form, feature: { ...form.feature, enableAnimation: v } })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>动画时长（秒）</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={form.feature.animationDuration || 5}
              onChange={(e) => setForm({
                ...form,
                feature: { ...form.feature, animationDuration: Number(e.target.value) },
              })}
            />
            <p className="text-xs text-muted-foreground">点名动画持续时间，默认 5 秒</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> 数据管理
          </CardTitle>
          <CardDescription>清空抽取记录可重置防重复窗口和权重计算</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="destructive" onClick={() => setClearOpen(true)} disabled={!currentClass}>
            <Trash2 className="mr-2 h-4 w-4" /> 清空抽取记录
          </Button>
          <Button variant="outline" onClick={handleViewWeights} disabled={!currentClass}>
            <BarChart3 className="mr-2 h-4 w-4" /> 查看权重数据
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="mr-2 h-4 w-4" /> 保存设置
      </Button>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空「{currentClass?.name}」的所有抽取记录吗？此操作不可撤销，清空后防重复窗口和权重将重新计算。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={async () => {
              if (!currentClass) return
              try {
                await rollcallApi.clearLogs(currentClass.id)
                toast.success('抽取记录已清空')
                setClearOpen(false)
              } catch (e: any) {
                toast.error(e?.message || '清空失败')
              }
            }}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> 后台密码
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            保护管理后台，防止未授权访问
            {hasPassword ? (
              <Badge variant="default" className="ml-1"><ShieldCheck className="mr-1 h-3 w-3" />已设置</Badge>
            ) : (
              <Badge variant="outline" className="ml-1"><ShieldOff className="mr-1 h-3 w-3" />未设置</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label>当前密码</Label>
              <Input
                type="password"
                value={pwForm.old}
                onChange={(e) => setPwForm({ ...pwForm, old: e.target.value })}
                placeholder="请输入当前密码"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={pwForm.new_}
              onChange={(e) => setPwForm({ ...pwForm, new_: e.target.value })}
              placeholder={hasPassword ? '输入新密码（留空则清除密码）' : '设置管理密码（留空则不启用）'}
            />
          </div>
          {pwForm.new_ && (
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="再次输入新密码"
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              />
            </div>
          )}
          <Button variant="outline" onClick={handleSetPassword} className="w-full">
            {hasPassword ? (pwForm.new_ ? '修改密码' : '清除密码') : '设置密码'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>权重数据 — {currentClass?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead className="text-right">积分</TableHead>
                  <TableHead className="text-right">权重</TableHead>
                  <TableHead className="text-right">概率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weightData.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.student_no || '-'}</TableCell>
                    <TableCell className="text-right">{s.score}</TableCell>
                    <TableCell className="text-right">{s.weight}</TableCell>
                    <TableCell className="text-right">{s.prob}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {weightData.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">暂无数据</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
