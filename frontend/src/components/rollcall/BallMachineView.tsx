import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { SlotMachineEngine } from './SlotMachine'

export interface AnimationViewHandle {
  engine: () => SlotMachineEngine | null
}

interface Props {
  students: { id: number; name: string; student_no?: string }[]
  count: number
  onComplete?: (selectedIds: number[]) => void
}

export const AnimationView = forwardRef<AnimationViewHandle, Props>(
  function AnimationView({ students, count, onComplete }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<SlotMachineEngine | null>(null)
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete

    useImperativeHandle(ref, () => ({
      engine: () => engineRef.current,
    }), [])

    // Create engine once on mount
    useEffect(() => {
      if (!canvasRef.current) return
      const engine = new SlotMachineEngine(canvasRef.current)
      engine.resize()
      engine.setOnComplete((ids) => onCompleteRef.current?.(ids))
      engine.setNames(students.map((s) => ({ id: s.id, text: s.name, suffix: s.student_no?.slice(-4) || undefined })))
      engine.setDisplayCount(count)
      engine.start()
      engineRef.current = engine

      const handleResize = () => engine.resize()
      window.addEventListener('resize', handleResize)
      return () => {
        engine.stop()
        window.removeEventListener('resize', handleResize)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update names when students actually change (not just reference)
    const studentsKey = students.map((s) => `${s.id}:${s.name}:${s.student_no || ''}`).join(',')
    useEffect(() => {
      engineRef.current?.setNames(students.map((s) => ({ id: s.id, text: s.name })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentsKey])

    // Update display count when count changes (without recreating engine)
    useEffect(() => {
      engineRef.current?.setDisplayCount(count)
    }, [count])

    return <canvas ref={canvasRef} className="w-full h-full" />
  }
)
