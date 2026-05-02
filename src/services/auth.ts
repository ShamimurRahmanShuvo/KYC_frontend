import type { LoginRequest, TokenResponse, CurrentUserResponse } from '../types/auth'
import { loginUser, getCurrentUser as apiGetCurrentUser } from './api'

const AUTH_TOKEN_KEY = 'kyc_auth_token'
const USER_INFO_KEY = 'kyc_user_info'

export function getAuthToken(): string | undefined {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken())
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const tokenResponse = await loginUser(payload)
  setAuthToken(tokenResponse.access_token)
  const userInfo = await refreshCurrentUser()
  if (!userInfo) {
    clearAuthToken()
    throw new Error('Failed to retrieve user profile after login')
  }
  return tokenResponse
}

export async function refreshCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    const userInfo = await apiGetCurrentUser(getAuthHeaders())
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
    return userInfo
  } catch (error) {
    console.error('Failed to refresh current user:', error)
    return null
  }
}

export async function ensureCurrentUser(): Promise<CurrentUserResponse | null> {
  const existingUser = getCurrentUser()
  if (existingUser) return existingUser
  return refreshCurrentUser()
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function getCurrentUser(): CurrentUserResponse | null {
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  return userInfo ? JSON.parse(userInfo) : null
}

export function hasRole(role: string): boolean {
  const user = getCurrentUser()
  return user ? user.roles.includes(role) : false
}

export function isAdmin(): boolean {
  return hasRole('admin') || hasRole('reviewer')
}
