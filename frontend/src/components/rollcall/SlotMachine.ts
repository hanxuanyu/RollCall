interface NameItem {
  id: number
  text: string
}

interface Slot {
  names: NameItem[]
  offset: number       // current absolute offset, always updated per-frame
  velocity: number     // current velocity in px/frame
  targetIdx: number
  stopped: boolean
  // For the decel curve
  curveActive: boolean
  curveStartOffset: number
  curveTargetOffset: number
  curveStartTime: number
  curveDuration: number
  curveEntrySpeed: number // px/ms at curve start
}

const COLORS = [
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
  '#f472b6', '#fb7185', '#fb923c', '#facc15',
  '#4ade80', '#2dd4bf', '#22d3ee', '#60a5fa',
]

const ITEM_H = 56
const IDLE_VEL = 0.5 // px per frame in idle
const PEAK_VEL = 22  // px per frame at peak speed
const ACCEL = 0.15   // px/frame^2 acceleration

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
  private stoppedCount = 0
  private selectedIds: number[] = []
  private rollDuration = 5000
  private rollStartTime = 0

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
    this.rebuildSlots()
  }

  setDisplayCount(n: number) {
    if (n === this.displayCount) return
    this.displayCount = n
    if (this.phase === 'idle') this.rebuildSlots()
  }

  private rebuildSlots() {
    this.slots = Array.from({ length: this.displayCount }, () => ({
      names: [...this.allItems].sort(() => Math.random() - 0.5),
      offset: Math.random() * this.allItems.length * ITEM_H,
      velocity: IDLE_VEL,
      targetIdx: -1,
      stopped: false,
      curveActive: false,
      curveStartOffset: 0,
      curveTargetOffset: 0,
      curveStartTime: 0,
      curveDuration: 0,
      curveEntrySpeed: 0,
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
    this.onComplete = onComplete
    this.rollDuration = durationMs
    this.rollStartTime = performance.now()
    this.stoppedCount = 0
    this.phase = 'spinning'

    // Ensure enough slots exist
    while (this.slots.length < selectedIds.length) {
      this.slots.push({
        names: [...this.allItems].sort(() => Math.random() - 0.5),
        offset: Math.random() * this.allItems.length * ITEM_H,
        velocity: IDLE_VEL,
        targetIdx: -1,
        stopped: false,
        curveActive: false,
        curveStartOffset: 0,
        curveTargetOffset: 0,
        curveStartTime: 0,
        curveDuration: 0,
        curveEntrySpeed: 0,
      })
    }
    // Trim excess
    this.slots.length = selectedIds.length
    this.displayCount = selectedIds.length

    // Assign targets — keep existing names and offset (no jump!)
    for (let i = 0; i < selectedIds.length; i++) {
      const slot = this.slots[i]
      slot.stopped = false
      slot.curveActive = false
      slot.targetIdx = slot.names.findIndex((n) => n.id === selectedIds[i])
      if (slot.targetIdx < 0) {
        const item = this.allItems.find((n) => n.id === selectedIds[i])
        if (item) { slot.names.push(item); slot.targetIdx = slot.names.length - 1 }
      }
    }
  }

  reset() {
    this.phase = 'idle'
    this.stoppedCount = 0
    this.selectedIds = []
    for (const slot of this.slots) {
      slot.velocity = IDLE_VEL
      slot.stopped = false
      slot.curveActive = false
      slot.targetIdx = -1
    }
    this.rebuildSlots()
  }

  private loop() {
    if (!this.running) return
    this.update()
    this.draw()
    this.animationId = requestAnimationFrame(() => this.loop())
  }

  private update() {
    if (this.phase === 'idle') {
      for (const slot of this.slots) {
        slot.offset += IDLE_VEL
      }
      return
    }

    if (this.phase === 'spinning') {
      const now = performance.now()
      const elapsed = now - this.rollStartTime
      const count = this.slots.length
      const stagger = Math.min(800, 3000 / count)

      for (let i = 0; i < this.slots.length; i++) {
        const slot = this.slots[i]
        if (slot.stopped) continue

        if (slot.curveActive) {
          // Decel curve phase: cubic from curveStartOffset to curveTargetOffset
          const ct = Math.min((now - slot.curveStartTime) / slot.curveDuration, 1)
          const totalDist = slot.curveTargetOffset - slot.curveStartOffset
          const v0n = (slot.curveEntrySpeed * slot.curveDuration) / totalDist
          const a = v0n - 2, b = 3 - 2 * v0n, c = v0n
          const s = a * ct * ct * ct + b * ct * ct + c * ct
          slot.offset = slot.curveStartOffset + totalDist * s

          if (ct >= 1) {
            slot.offset = slot.curveTargetOffset
            slot.stopped = true
            slot.velocity = 0
            this.stoppedCount++
            if (this.stoppedCount >= this.slots.length) {
              this.phase = 'display'
              setTimeout(() => this.onComplete?.(this.selectedIds), 400)
            }
          }
          continue
        }

        // Should this slot start its decel curve?
        const slotDecelTime = this.rollDuration + i * stagger
        if (elapsed >= slotDecelTime) {
          // Activate decel curve from current position/speed
          slot.curveActive = true
          slot.curveStartOffset = slot.offset
          slot.curveStartTime = now
          slot.curveEntrySpeed = slot.velocity / 16.67 // convert px/frame to px/ms

          // Calculate target offset: land on targetIdx
          const totalLen = slot.names.length * ITEM_H
          const currentPos = ((slot.offset % totalLen) + totalLen) % totalLen
          let targetPos = slot.targetIdx * ITEM_H
          if (targetPos <= currentPos) targetPos += totalLen
          const extraSpins = (2 + i) * totalLen
          slot.curveTargetOffset = slot.offset + (targetPos - currentPos) + extraSpins

          // Duration proportional to distance, min 1.5s
          const dist = slot.curveTargetOffset - slot.curveStartOffset
          slot.curveDuration = Math.max(1500, dist / (slot.velocity / 16.67) * 0.4)
          continue
        }

        // Free-running phase: accelerate up to peak, then hold
        if (slot.velocity < PEAK_VEL) {
          slot.velocity = Math.min(PEAK_VEL, slot.velocity + ACCEL)
        }
        // Add slight random wobble for realism
        slot.offset += slot.velocity + (Math.random() - 0.5) * 0.3
      }
    }
  }

  private draw() {
    const w = this.w()
    const h = this.h()
    const ctx = this.ctx
    ctx.clearRect(0, 0, w, h)

    const count = this.slots.length
    const gap = 12
    const slotW = count === 1 && this.phase === 'idle'
      ? Math.min(180, w * 0.35)
      : Math.min(180, (w - 60 - (count - 1) * gap) / count)
    const totalW = count * slotW + (count - 1) * gap
    const startX = (w - totalW) / 2
    const centerY = h / 2
    const visibleItems = Math.ceil(h / ITEM_H) + 4

    for (let si = 0; si < this.slots.length; si++) {
      const slot = this.slots[si]
      const sx = startX + si * (slotW + gap)
      this.drawSlotColumn(slot.names, slot.offset, slot.stopped, si, sx, slotW, centerY, h, visibleItems)
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
