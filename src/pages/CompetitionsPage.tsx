import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Competition } from '../types'

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])

  useEffect(() => {
    supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando competiciones:', error)
          return
        }

        setCompetitions((data ?? []) as Competition[])
      })
  }, [])

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">KO BASKET</p>
          <h1>Lehiaketak</h1>
        </div>
      </header>

      <section className="competition-list">
        {competitions.length === 0 ? (
          <article className="competition-card">
            <span className="badge">PREST</span>
            <h2>Bigarren Nazionala Gizonezkoak</h2>
            <p className="muted">Supabaseko lehen lehiaketa sortzean hemen agertuko da.</p>
          </article>
        ) : competitions.map(c => (
          <Link key={c.id} to={`/lehiaketak/${c.id}`} className="competition-card link-card">
            <span className="badge">KO</span>
            <h2>{c.name}</h2>
            <p className="muted">Izen-ematearen amaiera: {new Date(c.registration_deadline).toLocaleString('eu-ES')}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
