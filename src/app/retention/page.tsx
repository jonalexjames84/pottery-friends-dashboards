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

export default function RetentionPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [retentionCohorts, setRetentionCohorts] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch PostHog events for DAU
        const eventsRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
        })

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          const events = eventsData.results || []

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
        }

        // Fetch Supabase data
        const [cohortRes, unifiedRes, resRes, retCohortRes] = await Promise.all([
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
        ])

        if (cohortRes.ok) {
          const cohortData = await cohortRes.json()
          setCohorts(cohortData.cohorts || [])
        }
        if (unifiedRes.ok) setUnifiedActive(await unifiedRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (retCohortRes.ok) setRetentionCohorts(await retCohortRes.json())
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
              <span className={`w-3 h-3 rounded-full ${avgD7 >= 30 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: New content = return visits</p>
            </div>
            <p className="text-sm text-gray-600">
              Users return when they see new posts from people they follow.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare D7 retention for users with 0 follows vs 3+ follows.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${resurrectionRate >= 10 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Notifications drive retention</p>
            </div>
            <p className="text-sm text-gray-600">
              Push notifications for likes/comments increase D7 retention.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare retention for users with notifications on vs off.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H3: Studio events drive returns</p>
            </div>
            <p className="text-sm text-gray-600">
              Users in studios with events have higher retention than those without.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Segment retention by studio event participation.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H4: Weekly digests reduce churn</p>
            </div>
            <p className="text-sm text-gray-600">
              Email digests of studio activity bring back inactive users.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: A/B test weekly email digest vs no email.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {avgD7 < 30 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900">Improve D7 retention (currently {avgD7}%)</p>
                <p className="text-sm text-gray-600">
                  Focus on giving users reasons to return: push notifications, new content alerts, or daily digest emails.
                </p>
              </div>
            </div>
          )}

          {churnedUsers > totalMembers * 0.3 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900">Address high churn ({churnedUsers} users)</p>
                <p className="text-sm text-gray-600">
                  Build a re-engagement flow: "We miss you" emails, highlight what they're missing.
                </p>
              </div>
            </div>
          )}

          {resurrectionRate < 5 && churnedUsers > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900">Build win-back campaigns</p>
                <p className="text-sm text-gray-600">
                  Only {resurrectionRate}% of churned users return. Test re-engagement emails or push notifications.
                </p>
              </div>
            </div>
          )}

          {avgD7 >= 40 && (
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
