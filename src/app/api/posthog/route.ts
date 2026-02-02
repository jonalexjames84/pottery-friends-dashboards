import { NextRequest, NextResponse } from 'next/server'

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || ''
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '304303'
const POSTHOG_HOST = 'https://us.i.posthog.com'

export async function POST(request: NextRequest) {
  try {
    const { queryType, days = 30 } = await request.json()

    let query: any

    switch (queryType) {
      case 'screenViews':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$screen', kind: 'EventsNode' }],
          interval: 'day',
          dateRange: { date_from: `-${days}d` },
          breakdownFilter: { breakdown: '$screen_name', breakdown_type: 'event' },
        }
        break

      case 'dailyActiveUsers':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$screen', kind: 'EventsNode', math: 'dau' }],
          interval: 'day',
          dateRange: { date_from: `-${days}d` },
        }
        break

      case 'loginFunnel':
        query = {
          kind: 'FunnelQuery',
          series: [
            { event: 'login_started', kind: 'EventsNode' },
            { event: 'login_completed', kind: 'EventsNode' },
          ],
          dateRange: { date_from: `-${days}d` },
          funnelWindowInterval: 1,
          funnelWindowIntervalUnit: 'day',
        }
        break

      case 'retention':
        query = {
          kind: 'RetentionQuery',
          retentionFilter: {
            retentionType: 'retention_first_time',
            totalIntervals: 8,
            period: 'Day',
            targetEntity: { id: '$screen', type: 'events' },
            returningEntity: { id: '$screen', type: 'events' },
          },
          dateRange: { date_from: `-${days}d` },
        }
        break

      case 'eventsByPlatform':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$screen', kind: 'EventsNode' }],
          interval: 'day',
          dateRange: { date_from: `-${days}d` },
          breakdownFilter: { breakdown: '$os', breakdown_type: 'event' },
        }
        break

      case 'totalEvents':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$screen', kind: 'EventsNode' }],
          dateRange: { date_from: `-${days}d` },
        }
        break

      case 'uniqueUsers':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$screen', kind: 'EventsNode', math: 'dau' }],
          dateRange: { date_from: `-${days}d` },
        }
        break

      case 'events':
        // Fetch raw events
        const eventsRes = await fetch(
          `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events?limit=1000`,
          {
            headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` },
          }
        )
        if (!eventsRes.ok) {
          throw new Error(`PostHog API error: ${eventsRes.status}`)
        }
        const eventsData = await eventsRes.json()
        return NextResponse.json(eventsData)

      default:
        return NextResponse.json({ error: 'Invalid query type' }, { status: 400 })
    }

    const res = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`PostHog API error: ${res.status} - ${text}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('PostHog API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
