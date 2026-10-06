import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(
        'Ezin izan da saioa hasi. Egiaztatu datuak.',
      )
      return
    }

    navigate('/lehiaketak')
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img
          src="/pwa-512x512.png"
          alt="KO Basket"
          className="login-logo"
        />

        <h1>KO Basket</h1>

        <p className="muted">
          Sartu zure kontuan
        </p>

        <form
          onSubmit={handleSubmit}
          className="stack"
        >
          <label>
            Posta elektronikoa

            <input
              type="email"
              value={email}
              onChange={e =>
                setEmail(e.target.value)
              }
              required
            />
          </label>

          <label>
            Pasahitza

            <input
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
              required
            />
          </label>

          {message && (
            <p className="error">
              {message}
            </p>
          )}

          <button
            className="primary"
            type="submit"
          >
            SAIOA HASI
          </button>
        </form>

        <p className="auth-link">
          Ez duzu konturik?{' '}
          <Link to="/kontua-sortu">
            Sortu kontua
          </Link>
        </p>
      </section>
    </main>
  )
}