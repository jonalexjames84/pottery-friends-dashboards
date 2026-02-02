import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { queryType, days = 30 } = await request.json()

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    switch (queryType) {
      case 'overview': {
        // Get overview stats
        const [
          { count: totalMembers },
          { count: totalStudios },
          { count: totalPosts },
          { count: totalLikes },
          { count: totalComments },
          { count: totalFollows },
        ] = await Promise.all([
          supabase.from('studio_members').select('*', { count: 'exact', head: true }),
          supabase.from('studios').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('post_likes').select('*', { count: 'exact', head: true }),
          supabase.from('post_comments').select('*', { count: 'exact', head: true }),
          supabase.from('follows').select('*', { count: 'exact', head: true }),
        ])

        return NextResponse.json({
          totalMembers: totalMembers || 0,
          totalStudios: totalStudios || 0,
          totalPosts: totalPosts || 0,
          totalLikes: totalLikes || 0,
          totalComments: totalComments || 0,
          totalFollows: totalFollows || 0,
        })
      }

      case 'recentPosts': {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, created_at, studio_id')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        return NextResponse.json({ posts: posts || [] })
      }

      case 'recentLikes': {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('id, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        return NextResponse.json({ likes: likes || [] })
      }

      case 'recentComments': {
        const { data: comments } = await supabase
          .from('post_comments')
          .select('id, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        return NextResponse.json({ comments: comments || [] })
      }

      case 'recentFollows': {
        const { data: follows } = await supabase
          .from('follows')
          .select('id, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        return NextResponse.json({ follows: follows || [] })
      }

      case 'memberGrowth': {
        const { data: members } = await supabase
          .from('studio_members')
          .select('id, joined_at, status')
          .order('joined_at', { ascending: true })

        return NextResponse.json({ members: members || [] })
      }

      case 'engagementTrends': {
        // Get all engagement data for trend analysis
        const [postsRes, likesRes, commentsRes] = await Promise.all([
          supabase
            .from('posts')
            .select('id, created_at')
            .gte('created_at', startDate.toISOString()),
          supabase
            .from('post_likes')
            .select('id, created_at')
            .gte('created_at', startDate.toISOString()),
          supabase
            .from('post_comments')
            .select('id, created_at')
            .gte('created_at', startDate.toISOString()),
        ])

        return NextResponse.json({
          posts: postsRes.data || [],
          likes: likesRes.data || [],
          comments: commentsRes.data || [],
        })
      }

      case 'studioStats': {
        const { data: studios } = await supabase
          .from('studios')
          .select('id, name, created_at')

        const { data: members } = await supabase
          .from('studio_members')
          .select('studio_id, status')

        // Count members per studio
        const studioMemberCounts = (members || []).reduce((acc: Record<string, number>, m) => {
          if (m.status === 'active') {
            acc[m.studio_id] = (acc[m.studio_id] || 0) + 1
          }
          return acc
        }, {})

        const studioStats = (studios || []).map(s => ({
          id: s.id,
          name: s.name,
          memberCount: studioMemberCounts[s.id] || 0,
        }))

        return NextResponse.json({ studios: studioStats })
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
