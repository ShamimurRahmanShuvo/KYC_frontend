import type { ApiError, LoginRequest, RegisterRequest, RegisterResponse, TokenResponse } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok) {
    const error: ApiError = data
    const detail = error.detail || error.message || 'Request failed'
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  return data as T
}

export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  return fetchJson<RegisterResponse>(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload: LoginRequest): Promise<TokenResponse> {
  return fetchJson<TokenResponse>(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      username: payload.username,
      password: payload.password,
    }),
  })
}