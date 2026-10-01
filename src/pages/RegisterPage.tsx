import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    if (password !== password2) {
      setMessage('Pasahitzak ez datoz bat.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })
    if (error || !data.user) {
      setMessage('Ezin izan da kontua sortu.')
      return
    }



    navigate('/lehiaketak')
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Kontua sortu</h1>
        <p className="muted">Posta elektronikoa derrigorrezkoa da. Ez dugu komunikazioetarako erabiliko.</p>

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Erabiltzaile-izena
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </label>
          <label>
            Posta elektronikoa
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            Pasahitza
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          </label>
          <label>
            Pasahitza errepikatu
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} minLength={6} required />
          </label>

          {message && <p className="error">{message}</p>}
          <button className="primary" type="submit">KONTUA SORTU</button>
        </form>

        <p className="auth-link"><Link to="/saioa">Itzuli saioa hasteko pantailara</Link></p>
      </section>
    </main>
  )
}
