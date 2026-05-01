import type { LoginRequest, TokenResponse } from '../types/auth'
import { loginUser } from './api'

const AUTH_TOKEN_KEY = 'kyc_auth_token'

export function getAuthToken(): string | undefined {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken())
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const tokenResponse = await loginUser(payload)
  setAuthToken(tokenResponse.access_token)
  return tokenResponse
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
