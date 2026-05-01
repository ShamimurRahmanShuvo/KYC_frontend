export interface RegisterRequest {
  username: string
  email?: string
  password: string
}

export interface RegisterResponse {
  id: number
  username: string
  email?: string
  roles: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface ApiError {
  detail?: string
  message?: string
}

// KYC Types
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

export interface KYCEvaluationResponse {
  decision: string
  confidence_score?: number
  message?: string
}