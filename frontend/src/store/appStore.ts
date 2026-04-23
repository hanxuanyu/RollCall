import { create } from 'zustand'
import type { Class, AppConfig } from '@/types'
import { classApi, studentApi, configApi } from '@/lib/api'
import type { Student } from '@/types'

interface AppState {
  classes: Class[]
  currentClass: Class | null
  students: Student[]
  config: AppConfig | null
  loading: boolean
  adminAuthenticated: boolean

  loadClasses: () => Promise<void>
  setCurrentClass: (c: Class) => void
  loadStudents: (classID: number) => Promise<void>
  loadConfig: () => Promise<void>
  setAdminAuthenticated: (v: boolean) => void
  init: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  classes: [],
  currentClass: null,
  students: [],
  config: null,
  loading: false,
  adminAuthenticated: false,

  loadClasses: async () => {
    const classes = await classApi.list()
    set({ classes: classes || [] })
  },

  setCurrentClass: (c: Class) => {
    set({ currentClass: c })
    get().loadStudents(c.id)
  },

  loadStudents: async (classID: number) => {
    const students = await studentApi.list(classID)
    set({ students: students || [] })
  },

  loadConfig: async () => {
    const config = await configApi.get()
    set({ config: config as any })
  },

  setAdminAuthenticated: (v: boolean) => set({ adminAuthenticated: v }),

  init: async () => {
    set({ loading: true })
    try {
      await get().loadClasses()
      await get().loadConfig()
      try {
        const defaultClass = await classApi.getDefault()
        if (defaultClass) {
          set({ currentClass: defaultClass })
          await get().loadStudents(defaultClass.id)
        }
      } catch {
        const classes = get().classes
        if (classes.length > 0) {
          set({ currentClass: classes[0] })
          await get().loadStudents(classes[0].id)
        }
      }
    } finally {
      set({ loading: false })
    }
  },
}))
