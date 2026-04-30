import { useState } from 'react'
import type { FormEvent } from 'react'
import type { RegisterRequest } from '../types/auth'
import { registerUser } from '../services/api'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    const payload: RegisterRequest = {
      username: username.trim(),
      email: email.trim() || undefined,
      password,
    }

    try {
      const data = await registerUser(payload)
      setMessage(`Registration successful. Welcome, ${data.username}!`)
      setUsername('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the backend. Please verify the API URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card shadow-lg border-0 rounded-4">
      <div className="card-body p-4 p-md-5">
        <h1 className="card-title h2 mb-3 text-center">Register</h1>
        <p className="text-muted text-center mb-4">
          Create an account that matches the backend /auth/register endpoint.
        </p>

        <form onSubmit={handleRegister} className="mb-3">
          <div className="mb-3">
            <label htmlFor="username" className="form-label fw-semibold">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              type="text"
              className="form-control form-control-lg"
              minLength={3}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">
              Email
            </label>
            <input
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter email"
              type="email"
              className="form-control form-control-lg"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-semibold">
              Password
            </label>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              className="form-control form-control-lg"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg w-100 mb-3"
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Registering…
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        {message && (
          <div className="alert alert-success" role="alert">
            {message}
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="text-muted small text-center">
          <strong>Backend endpoint:</strong> <code className="bg-light px-1 rounded">POST /auth/register</code>
        </div>
      </div>
    </div>
  )
}