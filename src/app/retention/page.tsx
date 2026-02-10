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
  Cell,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

export default function RetentionPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [retentionCohorts, setRetentionCohorts] = useState<any>({})
  const [d0Engagement, setD0Engagement] = useState<any>({})
  const [d1Retention, setD1Retention] = useState<any>({})
  const [featureActivity, setFeatureActivity] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const days = parseInt(dateRange)

        // Fetch PostHog DAU using TrendsQuery (properly respects date range)
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
        const [cohortRes, unifiedRes, resRes, retCohortRes, d0Res, d1Res, featureRes] = await Promise.all([
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
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'retentionCohorts', days: 60 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'd0Engagement', days }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'd1RetentionByFeature', days: 60 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'newFeatureActivity', days }),
          }),
        ])

        if (cohortRes.ok) {
          const cohortData = await cohortRes.json()
          setCohorts(cohortData.cohorts || [])
        }
        if (unifiedRes.ok) setUnifiedActive(await unifiedRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (retCohortRes.ok) setRetentionCohorts(await retCohortRes.json())
        if (d0Res.ok) setD0Engagement(await d0Res.json())
        if (d1Res.ok) setD1Retention(await d1Res.json())
        if (featureRes.ok) setFeatureActivity(await featureRes.json())
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

  const totalMembers = unifiedActive.totalMembers || 0
  const activeMembers = unifiedActive.activeMembers || 0
  const activityRate = unifiedActive.activityRate || 0
  const churnedUsers = resurrection.churnedUsers || 0
  const resurrectedUsers = resurrection.resurrectedUsers || 0
  const resurrectionRate = resurrection.resurrectionRate || 0

  // Calculate retention health
  const retentionHealth = activityRate >= 40 ? 'healthy' : activityRate >= 20 ? 'okay' : 'needs-attention'

  // Get cohort retention data
  const cohortData = retentionCohorts.cohorts || []

  // Calculate average D1 and D7 retention
  const avgD1 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d1_rate || 0), 0) / cohortData.length)
    : 0
  const avgD7 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d7_rate || 0), 0) / cohortData.length)
    : 0

  // DAU trend calculations
  const recentDAU = dailyActiveUsers.slice(-7)
  const avgDAU = recentDAU.length > 0
    ? Math.round(recentDAU.reduce((sum, d) => sum + d.dau, 0) / recentDAU.length)
    : 0
  const peakDAU = dailyActiveUsers.length > 0
    ? Math.max(...dailyActiveUsers.map(d => d.dau))
    : 0

  // D0 engagement data
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

  // D0 engagement bar chart data
  const d0BarData = [
    { action: 'Posted', count: d0Engagement.d0_posted || 0, color: '#6366f1' },
    { action: 'Liked', count: d0Engagement.d0_liked || 0, color: '#ec4899' },
    { action: 'Followed', count: d0Engagement.d0_followed || 0, color: '#8b5cf6' },
    { action: 'Commented', count: d0Engagement.d0_commented || 0, color: '#14b8a6' },
    { action: 'Forum', count: d0Engagement.d0_forum_engaged || 0, color: '#f59e0b' },
    { action: 'Event RSVP', count: d0Engagement.d0_event_engaged || 0, color: '#ef4444' },
  ].filter(d => d.count > 0 || ['Forum', 'Event RSVP'].includes(d.action))

  // D1 retention comparison chart data
  const d1BarData = d1Segments
    .filter((s: any) => s.users > 0)
    .map((s: any) => ({
      segment: s.segment.replace('D0 ', ''),
      d1Rate: s.d1_rate || 0,
      users: s.users,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention & Stickiness</h1>
          <p className="text-sm text-gray-500">Are users coming back? Are they staying?</p>
          {totalMembers < 100 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users */}
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

        {/* Cohort Retention */}
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
                <XAxis
                  dataKey="cohort_week"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  labelFormatter={(v) => `Week of ${new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                />
                <Bar dataKey="d7_rate" fill="#10b981" name="D7 Retention" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Need more data for cohort analysis</p>
          )}
        </div>
      </div>

      {/* Cohort Table */}
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

      {/* D0 Engagement & D1 Retention by Feature */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">D0 Engagement & Feature Impact on D1</h2>
        <p className="text-sm text-gray-500 mb-4">What new users do on signup day and how it affects next-day return</p>

        {/* D0 Summary Metrics */}
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
          {/* D0 Action Breakdown */}
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

          {/* D1 Retention by D0 Feature */}
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
                    formatter={(value: number, name: string) => [`${value}%`, 'D1 Rate']}
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
                        <div
                          className="absolute top-0 h-5 w-0.5 bg-gray-900"
                          style={{ left: `${Math.min(overallD1Rate, 100)}%` }}
                          title={`Avg: ${overallD1Rate}%`}
                        />
                      )}
                    </div>
                    <div className="w-20 text-right text-sm shrink-0">
                      <span className={`font-semibold ${isAboveAvg ? 'text-emerald-600' : rate > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {rate}%
                      </span>
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

      {/* New Feature Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">New Feature Adoption</h2>
        <p className="text-sm text-gray-500 mb-4">Forum, Events, and Onboarding — tracking features that drive retention</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Forum Card */}
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
            {(forum.total_threads || 0) + (forum.total_replies || 0) === 0 && (
              <p className="text-xs text-amber-600 mt-2 text-center">Early stage — seed with discussion prompts</p>
            )}
          </div>

          {/* Events Card */}
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
            {(events.total_rsvps || 0) > 0 && (
              <p className="text-xs text-green-600 mt-2 text-center">
                {((events.total_rsvps / Math.max(events.total_events, 1)) * 100).toFixed(0)}% RSVP rate per event
              </p>
            )}
          </div>

          {/* Onboarding Card */}
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
            {(onboarding.steps || []).length > 0 && (
              <div className="mt-3 space-y-1">
                {(onboarding.steps || []).map((step: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{step.step}</span>
                    <span className="text-gray-900 font-medium">{step.completed}/{step.total}</span>
                  </div>
                ))}
              </div>
            )}
            {(onboarding.total_started || 0) === 0 && (onboarding.profile_completion_rate || 0) === 0 && (
              <p className="text-xs text-amber-600 mt-2 text-center">No onboarding data yet — tracking will populate as users complete steps</p>
            )}
          </div>
        </div>

        {/* Events Daily Trend */}
        {(events.daily_trend || []).some((d: any) => d.rsvps > 0 || d.events_created > 0) && (
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Events & RSVPs Over Time</h3>
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

        {/* Forum Daily Trend */}
        {(forum.daily_trend || []).some((d: any) => d.threads > 0 || d.replies > 0 || d.likes > 0) && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Forum Activity Over Time</h3>
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
      </div>

      {/* Questions & Hypotheses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Are users coming back?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> {avgD7}% D7 retention.
              {avgD7 >= 40
                ? " → Strong! Users are finding enough value to return."
                : avgD7 >= 20
                  ? " → Building. There's a core group of engaged users."
                  : " → Low. Need to investigate why users aren't returning."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Who churns and why?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {churnedUsers} users churned (no activity in 14+ days).
              {churnedUsers > totalMembers * 0.5
                ? " → High churn rate. Consider: push notifications, email re-engagement, or checking for UX issues."
                : churnedUsers > 0
                  ? " → Some natural churn. Consider re-engagement campaigns."
                  : " → No churn yet! Keep users engaged."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Can we bring users back?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {resurrectionRate}% resurrection rate ({resurrectedUsers} users came back).
              {resurrectionRate >= 10
                ? " → Re-engagement is working! Double down on win-back campaigns."
                : resurrectedUsers > 0
                  ? " → Some users can be recovered. Test push notifications or email."
                  : " → No resurrections yet. Build re-engagement flows."}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Retention Hypotheses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(d1Segments.find((s: any) => s.segment === 'D0 Posted')?.d1_rate || 0) > overallD1Rate ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: D0 posting drives D1 return</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who create a post on signup day are more likely to return.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Signal: D0 posters have {d1Segments.find((s: any) => s.segment === 'D0 Posted')?.d1_rate || 0}% D1 rate vs {overallD1Rate}% overall.
              {(d1Segments.find((s: any) => s.segment === 'D0 Posted')?.users || 0) < 10 && ' (small sample)'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(events.total_rsvps || 0) > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Event RSVPs drive retention</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who RSVP to events have a reason to return (upcoming event).
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Signal: {events.total_rsvps || 0} RSVPs from {events.unique_rsvp_users || 0} users, {events.upcoming_events || 0} upcoming events.
              {(events.total_rsvps || 0) === 0 ? ' Needs more adoption.' : ' Track D7 return rate for RSVP users.'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(forum.unique_participants || 0) > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H3: Forum creates social investment</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who participate in forum discussions build community ties that drive returns.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Signal: {forum.unique_participants || 0} forum participants, {forum.total_replies || 0} replies.
              {(forum.unique_participants || 0) === 0 ? ' Seed with discussion prompts to kickstart.' : ' Compare retention for forum users vs non-forum.'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${d0Rate >= 60 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H4: Welcome flow lifts D0 activation</p>
            </div>
            <p className="text-sm text-gray-600">
              Guided welcome experience increases D0 actions and downstream retention.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Signal: {d0Rate}% D0 activation rate ({d0AnyAction}/{d0Total} took action).
              {d0Rate < 50 ? ' Below 50% — welcome flow should guide to first action.' : ' Good activation. Focus on converting D0 to D1.'}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {d0Rate < 60 && d0Total > 0 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900">Boost D0 activation ({d0Rate}% → target 60%+)</p>
                <p className="text-sm text-gray-600">
                  {d0Total - d0AnyAction} of {d0Total} new users did nothing on signup day. The welcome flow should guide users to their first post, like, or follow within minutes.
                </p>
              </div>
            </div>
          )}

          {(forum.total_threads || 0) + (forum.total_replies || 0) < 5 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900">Seed the forum to drive engagement</p>
                <p className="text-sm text-gray-600">
                  Only {forum.total_replies || 0} replies and {forum.total_threads || 0} threads. Post weekly discussion prompts (e.g., "Show us your latest piece") to create return-worthy content.
                </p>
              </div>
            </div>
          )}

          {(events.total_rsvps || 0) > 0 && (events.total_rsvps || 0) < (events.total_events || 1) * 2 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900">Increase event RSVP conversion</p>
                <p className="text-sm text-gray-600">
                  {events.total_events || 0} events but only {events.total_rsvps || 0} RSVPs. Surface events in the welcome flow and feed. Event anticipation is a strong retention hook.
                </p>
              </div>
            </div>
          )}

          {avgD7 < 30 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">4.</span>
              <div>
                <p className="font-medium text-gray-900">Improve D7 retention (currently {avgD7}%)</p>
                <p className="text-sm text-gray-600">
                  Focus on giving users reasons to return: push notifications for forum replies, event reminders, and new content alerts.
                </p>
              </div>
            </div>
          )}

          {churnedUsers > totalMembers * 0.3 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">5.</span>
              <div>
                <p className="font-medium text-gray-900">Address high churn ({churnedUsers} users)</p>
                <p className="text-sm text-gray-600">
                  Build a re-engagement flow: "We miss you" emails, highlight new events and forum discussions they're missing.
                </p>
              </div>
            </div>
          )}

          {avgD7 >= 40 && d0Rate >= 60 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-gray-900">Retention is healthy!</p>
                <p className="text-sm text-gray-600">
                  Focus on growing the top of funnel (more signups) while maintaining current retention.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        DAU from PostHog events. Cohort retention from Supabase member activity.
      </p>
    </div>
  )
}
