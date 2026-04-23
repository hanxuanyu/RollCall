interface NameItem {
  id: number
  text: string
}

interface Slot {
  names: NameItem[]
  startOffset: number
  targetOffset: number
  totalDuration: number
  startTime: number
  stopped: boolean
}

const COLORS = [
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#fb923c', '#facc15',
  '#4ade80', '#2dd4bf', '#22d3ee', '#60a5fa',
]

const ITEM_H = 56

type Phase = 'idle' | 'spinning' | 'display'

export class SlotMachineEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private running = false
  private animationId = 0
  private phase: Phase = 'idle'
  private allItems: NameItem[] = []
  private slots: Slot[] = []
  private displayCount = 1
  private onComplete?: (selectedIds: number[]) => void
  private idleSlots: { names: NameItem[]; offset: number }[] = []
  private stoppedCount = 0
  private selectedIds: number[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dpr = window.devicePixelRatio || 1
  }

  private w() { return this.canvas.width / this.dpr }
  private h() { return this.canvas.height / this.dpr }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  setNames(names: NameItem[]) {
    this.allItems = names
    this.rebuildIdleSlots()
  }

  setDisplayCount(n: number) {
    this.displayCount = n
    if (this.phase === 'idle') this.rebuildIdleSlots()
  }

  private rebuildIdleSlots() {
    this.idleSlots = Array.from({ length: this.displayCount }, () => ({
      names: [...this.allItems].sort(() => Math.random() - 0.5),
      offset: Math.random() * this.allItems.length * ITEM_H,
    }))
  }

  start() {
    if (this.running) return
    this.running = true
    this.phase = 'idle'
    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animationId)
  }

  startRolling(selectedIds: number[], durationMs: number, onComplete: (ids: number[]) => void) {
    this.selectedIds = selectedIds
    this.displayCount = selectedIds.length
    this.phase = 'spinning'
    this.stoppedCount = 0
    this.onComplete = onComplete

    const now = performance.now()
    const count = selectedIds.length
    const stagger = Math.min(800, 3000 / count)

    this.slots = selectedIds.map((winnerId, i) => {
      const shuffled = [...this.allItems].sort(() => Math.random() - 0.5)
      const startOffset = Math.random() * shuffled.length * ITEM_H
      const targetIdx = shuffled.findIndex((n) => n.id === winnerId)

      const totalLen = shuffled.length * ITEM_H
      const currentPos = ((startOffset % totalLen) + totalLen) % totalLen
      let targetPos = targetIdx * ITEM_H
      if (targetPos <= currentPos) targetPos += totalLen
      // More spins for later columns — gives the staggered stop feel
      const extraSpins = (4 + i * 2) * totalLen
      const targetOffset = startOffset + (targetPos - currentPos) + extraSpins

      // Each column's total animation time: base duration + stagger
      const totalDuration = durationMs + i * stagger

      return {
        names: shuffled,
        startOffset,
        targetOffset,
        totalDuration,
        startTime: now,
        stopped: false,
      }
    })
  }

  reset() {
    this.phase = 'idle'
    this.slots = []
    this.stoppedCount = 0
    this.selectedIds = []
    this.rebuildIdleSlots()
  }

  private loop() {
    if (!this.running) return
    this.update()
    this.draw()
    this.animationId = requestAnimationFrame(() => this.loop())
  }

  // Attempt 1: single smoothstep S-curve per slot
  // position(t) = startOffset + (targetOffset - startOffset) * S(t)
  // S(t) = 6t^5 - 15t^4 + 10t^3  (Perlin smootherstep — zero velocity at both ends)
  private smootherstep(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private update() {
    if (this.phase === 'idle') {
      for (const s of this.idleSlots) s.offset += 0.5
      return
    }

    if (this.phase === 'spinning') {
      const now = performance.now()
      for (const slot of this.slots) {
        if (slot.stopped) continue
        const elapsed = now - slot.startTime
        const t = Math.min(elapsed / slot.totalDuration, 1)
        // smootherstep gives: start slow → fast in middle → slow at end
        // No discontinuity, no two-phase jump
        slot.startOffset // we store current offset directly via the curve
        if (t >= 1) {
          slot.stopped = true
          this.stoppedCount++
          if (this.stoppedCount >= this.slots.length) {
            this.phase = 'display'
            setTimeout(() => this.onComplete?.(this.selectedIds), 400)
          }
        }
      }
    }
  }

  private getSlotOffset(slot: Slot): number {
    if (slot.stopped) return slot.targetOffset
    const now = performance.now()
    const elapsed = now - slot.startTime
    const t = Math.min(elapsed / slot.totalDuration, 1)
    const s = this.smootherstep(t)
    return slot.startOffset + (slot.targetOffset - slot.startOffset) * s
  }

  private draw() {
    const w = this.w()
    const h = this.h()
    const ctx = this.ctx
    ctx.clearRect(0, 0, w, h)

    if (this.phase === 'idle') {
      this.drawIdleState(w, h)
      return
    }

    const count = this.slots.length
    const gap = 12
    const slotW = Math.min(180, (w - 60 - (count - 1) * gap) / count)
    const totalW = count * slotW + (count - 1) * gap
    const startX = (w - totalW) / 2
    const centerY = h / 2
    const visibleItems = Math.ceil(h / ITEM_H) + 4

    for (let si = 0; si < this.slots.length; si++) {
      const slot = this.slots[si]
      const offset = this.getSlotOffset(slot)
      const sx = startX + si * (slotW + gap)
      this.drawSlotColumn(slot.names, offset, slot.stopped, si, sx, slotW, centerY, h, visibleItems)
    }
    this.drawCenterHighlight(startX, totalW, centerY)
  }

  private drawIdleState(w: number, h: number) {
    const count = this.idleSlots.length
    const centerY = h / 2
    const visibleItems = Math.ceil(h / ITEM_H) + 4
    const gap = 12
    const slotW = count === 1
      ? Math.min(180, w * 0.35)
      : Math.min(180, (w - 60 - (count - 1) * gap) / count)
    const totalW = count * slotW + (count - 1) * gap
    const startX = (w - totalW) / 2

    for (let si = 0; si < this.idleSlots.length; si++) {
      const slot = this.idleSlots[si]
      const sx = startX + si * (slotW + gap)
      const items = slot.names.length > 0 ? slot.names : this.allItems
      this.drawSlotColumn(items, slot.offset, false, si, sx, slotW, centerY, h, visibleItems)
    }
    this.drawCenterHighlight(startX, totalW, centerY)
  }

  private drawSlotColumn(names: NameItem[], offset: number, stopped: boolean, si: number, sx: number, slotW: number, centerY: number, h: number, visibleItems: number) {
    if (names.length === 0) return
    const ctx = this.ctx
    const totalLen = names.length * ITEM_H

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(sx, 30, slotW, h - 60, 12)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(sx, 30, slotW, h - 60)

    const normalizedOffset = ((offset % totalLen) + totalLen) % totalLen
    const centerIdx = Math.round(normalizedOffset / ITEM_H)
    const subPixel = normalizedOffset - centerIdx * ITEM_H

    for (let vi = -Math.floor(visibleItems / 2); vi <= Math.floor(visibleItems / 2); vi++) {
      const idx = centerIdx + vi
      const nameIdx = ((idx % names.length) + names.length) % names.length
      const name = names[nameIdx].text
      const adjustedY = centerY + vi * ITEM_H - subPixel

      const distFromCenter = Math.abs(adjustedY - centerY)
      const alpha = Math.max(0.05, 1 - distFromCenter / (h * 0.38))
      const scale = Math.max(0.65, 1 - distFromCenter / (h * 0.55))
      const isCenter = vi === 0 && stopped

      ctx.globalAlpha = isCenter ? 1 : alpha
      const fontSize = (isCenter ? 20 : 16) * scale
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (isCenter) {
        const color = COLORS[si % COLORS.length]
        ctx.shadowColor = color
        ctx.shadowBlur = 20
        ctx.fillStyle = '#ffffff'
        ctx.fillText(name, sx + slotW / 2, adjustedY, slotW - 16)
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = COLORS[(nameIdx + si * 3) % COLORS.length]
        ctx.fillText(name, sx + slotW / 2, adjustedY, slotW - 16)
      }
    }
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = stopped ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.08)'
    ctx.lineWidth = stopped ? 2 : 1.5
    ctx.beginPath()
    ctx.roundRect(sx, 30, slotW, h - 60, 12)
    ctx.stroke()
    ctx.restore()
  }

  private drawCenterHighlight(startX: number, totalW: number, centerY: number) {
    const ctx = this.ctx
    const hlH = ITEM_H * 0.9
    ctx.save()
    ctx.strokeStyle = 'rgba(129,140,248,0.25)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(startX - 6, centerY - hlH / 2, totalW + 12, hlH, 8)
    ctx.stroke()
    ctx.fillStyle = 'rgba(129,140,248,0.04)'
    ctx.fill()
    ctx.restore()
  }
}
