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
  AreaChart,
  Area,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function EngagementPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any>({})
  const [dailyEngagement, setDailyEngagement] = useState<any[]>([])
  const [studioStats, setStudioStats] = useState<any[]>([])
  const [memberGrowth, setMemberGrowth] = useState<any[]>([])
  const [wowMetrics, setWowMetrics] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const [overviewRes, trendsRes, studioRes, growthRes, wowRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'overview' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'engagementTrends', days: parseInt(dateRange) }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'studioStats' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'memberGrowth', days: 90 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'wowMetrics' }),
          }),
        ])

        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json()
          setDailyEngagement(trendsData.trends || [])
        }
        if (studioRes.ok) {
          const studioData = await studioRes.json()
          setStudioStats(studioData.studios || [])
        }
        if (growthRes.ok) {
          const growthData = await growthRes.json()
          setMemberGrowth(growthData.growth || [])
        }
        if (wowRes.ok) {
          setWowMetrics(await wowRes.json())
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
  const totalEngagement = (overview.totalLikes || 0) + (overview.totalComments || 0)
  const engagementRate = overview.totalPosts > 0
    ? (totalEngagement / overview.totalPosts).toFixed(1)
    : '0'

  // WoW calculations
  const changes = wowMetrics.changes || {}
  const thisWeek = wowMetrics.thisWeek || {}
  const lastWeek = wowMetrics.lastWeek || {}

  const totalThisWeek = (thisWeek.posts || 0) + (thisWeek.likes || 0) + (thisWeek.comments || 0)
  const totalLastWeek = (lastWeek.posts || 0) + (lastWeek.likes || 0) + (lastWeek.comments || 0)
  const totalChange = totalThisWeek - totalLastWeek
  const totalChangePercent = totalLastWeek > 0 ? Math.round((totalChange / totalLastWeek) * 100) : 0

  // Pie chart data for engagement breakdown
  const engagementBreakdown = [
    { name: 'Likes', value: overview.totalLikes || 0 },
    { name: 'Comments', value: overview.totalComments || 0 },
    { name: 'Follows', value: overview.totalFollows || 0 },
  ]

  // Filter out days with no activity for cleaner charts
  const activeEngagement = dailyEngagement.filter(
    d => d.posts > 0 || d.likes > 0 || d.comments > 0 || d.follows > 0
  )

  // Top studio by engagement
  const topStudio = studioStats.length > 0
    ? studioStats.reduce((max, s) => (s.memberCount || 0) > (max.memberCount || 0) ? s : max)
    : null

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Engagement</h1>
          <p className="text-sm text-gray-500">Activity metrics from Supabase</p>
        </div>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* North Star Metric */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-6">
        <p className="text-indigo-100 text-sm font-medium">KEY METRIC</p>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-4xl font-bold">{engagementRate}</span>
          <span className="text-indigo-100">Interactions per Post</span>
        </div>
        <p className="text-indigo-200 text-sm mt-2">
          {totalEngagement.toLocaleString()} total interactions across {overview.totalPosts?.toLocaleString() || 0} posts
        </p>
      </div>

      {/* WoW Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Posts This Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{thisWeek.posts || 0}</p>
          <p className={`text-sm mt-1 ${(changes.posts || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(changes.posts || 0) >= 0 ? '+' : ''}{changes.posts || 0} vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Likes This Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{thisWeek.likes || 0}</p>
          <p className={`text-sm mt-1 ${(changes.likes || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(changes.likes || 0) >= 0 ? '+' : ''}{changes.likes || 0} vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Comments This Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{thisWeek.comments || 0}</p>
          <p className={`text-sm mt-1 ${(changes.comments || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(changes.comments || 0) >= 0 ? '+' : ''}{changes.comments || 0} vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Follows This Week</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{thisWeek.follows || 0}</p>
          <p className={`text-sm mt-1 ${(changes.follows || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(changes.follows || 0) >= 0 ? '+' : ''}{changes.follows || 0} vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Activity</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalThisWeek}</p>
          <p className={`text-sm mt-1 ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalChange >= 0 ? '+' : ''}{totalChange} ({totalChangePercent >= 0 ? '+' : ''}{totalChangePercent}%)
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Studios</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{overview.totalStudios?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Members</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{overview.totalMembers?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Stories</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{overview.totalStories?.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Event RSVPs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{overview.totalEventRsvps?.toLocaleString() || '0'}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Engagement Trend</h2>
          {activeEngagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activeEngagement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="likes" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Likes" />
                <Area type="monotone" dataKey="comments" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Comments" />
                <Area type="monotone" dataKey="posts" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} name="Posts" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No engagement data for selected period</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Engagement Breakdown</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{totalEngagement.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Interactions</p>
            </div>
          </div>
          {engagementBreakdown.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={90}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Studios by Members</h2>
            {topStudio && (
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">{topStudio.name}</p>
                <p className="text-xs text-gray-500">Top Studio</p>
              </div>
            )}
          </div>
          {studioStats && studioStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={studioStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="memberCount" fill="#6366f1" name="Members" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No studio data</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Growth (90 days)</h2>
          {memberGrowth && memberGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="newMembers" stroke="#6366f1" strokeWidth={2} name="New Members" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No member growth data</p>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-1">Engagement Health</h3>
          <p className="text-green-700 text-sm">
            {parseFloat(engagementRate) >= 2
              ? `${engagementRate} interactions/post is healthy! Above 2x is good.`
              : `${engagementRate} interactions/post. Target 2+ for healthy engagement.`}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-1">Weekly Trend</h3>
          <p className="text-amber-700 text-sm">
            {totalChange >= 0
              ? `Activity up ${totalChangePercent}% week over week. Keep it up!`
              : `Activity down ${Math.abs(totalChangePercent)}% week over week. Worth investigating.`}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-1">Data Security</h3>
          <p className="text-blue-700 text-sm">
            Using secure database functions that only return aggregate counts - no personal data exposed.
          </p>
        </div>
      </div>
    </div>
  )
}
