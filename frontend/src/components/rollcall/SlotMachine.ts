interface NameItem {
  id: number
  text: string
  suffix?: string
}

type SlotPhase = 'idle' | 'accelerating' | 'cruising' | 'decelerating' | 'stopped'

interface Slot {
  names: NameItem[]
  offset: number
  velocity: number        // px/s
  phase: SlotPhase
  targetIdx: number
  // decel curve params
  decelStartTime: number
  decelDuration: number
  decelStartOffset: number
  decelTotalDist: number
  decelV0n: number        // normalized entry velocity
}

const COLORS = [
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#fb923c', '#facc15',
  '#4ade80', '#2dd4bf', '#22d3ee', '#60a5fa',
]

const ITEM_H = 56
const IDLE_SPEED = 30       // px/s
const CRUISE_SPEED = 1200   // px/s
const ACCEL = 800           // px/s²
const MAX_DT = 50           // ms cap per frame
const MIN_EXTRA_SPINS = 3
const STAGGER_MS = 300

export class SlotMachineEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr = 1
  private running = false
  private animationId = 0
  private lastTime = 0
  private allItems: NameItem[] = []
  private slots: Slot[] = []
  private displayCount = 1
  private onComplete?: (selectedIds: number[]) => void
  private stoppedCount = 0
  private selectedIds: number[] = []
  private globalPhase: 'idle' | 'spinning' | 'display' = 'idle'

  private spinStartTime = 0

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
    if (this.globalPhase === 'idle') {
      this.rebuildSlots()
    }
  }

  setDisplayCount(n: number) {
    if (n === this.displayCount) return
    this.displayCount = n
    if (this.globalPhase === 'idle') this.rebuildSlots()
  }

  private makeSlot(): Slot {
    return {
      names: [...this.allItems].sort(() => Math.random() - 0.5),
      offset: Math.random() * this.allItems.length * ITEM_H,
      velocity: IDLE_SPEED,
      phase: 'idle',
      targetIdx: -1,
      decelStartTime: 0,
      decelDuration: 0,
      decelStartOffset: 0,
      decelTotalDist: 0,
      decelV0n: 0,
    }
  }

  private rebuildSlots() {
    this.slots = Array.from({ length: this.displayCount }, () => this.makeSlot())
  }

  start() {
    if (this.running) return
    this.running = true
    this.globalPhase = 'idle'
    this.lastTime = performance.now()
    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animationId)
  }

  beginSpin() {
    this.globalPhase = 'spinning'
    this.stoppedCount = 0
    this.spinStartTime = performance.now()

    while (this.slots.length < this.displayCount) {
      this.slots.push(this.makeSlot())
    }
    this.slots.length = this.displayCount

    for (const slot of this.slots) {
      slot.phase = 'accelerating'
      slot.velocity = IDLE_SPEED
      slot.targetIdx = -1
    }
  }

  setOnComplete(cb: (selectedIds: number[]) => void) {
    this.onComplete = cb
  }

  setTargets(selectedIds: number[], remainingMs: number) {
    this.selectedIds = selectedIds

    while (this.slots.length < selectedIds.length) {
      const s = this.makeSlot()
      s.phase = 'cruising'
      s.velocity = CRUISE_SPEED
      this.slots.push(s)
    }
    this.slots.length = selectedIds.length
    this.displayCount = selectedIds.length

    const now = performance.now()
    const stagger = Math.min(STAGGER_MS, 3000 / selectedIds.length)

    // Ensure at least 1.5s of acceleration + cruising before first decel
    const minSpinTime = 1500
    const earliestDecel = this.spinStartTime + minSpinTime
    const decelBase = Math.max(now, earliestDecel)
    // The animation should end at spinStartTime + totalDuration
    // remainingMs is already (totalDuration - elapsed), so end = now + remainingMs
    const animEndTime = now + remainingMs

    for (let i = 0; i < selectedIds.length; i++) {
      const slot = this.slots[i]

      slot.targetIdx = slot.names.findIndex((n) => n.id === selectedIds[i])
      if (slot.targetIdx < 0) {
        const item = this.allItems.find((n) => n.id === selectedIds[i])
        if (item) { slot.names.push(item); slot.targetIdx = slot.names.length - 1 }
      }

      const slotDecelStart = decelBase + i * stagger
      slot.decelStartTime = slotDecelStart
      slot.decelDuration = Math.max(2000, animEndTime + i * stagger - slotDecelStart)
    }
  }

  reset() {
    this.globalPhase = 'idle'
    this.stoppedCount = 0
    this.selectedIds = []
    this.rebuildSlots()
  }

  private loop() {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min(now - this.lastTime, MAX_DT) / 1000 // seconds
    this.lastTime = now
    this.update(now, dt)
    this.draw()
    this.animationId = requestAnimationFrame(() => this.loop())
  }

  private update(now: number, dt: number) {
    if (this.globalPhase === 'idle') {
      for (const slot of this.slots) {
        slot.offset += IDLE_SPEED * dt
      }
      return
    }

    if (this.globalPhase !== 'spinning') return

    for (const slot of this.slots) {
      if (slot.phase === 'stopped') continue

      // Check if decel curve should activate
      if (slot.targetIdx >= 0 && slot.phase !== 'decelerating' && now >= slot.decelStartTime) {
        slot.phase = 'decelerating'
        slot.decelStartOffset = slot.offset
        const totalLen = slot.names.length * ITEM_H
        const currentPos = ((slot.offset % totalLen) + totalLen) % totalLen
        let targetPos = slot.targetIdx * ITEM_H
        if (targetPos <= currentPos) targetPos += totalLen
        let extraDist = MIN_EXTRA_SPINS * totalLen
        let totalDist = (targetPos - currentPos) + extraDist
        const entrySpeed = slot.velocity
        let v0n = (entrySpeed * (slot.decelDuration / 1000)) / totalDist
        while (v0n > 3.0) {
          extraDist += totalLen
          totalDist = (targetPos - currentPos) + extraDist
          v0n = (entrySpeed * (slot.decelDuration / 1000)) / totalDist
        }
        slot.decelTotalDist = totalDist
        slot.decelV0n = v0n
        slot.decelStartTime = now
        continue
      }

      if (slot.phase === 'decelerating') {
        const t = Math.min((now - slot.decelStartTime) / slot.decelDuration, 1)
        const v0n = slot.decelV0n
        const a = 6 - 3 * v0n
        const b = 8 * v0n - 15
        const c = 10 - 6 * v0n
        const s = a * t * t * t * t * t + b * t * t * t * t + c * t * t * t + v0n * t
        slot.offset = slot.decelStartOffset + slot.decelTotalDist * s

        if (t >= 1) {
          slot.offset = slot.decelStartOffset + slot.decelTotalDist
          slot.velocity = 0
          slot.phase = 'stopped'
          this.stoppedCount++
          if (this.stoppedCount >= this.slots.length) {
            this.globalPhase = 'display'
            setTimeout(() => this.onComplete?.(this.selectedIds), 400)
          }
        }
        continue
      }

      // accelerating or cruising
      if (slot.phase === 'accelerating') {
        slot.velocity = Math.min(CRUISE_SPEED, slot.velocity + ACCEL * dt)
        if (slot.velocity >= CRUISE_SPEED) slot.phase = 'cruising'
      }
      slot.offset += slot.velocity * dt
    }
  }

  private draw() {
    const w = this.w()
    const h = this.h()
    const ctx = this.ctx
    ctx.clearRect(0, 0, w, h)

    const count = this.slots.length
    const gap = 12
    const slotW = count === 1 && this.globalPhase === 'idle'
      ? Math.min(180, w * 0.35)
      : Math.min(180, (w - 60 - (count - 1) * gap) / count)
    const totalW = count * slotW + (count - 1) * gap
    const startX = (w - totalW) / 2
    const centerY = h / 2
    const visibleItems = Math.ceil(h / ITEM_H) + 4

    for (let si = 0; si < this.slots.length; si++) {
      const slot = this.slots[si]
      const sx = startX + si * (slotW + gap)
      this.drawSlotColumn(slot, si, sx, slotW, centerY, h, visibleItems)
    }
    this.drawCenterHighlight(startX, totalW, centerY)
  }

  private drawSlotColumn(slot: Slot, si: number, sx: number, slotW: number, centerY: number, h: number, visibleItems: number) {
    const names = slot.names
    if (names.length === 0) return
    const ctx = this.ctx
    const totalLen = names.length * ITEM_H
    const stopped = slot.phase === 'stopped'

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(sx, 30, slotW, h - 60, 12)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(sx, 30, slotW, h - 60)

    const normalizedOffset = ((slot.offset % totalLen) + totalLen) % totalLen
    const centerIdx = Math.round(normalizedOffset / ITEM_H)
    const subPixel = normalizedOffset - centerIdx * ITEM_H

    for (let vi = -Math.floor(visibleItems / 2); vi <= Math.floor(visibleItems / 2); vi++) {
      const idx = centerIdx + vi
      const nameIdx = ((idx % names.length) + names.length) % names.length
      const item = names[nameIdx]
      const adjustedY = centerY + vi * ITEM_H - subPixel

      const distFromCenter = Math.abs(adjustedY - centerY)
      const alpha = Math.max(0.05, 1 - distFromCenter / (h * 0.38))
      const scale = Math.max(0.65, 1 - distFromCenter / (h * 0.55))
      const isCenter = vi === 0 && stopped
      const displayText = isCenter && item.suffix ? `${item.text} (${item.suffix})` : item.text

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
        ctx.fillText(displayText, sx + slotW / 2, adjustedY, slotW - 16)
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = COLORS[(nameIdx + si * 3) % COLORS.length]
        ctx.fillText(displayText, sx + slotW / 2, adjustedY, slotW - 16)
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
