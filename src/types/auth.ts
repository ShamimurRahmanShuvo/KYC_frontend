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

export interface ApiError {
  detail?: string
  message?: string
}