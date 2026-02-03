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
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

function ConfidenceBadge({ sampleSize, label }: { sampleSize: number; label?: string }) {
  const isSignificant = sampleSize >= 30
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${isSignificant ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
      n={sampleSize} {label || (isSignificant ? '(reliable)' : '(low confidence)')}
    </span>
  )
}

export default function RetentionPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    sessionsToday: 0,
    avgDAU: 0,
    stickiness: 0,
    thisWeekDAU: 0,
    lastWeekDAU: 0,
    peakDAU: 0,
    peakDate: '',
  })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch PostHog events
        const eventsRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
        })

        if (!eventsRes.ok) throw new Error('Failed to fetch events')
        const eventsData = await eventsRes.json()
        const events = eventsData.results || []

        // Get all users
        const allUsers = new Set(events.map((e: any) => e.distinct_id))
        const totalUsers = allUsers.size

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

        // Calculate metrics
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = dateUserMap.get(today)
        const sessionsToday = todayUsers ? todayUsers.size : 0

        const avgDAU = dauData.length > 0
          ? Math.round(dauData.reduce((sum, d) => sum + d.dau, 0) / dauData.length)
          : 0

        const stickiness = totalUsers > 0 ? Math.round((avgDAU / totalUsers) * 100) : 0

        // WoW calculations
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const thisWeekDAU = dauData
          .filter(d => new Date(d.date) >= oneWeekAgo)
          .reduce((sum, d) => sum + d.dau, 0)

        const lastWeekDAU = dauData
          .filter(d => {
            const date = new Date(d.date)
            return date >= twoWeeksAgo && date < oneWeekAgo
          })
          .reduce((sum, d) => sum + d.dau, 0)

        // Peak DAU
        const peakDay = dauData.reduce((max, d) => d.dau > max.dau ? d : max, { dau: 0, date: '' })

        setMetrics({
          totalUsers,
          sessionsToday,
          avgDAU,
          stickiness,
          thisWeekDAU,
          lastWeekDAU,
          peakDAU: peakDay.dau,
          peakDate: peakDay.date,
        })

        // Fetch Supabase data in parallel
        const [cohortRes, unifiedRes, resRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'cohortRetention' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'unifiedActiveMembers', days: 7 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'resurrectionRate' }),
          }),
        ])

        if (cohortRes.ok) {
          const cohortData = await cohortRes.json()
          setCohorts(cohortData.cohorts || [])
        }
        if (unifiedRes.ok) {
          setUnifiedActive(await unifiedRes.json())
        }
        if (resRes.ok) {
          setResurrection(await resRes.json())
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
        <div className="text-gray-500">Loading retention data...</div>
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

  const wowChange = metrics.thisWeekDAU - metrics.lastWeekDAU
  const wowPercent = metrics.lastWeekDAU > 0
    ? Math.round((wowChange / metrics.lastWeekDAU) * 100)
    : 0

  // Calculate retention trend from cohorts
  const avgWeek1Retention = cohorts.length > 0
    ? Math.round(cohorts.reduce((sum, c) => sum + (c.week1 || 0), 0) / cohorts.length)
    : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention & Activity</h1>
          <p className="text-sm text-gray-500">User engagement patterns from PostHog + Supabase</p>
        </div>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* North Star Metric */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-6 text-white mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-sm font-medium">KEY METRIC (UNIFIED DEFINITION)</p>
            <div className="flex items-baseline gap-4 mt-1">
              <span className="text-4xl font-bold">{unifiedActive.activeMembers || metrics.avgDAU}</span>
              <span className="text-emerald-100">Weekly Active Members</span>
            </div>
            <p className="text-emerald-200 text-sm mt-2">
              {unifiedActive.activityRate || metrics.stickiness}% of {unifiedActive.totalMembers || metrics.totalUsers} total members active (Supabase actions)
            </p>
          </div>
          <ConfidenceBadge sampleSize={unifiedActive.sampleSize || metrics.avgDAU} />
        </div>
      </div>

      {/* User Segmentation - New vs Returning */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">New Users Active</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{unifiedActive.newUserActive || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Joined last 14 days</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Returning Active</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{unifiedActive.returningUserActive || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Joined 14+ days ago</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Resurrected</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{resurrection.resurrectedUsers || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{resurrection.resurrectionRate || 0}% of churned</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Churned</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">{resurrection.churnedUsers || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Inactive 14+ days</p>
        </div>
      </div>

      {/* WoW Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">This Week Total</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.thisWeekDAU}</p>
          <p className={`text-sm mt-1 ${wowChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {wowChange >= 0 ? '+' : ''}{wowChange} ({wowPercent >= 0 ? '+' : ''}{wowPercent}%) vs last week
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Last Week Total</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.lastWeekDAU}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Active Today</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.sessionsToday}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Peak DAU</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.peakDAU}</p>
          <p className="text-xs text-gray-500 mt-1">{metrics.peakDate}</p>
        </div>
      </div>

      {/* Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* DAU Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Daily Active Users</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">PostHog</span>
          </div>
          {dailyActiveUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="dau" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="DAU" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No activity data yet</p>
          )}
        </div>

        {/* Week 1 Retention by Cohort */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Week 1 Retention</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Supabase</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">{avgWeek1Retention}%</p>
              <p className="text-xs text-gray-500">Avg Retention</p>
            </div>
          </div>
          {cohorts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cohorts.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="cohort"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <Bar dataKey="week1" fill="#10b981" name="Week 1 Retention %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Need more data for cohort analysis</p>
          )}
        </div>
      </div>

      {/* Cohort Retention Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cohort Retention Matrix</h2>
            <p className="text-sm text-gray-500">% of members active by week after joining</p>
          </div>
          {cohorts.length > 0 && cohorts.some(c => c.size < 30) && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Some cohorts have low sample size
            </span>
          )}
        </div>
        {cohorts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Week 0</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Week 1</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Week 2</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Week 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cohorts.map((cohort: any, index: number) => (
                  <tr key={index} className={cohort.size < 30 ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {new Date(cohort.cohort).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {cohort.size}
                      {cohort.size < 30 && <span className="text-amber-600 ml-1">*</span>}
                    </td>
                    {['week0', 'week1', 'week2', 'week3'].map((week) => {
                      const val = cohort[week] || 0
                      const intensity = Math.min(val / 100, 1)
                      const bgColor = val > 0 ? `rgba(16, 185, 129, ${intensity * 0.7 + 0.1})` : '#f9fafb'
                      const textColor = intensity > 0.5 ? '#fff' : '#374151'
                      return (
                        <td
                          key={week}
                          className="px-4 py-3 text-sm text-center font-medium"
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          {val > 0 ? `${val}%` : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Need more data for cohort analysis</p>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity Log</h2>
        {dailyActiveUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Active Users</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dailyActiveUsers.slice().reverse().slice(0, 14).map((row, index) => {
                  const percent = metrics.totalUsers > 0 ? (row.dau / metrics.totalUsers) * 100 : 0
                  return (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.dau}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{percent.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${Math.min(percent * 2, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No data available</p>
        )}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg p-4 ${(unifiedActive.activityRate || metrics.stickiness) >= 20 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <h3 className={`font-semibold mb-1 ${(unifiedActive.activityRate || metrics.stickiness) >= 20 ? 'text-green-800' : 'text-amber-800'}`}>
            Activity Rate
          </h3>
          <p className={`text-sm ${(unifiedActive.activityRate || metrics.stickiness) >= 20 ? 'text-green-700' : 'text-amber-700'}`}>
            {(unifiedActive.activityRate || metrics.stickiness) >= 20
              ? `${unifiedActive.activityRate || metrics.stickiness}% is healthy! Top community apps target 20%+.`
              : `${unifiedActive.activityRate || metrics.stickiness}% is below 20% benchmark.`}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${(resurrection.resurrectionRate || 0) >= 10 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <h3 className={`font-semibold mb-1 ${(resurrection.resurrectionRate || 0) >= 10 ? 'text-green-800' : 'text-amber-800'}`}>
            Resurrection Rate
          </h3>
          <p className={`text-sm ${(resurrection.resurrectionRate || 0) >= 10 ? 'text-green-700' : 'text-amber-700'}`}>
            {resurrection.resurrectionRate || 0}% of churned users came back.
            {(resurrection.resurrectionRate || 0) >= 10
              ? ' Re-engagement is working!'
              : ' Consider win-back campaigns.'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-1">Unified Definition</h3>
          <p className="text-blue-700 text-sm">
            Active = any Supabase action (post, like, comment, follow). Consistent across all pages.
            {cohorts.some(c => c.size < 30) && ' * = cohort too small for confidence.'}
          </p>
        </div>
      </div>
    </div>
  )
}
