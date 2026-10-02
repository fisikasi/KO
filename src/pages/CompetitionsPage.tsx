import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type CompetitionListItem = {
  id: string
  name: string
  registration_deadline: string
  registration_closed: boolean
  registration_open: boolean
  competition_status: 'registration' | 'active' | 'finished'
  is_joined: boolean
  participant_count: number
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] =
    useState<CompetitionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function loadCompetitions() {
    setLoading(true)

    const { data, error } = await supabase.rpc(
      'get_competitions_for_user',
    )

    if (error) {
      console.error(
        'Errorea lehiaketak kargatzean:',
        error,
      )
      setMessage(
        'Ezin izan dira lehiaketak kargatu.',
      )
      setLoading(false)
      return
    }

    setCompetitions(
      (data ?? []) as CompetitionListItem[],
    )
    setLoading(false)
  }

  useEffect(() => {
    loadCompetitions()
  }, [])

  async function joinCompetition(
    competitionId: string,
  ) {
    setJoiningId(competitionId)
    setMessage('')

    const { error } = await supabase.rpc(
      'join_competition',
      {
        p_competition_id: competitionId,
      },
    )

    if (error) {
      setMessage(
        error.message ||
          'Ezin izan da izen-ematea egin.',
      )
      setJoiningId(null)
      return
    }

    await loadCompetitions()
    setMessage('✓ Izena emanda.')
    setJoiningId(null)
  }

  function formatDeadline(
    dateString: string,
  ) {
    return new Intl.DateTimeFormat('eu-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">KO BASKET</p>
          <h1>Lehiaketak</h1>
        </div>
      </header>

      {message && (
        <p className="competition-page-message">
          {message}
        </p>
      )}

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <section className="competition-list">
          {competitions.length === 0 ? (
            <article className="competition-card">
              <span className="badge">PREST</span>
              <h2>Oraindik ez dago lehiaketarik</h2>
            </article>
          ) : (
            competitions.map(competition => (
              <article
                key={competition.id}
                className="competition-card"
              >
                <div className="competition-card-top">
                  <span className="badge">
                    {competition.competition_status ===
                    'finished'
                      ? 'AMAITUTA'
                      : 'KO'}
                  </span>

                  {competition.is_joined && (
                    <span className="joined-chip">
                      ✓ IZENA EMANDA
                    </span>
                  )}
                </div>

                <h2>{competition.name}</h2>

                <p className="muted">
                  {competition.participant_count}{' '}
                  parte-hartzaile
                </p>

                <p className="muted">
                  Izen-ematearen amaiera:{' '}
                  <strong>
                    {formatDeadline(
                      competition.registration_deadline,
                    )}
                  </strong>
                </p>

                <div className="competition-registration-state">
                  {competition.registration_open
                    ? '🟢 Izen-ematea irekita'
                    : '🔒 Izen-ematea itxita'}
                </div>

                <div className="competition-card-actions">
                  {!competition.is_joined &&
                    competition.registration_open && (
                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        joiningId === competition.id
                      }
                      onClick={() =>
                        joinCompetition(
                          competition.id,
                        )
                      }
                    >
                      {joiningId === competition.id
                        ? 'IZENA EMATEN...'
                        : 'PARTE HARTU'}
                    </button>
                  )}

                  {competition.is_joined && (
                    <Link
                      to={`/lehiaketak/${competition.id}`}
                      className="competition-enter-button"
                    >
                      SARTU
                    </Link>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  )
}
