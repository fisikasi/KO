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
  const [showInfo, setShowInfo] = useState(false)

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

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowInfo(true)}
                  >
                    + INFO
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {showInfo && (
        <div
          className="info-modal-backdrop"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="info-modal"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="info-modal-close"
              onClick={() => setShowInfo(false)}
              aria-label="Itxi"
            >
              ×
            </button>

            <p className="eyebrow">
              KO JOKOA
            </p>

            <h2>
              Nola jokatzen da?
            </h2>

            <div className="info-rules">
              <section>
                <h3>🎯 HELBURUA</h3>
                <p>
                  Aukeratu talde bat jardunaldi bakoitzean
                  eta saiatu bizirik jarraitzen.
                </p>
              </section>

              <section>
                <h3>🏀 NOLA JOKATZEN DA?</h3>

                <ul>
                  <li>
                    Jardunaldi bakoitzean talde bakarra
                    aukeratu behar duzu.
                  </li>

                  <li>
                    Aukeratutako taldeak irabazten badu,
                    bizirik jarraitzen duzu.
                  </li>

                  <li>
                    Galtzen badu, KO-tik kanpo geratzen zara.
                  </li>

                  <li>
                    Talderik aukeratzen ez baduzu,
                    kanporatuta geratzen zara.
                  </li>

                  <li>
                    Behin erabilitako talde bat ezin duzu
                    berriro aukeratu jolasa bukatu arte.
                  </li>
                </ul>
              </section>

              <section>
                <h3>⏰ EPEAK</h3>

                <ul>
                  <li>
                    Taldearen aukeraketa ostiralean 21:30etan ixten da.
                  </li>

                  <li>
                    Une horretatik aurrera parte-hartzaile
                    guztien aukeraketak ikusgai egongo dira.
                  </li>

                  <li>
                    Jardunaldia astelehenean 23:00etan ixten da.
                  </li>

                  <li>
                    Ligako jardunaldirik ez badago,
                    koordinatzaileak KO jardunaldia
                    atzeratu dezake.
                  </li>
                </ul>
              </section>

              <section>
                <h3>🏆 NOLA IRABAZTEN DA?</h3>

                <ul>
                  <li>
                    Bizirik geratzen den azken jokalaria bazara,
                    txapelduna zara.
                  </li>

                  <li>
                    Aukeran zeundetTalde guztiak 
                    erabili badituzu eta
                    bizirik jarraitzen baduzu,
                    txapelduna zara.
                  </li>

                  <li>
                    Txapeldun bat baino gehiago egon daiteke.
                  </li>
                </ul>
              </section>

              <section>
                <h3>🔥 BOLADA</h3>

                <p>
                  Zure boladak jarraian gainditutako
                  jardunaldi kopurua erakusten du.
                </p>
              </section>

              <section>
                <h3>ℹ️ GARRANTZITSUA</h3>

                <p>
                  Koordinatzaileak, beharrezkoa bada,
                  aukeraketa lehenago itxi,
                  jardunaldia amaitu edo jardunaldia
                  atzeratu dezake.
                </p>
              </section>
            </div>

            <div className="info-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowInfo(false)}
              >
                ITXI
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
