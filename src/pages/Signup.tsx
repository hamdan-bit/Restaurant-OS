import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [publicSlug, setPublicSlug] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      localStorage.setItem('fairprice-registration-draft', JSON.stringify({
        business_name: businessName,
        public_slug: publicSlug,
        owner_name: ownerName,
        contact_email: email,
        contact_phone: contactPhone || null,
      }))
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p className="auth-subtitle">
            We sent a confirmation link to <strong>{email}</strong>.
            <br />
            Click the link to activate your account.
          </p>
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Get started with Restaurant OS</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="business-name">Restaurant name</label>
          <input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Savanna Table" required />

          <label htmlFor="public-slug">Public URL slug</label>
          <input id="public-slug" value={publicSlug} onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="savanna-table" required />

          <label htmlFor="owner-name">Your full name</label>
          <input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Doe" required />

          <label htmlFor="contact-phone">Contact phone</label>
          <input id="contact-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+256 700 000 000" />

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
            autoComplete="new-password"
          />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating registration…' : 'Create restaurant account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
