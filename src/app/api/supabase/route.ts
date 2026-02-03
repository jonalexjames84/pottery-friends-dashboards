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
        // Use secure database function that only returns aggregate counts
        const { data, error } = await supabase.rpc('get_dashboard_overview')
        if (error) throw error
        return NextResponse.json(data || {})
      }

      case 'engagementTrends': {
        // Use secure database function for daily trends
        const { data, error } = await supabase.rpc('get_engagement_trends', { days_back: days })
        if (error) throw error
        return NextResponse.json({ trends: data || [] })
      }

      case 'studioStats': {
        // Use secure database function for studio stats
        const { data, error } = await supabase.rpc('get_studio_stats')
        if (error) throw error
        return NextResponse.json({ studios: data || [] })
      }

      case 'memberGrowth': {
        // Use secure database function for member growth
        const { data, error } = await supabase.rpc('get_member_growth', { days_back: days })
        if (error) throw error
        return NextResponse.json({ growth: data || [] })
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
