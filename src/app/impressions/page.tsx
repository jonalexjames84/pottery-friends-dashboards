'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'
import { EarlyDataBanner } from '@/components/EarlyDataBanner'

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <p className="text-red-600 text-sm mt-2">Make sure POSTHOG_API_KEY is set in environment variables.</p>
      </div>
    )
  }

  const wowChange = metrics.thisWeekViews - metrics.lastWeekViews
  const wowPercent = metrics.lastWeekViews > 0
    ? Math.round((wowChange / metrics.lastWeekViews) * 100)
    : 0

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Screen Views</h1>
          <p className="text-xs sm:text-sm text-gray-500">App navigation patterns from PostHog</p>
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <EarlyDataBanner totalUsers={metrics.uniqueUsers} />

      {/* North Star for this page */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-6 text-white mb-6">
        <p className="text-blue-100 text-sm font-medium">KEY METRIC</p>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-4xl font-bold">{metrics.avgViewsPerUser}</span>
          <span className="text-blue-100">Screens per User</span>
        </div>
        <p className="text-blue-200 text-sm mt-2">
          {metrics.uniqueUsers} users viewed {metrics.totalViews} screens total
        </p>
      </div>

      {/* WoW Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">This Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.thisWeekViews}</p>
          <p className={`text-sm mt-1 ${wowChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {wowChange >= 0 ? '+' : ''}{wowChange} ({wowPercent >= 0 ? '+' : ''}{wowPercent}%) vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Last Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.lastWeekViews}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Unique Users</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.uniqueUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Top Screen</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 truncate">{metrics.topScreen}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Screen Views</h2>
          {screenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={screenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Views" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Views by Screen</h2>
          {screenBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={screenBreakdown.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="screen" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="views" fill="#3b82f6" name="Views" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Screen Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Screen Breakdown</h2>
        {screenBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.screen}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.views}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{row.percentage}%</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No screen data available</p>
        )}
      </div>

      {/* Insight */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-1">Data Source</h3>
        <p className="text-blue-700 text-sm">
          Screen view events from PostHog ($screen events). Add more screens to your app tracking to see complete navigation patterns.
        </p>
      </div>
    </div>
  )
}
