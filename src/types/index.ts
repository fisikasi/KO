export type Competition = {
  id: string
  name: string
  registration_deadline: string
  is_active: boolean
}

export type Team = {
  id: string
  competition_id: string
  name: string
  image_url: string | null
}

export type Round = {
  id: string
  competition_id: string
  round_number: number
  pick_deadline: string
  results_deadline: string
  counts_for_ko: boolean
  status: 'open' | 'picks_closed' | 'results_pending' | 'completed'
}
