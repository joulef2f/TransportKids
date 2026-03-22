const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    // Try refresh
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json()
        localStorage.setItem('accessToken', accessToken)
        return null // signal retry
      }
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, body }
  }
  if (res.status === 204) return null
  return res.json()
}

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(res)
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body: unknown) => request('POST', path, body),
  put: (path: string, body: unknown) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),

  auth: {
    login: (email: string, password: string) =>
      request('POST', '/auth/login', { email, password }),
    register: (email: string, password: string, companyName: string) =>
      request('POST', '/auth/register', { email, password, companyName }),
    refresh: (refreshToken: string) =>
      request('POST', '/auth/refresh', { refreshToken }),
  },
  vehicles: {
    list: () => api.get('/vehicles'),
    get: (id: string) => api.get(`/vehicles/${id}`),
    create: (data: unknown) => api.post('/vehicles', data),
    update: (id: string, data: unknown) => api.put(`/vehicles/${id}`, data),
    delete: (id: string) => api.delete(`/vehicles/${id}`),
    alerts: (id: string) => api.get(`/vehicles/${id}/alerts`),
  },
  drivers: {
    list: () => api.get('/drivers'),
    get: (id: string) => api.get(`/drivers/${id}`),
    create: (data: unknown) => api.post('/drivers', data),
    update: (id: string, data: unknown) => api.put(`/drivers/${id}`, data),
    delete: (id: string) => api.delete(`/drivers/${id}`),
    schedule: (id: string, from?: string, to?: string) =>
      api.get(`/drivers/${id}/schedule?from=${from || ''}&to=${to || ''}`),
  },
  clients: {
    list: () => api.get('/clients'),
    get: (id: string) => api.get(`/clients/${id}`),
    create: (data: unknown) => api.post('/clients', data),
    update: (id: string, data: unknown) => api.put(`/clients/${id}`, data),
    delete: (id: string) => api.delete(`/clients/${id}`),
    children: (id: string) => api.get(`/clients/${id}/children`),
  },
  children: {
    create: (data: unknown) => api.post('/children', data),
    update: (id: string, data: unknown) => api.put(`/children/${id}`, data),
    delete: (id: string) => api.delete(`/children/${id}`),
  },
  tours: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return api.get(`/tours${qs}`)
    },
    get: (id: string) => api.get(`/tours/${id}`),
    create: (data: unknown) => api.post('/tours', data),
    update: (id: string, data: unknown) => api.put(`/tours/${id}`, data),
    delete: (id: string) => api.delete(`/tours/${id}`),
    optimize: (id: string) => api.post(`/tours/${id}/optimize`, {}),
    calculateCost: (id: string, tollCost?: number) =>
      api.post(`/tours/${id}/calculate-cost`, { tollCost }),
    conflicts: (params: Record<string, string>) => {
      const qs = '?' + new URLSearchParams(params).toString()
      return api.get(`/tours/conflicts${qs}`)
    },
  },
  dashboard: {
    summary: (month: number, year: number) =>
      api.get(`/dashboard/summary?month=${month}&year=${year}`),
    ranking: (month: number, year: number) =>
      api.get(`/dashboard/tours-ranking?month=${month}&year=${year}`),
    kpis: (from: string, to: string) =>
      api.get(`/dashboard/kpis?from=${from}&to=${to}`),
  },
  company: {
    settings: () => api.get('/company/settings'),
    updateSettings: (data: unknown) => api.put('/company/settings', data),
  },
}
