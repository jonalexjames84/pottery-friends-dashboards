'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function RetentionPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([])
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [retentionCohorts, setRetentionCohorts] = useState<any>({})
  const [d0Engagement, setD0Engagement] = useState<any>({})
  const [d1Retention, setD1Retention] = useState<any>({})
  const [featureActivity, setFeatureActivity] = useState<any>({})
  const [overview, setOverview] = useState<any>({})
  const [dailyEngagement, setDailyEngagement] = useState<any[]>([])
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [engagementDist, setEngagementDist] = useState<any>({})
  const [studioHealth, setStudioHealth] = useState<any[]>([])
  const [studioStats, setStudioStats] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const days = parseInt(dateRange)

        // Fetch PostHog DAU
        const dauRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'dailyActiveUsers', days }),
        })

        if (dauRes.ok) {
          const dauData = await dauRes.json()
          const series = dauData.results?.[0] || {}
          const dates = series.days || series.labels || []
          const counts = series.data || []
          const dauTimeSeries = dates.map((d: string, i: number) => ({
            date: (d || '').split('T')[0],
            dau: counts[i] || 0,
          })).filter((d: any) => d.date)
          setDailyActiveUsers(dauTimeSeries)
        }

        // Fetch all Supabase data in parallel
        const [
          unifiedRes, resRes, retCohortRes, d0Res, d1Res, featureRes,
          overviewRes, trendsRes, wowRes, distRes, healthRes, studioRes,
        ] = await Promise.all([
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'unifiedActiveMembers', days: 7 }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'resurrectionRate' }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'retentionCohorts', days: 60 }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'd0Engagement', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'd1RetentionByFeature', days: 60 }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'newFeatureActivity', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'overview' }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'engagementTrends', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'wowMetrics' }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'engagementDistribution' }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'studioHealth' }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'studioStats' }) }),
        ])

        if (unifiedRes.ok) setUnifiedActive(await unifiedRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (retCohortRes.ok) setRetentionCohorts(await retCohortRes.json())
        if (d0Res.ok) setD0Engagement(await d0Res.json())
        if (d1Res.ok) setD1Retention(await d1Res.json())
        if (featureRes.ok) setFeatureActivity(await featureRes.json())
        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json()
          setDailyEngagement(trendsData.trends || [])
        }
        if (wowRes.ok) setWowMetrics(await wowRes.json())
        if (distRes.ok) setEngagementDist(await distRes.json())
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setStudioHealth(Array.isArray(healthData) ? healthData : healthData.studios || [])
        }
        if (studioRes.ok) {
          const studioData = await studioRes.json()
          setStudioStats(studioData.studios || [])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
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

  // Retention metrics
  const totalMembers = unifiedActive.totalMembers || 0
  const activeMembers = unifiedActive.activeMembers || 0
  const activityRate = unifiedActive.activityRate || 0
  const churnedUsers = resurrection.churnedUsers || 0
  const resurrectedUsers = resurrection.resurrectedUsers || 0
  const resurrectionRate = resurrection.resurrectionRate || 0

  const retentionHealth = activityRate >= 40 ? 'healthy' : activityRate >= 20 ? 'okay' : 'needs-attention'
  const cohortData = retentionCohorts.cohorts || []

  const avgD1 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d1_rate || 0), 0) / cohortData.length)
    : 0
  const avgD3 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d3_rate || 0), 0) / cohortData.length)
    : 0
  const avgD7 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d7_rate || 0), 0) / cohortData.length)
    : 0

  // DAU
  const recentDAU = dailyActiveUsers.slice(-7)
  const avgDAU = recentDAU.length > 0
    ? Math.round(recentDAU.reduce((sum, d) => sum + d.dau, 0) / recentDAU.length)
    : 0

  // D0 engagement
  const d0Total = d0Engagement.total_new_users || 0
  const d0AnyAction = d0Engagement.d0_any_action || 0
  const d0Rate = d0Total > 0 ? Math.round((d0AnyAction / d0Total) * 100) : 0
  const d0Trend = d0Engagement.daily_trend || []

  // D1 retention by feature
  const d1Segments = d1Retention.segments || []
  const overallD1Rate = d1Retention.overall_d1_rate || 0

  // New feature activity
  const forum = featureActivity.forum || {}
  const events = featureActivity.events || {}
  const onboarding = featureActivity.onboarding || {}

  // D0 bar chart data
  const d0BarData = [
    { action: 'Posted', count: d0Engagement.d0_posted || 0, color: '#6366f1' },
    { action: 'Liked', count: d0Engagement.d0_liked || 0, color: '#ec4899' },
    { action: 'Followed', count: d0Engagement.d0_followed || 0, color: '#8b5cf6' },
    { action: 'Commented', count: d0Engagement.d0_commented || 0, color: '#14b8a6' },
    { action: 'Forum', count: d0Engagement.d0_forum_engaged || 0, color: '#f59e0b' },
    { action: 'Event RSVP', count: d0Engagement.d0_event_engaged || 0, color: '#ef4444' },
  ].filter(d => d.count > 0 || ['Forum', 'Event RSVP'].includes(d.action))

  // D1 retention comparison
  const d1BarData = d1Segments
    .filter((s: any) => s.users > 0)
    .map((s: any) => ({ segment: s.segment.replace('D0 ', ''), d1Rate: s.d1_rate || 0, users: s.users }))

  // Engagement metrics
  const changes = wowMetrics.changes || {}
  const thisWeek = wowMetrics.thisWeek || {}
  const medianEngagement = engagementDist.medianEngagement || 0
  const meanEngagement = engagementDist.meanEngagement || 0
  const zeroEngagementRate = engagementDist.zeroEngagementRate || 0

  const totalLikes = overview.totalLikes || 0
  const totalComments = overview.totalComments || 0
  const totalFollows = overview.totalFollows || 0

  const engagementBreakdown = [
    { name: 'Likes', value: totalLikes },
    { name: 'Comments', value: totalComments },
    { name: 'Follows', value: totalFollows },
  ].filter(d => d.value > 0)

  const activeDays = dailyEngagement.filter(d => d.posts > 0 || d.likes > 0 || d.comments > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention</h1>
          <p className="text-sm text-gray-500">Are users sticking around and going deep?</p>
          {totalMembers < 100 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* North Star Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-6 text-white ${
          retentionHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          retentionHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Weekly Activity Rate</p>
          <p className="text-4xl font-bold mt-1">{activityRate}%</p>
          <p className="text-white/70 text-sm mt-1">{activeMembers} of {totalMembers} active</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">D1 Retention</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{avgD1}%</p>
          <p className="text-sm text-gray-500 mt-1">Return next day</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">D7 Retention</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{avgD7}%</p>
          <p className="text-sm text-gray-500 mt-1">Return within week</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Churned Users</p>
          <p className="text-4xl font-bold text-red-600 mt-1">{churnedUsers}</p>
          <p className="text-sm text-gray-500 mt-1">Inactive 14+ days</p>
        </div>
      </div>

      {/* User Health Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Health Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{unifiedActive.newUserActive || 0}</p>
            <p className="text-sm text-gray-600 mt-1">New & Active</p>
            <p className="text-xs text-gray-500">Joined last 14 days, active this week</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{unifiedActive.returningUserActive || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Returning</p>
            <p className="text-xs text-gray-500">Joined 14+ days ago, still active</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600">{resurrectedUsers}</p>
            <p className="text-sm text-gray-600 mt-1">Resurrected</p>
            <p className="text-xs text-gray-500">Were churned, came back ({resurrectionRate}%)</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{churnedUsers}</p>
            <p className="text-sm text-gray-600 mt-1">Churned</p>
            <p className="text-xs text-gray-500">No activity in 14+ days</p>
          </div>
        </div>
      </div>

      {/* DAU + Cohort D7 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Active Users</h2>
              <p className="text-sm text-gray-500">From PostHog events</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{avgDAU}</p>
              <p className="text-xs text-gray-500">7-day avg</p>
            </div>
          </div>
          {dailyActiveUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="dau" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="DAU" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No PostHog data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cohort D7 Retention</h2>
              <p className="text-sm text-gray-500">By signup week</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">{avgD7}%</p>
              <p className="text-xs text-gray-500">Average</p>
            </div>
          </div>
          {cohortData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cohortData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort_week" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} labelFormatter={(v) => `Week of ${new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`} />
                <Bar dataKey="d7_rate" fill="#10b981" name="D7 Retention" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Need more data for cohort analysis</p>
          )}
        </div>
      </div>

      {/* Cohort Table with D3 */}
      {cohortData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Retention by Cohort</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort Week</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">D1</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">D3</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">D7</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cohortData.map((cohort: any, i: number) => {
                  const d7Health = cohort.d7_rate >= 40 ? 'healthy' : cohort.d7_rate >= 20 ? 'okay' : 'low'
                  return (
                    <tr key={i} className={d7Health === 'low' ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {new Date(cohort.cohort_week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {cohort.users}
                        {cohort.users < 10 && <span className="text-amber-500 ml-1">*</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-medium ${cohort.d1_rate >= 30 ? 'text-green-600' : cohort.d1_rate >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                          {cohort.d1_rate || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-medium ${(cohort.d3_rate || 0) >= 25 ? 'text-green-600' : (cohort.d3_rate || 0) >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                          {cohort.d3_rate || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-medium ${cohort.d7_rate >= 40 ? 'text-green-600' : cohort.d7_rate >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                          {cohort.d7_rate || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d7Health === 'healthy' ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Healthy</span>
                        ) : d7Health === 'okay' ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Building</span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Needs work</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">* Small cohort size — interpret with caution</p>
        </div>
      )}

      {/* D0 Engagement & D1 Retention */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">D0 Engagement & Feature Impact on D1</h2>
        <p className="text-sm text-gray-500 mb-4">What new users do on signup day and how it affects next-day return</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">New Users ({dateRange}d)</p>
            <p className="text-3xl font-bold text-gray-900">{d0Total}</p>
          </div>
          <div className={`rounded-lg p-4 shadow-sm ${d0Rate >= 60 ? 'bg-green-50' : d0Rate >= 40 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <p className="text-sm text-gray-500">D0 Activation Rate</p>
            <p className={`text-3xl font-bold ${d0Rate >= 60 ? 'text-green-600' : d0Rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{d0Rate}%</p>
            <p className="text-xs text-gray-500">{d0AnyAction} took action on D0</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Overall D1 Rate</p>
            <p className="text-3xl font-bold text-indigo-600">{overallD1Rate}%</p>
            <p className="text-xs text-gray-500">returned next day</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Onboarding Completion</p>
            <p className="text-3xl font-bold text-gray-900">{onboarding.profile_completion_rate || 0}%</p>
            <p className="text-xs text-gray-500">completed profile setup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">What Users Do on D0</h3>
            <p className="text-xs text-gray-500 mb-3">Actions taken on signup day (of {d0Total} new users)</p>
            {d0BarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d0BarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="action" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(value: number) => [`${value} users`, 'Count']} />
                  <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]}>
                    {d0BarData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No D0 data yet</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">D1 Return Rate by D0 Action</h3>
            <p className="text-xs text-gray-500 mb-3">Which D0 actions predict next-day return?</p>
            {d1BarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d1BarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'D1 Rate']}
                    labelFormatter={(label) => `D0 ${label} (n=${d1BarData.find((d: any) => d.segment === label)?.users || 0})`}
                  />
                  <Bar dataKey="d1Rate" name="D1 Rate" radius={[4, 4, 0, 0]}>
                    {d1BarData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.d1Rate >= overallD1Rate ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">Need more data for D1 analysis</p>
            )}
          </div>
        </div>

        {/* D0 Trend */}
        {d0Trend.length > 1 && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">D0 Activation Trend</h3>
            <p className="text-xs text-gray-500 mb-3">New users vs those who take any action on signup day</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={d0Trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="signup_date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="new_users" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} name="New Users" />
                <Area type="monotone" dataKey="any_action" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="D0 Active" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* D1 Insights */}
        {d1Segments.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-3">D1 Retention Insights</h3>
            <div className="space-y-2">
              {d1Segments.filter((s: any) => s.users > 0).map((seg: any, i: number) => {
                const rate = seg.d1_rate || 0
                const isAboveAvg = rate > overallD1Rate
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium text-gray-700 shrink-0">{seg.segment.replace('D0 ', '')}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                      <div
                        className={`h-5 rounded-full ${isAboveAvg ? 'bg-emerald-400' : rate > 0 ? 'bg-red-400' : 'bg-gray-200'}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                      {overallD1Rate > 0 && (
                        <div className="absolute top-0 h-5 w-0.5 bg-gray-900" style={{ left: `${Math.min(overallD1Rate, 100)}%` }} title={`Avg: ${overallD1Rate}%`} />
                      )}
                    </div>
                    <div className="w-20 text-right text-sm shrink-0">
                      <span className={`font-semibold ${isAboveAvg ? 'text-emerald-600' : rate > 0 ? 'text-red-600' : 'text-gray-400'}`}>{rate}%</span>
                      <span className="text-gray-400 text-xs ml-1">n={seg.users}</span>
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-gray-400 mt-2">Black line = overall D1 average ({overallD1Rate}%)</p>
            </div>
          </div>
        )}
      </div>

      {/* Engagement Depth */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Engagement Depth</h2>
        <p className="text-sm text-gray-500 mb-4">How active are users? What are they doing?</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Posts', value: thisWeek.posts || 0, change: changes.posts },
            { label: 'Likes', value: thisWeek.likes || 0, change: changes.likes },
            { label: 'Comments', value: thisWeek.comments || 0, change: changes.comments },
            { label: 'Follows', value: thisWeek.follows || 0, change: changes.follows },
            { label: 'New Members', value: thisWeek.new_members || 0, change: changes.newMembers },
          ].map((metric) => (
            <div key={metric.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500">{metric.label}</p>
              {metric.change !== undefined && (
                <p className={`text-xs mt-1 ${(metric.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(metric.change || 0) >= 0 ? '+' : ''}{metric.change}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Activity Trend */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Daily Activity Trend</h3>
            {activeDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activeDays}>
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
              <p className="text-gray-400 text-center py-8">No activity data for selected period</p>
            )}
          </div>

          {/* Engagement Mix */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Engagement Mix</h3>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">{(totalLikes + totalComments + totalFollows).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Interactions</p>
              </div>
            </div>
            {engagementBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={engagementBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {engagementBreakdown.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No engagement data yet</p>
            )}
          </div>
        </div>

        {/* Post Performance Distribution */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Post Performance Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{engagementDist.totalPosts || 0}</p>
              <p className="text-xs text-gray-500">Total Posts</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{engagementDist.postsZeroEngagement || 0}</p>
              <p className="text-xs text-gray-500">Zero Engagement</p>
              <p className="text-xs text-red-600">{zeroEngagementRate}%</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{medianEngagement}</p>
              <p className="text-xs text-gray-500">Median</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{engagementDist.p75Engagement || 0}</p>
              <p className="text-xs text-gray-500">P75</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{engagementDist.p90Engagement || 0}</p>
              <p className="text-xs text-gray-500">P90</p>
            </div>
          </div>
          {engagementDist.isSkewed && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Mean ({meanEngagement}) is much higher than median ({medianEngagement}).
                A few viral posts are inflating the average.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Feature Adoption */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Feature Adoption</h2>
        <p className="text-sm text-gray-500 mb-4">Forum, Events, and Onboarding — features that drive retention</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">F</div>
              <div>
                <p className="font-semibold text-gray-900">Forum</p>
                <p className="text-xs text-gray-500">{forum.unique_participants || 0} participants</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{forum.total_threads || 0}</p>
                <p className="text-xs text-gray-500">Threads</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{forum.total_replies || 0}</p>
                <p className="text-xs text-gray-500">Replies</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{forum.total_likes || 0}</p>
                <p className="text-xs text-gray-500">Likes</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">E</div>
              <div>
                <p className="font-semibold text-gray-900">Events</p>
                <p className="text-xs text-gray-500">{events.unique_rsvp_users || 0} unique RSVPs</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{events.total_events || 0}</p>
                <p className="text-xs text-gray-500">Published</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{events.total_rsvps || 0}</p>
                <p className="text-xs text-gray-500">RSVPs</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{events.upcoming_events || 0}</p>
                <p className="text-xs text-gray-500">Upcoming</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">W</div>
              <div>
                <p className="font-semibold text-gray-900">Welcome / Onboarding</p>
                <p className="text-xs text-gray-500">Profile completion</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{onboarding.profile_completion_rate || 0}%</p>
                <p className="text-xs text-gray-500">Completed Profile</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{onboarding.total_started || 0}</p>
                <p className="text-xs text-gray-500">Started Onboarding</p>
              </div>
            </div>
          </div>
        </div>

        {/* Forum/Events trend charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(forum.daily_trend || []).some((d: any) => d.threads > 0 || d.replies > 0 || d.likes > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Forum Activity Over Time</h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={forum.daily_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.split('T')?.[0]?.slice(5) || v} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(v) => v?.split('T')?.[0] || v} />
                  <Area type="monotone" dataKey="threads" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Threads" />
                  <Area type="monotone" dataKey="replies" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Replies" />
                  <Area type="monotone" dataKey="likes" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} name="Likes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {(events.daily_trend || []).some((d: any) => d.rsvps > 0 || d.events_created > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Events & RSVPs Over Time</h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={events.daily_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.split('T')?.[0]?.slice(5) || v} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(v) => v?.split('T')?.[0] || v} />
                  <Area type="monotone" dataKey="events_created" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Events Created" />
                  <Area type="monotone" dataKey="rsvps" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="RSVPs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Studio Performance */}
      {studioHealth && studioHealth.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Studio Performance</h2>
          <p className="text-sm text-gray-500 mb-4">Engagement per member by studio</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={studioHealth.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="engagementPerMember" fill="#6366f1" name="Engagement/Member" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All-Time Totals */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All-Time Totals</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {[
            { label: 'Members', value: overview.totalMembers || 0 },
            { label: 'Studios', value: overview.totalStudios || 0 },
            { label: 'Posts', value: overview.totalPosts || 0 },
            { label: 'Likes', value: totalLikes },
            { label: 'Comments', value: totalComments },
            { label: 'Follows', value: totalFollows },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Questions & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions & Actions</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Are users coming back?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> {avgD7}% D7 retention.
              {avgD7 >= 40
                ? ' Strong — users are finding enough value to return.'
                : avgD7 >= 20
                  ? ' Building. There\'s a core group of engaged users.'
                  : ' Low. Need to investigate why users aren\'t returning.'}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Is content getting engagement?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> Median {medianEngagement} interactions per post, {zeroEngagementRate}% with zero engagement.
              {medianEngagement >= 5
                ? ' Posts are resonating!'
                : medianEngagement >= 2
                  ? ' Room to improve content surfacing and notifications.'
                  : ' Low. Consider push notifications for new posts or community prompts.'}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Who churns and why?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {churnedUsers} users churned, {resurrectionRate}% resurrection rate.
              {churnedUsers > totalMembers * 0.5
                ? ' High churn. Consider push notifications, email re-engagement, or checking UX.'
                : churnedUsers > 0
                  ? ' Some natural churn. Consider re-engagement campaigns.'
                  : ' No churn yet — keep users engaged.'}
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <p className="font-medium text-gray-900">What drives D0 → D1 return?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> D0 activation rate is {d0Rate}%, overall D1 rate is {overallD1Rate}%.
              {d0Rate >= 60
                ? ' Good activation. Focus on converting D0 activity to D1 return.'
                : ' Low D0 activation. The welcome flow should guide users to first action.'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        DAU from PostHog events. Cohort retention and engagement from Supabase.
      </p>
    </div>
  )
}
