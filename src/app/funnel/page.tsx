'use client'

import { useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [posthogData, setPosthogData] = useState<any>({ loginStarted: 0, loginCompleted: 0 })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [unifiedRes, phRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'unifiedFunnel', days: parseInt(dateRange) }),
          }),
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
          }),
        ])

        if (unifiedRes.ok) setUnifiedFunnel(await unifiedRes.json())
        if (phRes.ok) {
          const phData = await phRes.json()
          const events = phData.results || []
          const loginStarted = new Set(events.filter((e: any) => e.event === 'login_started').map((e: any) => e.distinct_id)).size
          const loginCompleted = new Set(events.filter((e: any) => e.event === 'login_completed').map((e: any) => e.distinct_id)).size
          setPosthogData({ loginStarted, loginCompleted })
        }
      } catch (err) {
        console.error('Failed to fetch funnel data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading funnel data...</div>
      </div>
    )
  }

  const stages = unifiedFunnel.stages || []
  const totalMembers = unifiedFunnel.totalMembers || 0
  const activationRate = unifiedFunnel.activationRate || 0

  // Calculate dropoffs
  const dropoffs = stages.slice(0, -1).map((stage: any, i: number) => {
    const next = stages[i + 1]
    const dropped = stage.count - next.count
    const dropRate = stage.count > 0 ? Math.round((dropped / stage.count) * 100) : 0
    return {
      from: stage.name,
      to: next.name,
      dropped,
      dropRate,
      conversionRate: 100 - dropRate,
    }
  })

  // Find biggest dropoff
  const biggestDropoff = dropoffs.reduce(
    (max: any, d: any) => (d.dropRate > (max?.dropRate || 0) ? d : max),
    null
  )

  // Login conversion rate
  const loginConversion = posthogData.loginStarted > 0
    ? Math.round((posthogData.loginCompleted / posthogData.loginStarted) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activation Funnel</h1>
          <p className="text-sm text-gray-500">How new users become engaged community members</p>
          {totalMembers < 100 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl p-6 text-white ${activationRate >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : activationRate >= 30 ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
          <p className="text-white/80 text-sm font-medium">Activation Rate</p>
          <p className="text-4xl font-bold mt-1">{activationRate}%</p>
          <p className="text-white/70 text-sm mt-1">Signup → Engaged</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Login Conversion</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{loginConversion}%</p>
          <p className="text-sm text-gray-500 mt-1">Started → Completed (PostHog)</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Biggest Drop-off</p>
          <p className="text-4xl font-bold text-red-600 mt-1">{biggestDropoff?.dropRate || 0}%</p>
          <p className="text-sm text-gray-500 mt-1">{biggestDropoff?.from || 'N/A'} → {biggestDropoff?.to || 'N/A'}</p>
        </div>
      </div>

      {/* Visual Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Journey</h2>

        {stages.length > 0 ? (
          <div className="space-y-4">
            {stages.map((stage: any, i: number) => {
              const isDropoff = i > 0 && stages[i-1].count - stage.count > stages[i-1].count * 0.3
              const bgColor = isDropoff ? 'bg-red-100' : 'bg-indigo-100'
              const barColor = isDropoff ? 'bg-red-500' : 'bg-indigo-500'

              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDropoff ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-900">{stage.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">{stage.count}</span>
                      <span className="text-sm text-gray-500 ml-2">({stage.rate}%)</span>
                    </div>
                  </div>
                  <div className={`w-full ${bgColor} rounded-full h-8`}>
                    <div
                      className={`${barColor} h-8 rounded-full flex items-center justify-end pr-3`}
                      style={{ width: `${Math.max(stage.rate, 5)}%` }}
                    >
                      {stage.rate >= 15 && (
                        <span className="text-white text-sm font-medium">{stage.rate}%</span>
                      )}
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="flex items-center justify-center my-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        dropoffs[i]?.dropRate > 40 ? 'bg-red-100 text-red-700' :
                        dropoffs[i]?.dropRate > 20 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        ↓ {dropoffs[i]?.dropRate || 0}% drop ({dropoffs[i]?.dropped || 0} users)
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Waiting for signups...</p>
        )}
      </div>

      {/* Conversion Table */}
      {stages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage-by-Stage Conversion</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transition</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Converted</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dropped</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dropoffs.map((d: any, i: number) => (
                  <tr key={i} className={d.dropRate > 40 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.from} → {d.to}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{stages[i+1]?.count || 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">-{d.dropped}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{d.conversionRate}%</td>
                    <td className="px-4 py-3">
                      {d.dropRate > 40 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Needs attention</span>
                      ) : d.dropRate > 20 ? (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Room to improve</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Healthy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Questions & Hypotheses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Where are we losing the most users?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> {biggestDropoff
                ? `${biggestDropoff.from} → ${biggestDropoff.to} loses ${biggestDropoff.dropRate}% of users (${biggestDropoff.dropped} people).`
                : 'Need more data to identify.'
              }
              {biggestDropoff?.from === 'Profile Set' && biggestDropoff?.to === 'First Post' && (
                <span className="block mt-1 text-amber-700">
                  → Consider: guided first post prompt, template suggestions, or "what to share" tips.
                </span>
              )}
              {biggestDropoff?.from === 'Signed Up' && biggestDropoff?.to === 'Profile Set' && (
                <span className="block mt-1 text-amber-700">
                  → Consider: simpler profile setup, skip option, or progressive profiling.
                </span>
              )}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">What does "good" look like?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Benchmark:</strong> Community apps typically see 30-50% activation rates.
              You're at <strong>{activationRate}%</strong>.
              {activationRate >= 50
                ? " → Excellent! Your onboarding is working well."
                : activationRate >= 30
                  ? " → Solid foundation. Focus on the biggest drop-off to improve."
                  : " → Below benchmark. Prioritize onboarding improvements."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Is login friction a problem?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {loginConversion}% of users who start login complete it.
              {loginConversion >= 80
                ? " → Login is smooth."
                : loginConversion >= 60
                  ? " → Some friction. Check for errors in login flow."
                  : posthogData.loginStarted > 0
                    ? " → High friction. Investigate auth errors or UX issues."
                    : " → Need PostHog data to measure."}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Funnel Hypotheses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(stages[2]?.rate || 0) >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: Posting is the activation moment</p>
            </div>
            <p className="text-sm text-gray-600">
              Users who make their first post within 48 hours are 2x more likely to become weekly active.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Track D7 retention for users who posted vs didn't post on D0.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(stages[3]?.rate || 0) >= 60 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Getting a like = retention</p>
            </div>
            <p className="text-sm text-gray-600">
              Users whose first post gets a like within 24 hours are more likely to return.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Measure if "time to first like" correlates with D7 retention.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H3: Profiles increase engagement</p>
            </div>
            <p className="text-sm text-gray-600">
              Users with complete profiles (photo + bio) get more followers.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare follow rates for complete vs incomplete profiles.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H4: Studio members activate faster</p>
            </div>
            <p className="text-sm text-gray-600">
              Users invited to a studio have higher activation than organic signups.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Segment funnel by acquisition source (studio invite vs direct).
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {biggestDropoff?.dropRate > 30 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900">Fix the {biggestDropoff.from} → {biggestDropoff.to} drop-off</p>
                <p className="text-sm text-gray-600">
                  {biggestDropoff.from === 'Profile Set' && 'Add a "Share your first piece" prompt after profile setup.'}
                  {biggestDropoff.from === 'Signed Up' && 'Simplify profile setup or make it optional.'}
                  {biggestDropoff.from === 'First Post' && 'Ensure new posts get engagement quickly (notifications, feed placement).'}
                </p>
              </div>
            </div>
          )}

          {activationRate < 40 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900">Improve onboarding experience</p>
                <p className="text-sm text-gray-600">
                  Consider adding: welcome tutorial, example content, or suggested users to follow.
                </p>
              </div>
            </div>
          )}

          {loginConversion > 0 && loginConversion < 70 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900">Investigate login friction</p>
                <p className="text-sm text-gray-600">
                  Check PostHog for login error events. Consider social login options.
                </p>
              </div>
            </div>
          )}

          {activationRate >= 50 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-gray-900">Activation is healthy!</p>
                <p className="text-sm text-gray-600">
                  Focus on retention and growing the top of funnel (more signups).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Funnel data from Supabase (member actions). Login events from PostHog.
      </p>
    </div>
  )
}
