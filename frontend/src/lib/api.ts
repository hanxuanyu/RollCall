import * as App from '../../wailsjs/go/app/App'
import type { Student } from '@/types'
import {
  classApiHttp, studentApiHttp, rollcallApiHttp,
  scoreApiHttp, configApiHttp, adminApiHttp,
} from './api-http'

const isWails = !!(window as any).go

export const classApi = isWails ? {
  list: () => App.GetClasses(),
  create: (name: string) => App.CreateClass(name),
  update: (id: number, name: string) => App.UpdateClass(id, name),
  delete: (id: number) => App.DeleteClass(id),
  setDefault: (id: number) => App.SetDefaultClass(id),
  getDefault: () => App.GetDefaultClass(),
  studentCount: (id: number) => App.GetClassStudentCount(id),
} : classApiHttp

export const studentApi = isWails ? {
  list: (classID: number) => App.GetStudents(classID),
  create: (classID: number, name: string, studentNo: string, gender: string) => App.CreateStudent(classID, name, studentNo, gender),
  update: (stu: Student) => App.UpdateStudent(stu as any),
  delete: (id: number) => App.DeleteStudent(id),
  search: (classID: number, q: string) => App.SearchStudents(classID, q),
  previewImport: () => App.PreviewImport(),
  previewImportText: (text: string) => App.PreviewImportText(text),
  previewImportFile: (file: File) => {
    return new Promise<Student[]>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const text = reader.result as string
          const data = await App.PreviewImportText(text)
          resolve(data)
        } catch (e) { reject(e) }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  },
  confirmImport: (classID: number, students: Student[]) => App.ConfirmImport(classID, students as any),
  export_: (classID: number) => App.ExportStudents(classID),
} : studentApiHttp

export const rollcallApi = isWails ? {
  doRollCall: (classID: number, count: number) => App.DoRollCall(classID, count),
  reportResult: (classID: number, studentIDs: number[]) => App.ReportRollCallResult(classID, studentIDs),
  getLogs: (classID: number, limit: number) => App.GetRollCallLogs(classID, limit),
  clearLogs: (classID: number) => App.ClearRollCallLogs(classID),
  getWeightInfo: (classID: number) => App.GetWeightInfo(classID),
} : rollcallApiHttp

export const scoreApi = isWails ? {
  add: (studentID: number, delta: number, reason: string) => App.AddScore(studentID, delta, reason),
  batchAdd: (ids: number[], delta: number, reason: string) => App.BatchAddScore(ids, delta, reason),
  getLogs: (studentID: number) => App.GetScoreLogs(studentID),
  getLogsByClass: (classID: number) => App.GetScoreLogsByClass(classID),
} : scoreApiHttp

export const configApi = isWails ? {
  get: () => App.GetConfig(),
  update: (cfg: any) => App.UpdateConfig(cfg),
} : configApiHttp

export const adminApi = isWails ? {
  hasPassword: () => App.HasAdminPassword(),
  verify: (password: string) => App.VerifyAdminPassword(password),
  setPassword: (oldPassword: string, newPassword: string) => App.SetAdminPassword(oldPassword, newPassword),
} : adminApiHttp
