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
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'

export default function ImpressionsPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screenData, setScreenData] = useState<any[]>([])
  const [platformData, setPlatformData] = useState<any[]>([])
  const [totalViews, setTotalViews] = useState(0)
  const [uniqueUsers, setUniqueUsers] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch raw events to process
        const eventsRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
        })

        if (!eventsRes.ok) throw new Error('Failed to fetch events')
        const eventsData = await eventsRes.json()
        const events = eventsData.results || []

        // Filter screen events
        const screenEvents = events.filter((e: any) => e.event === '$screen')

        // Calculate total views
        setTotalViews(screenEvents.length)

        // Calculate unique users
        const uniqueUserIds = new Set(screenEvents.map((e: any) => e.distinct_id))
        setUniqueUsers(uniqueUserIds.size)

        // Group by date for daily trends
        const dateMap = new Map<string, number>()
        screenEvents.forEach((e: any) => {
          const date = e.timestamp.split('T')[0]
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        })

        const dailyData = Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, views: count }))
          .sort((a, b) => a.date.localeCompare(b.date))

        setScreenData(dailyData)

        // Group by screen name for breakdown
        const screenMap = new Map<string, number>()
        screenEvents.forEach((e: any) => {
          const screenName = e.properties?.$screen_name || 'Unknown'
          screenMap.set(screenName, (screenMap.get(screenName) || 0) + 1)
        })

        const screenBreakdown = Array.from(screenMap.entries())
          .map(([screen, count]) => ({ screen, views: count }))
          .sort((a, b) => b.views - a.views)

        setPlatformData(screenBreakdown)
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Screen Views & Engagement</h1>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard title="Total Screen Views" value={totalViews.toLocaleString()} />
        <MetricCard title="Unique Users" value={uniqueUsers.toLocaleString()} />
        <MetricCard
          title="Views per User"
          value={uniqueUsers > 0 ? (totalViews / uniqueUsers).toFixed(1) : '0'}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Screen Views</h2>
        {screenData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={screenData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} name="Screen Views" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No data available for selected period</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Views by Screen</h2>
        {platformData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="screen" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="views" fill="#6366f1" name="Views" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No data available</p>
        )}
      </div>
    </div>
  )
}
