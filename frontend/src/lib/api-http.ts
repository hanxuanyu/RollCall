const BASE = '/api'

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const opts: RequestInit = { method, headers: {} }
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      opts.body = body
    } else {
      (opts.headers as Record<string, string>)['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const classApiHttp = {
  list: () => request<any[]>('GET', '/classes'),
  create: (name: string) => request<any>('POST', '/classes', { name }),
  update: (id: number, name: string) => request<any>('PUT', `/classes/${id}`, { name }),
  delete: (id: number) => request<any>('DELETE', `/classes/${id}`),
  setDefault: (id: number) => request<any>('PUT', `/classes/${id}/default`),
  getDefault: () => request<any>('GET', '/classes/default'),
  studentCount: (id: number) => request<number>('GET', `/classes/${id}/count`),
}

export const studentApiHttp = {
  list: (classID: number) => request<any[]>('GET', `/classes/${classID}/students`),
  create: (classID: number, name: string, studentNo: string, gender: string) =>
    request<any>('POST', `/classes/${classID}/students`, { name, student_no: studentNo, gender }),
  update: (stu: any) => request<any>('PUT', `/students/${stu.id}`, stu),
  delete: (id: number) => request<any>('DELETE', `/students/${id}`),
  search: (classID: number, q: string) => request<any[]>('GET', `/classes/${classID}/students/search?q=${encodeURIComponent(q)}`),
  previewImport: async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    return new Promise<any[] | null>((resolve) => {
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) { resolve(null); return }
        const form = new FormData()
        form.append('file', file)
        try {
          const res = await fetch(`${BASE}/students/preview-import`, { method: 'POST', body: form })
          if (!res.ok) { resolve(null); return }
          const data = await res.json()
          resolve(data)
        } catch { resolve(null) }
      }
      input.click()
    })
  },
  previewImportText: (text: string) =>
    request<any[]>('POST', '/students/preview-import-text', { text }),
  previewImportFile: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/students/preview-import`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || res.statusText)
    }
    return res.json() as Promise<any[]>
  },
  confirmImport: (classID: number, students: any[]) =>
    request<number>('POST', `/classes/${classID}/students/confirm-import`, students),
  export_: (classID: number) => {
    window.open(`${BASE}/classes/${classID}/students/export`, '_blank')
    return Promise.resolve()
  },
}

export const rollcallApiHttp = {
  doRollCall: (classID: number, count: number) =>
    request<any[]>('POST', `/classes/${classID}/rollcall`, { count }),
  reportResult: (classID: number, studentIDs: number[]) =>
    request<any[]>('POST', `/classes/${classID}/rollcall/report`, { student_ids: studentIDs }),
  getLogs: (classID: number, limit: number) =>
    request<any[]>('GET', `/classes/${classID}/rollcall/logs?limit=${limit}`),
  clearLogs: (classID: number) =>
    request<any>('DELETE', `/classes/${classID}/rollcall/logs`),
  getWeightInfo: (classID: number) =>
    request<any[]>('GET', `/classes/${classID}/rollcall/weights`),
}

export const scoreApiHttp = {
  add: (studentID: number, delta: number, reason: string) =>
    request<any>('POST', '/scores/add', { student_id: studentID, delta, reason }),
  batchAdd: (ids: number[], delta: number, reason: string) =>
    request<any>('POST', '/scores/batch', { student_ids: ids, delta, reason }),
  getLogs: (studentID: number) =>
    request<any[]>('GET', `/scores/student/${studentID}`),
  getLogsByClass: (classID: number) =>
    request<any[]>('GET', `/scores/class/${classID}`),
}

export const configApiHttp = {
  get: () => request<any>('GET', '/config'),
  update: (cfg: any) => request<any>('PUT', '/config', cfg),
}

export const adminApiHttp = {
  hasPassword: () => request<boolean>('GET', '/admin/has-password'),
  verify: (password: string) => request<boolean>('POST', '/admin/verify', { password }),
  setPassword: (oldPassword: string, newPassword: string) =>
    request<any>('POST', '/admin/set-password', { old: oldPassword, new: newPassword }),
}
