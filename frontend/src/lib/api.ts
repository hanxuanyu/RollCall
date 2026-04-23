import * as App from '../../wailsjs/go/app/App'
import type { Student } from '@/types'

export const classApi = {
  list: () => App.GetClasses(),
  create: (name: string) => App.CreateClass(name),
  update: (id: number, name: string) => App.UpdateClass(id, name),
  delete: (id: number) => App.DeleteClass(id),
  setDefault: (id: number) => App.SetDefaultClass(id),
  getDefault: () => App.GetDefaultClass(),
  studentCount: (id: number) => App.GetClassStudentCount(id),
}

export const studentApi = {
  list: (classID: number) => App.GetStudents(classID),
  create: (classID: number, name: string, gender: string) => App.CreateStudent(classID, name, gender),
  update: (stu: Student) => App.UpdateStudent(stu as any),
  delete: (id: number) => App.DeleteStudent(id),
  search: (classID: number, q: string) => App.SearchStudents(classID, q),
  previewImport: () => App.PreviewImport(),
  confirmImport: (classID: number, students: Student[]) => App.ConfirmImport(classID, students as any),
  export_: (classID: number) => App.ExportStudents(classID),
}

export const rollcallApi = {
  doRollCall: (classID: number, count: number) => App.DoRollCall(classID, count),
  reportResult: (classID: number, studentIDs: number[]) => App.ReportRollCallResult(classID, studentIDs),
  getLogs: (classID: number, limit: number) => App.GetRollCallLogs(classID, limit),
}

export const scoreApi = {
  add: (studentID: number, delta: number, reason: string) => App.AddScore(studentID, delta, reason),
  batchAdd: (ids: number[], delta: number, reason: string) => App.BatchAddScore(ids, delta, reason),
  getLogs: (studentID: number) => App.GetScoreLogs(studentID),
  getLogsByClass: (classID: number) => App.GetScoreLogsByClass(classID),
}

export const configApi = {
  get: () => App.GetConfig(),
  update: (cfg: any) => App.UpdateConfig(cfg),
}

export const adminApi = {
  hasPassword: () => App.HasAdminPassword(),
  verify: (password: string) => App.VerifyAdminPassword(password),
  setPassword: (oldPassword: string, newPassword: string) => App.SetAdminPassword(oldPassword, newPassword),
}
