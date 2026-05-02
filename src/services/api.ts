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

// Admin API functions
export interface AdminKYCListResponse {
  items: AdminKYCItem[]
  meta: {
    total: number
    page: number
    size: number
    total_pages: number
  }
}

export interface AdminKYCItem {
  id: number
  case_reference: string
  status: string
  face_score: number
  liveness_score: number
  document_score: number
  fraud_score: number
  overall_score: number
  created_at: string
  user_id: number
}

export interface AdminApplicant {
  id: number
  username: string
  email?: string
  created_at: string
  updated_at: string
}

export interface AdminKYCDetailResponse {
  id: number
  case_reference: string
  status: string
  face_score: number
  liveness_score: number
  document_score: number
  fraud_score: number
  overall_score: number
  reason_codes?: string
  decision_source?: string
  model_version?: string
  submitted_at?: string
  reviewed_at?: string
  updated_at: string
  user?: AdminApplicant
  documents?: AdminDocument[]
  biometric_sessions?: AdminBiometricSession[]
}

export interface AdminDocument {
  id: number
  side: string
  document_type?: string
  file_path: string
  extracted_name?: string
  extracted_id_number?: string
  extracted_dob?: string
  extracted_expiry_date?: string
  oce_confidence: number
  authenticity_score: number
  is_expired: boolean
  is_tampered: boolean
}

export interface AdminBiometricSession {
  id: number
  session_reference: string
  capture_type: string
  passive_liveness_score: number
  active_liveness_score: number
  combined_liveness_score: number
  face_match_score: number
  challenge_result?: number
  created_at: string
}

export interface AdminReviewRequest {
  action: string
  notes?: string
}

export interface AdminReviewResponse {
  application_id: number
  previous_status: string
  new_status: string
  reviewed_by: string
  notes?: string
  created_at: string
}

export interface CurrentUserResponse {
  id: number
  username: string
  email?: string
  roles: string[]
}

export async function getCurrentUser(authHeaders: HeadersInit): Promise<CurrentUserResponse> {
  return fetchJson<CurrentUserResponse>(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
  })
}

export async function listKYCapplications(
  page: number = 1,
  size: number = 10,
  authHeaders: HeadersInit
): Promise<AdminKYCListResponse> {
  return fetchJson<AdminKYCListResponse>(
    `${API_BASE}/admin/kyc-applications?page=${page}&size=${size}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    }
  )
}

export async function searchKYCapplications(
  authHeaders: HeadersInit,
  status?: string,
  id_number?: string
): Promise<AdminKYCItem[]> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (id_number) params.append('id_number', id_number)

  return fetchJson<AdminKYCItem[]>(
    `${API_BASE}/admin/kyc-applications/search?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    }
  )
}

export async function getKYCDetail(kycId: number, authHeaders: HeadersInit): Promise<AdminKYCDetailResponse> {
  return fetchJson<AdminKYCDetailResponse>(`${API_BASE}/admin/kyc-applications/${kycId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
  })
}

export async function approveKYC(
  kycId: number,
  payload: AdminReviewRequest,
  authHeaders: HeadersInit
): Promise<AdminReviewResponse> {
  return fetchJson<AdminReviewResponse>(`${API_BASE}/admin/kyc-applications/${kycId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  })
}

export async function rejectKYC(
  kycId: number,
  payload: AdminReviewRequest,
  authHeaders: HeadersInit
): Promise<AdminReviewResponse> {
  return fetchJson<AdminReviewResponse>(`${API_BASE}/admin/kyc-applications/${kycId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  })
}

export async function getReviewQueue(authHeaders: HeadersInit): Promise<AdminKYCItem[]> {
  return fetchJson<AdminKYCItem[]>(`${API_BASE}/admin/kyc-review-queue`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
  })
}