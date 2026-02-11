import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { queryType, days = 30 } = await request.json()

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (queryType) {
      case 'overview': {
        const { data, error } = await supabase.rpc('get_dashboard_overview')
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'engagementTrends': {
        const { data, error } = await supabase.rpc('get_engagement_trends', { days_back: days })
        if (error) throw error
        return NextResponse.json({ trends: data || [] })
      }

      case 'studioStats': {
        const { data, error } = await supabase.rpc('get_studio_stats')
        if (error) throw error
        return NextResponse.json({ studios: data || [] })
      }

      case 'memberGrowth': {
        const { data, error } = await supabase.rpc('get_member_growth', { days_back: days })
        if (error) throw error
        return NextResponse.json({ growth: data || [] })
      }

      case 'activeMembers': {
        const { data, error } = await supabase.rpc('get_active_members', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'wowMetrics': {
        const { data, error } = await supabase.rpc('get_wow_metrics')
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'activationFunnel': {
        const { data, error } = await supabase.rpc('get_activation_funnel')
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'cohortRetention': {
        const { data, error } = await supabase.rpc('get_cohort_retention')
        if (error) throw error
        return NextResponse.json({ cohorts: data || [] })
      }

      case 'studioHealth': {
        const { data, error } = await supabase.rpc('get_studio_health')
        if (error) throw error
        return NextResponse.json({ studios: data || [] })
      }

      case 'unifiedActiveMembers': {
        const { data, error } = await supabase.rpc('get_unified_active_members', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'unifiedFunnel': {
        const { data, error } = await supabase.rpc('get_unified_funnel', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'engagementDistribution': {
        const { data, error } = await supabase.rpc('get_engagement_distribution', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'resurrectionRate': {
        const { data, error } = await supabase.rpc('get_resurrection_rate', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'retentionCohorts': {
        const { data, error } = await supabase.rpc('get_retention_cohorts', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'websiteAnalytics': {
        const { data, error } = await supabase.rpc('get_website_analytics', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'd0Engagement': {
        const { data, error } = await supabase.rpc('get_d0_engagement_breakdown', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'd1RetentionByFeature': {
        const { data, error } = await supabase.rpc('get_d1_retention_by_feature', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'newFeatureActivity': {
        const { data, error } = await supabase.rpc('get_new_feature_activity', { days_back: days })
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'impressions': {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        const { data, error } = await supabase
          .from('impressions')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
        if (error) throw error
        const rows = (data || []) as { created_at: string; platform: string; count: number }[]
        // Group by date and platform
        const byDate = new Map<string, { date: string; iOS: number; Android: number; Web: number; total: number }>()
        for (const row of rows) {
          const date = row.created_at.split('T')[0]
          if (!byDate.has(date)) byDate.set(date, { date, iOS: 0, Android: 0, Web: 0, total: 0 })
          const entry = byDate.get(date)!
          const platform = row.platform as 'iOS' | 'Android' | 'Web'
          entry[platform] = (entry[platform] || 0) + row.count
          entry.total += row.count
        }
        const trend = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
        const totalImpressions = rows.reduce((sum, r) => sum + r.count, 0)
        const platformTotals = { iOS: 0, Android: 0, Web: 0 }
        for (const r of rows) { platformTotals[r.platform as keyof typeof platformTotals] += r.count }
        return NextResponse.json({ trend, total: totalImpressions, platforms: platformTotals })
      }

      case 'installs': {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        const { data, error } = await supabase
          .from('installs')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
        if (error) throw error
        const rows = (data || []) as { created_at: string; platform: string; count: number }[]
        const byDate = new Map<string, { date: string; iOS: number; Android: number; Web: number; total: number }>()
        for (const row of rows) {
          const date = row.created_at.split('T')[0]
          if (!byDate.has(date)) byDate.set(date, { date, iOS: 0, Android: 0, Web: 0, total: 0 })
          const entry = byDate.get(date)!
          const platform = row.platform as 'iOS' | 'Android' | 'Web'
          entry[platform] = (entry[platform] || 0) + row.count
          entry.total += row.count
        }
        const trend = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
        const totalInstalls = rows.reduce((sum, r) => sum + r.count, 0)
        const platformTotals = { iOS: 0, Android: 0, Web: 0 }
        for (const r of rows) { platformTotals[r.platform as keyof typeof platformTotals] += r.count }
        return NextResponse.json({ trend, total: totalInstalls, platforms: platformTotals })
      }

      default:
        return NextResponse.json({ error: 'Invalid query type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Supabase API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
