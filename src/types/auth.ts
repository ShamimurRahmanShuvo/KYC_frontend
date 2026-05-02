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

// Admin Types
export interface CurrentUserResponse {
  id: number
  username: string
  email?: string
  roles: string[]
}

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