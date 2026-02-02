'use client'

import { useState, useEffect } from 'react'
import {
  FunnelChart,
  Funnel,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [conversionRate, setConversionRate] = useState(0)

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

        // Count unique users at each funnel stage
        const loginStartedUsers = new Set(
          events.filter((e: any) => e.event === 'login_started').map((e: any) => e.distinct_id)
        )
        const loginCompletedUsers = new Set(
          events.filter((e: any) => e.event === 'login_completed').map((e: any) => e.distinct_id)
        )
        const screenViewUsers = new Set(
          events.filter((e: any) => e.event === '$screen').map((e: any) => e.distinct_id)
        )

        // Build funnel stages based on available events
        const stages: Record<string, number> = {
          'App Opened': screenViewUsers.size,
          'Login Started': loginStartedUsers.size,
          'Login Completed': loginCompletedUsers.size,
        }

        setStageCounts(stages)

        // Format for funnel chart
        const funnelFormatted = Object.entries(stages).map(([name, value], index) => ({
          name,
          value,
          fill: ['#6366f1', '#f59e0b', '#10b981'][index],
        }))

        setFunnelData(funnelFormatted)

        // Calculate conversion rate
        const rate = loginStartedUsers.size > 0
          ? (loginCompletedUsers.size / loginStartedUsers.size) * 100
          : 0
        setConversionRate(rate)
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

  // Calculate conversion data between stages
  const stageNames = Object.keys(stageCounts)
  const conversionData = stageNames.slice(0, -1).map((stage, i) => {
    const currentCount = stageCounts[stage]
    const nextStage = stageNames[i + 1]
    const nextCount = stageCounts[nextStage]
    const rate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0
    const dropOff = 100 - rate

    return {
      transition: `${stage} → ${nextStage}`,
      conversionRate: Math.round(rate * 10) / 10,
      dropOffRate: Math.round(dropOff * 10) / 10,
      usersConverted: nextCount,
      usersDropped: currentCount - nextCount,
    }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Login Funnel</h1>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <MetricCard key={stage} title={stage} value={count.toLocaleString()} />
        ))}
        <MetricCard
          title="Login Conversion"
          value={`${conversionRate.toFixed(1)}%`}
          changeType={conversionRate >= 50 ? 'positive' : conversionRate >= 25 ? 'neutral' : 'negative'}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Journey Funnel</h2>
        {funnelData.length > 0 && funnelData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No funnel data available yet</p>
        )}
      </div>

      {conversionData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage Conversion Rates</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drop-off Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users Converted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users Dropped</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversionData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.transition}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.conversionRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.dropOffRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.usersConverted.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.usersDropped.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="transition" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="conversionRate" fill="#10b981" name="Conversion Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Data Source</h3>
        <p className="text-blue-700 text-sm">
          This funnel tracks <code className="bg-blue-100 px-1 rounded">login_started</code> →{' '}
          <code className="bg-blue-100 px-1 rounded">login_completed</code> events from PostHog.
          Add more events in your app to expand the funnel.
        </p>
      </div>
    </div>
  )
}
