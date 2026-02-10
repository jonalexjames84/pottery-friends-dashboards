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
