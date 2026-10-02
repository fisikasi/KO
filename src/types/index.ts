export type Competition = {
  id: string
  name: string
  registration_deadline: string
  registration_closed: boolean
  registration_closed_at?: string | null
  status: 'registration' | 'active' | 'finished'
  auto_create_rounds: boolean
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
  status: 'locked' | 'open' | 'published' | 'completed'
  published_at?: string | null
  closed_at?: string | null
}
