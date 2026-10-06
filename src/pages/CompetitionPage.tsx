import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Competition, Round, Team } from '../types'

type Tab = 'ko' | 'standings' | 'results'

type Standing = {
  user_id: string
  username: string
  streak: number
  is_alive: boolean
  is_champion: boolean
  player_status: 'alive' | 'eliminated' | 'champion'
  used_team_count: number
}

type RoundResult = {
  round_id: string
  team_id: string
  result: 'pending' | 'won' | 'lost'
  updated_at?: string
}

type UserHistoryItem = {
  round_id: string
  round_number: number
  team_id: string
  team_name: string
  image_url?: string | null
  result: 'pending' | 'won' | 'lost'
  round_status: string
  pick_deadline: string
}

type PublicPick = {
  user_id: string
  username: string
  team_id: string | null
  team_name: string | null
  image_url?: string | null
  has_pick: boolean
}

type AppNotification = {
  id: string
  user_id: string
  competition_id: string
  round_id?: string | null
  type:
    | 'survived'
    | 'eliminated'
    | 'no_pick'
    | 'champion'
    | 'champion_announcement'
    | 'info'
  message: string
  is_read: boolean
  created_at: string
}

export default function CompetitionPage() {
  const { competitionId } = useParams()

  const [competition, setCompetition] = useState<Competition | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [rounds, setRounds] = useState<Round[]>([])

  const [activeTab, setActiveTab] = useState<Tab>('ko')

  // KO
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null)
  const [usedTeamIds, setUsedTeamIds] = useState<string[]>([])

  // Erabiltzaileak talde bat eskuz sakatu badu, Supabaseko
  // hasierako kargak ez du hautaketa hori ezabatuko.
  const pickInteractionRef = useRef(false)
  const [currentUserAlive, setCurrentUserAlive] = useState(true)
  const [currentUserChampion, setCurrentUserChampion] = useState(false)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [publicPicks, setPublicPicks] = useState<PublicPick[]>([])
  const [loadingPublicPicks, setLoadingPublicPicks] = useState(false)

  const [notification, setNotification] =
    useState<AppNotification | null>(null)
  const [loadingNotification, setLoadingNotification] = useState(false)
  const [markingNotification, setMarkingNotification] = useState(false)

  // Sailkapena
  const [standings, setStandings] = useState<Standing[]>([])
  const [loadingStandings, setLoadingStandings] = useState(false)

  const [selectedStanding, setSelectedStanding] =
    useState<Standing | null>(null)
  const [userHistory, setUserHistory] = useState<UserHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Emaitzak
  const [selectedResultsRoundId, setSelectedResultsRoundId] =
    useState<string | null>(null)

  const [roundResults, setRoundResults] = useState<RoundResult[]>([])

  const [coordinatorMode, setCoordinatorMode] = useState(false)
  const [coordinatorPassword, setCoordinatorPassword] = useState('')

  const [resultSavingTeamId, setResultSavingTeamId] =
    useState<string | null>(null)

  const [resultsMessage, setResultsMessage] = useState('')
  const [closingRound, setClosingRound] = useState(false)
  const [coordinatorAction, setCoordinatorAction] =
    useState<
      'publish' |
      'registration' |
      'openRegistration' |
      'restart' |
      'postpone' |
      'removeUser' |
      null
    >(null)

  // --------------------------------------------------
  // DATU NAGUSIAK KARGATU
  // --------------------------------------------------

  async function loadBaseData() {
    if (!competitionId) return

    const [competitionResult, teamsResult, roundsResult] =
      await Promise.all([
        supabase
          .from('competitions')
          .select('*')
          .eq('id', competitionId)
          .single(),

        supabase
          .from('teams')
          .select('*')
          .eq('competition_id', competitionId)
          .order('name'),

        supabase
          .from('rounds')
          .select('*')
          .eq('competition_id', competitionId)
          .order('round_number'),
      ])

    if (competitionResult.error) {
      console.error(
        'Errorea lehiaketa kargatzean:',
        competitionResult.error,
      )
    } else {
      setCompetition(competitionResult.data as Competition)
    }

    if (teamsResult.error) {
      console.error(
        'Errorea taldeak kargatzean:',
        teamsResult.error,
      )
    } else {
      setTeams((teamsResult.data ?? []) as Team[])
    }

    if (roundsResult.error) {
      console.error(
        'Errorea jardunaldiak kargatzean:',
        roundsResult.error,
      )
    } else {
      setRounds((roundsResult.data ?? []) as Round[])
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [competitionId])

  // --------------------------------------------------
  // JAKINARAZPENAK
  // --------------------------------------------------

  async function loadLatestNotification() {
    if (!competitionId) return

    setLoadingNotification(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setNotification(null)
      setLoadingNotification(false)
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(
        'Errorea jakinarazpena kargatzean:',
        error,
      )
      setNotification(null)
      setLoadingNotification(false)
      return
    }

    setNotification(
      data ? (data as AppNotification) : null,
    )
    setLoadingNotification(false)
  }

  async function markNotificationAsRead() {
    if (!notification) return

    setMarkingNotification(true)

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notification.id)

    if (error) {
      console.error(
        'Errorea jakinarazpena irakurrita markatzean:',
        error,
      )
      setMarkingNotification(false)
      return
    }

    setNotification(null)
    setMarkingNotification(false)
  }

  useEffect(() => {
    loadLatestNotification()

    const interval = window.setInterval(() => {
      loadLatestNotification()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [competitionId])

  // --------------------------------------------------
  // UNEKO ERABILTZAILEAREN EGOERA
  // --------------------------------------------------

  async function loadCurrentUserStatus() {
    if (!competitionId) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase.rpc(
      'get_competition_standings',
      {
        p_competition_id: competitionId,
      },
    )

    if (error) {
      console.error(
        'Errorea erabiltzailearen egoera kargatzean:',
        error,
      )
      return
    }

    const currentStanding = (data ?? []).find(
      (standing: Standing) =>
        standing.user_id === user.id,
    )

    /*
      Sailkapenean badago, bere egoera erabiltzen dugu.
      Oraindik sailkapenean ez badago, lehenespenez bizirik.
    */
    setCurrentUserAlive(
      currentStanding
        ? currentStanding.is_alive
        : true,
    )

    setCurrentUserChampion(
      currentStanding
        ? currentStanding.is_champion
        : false,
    )
  }

  useEffect(() => {
    loadCurrentUserStatus()
  }, [competitionId])

  // --------------------------------------------------
  // UNEKO KO JARDUNALDIA
  // --------------------------------------------------

  const activeRound = useMemo(
    () =>
      rounds.find(
        round =>
          round.counts_for_ko &&
          (
            round.status === 'open' ||
            round.status === 'published'
          ),
      ) ?? null,
    [rounds],
  )

  const pickDeadlinePassed = useMemo(() => {
    if (!activeRound?.pick_deadline) return false

    return (
      activeRound.status !== 'open' ||
      new Date() >= new Date(activeRound.pick_deadline)
    )
  }, [activeRound])

  useEffect(() => {
    pickInteractionRef.current = false
    setSelectedTeamId(null)
    setSavedTeamId(null)
  }, [activeRound?.id])

  // --------------------------------------------------
  // ERABILTZAILEAREN AUKERAKETAK
  // --------------------------------------------------

  useEffect(() => {
    async function loadUserPicks() {
      if (!competitionId || !activeRound) return

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: allPicks, error } = await supabase
        .from('picks')
        .select('team_id, round_id')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)

      if (error) {
        console.error(
          'Errorea aukeraketak kargatzean:',
          error,
        )
        return
      }

      const picks = allPicks ?? []

      const currentPick = picks.find(
        pick => pick.round_id === activeRound.id,
      )

      if (currentPick) {
        setSelectedTeamId(currentPick.team_id)
        setSavedTeamId(currentPick.team_id)
      } else {
        setSavedTeamId(null)

        // Karga asinkronoa erabiltzailea klik egin ondoren
        // bukatzen bada, ez dugu bere hautaketa ezabatzen.
        if (!pickInteractionRef.current) {
          setSelectedTeamId(null)
        }
      }

      const previousRoundIds = rounds
        .filter(
          round =>
            round.counts_for_ko &&
            round.round_number < activeRound.round_number,
        )
        .map(round => round.id)

      const usedIds = picks
        .filter(pick =>
          previousRoundIds.includes(pick.round_id),
        )
        .map(pick => pick.team_id)

      setUsedTeamIds(usedIds)
    }

    loadUserPicks()
  }, [competitionId, activeRound, rounds])

  // --------------------------------------------------
  // JARDUNALDIKO AUKERAKETA PUBLIKOAK
  // --------------------------------------------------

  async function loadPublicPicks(roundId: string) {
    setLoadingPublicPicks(true)

    const { data, error } = await supabase.rpc(
      'get_public_round_picks',
      {
        p_round_id: roundId,
      },
    )

    if (error) {
      console.error(
        'Errorea jardunaldiko aukeraketak kargatzean:',
        error,
      )

      setPublicPicks([])
      setLoadingPublicPicks(false)
      return
    }

    setPublicPicks((data ?? []) as PublicPick[])
    setLoadingPublicPicks(false)
  }

  useEffect(() => {
    if (!activeRound?.pick_deadline) {
      setPublicPicks([])
      return
    }

    const deadline = new Date(activeRound.pick_deadline)
    const isPublic =
      activeRound.status === 'published' ||
      activeRound.status === 'completed' ||
      new Date() >= deadline

    if (isPublic) {
      loadPublicPicks(activeRound.id)
    } else {
      setPublicPicks([])
    }

    if (
      activeRound.status !== 'open' ||
      new Date() >= deadline
    ) {
      return
    }

    const millisecondsUntilDeadline =
      deadline.getTime() - Date.now()

    const timeoutId = window.setTimeout(() => {
      loadBaseData()
      loadPublicPicks(activeRound.id)
    }, millisecondsUntilDeadline + 250)

    return () => window.clearTimeout(timeoutId)
  }, [activeRound])

  // --------------------------------------------------
  // SAILKAPENA
  // --------------------------------------------------

  async function loadStandings() {
    if (!competitionId) return

    setLoadingStandings(true)

    const { data, error } = await supabase.rpc(
      'get_competition_standings',
      {
        p_competition_id: competitionId,
      },
    )

    if (error) {
      console.error(
        'Errorea sailkapena kargatzean:',
        error,
      )

      setLoadingStandings(false)
      return
    }

    setStandings((data ?? []) as Standing[])
    setLoadingStandings(false)
  }

  useEffect(() => {
    if (activeTab !== 'standings') return

    loadStandings()
  }, [activeTab, competitionId])


  async function loadUserHistory(standing: Standing) {
    if (!competitionId) return

    setSelectedStanding(standing)
    setLoadingHistory(true)
    setUserHistory([])

    const { data, error } = await supabase.rpc(
      'get_user_pick_history',
      {
        p_competition_id: competitionId,
        p_user_id: standing.user_id,
      },
    )

    if (error) {
      console.error(
        'Errorea historikoa kargatzean:',
        error,
      )
      setLoadingHistory(false)
      return
    }

    setUserHistory((data ?? []) as UserHistoryItem[])
    setLoadingHistory(false)
  }

  // --------------------------------------------------
  // EMAITZEN JARDUNALDI LEHENETSIA
  // --------------------------------------------------

  useEffect(() => {
    if (rounds.length === 0) return

    const currentRound = [...rounds]
      .filter(
        round =>
          round.status === 'open' ||
          round.status === 'published',
      )
      .sort(
        (a, b) =>
          b.round_number - a.round_number,
      )[0]

    const latestCompletedRound = [...rounds]
      .filter(round => round.status === 'completed')
      .sort(
        (a, b) =>
          b.round_number - a.round_number,
      )[0]

    setSelectedResultsRoundId(
      currentRound?.id ??
        latestCompletedRound?.id ??
        null,
    )
  }, [rounds])

  // --------------------------------------------------
  // EMAITZAK KARGATU
  // --------------------------------------------------

  async function loadRoundResults(roundId: string) {
    const { data, error } = await supabase
      .from('round_results')
      .select('*')
      .eq('round_id', roundId)

    if (error) {
      console.error(
        'Errorea emaitzak kargatzean:',
        error,
      )
      return
    }

    setRoundResults((data ?? []) as RoundResult[])
  }

  useEffect(() => {
    if (!selectedResultsRoundId) {
      setRoundResults([])
      return
    }

    loadRoundResults(selectedResultsRoundId)
  }, [selectedResultsRoundId])

  // --------------------------------------------------
  // TALDEA AUKERATU
  // --------------------------------------------------

  async function savePick() {
    if (
      !competitionId ||
      !activeRound ||
      !selectedTeamId
    ) {
      return
    }

    if (currentUserChampion) {
      setMessage(
        'Txapelduna zara eta ez duzu beste talderik aukeratu behar.',
      )
      return
    }

    if (!currentUserAlive) {
      setMessage(
        'Kanporatuta zaude eta ezin duzu beste talderik aukeratu.',
      )
      return
    }

    if (pickDeadlinePassed) {
      setMessage('Aukeratzeko epea amaitu da.')
      return
    }

    if (usedTeamIds.includes(selectedTeamId)) {
      setMessage(
        'Talde hau aurretik erabili duzu.',
      )
      return
    }

    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage(
        'Ez da erabiltzailea aurkitu.',
      )
      setSaving(false)
      return
    }

    const { error } = await supabase.rpc(
      'save_ko_pick',
      {
        p_competition_id: competitionId,
        p_round_id: activeRound.id,
        p_team_id: selectedTeamId,
      },
    )

    if (error) {
      console.error(
        'Errorea aukeraketa gordetzean:',
        error,
      )

      setMessage(
        error.message || 'Ezin izan da aukeraketa gorde.',
      )

      setSaving(false)
      return
    }

    setSavedTeamId(selectedTeamId)
    pickInteractionRef.current = false
    setMessage('Aukeraketa gordeta.')
    setSaving(false)
  }

  // --------------------------------------------------
  // EMAITZA ALDATU
  // --------------------------------------------------

  async function setResult(
    teamId: string,
    result: 'pending' | 'won' | 'lost',
  ) {
    if (!selectedResultsRoundId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    setResultSavingTeamId(teamId)
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'set_round_result',
      {
        p_round_id:
          selectedResultsRoundId,
        p_team_id: teamId,
        p_result: result,
        p_password:
          coordinatorPassword,
      },
    )

    if (error) {
      console.error(
        'Errorea emaitza gordetzean:',
        error,
      )

      setResultsMessage(
        `Errorea: ${error.message}`,
      )

      setResultSavingTeamId(null)
      return
    }

    await loadRoundResults(
      selectedResultsRoundId,
    )

    setResultsMessage(
      'Emaitza gordeta.',
    )

    setResultSavingTeamId(null)
  }

  // --------------------------------------------------
  // KOORDINATZAILEAREN EKINTZAK
  // --------------------------------------------------

  async function publishRoundPicks() {
    if (!selectedResultsRoundId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    setCoordinatorAction('publish')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'publish_round_picks',
      {
        p_round_id: selectedResultsRoundId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(`Errorea: ${error.message}`)
      setCoordinatorAction(null)
      return
    }

    await loadBaseData()
    await loadPublicPicks(selectedResultsRoundId)

    setResultsMessage(
      'Aukeraketa itxita eta argitaratuta.',
    )
    setCoordinatorAction(null)
  }

  async function closeRegistration() {
    if (!competitionId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const confirmed = window.confirm(
      'Izen-ematea itxi nahi duzu? Une horretatik aurrera ezin izango da parte-hartzaile berririk sartu.',
    )

    if (!confirmed) return

    setCoordinatorAction('registration')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'close_competition_registration',
      {
        p_competition_id: competitionId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(`Errorea: ${error.message}`)
      setCoordinatorAction(null)
      return
    }

    await loadBaseData()
    setResultsMessage('Izen-ematea itxita.')
    setCoordinatorAction(null)
  }

  async function openRegistration() {
    if (!competitionId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const confirmed = window.confirm(
      'Izen-emateak berriro ireki nahi dituzu?',
    )

    if (!confirmed) return

    setCoordinatorAction('openRegistration')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'open_competition_registration',
      {
        p_competition_id: competitionId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(
        `Errorea: ${error.message}`,
      )
      setCoordinatorAction(null)
      return
    }

    await loadBaseData()

    setResultsMessage(
      'Izen-emateak berriro irekita.',
    )

    setCoordinatorAction(null)
  }

  async function postponeRound() {
    if (!selectedResultsRoundId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const selectedRound = rounds.find(
      round =>
        round.id === selectedResultsRoundId,
    )

    if (!selectedRound) return

    const confirmed = window.confirm(
      `${selectedRound.round_number}. jardunaldia astebete atzeratu nahi duzu?`,
    )

    if (!confirmed) return

    setCoordinatorAction('postpone')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'postpone_ko_round',
      {
        p_round_id: selectedResultsRoundId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(
        `Errorea: ${error.message}`,
      )
      setCoordinatorAction(null)
      return
    }

    await loadBaseData()

    const { data: updatedRound } =
      await supabase
        .from('rounds')
        .select(
          'pick_deadline, results_deadline',
        )
        .eq(
          'id',
          selectedResultsRoundId,
        )
        .single()

    if (updatedRound) {
      const pickDate =
        new Intl.DateTimeFormat(
          'eu-ES',
          {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid',
          },
        ).format(
          new Date(
            updatedRound.pick_deadline,
          ),
        )

      const resultsDate =
        new Intl.DateTimeFormat(
          'eu-ES',
          {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid',
          },
        ).format(
          new Date(
            updatedRound.results_deadline,
          ),
        )

      setResultsMessage(
        `📅 Jardunaldia atzeratuta. Aukeraketa: ${pickDate}. Jardunaldiaren itxiera: ${resultsDate}.`,
      )
    } else {
      setResultsMessage(
        '📅 Jardunaldia astebete atzeratu da.',
      )
    }

    setCoordinatorAction(null)
  }
  async function restartCompetition() {
    if (!competitionId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const confirmed = window.confirm(
      'Txapelketa berriro hasi nahi duzu? Aukeraketak, emaitzak, jakinarazpenak eta txapeldunak berrabiaraziko dira. Parte-hartzaileak eta taldeak mantenduko dira.',
    )

    if (!confirmed) return

    setCoordinatorAction('restart')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'restart_competition',
      {
        p_competition_id: competitionId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(`Errorea: ${error.message}`)
      setCoordinatorAction(null)
      return
    }

    setSelectedStanding(null)
    setUserHistory([])
    setNotification(null)

    await loadBaseData()
    await loadStandings()
    await loadCurrentUserStatus()
    await loadLatestNotification()

    setResultsMessage('Txapelketa berriro hasita.')
    setCoordinatorAction(null)
  }

  async function removeParticipant(
    userId: string,
    username: string,
  ) {
    if (!competitionId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const confirmed = window.confirm(
      `${username} lehiaketatik kendu nahi duzu?\n\nBere aukeraketak eta lehiaketa honetako datuak ezabatuko dira.`,
    )

    if (!confirmed) return

    setCoordinatorAction('removeUser')
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'remove_competition_participant',
      {
        p_competition_id: competitionId,
        p_user_id: userId,
        p_password: coordinatorPassword,
      },
    )

    if (error) {
      setResultsMessage(
        `Errorea: ${error.message}`,
      )
      setCoordinatorAction(null)
      return
    }

    await loadStandings()
    await loadBaseData()

    setResultsMessage(
      `${username} lehiaketatik kendu da.`,
    )

    setCoordinatorAction(null)
  }

  // --------------------------------------------------
  // JARDUNALDIA ITXI
  // --------------------------------------------------

  async function closeRound() {
    if (!selectedResultsRoundId) return

    if (!coordinatorPassword.trim()) {
      setResultsMessage(
        'Koordinatzailearen pasahitza sartu behar duzu.',
      )
      return
    }

    const selectedRound = rounds.find(
      round =>
        round.id === selectedResultsRoundId,
    )

    if (!selectedRound) return

    if (selectedRound.status === 'completed') {
      setResultsMessage(
        'Jardunaldia dagoeneko itxita dago.',
      )
      return
    }

    const missingResults = teams.filter(
      team => {
        const result =
          roundResults.find(
            item =>
              item.team_id === team.id,
          )?.result ?? 'pending'

        return result === 'pending'
      },
    )

    if (missingResults.length > 0) {
      setResultsMessage(
        `Ezin da jardunaldia itxi. ${missingResults.length} talderen emaitza falta da.`,
      )
      return
    }

    const confirmed = window.confirm(
      `${selectedRound.round_number}. jardunaldia itxi eta hurrengoa ireki nahi duzu?\n\nSailkapena, kanporaketak eta jakinarazpenak eguneratuko dira.`,
    )

    if (!confirmed) return

    setClosingRound(true)
    setResultsMessage('')

    const { error } = await supabase.rpc(
      'close_ko_round',
      {
        p_round_id:
          selectedResultsRoundId,
        p_password:
          coordinatorPassword,
      },
    )

    if (error) {
      console.error(
        'Errorea jardunaldia ixtean:',
        error,
      )

      setResultsMessage(
        `Errorea: ${error.message}`,
      )

      setClosingRound(false)
      return
    }

    /*
      Jardunaldia ixtean hiru gauza
      berriro kargatzen ditugu:
      - jardunaldiak
      - sailkapena
      - erabiltzaile honen egoera
    */
    await loadBaseData()
    await loadStandings()
    await loadCurrentUserStatus()
    await loadLatestNotification()

    setResultsMessage(
      `${selectedRound.round_number}. jardunaldia itxita. Hurrengo jardunaldia, badago, irekita geratu da.`,
    )

    setClosingRound(false)
  }

  // --------------------------------------------------
  // DATA EUSKARAZ
  // --------------------------------------------------

  


  // --------------------------------------------------
  // LABURPENAK
  // --------------------------------------------------

  const startedCount =
    standings.length

  const aliveCount =
    standings.filter(
      standing =>
        standing.player_status === 'alive',
    ).length

  const championCount =
    standings.filter(
      standing =>
        standing.player_status === 'champion',
    ).length

  const eliminatedCount =
    standings.filter(
      standing =>
        standing.player_status === 'eliminated',
    ).length

  const selectedResultsRound =
    rounds.find(
      round =>
        round.id ===
        selectedResultsRoundId,
    )

  const pendingResultsCount =
    teams.filter(team => {
      const result =
        roundResults.find(
          item =>
            item.team_id === team.id,
        )?.result ?? 'pending'

      return result === 'pending'
    }).length

  // --------------------------------------------------
  // INTERFAZEA
  // --------------------------------------------------

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Link
            to="/lehiaketak"
            className="back-link"
          >
            ← LEHIAKETAK
          </Link>

          <p className="eyebrow">
            LEHIAKETA
          </p>

          <h1>
            {competition?.name ??
              'Bigarren Nazionala Gizonezkoak'}
          </h1>

          {competition?.status === 'finished' && (
            <p className="competition-finished">
              🏁 TXAPELKETA AMAITUTA
            </p>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={`tab ${
            activeTab === 'ko'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('ko')
          }
        >
          KO
        </button>

        <button
          type="button"
          className={`tab ${
            activeTab === 'standings'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab(
              'standings',
            )
          }
        >
          Sailkapena
        </button>

        <button
          type="button"
          className={`tab ${
            activeTab === 'results'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab(
              'results',
            )
          }
        >
          Emaitzak
        </button>
      </nav>

      {/* ------------------------------------------------
          KO
      ------------------------------------------------ */}

      {activeTab === 'ko' && (
        <>
          {loadingNotification ? (
            <div className="notification-card">
              <p>Kargatzen...</p>
            </div>
          ) : notification ? (
            <section
              className={`notification-card notification-${notification.type}`}
            >
              <div className="notification-content">
                <p className="eyebrow">
                  JAKINARAZPENA
                </p>

                <h2>
                  {notification.type === 'survived' &&
                    '🔥 BIZIRIK JARRAITZEN DUZU'}

                  {notification.type === 'eliminated' &&
                    '💀 KANPORATUTA'}

                  {notification.type === 'no_pick' &&
                    '💀 KANPORATUTA'}

                  {notification.type === 'champion' &&
                    '🏆 TXAPELDUNA ZARA'}

                  {notification.type === 'champion_announcement' &&
                    '🏆 TXAPELDUNA'}

                  {notification.type === 'info' &&
                    'ℹ️ INFORMAZIOA'}
                </h2>

                <p>
                  {notification.message}
                </p>
              </div>

              <button
                type="button"
                className="notification-read-button"
                disabled={markingNotification}
                onClick={markNotificationAsRead}
              >
                {markingNotification
                  ? 'GORDETZEN...'
                  : 'IRAKURRITA'}
              </button>
            </section>
          ) : null}

          <section className="status-panel">
            <div>
              <p className="eyebrow">
                UNEKO JARDUNALDIA
              </p>

              <h2>
                {activeRound
                  ? `${activeRound.round_number}. jardunaldia`
                  : 'Oraindik jardunaldirik ez'}
              </h2>
              {activeRound?.postponed_at && (
                <div className="warning">
                  <strong>📅 JARDUNALDIA ATZERATUTA</strong>

                  <p>
                    Aukeraketa:{' '}
                    <strong>
                      {new Intl.DateTimeFormat('eu-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Madrid',
                      }).format(
                        new Date(activeRound.pick_deadline),
                      )}
                    </strong>
                  </p>

                  <p>
                    Jardunaldiaren itxiera:{' '}
                    <strong>
                      {new Intl.DateTimeFormat('eu-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Madrid',
                      }).format(
                        new Date(activeRound.results_deadline),
                      )}
                    </strong>
                  </p>
                </div>
              )}

              <p className="muted">
                Aukeratzeko azken ordua:{' '}
                <strong>Ostiralean 21:30etan</strong>
              </p>

              {pickDeadlinePassed && (
                <p className="warning">
                  Aukeraketa itxita dago.
                </p>
              )}
            </div>

            <span
              className={
                currentUserChampion
                  ? 'alive-chip champion-chip'
                  : currentUserAlive
                    ? 'alive-chip'
                    : 'alive-chip eliminated-chip'
              }
            >
              {currentUserChampion
                ? '🏆 TXAPELDUNA'
                : currentUserAlive
                  ? '🔥 BIZIRIK'
                  : '💀 KANPORATUTA'}
            </span>
          </section>

          {currentUserChampion && (
            <div className="champion-message">
              <strong>
                🏆 Txapelduna zara!
              </strong>

              <p>
                Txapelketa bizirik amaitu duzu. Zure historikoa eta
                gainerako parte-hartzaileen bilakaera ikusten jarrai
                dezakezu.
              </p>
            </div>
          )}

          {!currentUserAlive && !currentUserChampion && (
            <div className="eliminated-message">
              <strong>
                💀 KO-tik kanpo geratu zara.
              </strong>

              <p>
                Ezin duzu hurrengo jardunaldietan talderik
                aukeratu. Emaitzak, sailkapena eta
                lehiaketaren bilakaera ikusten jarrai
                dezakezu.
              </p>
            </div>
          )}

          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  AUKERAKETA
                </p>

                <h2>
                  Aukeratu taldea
                </h2>
              </div>

              <p className="muted">
                Aurretik erabilitako taldeak
                ezin dira berriro aukeratu.
              </p>
            </div>

            <div className="team-grid">
              {teams.map(team => {
                const isSelected =
                  selectedTeamId ===
                  team.id

                const isSaved =
                  savedTeamId ===
                  team.id

                const isUsed =
                  usedTeamIds.includes(
                    team.id,
                  )

                const isDisabled =
                  isUsed ||
                  pickDeadlinePassed ||
                  !currentUserAlive ||
                  currentUserChampion

                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={isDisabled}
                    className={[
                      'team-card',
                      isSelected
                        ? 'selected'
                        : '',
                      isUsed
                        ? 'used'
                        : '',
                      pickDeadlinePassed
                        ? 'locked'
                        : '',
                      (!currentUserAlive ||
                        currentUserChampion)
                        ? 'eliminated-team'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      if (
                        isDisabled
                      ) {
                        return
                      }

                      pickInteractionRef.current = true

                      setSelectedTeamId(
                        team.id,
                      )

                      setMessage('')
                    }}
                  >
                    {team.image_url ? (
                      <img
                        src={
                          team.image_url
                        }
                        alt={
                          team.name
                        }
                      />
                    ) : (
                      <div className="team-placeholder">
                        🏀
                      </div>
                    )}

                    <strong>
                      {team.name}
                    </strong>

                    {isUsed && (
                      <span className="used-pick">
                        🔒 ERABILITA
                      </span>
                    )}

                    {isSaved &&
                      !isUsed && (
                        <span className="saved-pick">
                          ✓ NIRE AUKERA
                        </span>
                      )}
                  </button>
                )
              })}
            </div>

            {selectedTeamId &&
              activeRound &&
              !pickDeadlinePassed &&
              currentUserAlive &&
              !currentUserChampion && (
                <div className="pick-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={saving}
                    onClick={
                      savePick
                    }
                  >
                    {saving
                      ? 'GORDETZEN...'
                      : 'AUKERA BAIEZTATU'}
                  </button>
                </div>
              )}

            {message && (
              <p className="pick-message">
                {message}
              </p>
            )}
          </section>

          <section className="public-picks-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  JARDUNALDIKO AUKERAKETAK
                </p>

                <h2>
                  Parte-hartzaileen aukerak
                </h2>
              </div>
            </div>

            {!activeRound ? (
              <div className="empty-state">
                Oraindik ez dago jardunaldi aktiborik.
              </div>
            ) : activeRound.status === 'open' &&
              activeRound.pick_deadline &&
              new Date() < new Date(activeRound.pick_deadline) ? (
              <div className="public-picks-locked">
                <strong>
                  🔒 Aukeraketak ezkutuan daude
                </strong>

                <p>
                  Ikusgai:{' '}
                  <strong>Ostiralean 21:30etan</strong>
                </p>
              </div>
            ) : loadingPublicPicks ? (
              <p>Kargatzen...</p>
            ) : publicPicks.length === 0 ? (
              <div className="empty-state">
                Ez dago aukeraketarik.
              </div>
            ) : (
              <div className="public-picks-list">
                {publicPicks.map(pick => (
                  <div
                    key={pick.user_id}
                    className={`public-pick-row ${
                      pick.has_pick ? '' : 'no-pick'
                    }`}
                  >
                    <strong>
                      {pick.username}
                    </strong>

                    {pick.has_pick && pick.team_name ? (
                      <div className="public-pick-team">
                        {pick.image_url ? (
                          <img
                            src={pick.image_url}
                            alt={pick.team_name}
                          />
                        ) : (
                          <div className="team-placeholder small">
                            🏀
                          </div>
                        )}

                        <span>
                          {pick.team_name}
                        </span>
                      </div>
                    ) : (
                      <div className="public-pick-missing">
                        ⚠️ EZ DU AUKERATU
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ------------------------------------------------
          SAILKAPENA
      ------------------------------------------------ */}

      {activeTab === 'standings' && (
        <section className="standings-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                SAILKAPENA
              </p>

              <h2>
                KO egoera
              </h2>
            </div>
          </div>

          <div className="results-toolbar">
            {!coordinatorMode ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCoordinatorMode(true)
                }
              >
                🔐 KOORDINATZAILE MODUA
              </button>
            ) : (
              <div className="coordinator-box">
                <label>
                  Koordinatzailearen pasahitza

                  <input
                    type="password"
                    value={coordinatorPassword}
                    onChange={event =>
                      setCoordinatorPassword(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            )}
          </div>

          {loadingStandings ? (
            <p>Kargatzen...</p>
          ) : (
            <>
              <div className="standings-summary">
                <div>
                  <strong>
                    {startedCount}
                  </strong>

                  <span>
                    HASI ZIREN
                  </span>
                </div>

                <div>
                  <strong>
                    {aliveCount}
                  </strong>

                  <span>
                    🔥 BIZIRIK
                  </span>
                </div>

                <div>
                  <strong>
                    {championCount}
                  </strong>

                  <span>
                    🏆 TXAPELDUNAK
                  </span>
                </div>

                <div>
                  <strong>
                    {eliminatedCount}
                  </strong>

                  <span>
                    💀 KANPORATUTA
                  </span>
                </div>
              </div>

              <div className="standings-list">
                {standings.map(
                  (standing, index) => (
                    <div
                      key={standing.user_id}
                      className={`standing-row standing-button ${
                        standing.player_status === 'champion'
                          ? 'champion'
                          : standing.player_status === 'eliminated'
                            ? 'eliminated'
                            : ''
                      }`}
                      onClick={() =>
                        loadUserHistory(standing)
                      }
                    >
                      <span>{index + 1}</span>

                      <strong>
                        {standing.username}
                      </strong>

                      <span className="standing-streak">
                        Bolada: {standing.streak}
                      </span>

                      <span>
                        {standing.player_status === 'champion'
                          ? '🏆 TXAPELDUNA'
                          : standing.player_status === 'alive'
                            ? '🔥 BIZIRIK'
                            : '💀 KANPORATUTA'}
                      </span>
                      {coordinatorMode && (
                        <button
                          type="button"
                          className="remove-user-button"
                          title={`${standing.username} lehiaketatik kendu`}
                          aria-label={`${standing.username} lehiaketatik kendu`}
                          onClick={event => {
                            event.stopPropagation()

                            removeParticipant(
                              standing.user_id,
                              standing.username,
                            )
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>

              {selectedStanding && (
                <section className="history-panel">
                  <div className="history-header">
                    <div>
                      <p className="eyebrow">
                        HISTORIKOA
                      </p>

                      <h2>
                        {selectedStanding.username}
                      </h2>

                      <p>
                        {selectedStanding.is_alive
                          ? '🔥 BIZIRIK'
                          : '💀 KANPORATUTA'}
                        {' · '}
                        Bolada: {selectedStanding.streak}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="history-close"
                      onClick={() => {
                        setSelectedStanding(null)
                        setUserHistory([])
                      }}
                    >
                      ITXI
                    </button>
                  </div>

                  {loadingHistory ? (
                    <p>Kargatzen...</p>
                  ) : userHistory.length === 0 ? (
                    <div className="empty-state">
                      Oraindik ez dago ikusgai dagoen aukeraketarik.
                    </div>
                  ) : (
                    <div className="history-list">
                      {userHistory.map(item => (
                        <div
                          key={item.round_id}
                          className="history-row"
                        >
                          <div className="history-round">
                            <strong>
                              {item.round_number}. jardunaldia
                            </strong>
                          </div>

                          <div className="history-team">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.team_name}
                              />
                            ) : (
                              <div className="team-placeholder small">
                                🏀
                              </div>
                            )}

                            <span>{item.team_name}</span>
                          </div>

                          <div className="history-result">
                            {item.result === 'won' &&
                              '✅ IRABAZI'}
                            {item.result === 'lost' &&
                              '❌ GALDU'}
                            {item.result === 'pending' &&
                              '⏳ ZAIN'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      )}

      {/* ------------------------------------------------
          EMAITZAK
      ------------------------------------------------ */}

      {activeTab === 'results' && (
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                EMAITZAK
              </p>

              <h2>
                Jardunaldiko emaitzak
              </h2>
            </div>

            <select
              value={
                selectedResultsRoundId ??
                ''
              }
              onChange={event => {
                setSelectedResultsRoundId(
                  event.target.value,
                )

                setResultsMessage('')
              }}
            >
              {[...rounds]
                .sort(
                  (a, b) =>
                    b.round_number -
                    a.round_number,
                )
                .map(round => (
                  <option
                    key={round.id}
                    value={round.id}
                  >
                    {
                      round.round_number
                    }
                    . jardunaldia
                  </option>
                ))}
            </select>
          </div>

          {selectedResultsRound && (
            <div className="results-info">
              <p className="muted">
                Jardunaldia ixteko azken ordua:{' '}
                <strong>Astelehena 23:00etan</strong>
              </p>

              {selectedResultsRound.status === 'locked' && (
                <p>🔒 Jardunaldia oraindik ez dago irekita.</p>
              )}

              {selectedResultsRound.status === 'open' && (
                <p>🟢 Aukeraketa irekita.</p>
              )}

              {selectedResultsRound.status === 'published' && (
                <p>👁 Aukeraketa itxita eta argitaratuta.</p>
              )}

              {selectedResultsRound.status ===
                'completed' ? (
                <p>
                  ✅ Jardunaldia itxita
                </p>
              ) : pendingResultsCount >
                0 ? (
                <p className="warning">
                  {pendingResultsCount}{' '}
                  talderen emaitza falta da.
                </p>
              ) : (
                <p>
                  ✅ Emaitza guztiak sartuta.
                </p>
              )}
            </div>
          )}

          <div className="results-toolbar">
            {!coordinatorMode ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCoordinatorMode(
                    true,
                  )
                }
              >
                🔐 KOORDINATZAILE MODUA
              </button>
            ) : (
              <div className="coordinator-box">
                <label>
                  Koordinatzailearen pasahitza

                  <input
                    type="password"
                    value={
                      coordinatorPassword
                    }
                    onChange={event =>
                      setCoordinatorPassword(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <div className="coordinator-actions">
                  {competition?.status !== 'finished' && (
                  <>
                    {!competition?.registration_closed ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={coordinatorAction !== null}
                        onClick={closeRegistration}
                      >
                        {coordinatorAction === 'registration'
                          ? 'IXTEN...'
                          : 'ITXI IZEN-EMATEAK'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={coordinatorAction !== null}
                        onClick={openRegistration}
                      >
                        {coordinatorAction === 'openRegistration'
                          ? 'IREKITZEN...'
                          : 'IREKI IZEN-EMATEAK'}
                      </button>
                    )}
                  </>
                )}

                  {selectedResultsRound?.status === 'open' && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={coordinatorAction !== null}
                      onClick={publishRoundPicks}
                    >
                      {coordinatorAction === 'publish'
                        ? 'ARGITARATZEN...'
                        : 'AUKERAKETA ITXI ETA ARGITARATU'}
                    </button>
                  )}

                  {selectedResultsRound?.status === 'open' && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={coordinatorAction !== null}
                      onClick={postponeRound}
                    >
                      {coordinatorAction === 'postpone'
                        ? 'ATZERATZEN...'
                        : '📅 ASTEBETE ATZERATU'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger-button"
                    disabled={coordinatorAction !== null}
                    onClick={restartCompetition}
                  >
                    {coordinatorAction === 'restart'
                      ? 'BERRABIARAZTEN...'
                      : 'TXAPELKETA BERRIRO HASI'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="results-list">
            {teams.map(team => {
              const teamResult =
                roundResults.find(
                  result =>
                    result.team_id ===
                    team.id,
                )?.result ??
                'pending'

              const isSaving =
                resultSavingTeamId ===
                team.id

              return (
                <div
                  key={team.id}
                  className="result-row"
                >
                  <div className="result-team-info">
                    {team.image_url ? (
                      <img
                        src={team.image_url}
                        alt={team.name}
                      />
                    ) : (
                      <div className="team-placeholder small">
                        🏀
                      </div>
                    )}

                    <div>
                      <strong>
                        {team.name}
                      </strong>

                      <div className="result-status">
                        {teamResult ===
                          'won' &&
                          '✅ IRABAZI'}

                        {teamResult ===
                          'lost' &&
                          '❌ GALDU'}

                        {teamResult ===
                          'pending' &&
                          '⏳ EMAITZARIK GABE'}
                      </div>
                    </div>
                  </div>

                  {coordinatorMode &&
                    selectedResultsRound?.status ===
                      'published' && (
                      <div className="result-actions">
                        <button
                          type="button"
                          disabled={
                            isSaving
                          }
                          className={`result-button ${
                            teamResult ===
                            'won'
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            setResult(
                              team.id,
                              'won',
                            )
                          }
                        >
                          IRABAZI
                        </button>

                        <button
                          type="button"
                          disabled={
                            isSaving
                          }
                          className={`result-button ${
                            teamResult ===
                            'lost'
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            setResult(
                              team.id,
                              'lost',
                            )
                          }
                        >
                          GALDU
                        </button>

                        <button
                          type="button"
                          disabled={
                            isSaving
                          }
                          className={`result-button ${
                            teamResult ===
                            'pending'
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            setResult(
                              team.id,
                              'pending',
                            )
                          }
                        >
                          EMAITZARIK GABE
                        </button>
                      </div>
                    )}
                </div>
              )
            })}
          </div>

          {coordinatorMode &&
            selectedResultsRound &&
            selectedResultsRound.status ===
              'published' && (
              <div className="close-round-area">
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    closingRound ||
                    pendingResultsCount >
                      0
                  }
                  onClick={
                    closeRound
                  }
                >
                  {closingRound
                    ? 'IXTEN...'
                    : 'JARDUNALDIA ITXI ETA HURRENGOA IREKI'}
                </button>

                {pendingResultsCount >
                  0 && (
                  <p className="muted">
                    Jardunaldia ixteko
                    emaitza guztiak sartu
                    behar dira.
                  </p>
                )}
              </div>
            )}

          {resultsMessage && (
            <p className="pick-message">
              {resultsMessage}
            </p>
          )}
        </section>
      )}
    </main>
  )
}