import { FormEvent, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function App() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState('user')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    const payload = {
      username: username.trim(),
      email: email.trim() || undefined,
      password,
      roles: roles
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean),
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        const detail = data?.detail || data?.message || 'Registration failed'
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
      } else {
        setMessage(`Registration successful. Welcome, ${data.username}!`)
        setUsername('')
        setEmail('')
        setPassword('')
        setRoles('user')
      }
    } catch (err) {
      setError('Unable to connect to the backend. Please verify the API URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="auth-panel">
        <div className="auth-card">
          <h1>Register</h1>
          <p>Create an account that matches the backend /auth/register endpoint.</p>

          <form onSubmit={handleRegister} className="auth-form">
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                type="text"
                minLength={3}
                required
              />
            </label>

            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                type="email"
              />
            </label>

            <label>
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                minLength={6}
                required
              />
            </label>

            <label>
              Roles
              <input
                value={roles}
                onChange={(event) => setRoles(event.target.value)}
                placeholder="user, reviewer"
                type="text"
              />
              <small>Comma-separated roles. Default is <strong>user</strong>.</small>
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering…' : 'Register'}
            </button>
          </form>

          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}

          <div className="note">
            <strong>Backend endpoint:</strong> POST <code>/auth/register</code>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
