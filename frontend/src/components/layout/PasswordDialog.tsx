import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onVerify: (password: string) => Promise<boolean>
}

export function PasswordDialog({ open, onClose, onSuccess, onVerify }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password) {
      setError('请输入密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const ok = await onVerify(password)
      if (ok) {
        setPassword('')
        onSuccess()
      } else {
        setError('密码错误')
      }
    } catch {
      setError('验证失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setPassword('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> 管理后台
          </DialogTitle>
          <DialogDescription>请输入管理密码以进入后台</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="请输入管理密码"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '验证中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
