import type { ApiError, LoginRequest, RegisterRequest, RegisterResponse, TokenResponse } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const text = await response.text()

  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (err) {
      if (response.ok) {
        throw new Error('Invalid JSON response from server')
      }
      throw new Error(text)
    }
  }

  if (!response.ok) {
    const error = (typeof data === 'object' && data !== null ? (data as ApiError) : undefined)
    const detail = error?.detail || error?.message || text || `Request failed with status ${response.status}`
    throw new Error(detail)
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

// KYC API functions
export interface CreateKYCRequest {
  country?: string
  document_type?: string
}

export interface KYCCaseResponse {
  id: number
  case_reference: string
  status: string
  retry_count: number
  created_at: string
}

export interface DocumentUploadResponse {
  document_id: number
  message: string
}

export async function createKYCApplication(payload: CreateKYCRequest, authHeaders: HeadersInit): Promise<KYCCaseResponse> {
  return fetchJson<KYCCaseResponse>(`${API_BASE}/kyc/create-kyc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  })
}

export async function uploadDocument(
  kycId: number,
  file: File,
  endpoint: string,
  authHeaders: HeadersInit
): Promise<DocumentUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  return fetchJson<DocumentUploadResponse>(`${API_BASE}/kyc/${kycId}/${endpoint}`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })
}

export async function evaluateKYCApplication(kycId: number, authHeaders: HeadersInit): Promise<any> {
  return fetchJson<any>(`${API_BASE}/kyc/${kycId}/evaluate`, {
    method: 'POST',
    headers: authHeaders,
  })
}