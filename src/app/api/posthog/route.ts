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

      // Website Analytics Queries
      case 'websitePageViews':
        query = {
          kind: 'TrendsQuery',
          series: [
            { event: '$pageview', kind: 'EventsNode', name: 'Page Views' },
            { event: '$pageview', kind: 'EventsNode', math: 'unique_session', name: 'Visitors' },
          ],
          interval: 'day',
          dateRange: { date_from: `-${days}d` },
          filterTestAccounts: true,
          properties: {
            type: 'AND',
            values: [
              {
                type: 'AND',
                values: [{ key: '$host', value: 'potteryfriends.com', operator: 'icontains', type: 'event' }]
              }
            ]
          }
        }
        break

      case 'websiteTrafficSources':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$pageview', kind: 'EventsNode', math: 'unique_session' }],
          dateRange: { date_from: `-${days}d` },
          breakdownFilter: { breakdown: '$referring_domain', breakdown_type: 'event', breakdown_limit: 10 },
          filterTestAccounts: true,
          properties: {
            type: 'AND',
            values: [
              {
                type: 'AND',
                values: [{ key: '$host', value: 'potteryfriends.com', operator: 'icontains', type: 'event' }]
              }
            ]
          }
        }
        break

      case 'websiteTopPages':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$pageview', kind: 'EventsNode' }],
          dateRange: { date_from: `-${days}d` },
          breakdownFilter: { breakdown: '$pathname', breakdown_type: 'event', breakdown_limit: 15 },
          filterTestAccounts: true,
          properties: {
            type: 'AND',
            values: [
              {
                type: 'AND',
                values: [{ key: '$host', value: 'potteryfriends.com', operator: 'icontains', type: 'event' }]
              }
            ]
          }
        }
        break

      case 'websiteDevices':
        query = {
          kind: 'TrendsQuery',
          series: [{ event: '$pageview', kind: 'EventsNode', math: 'unique_session' }],
          dateRange: { date_from: `-${days}d` },
          breakdownFilter: { breakdown: '$device_type', breakdown_type: 'event' },
          filterTestAccounts: true,
          properties: {
            type: 'AND',
            values: [
              {
                type: 'AND',
                values: [{ key: '$host', value: 'potteryfriends.com', operator: 'icontains', type: 'event' }]
              }
            ]
          }
        }
        break

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

    // Transform website analytics responses
    if (queryType === 'websitePageViews') {
      return NextResponse.json(transformWebsitePageViews(data, days))
    }
    if (queryType === 'websiteTrafficSources') {
      return NextResponse.json(transformWebsiteTrafficSources(data))
    }
    if (queryType === 'websiteTopPages') {
      return NextResponse.json(transformWebsiteTopPages(data))
    }
    if (queryType === 'websiteDevices') {
      return NextResponse.json(transformWebsiteDevices(data))
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PostHog API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Transform website page views data
function transformWebsitePageViews(data: any, days: number) {
  const results = data?.results || []
  const trend: any[] = []

  // PostHog returns series data - first is page views, second is visitors
  const pageViewsSeries = results[0] || { data: [], days: [] }
  const visitorsSeries = results[1] || { data: [], days: [] }

  const dates = pageViewsSeries.days || pageViewsSeries.labels || []
  const pageViewsData = pageViewsSeries.data || []
  const visitorsData = visitorsSeries.data || []

  for (let i = 0; i < dates.length; i++) {
    trend.push({
      date: dates[i]?.split('T')[0] || `Day ${i + 1}`,
      pageViews: pageViewsData[i] || 0,
      visitors: visitorsData[i] || 0,
    })
  }

  const totalPageViews = pageViewsData.reduce((a: number, b: number) => a + b, 0)
  const uniqueVisitors = visitorsData.reduce((a: number, b: number) => a + b, 0)

  // Calculate week-over-week changes
  const midpoint = Math.floor(dates.length / 2)
  const thisWeekViews = pageViewsData.slice(midpoint).reduce((a: number, b: number) => a + b, 0)
  const lastWeekViews = pageViewsData.slice(0, midpoint).reduce((a: number, b: number) => a + b, 0)
  const pageViewsChange = lastWeekViews > 0 ? Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100) : 0

  const thisWeekVisitors = visitorsData.slice(midpoint).reduce((a: number, b: number) => a + b, 0)
  const lastWeekVisitors = visitorsData.slice(0, midpoint).reduce((a: number, b: number) => a + b, 0)
  const visitorsChange = lastWeekVisitors > 0 ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100) : 0

  return {
    trend,
    summary: {
      totalPageViews,
      uniqueVisitors,
      avgSessionDuration: 45, // Placeholder - would need session data
      bounceRate: 55, // Placeholder - would need session data
      appConversions: 0, // Placeholder - needs conversion tracking
      pageViewsChange,
      visitorsChange,
      conversionChange: 0,
      // Funnel placeholders - will populate as tracking is added
      betaSignups: 0,
      betaActivated: 0,
      betaFirstPost: 0,
      betaActive: 0,
      waitlistTotal: 0,
      waitlistInvited: 0,
      waitlistConverted: 0,
      waitlistActive: 0,
      webUsers: uniqueVisitors,
      sawAppPromo: Math.round(uniqueVisitors * 0.4),
      clickedDownload: 0,
      appUsers: 0,
      studioLeads: 0,
      studioDemos: 0,
      studioTrials: 0,
      studiosPaying: 0,
    }
  }
}

// Transform traffic sources data
function transformWebsiteTrafficSources(data: any) {
  const results = data?.results || []
  const sources: any[] = []

  // PostHog breakdown returns multiple series, one per breakdown value
  let totalVisitors = 0
  for (const series of results) {
    const visitors = (series.data || []).reduce((a: number, b: number) => a + b, 0)
    totalVisitors += visitors
    sources.push({
      source: series.breakdown_value || 'Direct',
      visitors,
    })
  }

  // Add percentages and sort
  for (const source of sources) {
    source.percentage = totalVisitors > 0 ? Math.round((source.visitors / totalVisitors) * 100) : 0
  }
  sources.sort((a, b) => b.visitors - a.visitors)

  // Clean up source names
  for (const source of sources) {
    if (!source.source || source.source === '$direct' || source.source === '') {
      source.source = 'Direct'
    } else if (source.source.includes('google')) {
      source.source = 'Google'
    } else if (source.source.includes('facebook') || source.source.includes('instagram')) {
      source.source = 'Social'
    } else if (source.source.includes('twitter') || source.source.includes('x.com')) {
      source.source = 'Social'
    }
  }

  return { sources: sources.slice(0, 8) }
}

// Transform top pages data
function transformWebsiteTopPages(data: any) {
  const results = data?.results || []
  const pages: any[] = []

  for (const series of results) {
    const views = (series.data || []).reduce((a: number, b: number) => a + b, 0)
    pages.push({
      path: series.breakdown_value || '/',
      views,
    })
  }

  pages.sort((a, b) => b.views - a.views)

  return { pages: pages.slice(0, 15) }
}

// Transform devices data
function transformWebsiteDevices(data: any) {
  const results = data?.results || []
  const devices: any[] = []

  let totalVisitors = 0
  for (const series of results) {
    const visitors = (series.data || []).reduce((a: number, b: number) => a + b, 0)
    totalVisitors += visitors

    let deviceName = series.breakdown_value || 'Unknown'
    // Normalize device names
    if (deviceName.toLowerCase().includes('mobile') || deviceName.toLowerCase().includes('phone')) {
      deviceName = 'Mobile'
    } else if (deviceName.toLowerCase().includes('tablet') || deviceName.toLowerCase().includes('ipad')) {
      deviceName = 'Tablet'
    } else if (deviceName.toLowerCase().includes('desktop') || deviceName.toLowerCase().includes('pc')) {
      deviceName = 'Desktop'
    }

    // Merge duplicates
    const existing = devices.find(d => d.device === deviceName)
    if (existing) {
      existing.visitors += visitors
    } else {
      devices.push({ device: deviceName, visitors })
    }
  }

  // Add percentages
  for (const device of devices) {
    device.percentage = totalVisitors > 0 ? Math.round((device.visitors / totalVisitors) * 100) : 0
  }

  devices.sort((a, b) => b.visitors - a.visitors)

  return { devices }
}
