'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'

export default function RetentionPage() {
  const [weeksToShow, setWeeksToShow] = useState('4')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [sessionsToday, setSessionsToday] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const eventsRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(weeksToShow) * 7 }),
        })

        if (!eventsRes.ok) throw new Error('Failed to fetch events')
        const eventsData = await eventsRes.json()
        const events = eventsData.results || []

        // Get all users
        const allUsers = new Set(events.map((e: any) => e.distinct_id))
        setTotalUsers(allUsers.size)

        // Group by date for daily active users
        const dateUserMap = new Map<string, Set<string>>()
        events.forEach((e: any) => {
          const date = e.timestamp.split('T')[0]
          if (!dateUserMap.has(date)) {
            dateUserMap.set(date, new Set())
          }
          dateUserMap.get(date)!.add(e.distinct_id)
        })

        const dauData = Array.from(dateUserMap.entries())
          .map(([date, users]) => ({
            date,
            dau: users.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        setDailyActiveUsers(dauData)

        // Sessions today
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = dateUserMap.get(today)
        setSessionsToday(todayUsers ? todayUsers.size : 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [weeksToShow])

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

  // Calculate average DAU
  const avgDAU = dailyActiveUsers.length > 0
    ? Math.round(dailyActiveUsers.reduce((sum, d) => sum + d.dau, 0) / dailyActiveUsers.length)
    : 0

  // Calculate stickiness (DAU/MAU)
  const stickiness = totalUsers > 0 ? ((avgDAU / totalUsers) * 100).toFixed(1) : '0'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Retention & Activity</h1>
        <div className="w-40">
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(e.target.value)}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="1">Last 7 Days</option>
            <option value="2">Last 14 Days</option>
            <option value="4">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Users" value={totalUsers.toLocaleString()} />
        <MetricCard title="Active Today" value={sessionsToday.toLocaleString()} />
        <MetricCard title="Avg Daily Active" value={avgDAU.toLocaleString()} />
        <MetricCard title="Stickiness (DAU/MAU)" value={`${stickiness}%`} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h2>
        {dailyActiveUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyActiveUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="dau"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 6 }}
                name="Daily Active Users"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No activity data available yet</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
        {dailyActiveUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyActiveUsers.slice().reverse().map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.dau}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {totalUsers > 0 ? ((row.dau / totalUsers) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No data available</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-800 mb-2">Retention Note</h3>
        <p className="text-amber-700 text-sm">
          D1-D7 cohort retention analysis requires at least 7 days of data. As you collect more events,
          this page will show detailed retention cohorts. Currently showing daily active user trends.
        </p>
      </div>
    </div>
  )
}
