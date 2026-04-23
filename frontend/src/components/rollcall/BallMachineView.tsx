import { useRef, useEffect, useCallback } from 'react'
import { SlotMachineEngine } from './SlotMachine'

interface Props {
  students: { id: number; name: string }[]
  rolling: boolean
  selectedIds: number[]
  count: number
  durationMs: number
  onReady?: (engine: SlotMachineEngine) => void
  onComplete?: (selectedIds: number[]) => void
}

export function AnimationView({ students, rolling, selectedIds, count, durationMs, onReady, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SlotMachineEngine | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return
    const engine = new SlotMachineEngine(canvasRef.current)
    engine.resize()
    engine.setNames(students.map((s) => ({ id: s.id, text: s.name })))
    engine.setDisplayCount(count)
    engine.start()
    engineRef.current = engine
    onReady?.(engine)
  }, [students, onReady, count])

  useEffect(() => {
    initEngine()
    const handleResize = () => engineRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      engineRef.current?.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [initEngine])

  useEffect(() => {
    if (engineRef.current) engineRef.current.setDisplayCount(count)
  }, [count])

  useEffect(() => {
    if (!engineRef.current || !rolling || selectedIds.length === 0) return
    engineRef.current.startRolling(selectedIds, durationMs, (ids) => {
      onCompleteRef.current?.(ids)
    })
  }, [rolling, selectedIds, durationMs])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
