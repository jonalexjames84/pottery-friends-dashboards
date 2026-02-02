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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function EngagementPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any>({})
  const [dailyEngagement, setDailyEngagement] = useState<any[]>([])
  const [studioStats, setStudioStats] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch overview stats
        const overviewRes = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'overview' }),
        })
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json()
          setOverview(overviewData)
        }

        // Fetch engagement trends
        const trendsRes = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'engagementTrends', days: parseInt(dateRange) }),
        })
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json()

          // Group by date
          const dateMap = new Map<string, { posts: number; likes: number; comments: number }>()

          trendsData.posts?.forEach((p: any) => {
            const date = p.created_at.split('T')[0]
            const existing = dateMap.get(date) || { posts: 0, likes: 0, comments: 0 }
            existing.posts++
            dateMap.set(date, existing)
          })

          trendsData.likes?.forEach((l: any) => {
            const date = l.created_at.split('T')[0]
            const existing = dateMap.get(date) || { posts: 0, likes: 0, comments: 0 }
            existing.likes++
            dateMap.set(date, existing)
          })

          trendsData.comments?.forEach((c: any) => {
            const date = c.created_at.split('T')[0]
            const existing = dateMap.get(date) || { posts: 0, likes: 0, comments: 0 }
            existing.comments++
            dateMap.set(date, existing)
          })

          const dailyData = Array.from(dateMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))

          setDailyEngagement(dailyData)
        }

        // Fetch studio stats
        const studioRes = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'studioStats' }),
        })
        if (studioRes.ok) {
          const studioData = await studioRes.json()
          setStudioStats(studioData.studios || [])
        }
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
        <div className="text-gray-500">Loading Supabase data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  // Calculate engagement rate
  const engagementRate = overview.totalPosts > 0
    ? (((overview.totalLikes || 0) + (overview.totalComments || 0)) / overview.totalPosts).toFixed(1)
    : '0'

  // Pie chart data for engagement breakdown
  const engagementBreakdown = [
    { name: 'Likes', value: overview.totalLikes || 0 },
    { name: 'Comments', value: overview.totalComments || 0 },
    { name: 'Follows', value: overview.totalFollows || 0 },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community Engagement</h1>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard title="Studios" value={overview.totalStudios?.toLocaleString() || '0'} />
        <MetricCard title="Members" value={overview.totalMembers?.toLocaleString() || '0'} />
        <MetricCard title="Posts" value={overview.totalPosts?.toLocaleString() || '0'} />
        <MetricCard title="Likes" value={overview.totalLikes?.toLocaleString() || '0'} />
        <MetricCard title="Comments" value={overview.totalComments?.toLocaleString() || '0'} />
        <MetricCard title="Follows" value={overview.totalFollows?.toLocaleString() || '0'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Engagement</h2>
          {dailyEngagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyEngagement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="posts" stroke="#6366f1" strokeWidth={2} name="Posts" />
                <Line type="monotone" dataKey="likes" stroke="#10b981" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} name="Comments" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No engagement data for selected period</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h2>
          {engagementBreakdown.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {engagementBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No engagement data</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Studios Overview</h2>
        {studioStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={studioStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={150} />
              <Tooltip />
              <Bar dataKey="memberCount" fill="#6366f1" name="Members" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No studio data</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Engagement Rate</h3>
          <p className="text-green-700">
            <span className="text-2xl font-bold">{engagementRate}</span> interactions per post
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Data Source</h3>
          <p className="text-blue-700 text-sm">
            Community data from Supabase: posts, likes, comments, follows, and member activity.
          </p>
        </div>
      </div>
    </div>
  )
}
