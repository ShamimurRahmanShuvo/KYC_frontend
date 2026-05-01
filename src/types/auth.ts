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