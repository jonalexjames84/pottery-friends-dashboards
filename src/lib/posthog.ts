const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || ''
const POSTHOG_PROJECT_ID = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID || '304303'
const POSTHOG_HOST = 'https://us.i.posthog.com'

export interface PostHogEvent {
  id: string
  distinct_id: string
  event: string
  timestamp: string
  properties: Record<string, any>
  person?: {
    distinct_ids: string[]
    properties: Record<string, any>
  }
}

export interface PostHogInsightResult {
  result: any[]
  timezone: string
}

export async function fetchPostHogEvents(limit = 100): Promise<PostHogEvent[]> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    }
  )

  if (!res.ok) {
    throw new Error(`PostHog API error: ${res.status}`)
  }

  const data = await res.json()
  return data.results || []
}

export async function fetchPostHogInsight(query: any): Promise<any> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostHog API error: ${res.status} - ${text}`)
  }

  return res.json()
}

export async function getScreenViews(days = 30) {
  const query = {
    kind: 'TrendsQuery',
    series: [
      {
        event: '$screen',
        kind: 'EventsNode',
      },
    ],
    interval: 'day',
    dateRange: {
      date_from: `-${days}d`,
    },
    breakdownFilter: {
      breakdown: '$screen_name',
      breakdown_type: 'event',
    },
  }

  return fetchPostHogInsight(query)
}

export async function getLoginFunnel(days = 30) {
  const query = {
    kind: 'FunnelQuery',
    series: [
      { event: 'login_started', kind: 'EventsNode' },
      { event: 'login_completed', kind: 'EventsNode' },
    ],
    dateRange: {
      date_from: `-${days}d`,
    },
    funnelWindowInterval: 1,
    funnelWindowIntervalUnit: 'day',
  }

  return fetchPostHogInsight(query)
}

export async function getDailyActiveUsers(days = 30) {
  const query = {
    kind: 'TrendsQuery',
    series: [
      {
        event: '$screen',
        kind: 'EventsNode',
        math: 'dau',
      },
    ],
    interval: 'day',
    dateRange: {
      date_from: `-${days}d`,
    },
  }

  return fetchPostHogInsight(query)
}

export async function getRetention(days = 30) {
  const query = {
    kind: 'RetentionQuery',
    retentionFilter: {
      retentionType: 'retention_first_time',
      totalIntervals: 8,
      period: 'Day',
      targetEntity: { id: '$screen', type: 'events' },
      returningEntity: { id: '$screen', type: 'events' },
    },
    dateRange: {
      date_from: `-${days}d`,
    },
  }

  return fetchPostHogInsight(query)
}

export async function getEventsByPlatform(days = 30) {
  const query = {
    kind: 'TrendsQuery',
    series: [
      {
        event: '$screen',
        kind: 'EventsNode',
      },
    ],
    interval: 'day',
    dateRange: {
      date_from: `-${days}d`,
    },
    breakdownFilter: {
      breakdown: '$os',
      breakdown_type: 'event',
    },
  }

  return fetchPostHogInsight(query)
}

export async function getTotalUsers() {
  const query = {
    kind: 'TrendsQuery',
    series: [
      {
        event: '$screen',
        kind: 'EventsNode',
        math: 'unique_users',
      },
    ],
    dateRange: {
      date_from: '-30d',
    },
  }

  return fetchPostHogInsight(query)
}
