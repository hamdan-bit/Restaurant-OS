import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { createAndSubmitRegistrationApplication } from '../lib/data-services'
import './Auth.css'

export default function RegistrationPage() {
  const [businessName, setBusinessName] = useState('')
  const [publicSlug, setPublicSlug] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createAndSubmitRegistrationApplication({
        business_name: businessName,
        public_slug: publicSlug,
        owner_name: ownerName,
        contact_email: user?.email ?? '',
        contact_phone: contactPhone || null,
      })
      navigate('/dashboard', { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Registration could not be submitted.')
    } finally {
      setLoading(false)
    }
  }

  return <AppShell><section className="auth-container"><div className="auth-card"><h1>Register your restaurant</h1><p className="auth-subtitle">Submit your workspace for platform approval.</p>{error && <div className="auth-error">{error}</div>}<form onSubmit={submit} className="auth-form"><label htmlFor="registration-business">Restaurant name</label><input id="registration-business" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required /><label htmlFor="registration-slug">Public URL slug</label><input id="registration-slug" value={publicSlug} onChange={(event) => setPublicSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required /><label htmlFor="registration-owner">Owner name</label><input id="registration-owner" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required /><label htmlFor="registration-phone">Contact phone</label><input id="registration-phone" type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /><button className="auth-button" disabled={loading}>{loading ? 'Submitting…' : 'Submit for approval'}</button></form></div></section></AppShell>
}
