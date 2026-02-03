'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

export default function ImpressionsPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screenData, setScreenData] = useState<any[]>([])
  const [screenBreakdown, setScreenBreakdown] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    totalViews: 0,
    uniqueUsers: 0,
    avgViewsPerUser: 0,
    topScreen: '',
    thisWeekViews: 0,
    lastWeekViews: 0,
  })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const eventsRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
        })

        if (!eventsRes.ok) throw new Error('Failed to fetch events')
        const eventsData = await eventsRes.json()
        const events = eventsData.results || []

        const screenEvents = events.filter((e: any) => e.event === '$screen')
        const totalViews = screenEvents.length
        const uniqueUserIds = new Set(screenEvents.map((e: any) => e.distinct_id))
        const uniqueUsers = uniqueUserIds.size

        // Group by date
        const dateMap = new Map<string, number>()
        screenEvents.forEach((e: any) => {
          const date = e.timestamp.split('T')[0]
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        })

        const dailyData = Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, views: count }))
          .sort((a, b) => a.date.localeCompare(b.date))

        setScreenData(dailyData)

        // Group by screen name
        const screenMap = new Map<string, number>()
        screenEvents.forEach((e: any) => {
          const screenName = e.properties?.$screen_name || 'Unknown'
          screenMap.set(screenName, (screenMap.get(screenName) || 0) + 1)
        })

        const breakdown = Array.from(screenMap.entries())
          .map(([screen, count]) => ({ screen, views: count, percentage: ((count / totalViews) * 100).toFixed(1) }))
          .sort((a, b) => b.views - a.views)

        setScreenBreakdown(breakdown)

        // Calculate WoW
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const thisWeekViews = screenEvents.filter((e: any) => new Date(e.timestamp) >= oneWeekAgo).length
        const lastWeekViews = screenEvents.filter((e: any) => {
          const d = new Date(e.timestamp)
          return d >= twoWeeksAgo && d < oneWeekAgo
        }).length

        setMetrics({
          totalViews,
          uniqueUsers,
          avgViewsPerUser: uniqueUsers > 0 ? Math.round((totalViews / uniqueUsers) * 10) / 10 : 0,
          topScreen: breakdown[0]?.screen || 'N/A',
          thisWeekViews,
          lastWeekViews,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading PostHog data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 font-medium">Error: {error}</p>
        <p className="text-red-600 text-sm mt-2">Make sure POSTHOG_API_KEY is set in environment variables.</p>
      </div>
    )
  }

  const wowChange = metrics.thisWeekViews - metrics.lastWeekViews
  const wowPercent = metrics.lastWeekViews > 0
    ? Math.round((wowChange / metrics.lastWeekViews) * 100)
    : 0

  // Determine session depth health
  const sessionHealth = metrics.avgViewsPerUser >= 5 ? 'healthy' : metrics.avgViewsPerUser >= 3 ? 'okay' : 'needs-attention'

  // Find key screens
  const feedScreen = screenBreakdown.find(s => s.screen.toLowerCase().includes('feed') || s.screen.toLowerCase().includes('home'))
  const profileScreen = screenBreakdown.find(s => s.screen.toLowerCase().includes('profile'))
  const postScreen = screenBreakdown.find(s => s.screen.toLowerCase().includes('post') || s.screen.toLowerCase().includes('create'))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screen Views & Navigation</h1>
          <p className="text-sm text-gray-500">How users navigate through your app</p>
          {metrics.uniqueUsers < 100 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({metrics.uniqueUsers} users) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-6 text-white ${
          sessionHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          sessionHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Session Depth</p>
          <p className="text-4xl font-bold mt-1">{metrics.avgViewsPerUser}</p>
          <p className="text-white/70 text-sm mt-1">screens per user</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">This Week</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{metrics.thisWeekViews.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${wowChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {wowChange >= 0 ? '+' : ''}{wowPercent}% vs last week
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Unique Users</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{metrics.uniqueUsers}</p>
          <p className="text-sm text-gray-500 mt-1">with screen events</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Top Screen</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1 truncate">{metrics.topScreen}</p>
          <p className="text-sm text-gray-500 mt-1">most visited</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Views */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Daily Screen Views</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{metrics.totalViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500">total views</p>
            </div>
          </div>
          {screenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={screenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Views" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No PostHog data yet</p>
          )}
        </div>

        {/* Screen Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Views by Screen</h2>
          {screenBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={screenBreakdown.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="screen" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="views" fill="#6366f1" name="Views" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No screen data yet</p>
          )}
        </div>
      </div>

      {/* Screen Table */}
      {screenBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Screens</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {screenBreakdown.map((row, index) => (
                  <tr key={index} className={index === 0 ? 'bg-indigo-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.screen}
                      {index === 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Top</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{row.percentage}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${Math.min(parseFloat(row.percentage) * 2, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Questions & Hypotheses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Are users exploring the app?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> {metrics.avgViewsPerUser} screens per session.
              {metrics.avgViewsPerUser >= 5
                ? " → Great depth! Users are exploring multiple features."
                : metrics.avgViewsPerUser >= 3
                  ? " → Moderate. Users visit a few screens but may not be discovering all features."
                  : " → Low. Users might be confused or not finding value. Check onboarding flow."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Which screens are most popular?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> "{metrics.topScreen}" is the most visited screen.
              {feedScreen && ` Feed/Home has ${feedScreen.percentage}% of views.`}
              {profileScreen && ` Profiles get ${profileScreen.percentage}% of views.`}
              {postScreen && ` Post creation gets ${postScreen.percentage}% of views.`}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Is app usage growing?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {wowPercent >= 0 ? '+' : ''}{wowPercent}% screen views week-over-week.
              {wowPercent >= 10
                ? " → Growing! More users or deeper sessions."
                : wowPercent >= -10
                  ? " → Stable. Usage is consistent."
                  : " → Declining. Check if users are churning or using the app less."}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Navigation Hypotheses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${metrics.avgViewsPerUser >= 4 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: Feed → Profile drives follows</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who visit profiles from the feed are more likely to follow.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Track feed → profile → follow conversion path.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${postScreen ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Post creation screen = activation</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who reach the post creation screen are more likely to become active.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare retention for users who visited vs didn't visit create screen.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H3: Studio screens increase engagement</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who visit studio pages have higher overall engagement.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Segment engagement by studio screen visits.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H4: Deep sessions = retained users</p>
            </div>
            <p className="text-sm text-gray-600">
              Users with 5+ screens per session have 2x better D7 retention.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Correlate session depth with D7 retention.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {metrics.avgViewsPerUser < 3 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900">Improve session depth ({metrics.avgViewsPerUser} screens/user)</p>
                <p className="text-sm text-gray-600">
                  Users aren't exploring. Consider: better navigation hints, onboarding tour, or prominent CTAs to other features.
                </p>
              </div>
            </div>
          )}

          {wowPercent < -15 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900">Address declining usage ({wowPercent}% WoW)</p>
                <p className="text-sm text-gray-600">
                  Screen views are down. Check: are users churning, or using the app less frequently?
                </p>
              </div>
            </div>
          )}

          {!postScreen && metrics.totalViews > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900">Track post creation screen</p>
                <p className="text-sm text-gray-600">
                  No "post" or "create" screen in data. Add PostHog tracking to measure content creation flow.
                </p>
              </div>
            </div>
          )}

          {metrics.avgViewsPerUser >= 5 && wowPercent >= 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-gray-900">Navigation is healthy!</p>
                <p className="text-sm text-gray-600">
                  Users are exploring the app well. Focus on converting screen views to actions (posts, likes, follows).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Data from PostHog $screen events. Track more screens to see complete navigation patterns.
      </p>
    </div>
  )
}
