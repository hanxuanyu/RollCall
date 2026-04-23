export interface Class {
  id: number
  name: string
  is_default: boolean
  created_at: string
}

export interface Student {
  id: number
  class_id: number
  name: string
  student_no: string
  gender: string
  score: number
  status: string
  created_at: string
}

export interface ScoreLog {
  id: number
  student_id: number
  student_name?: string
  delta: number
  reason: string
  created_at: string
}

export interface RollCallLog {
  id: number
  class_id: number
  mode: string
  count: number
  result: string
  created_at: string
}

export interface AppConfig {
  app: { port: number; mode: string }
  feature: {
    enableScore: boolean
    enableAnimation: boolean
    animationDuration: number
    animationStyle: 'ballMachine' | 'slotMachine' | 'cardFlip'
  }
  random: { mode: string; avoidRepeatWindow: number; weightByScore: boolean }
}
