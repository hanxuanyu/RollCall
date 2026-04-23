import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { configApi, adminApi } from '@/lib/api'
import { toast } from 'sonner'
import type { AppConfig } from '@/types'
import { Save, Lock, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function SettingsPage() {
  const { config, loadConfig } = useAppStore()
  const [form, setForm] = useState<AppConfig | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ old: '', new_: '', confirm: '' })

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
                <SelectValue />
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
              {form.random.mode === 'weighted' && '积分越高的学生被选中概率越高'}
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
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>积分权重</Label>
              <p className="text-xs text-muted-foreground">点名时根据积分调整概率</p>
            </div>
            <Switch
              checked={form.random.weightByScore}
              onCheckedChange={(v) => setForm({ ...form, random: { ...form.random, weightByScore: v } })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="mr-2 h-4 w-4" /> 保存设置
      </Button>

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
    </div>
  )
}
