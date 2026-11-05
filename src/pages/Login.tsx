import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createAndSubmitRegistrationApplication } from '../lib/data-services'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const draft = localStorage.getItem('fairprice-registration-draft')
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as {
            business_name: string
            public_slug: string
            owner_name: string
            contact_email: string
            contact_phone: string | null
          }
          await createAndSubmitRegistrationApplication(parsed)
          localStorage.removeItem('fairprice-registration-draft')
        } catch (registrationError: unknown) {
          setError(registrationError instanceof Error ? registrationError.message : 'Account created, but registration could not be submitted.')
          setLoading(false)
          return
        }
      }
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to Restaurant OS</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
