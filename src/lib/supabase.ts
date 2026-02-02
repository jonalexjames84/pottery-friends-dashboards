import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Impression {
  id: string
  created_at: string
  platform: 'iOS' | 'Android' | 'Web'
  count: number
}

export interface Install {
  id: string
  created_at: string
  platform: 'iOS' | 'Android' | 'Web'
  count: number
}

export interface UserEvent {
  id: string
  user_id: string
  event_type: 'app_open' | 'sign_up' | 'onboarding_complete' | 'first_action'
  created_at: string
}

export interface UserSession {
  id: string
  user_id: string
  session_date: string
}

export async function getImpressions(startDate: Date, endDate: Date, platform?: string) {
  let query = supabase
    .from('impressions')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (platform && platform !== 'All') {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Impression[]
}

export async function getInstalls(startDate: Date, endDate: Date, platform?: string) {
  let query = supabase
    .from('installs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (platform && platform !== 'All') {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Install[]
}

export async function getFunnelEvents(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('user_events')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (error) throw error
  return data as UserEvent[]
}

export async function getUserSessions(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .gte('session_date', startDate.toISOString())
    .lte('session_date', endDate.toISOString())

  if (error) throw error
  return data as UserSession[]
}
