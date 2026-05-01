import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginRequest } from '../types/auth'
import { loginUser } from '../services/api'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    const payload: LoginRequest = {
      username: username.trim(),
      password,
    }

    try {
      const data = await loginUser(payload)
      setMessage(`Login successful. Token received.`)
      setUsername('')
      setPassword('')
      console.log('Login token:', data.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the backend. Please verify the API URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card shadow-lg border-0 rounded-4">
      <div className="card-body p-4 p-md-5">
        <h1 className="card-title h2 mb-3 text-center">Login</h1>
        <p className="text-muted text-center mb-4">Use your credentials to sign in and check your status.</p>

        <form onSubmit={handleLogin} className="mb-3">
          <div className="mb-3">
            <label htmlFor="loginUsername" className="form-label fw-semibold">
              Username
            </label>
            <input
              id="loginUsername"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              type="text"
              className="form-control form-control-lg"
              minLength={3}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="loginPassword" className="form-label fw-semibold">
              Password
            </label>
            <input
              id="loginPassword"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              className="form-control form-control-lg"
              minLength={6}
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-100 mb-3">
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing in…
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {message && <div className="alert alert-success" role="alert">{message}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
      </div>
    </div>
  )
}
