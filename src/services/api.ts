import type { RegisterRequest, RegisterResponse, ApiError } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    const error: ApiError = data
    const detail = error.detail || error.message || 'Registration failed'
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  return data as RegisterResponse
}