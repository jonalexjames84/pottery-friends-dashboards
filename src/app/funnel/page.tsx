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
import { DateRangeSelect } from '@/components/DateRangeSelect'

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9', '#f0abfc']

function ConfidenceBadge({ sampleSize }: { sampleSize: number }) {
  const isSignificant = sampleSize >= 30
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${isSignificant ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
      n={sampleSize} {isSignificant ? '(reliable)' : '(low confidence)'}
    </span>
  )
}

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [posthogFunnel, setPosthogFunnel] = useState<any[]>([])
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [posthogConversion, setPosthogConversion] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch both funnels in parallel
        const [phRes, unifiedRes] = await Promise.all([
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'unifiedFunnel' }),
          }),
        ])

        if (phRes.ok) {
          const phData = await phRes.json()
          const events = phData.results || []

          const screenUsers = new Set(events.filter((e: any) => e.event === '$screen').map((e: any) => e.distinct_id))
          const loginStartedUsers = new Set(events.filter((e: any) => e.event === 'login_started').map((e: any) => e.distinct_id))
          const loginCompletedUsers = new Set(events.filter((e: any) => e.event === 'login_completed').map((e: any) => e.distinct_id))

          const phFunnel = [
            { name: 'Screen View', count: screenUsers.size, fill: COLORS[0] },
            { name: 'Login Started', count: loginStartedUsers.size, fill: COLORS[1] },
            { name: 'Login Completed', count: loginCompletedUsers.size, fill: COLORS[2] },
          ]
          setPosthogFunnel(phFunnel)

          const conv = loginStartedUsers.size > 0 ? (loginCompletedUsers.size / loginStartedUsers.size) * 100 : 0
          setPosthogConversion(Math.round(conv))
        }

        if (unifiedRes.ok) {
          setUnifiedFunnel(await unifiedRes.json())
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

  const unifiedStages = unifiedFunnel.stages || []
  const unifiedFunnelData = unifiedStages.map((stage: any, index: number) => ({
    name: stage.name,
    count: stage.count,
    rate: stage.rate,
    fill: COLORS[index % COLORS.length],
  }))

  // Calculate conversion stages for PostHog
  const phConversionStages = posthogFunnel.slice(0, -1).map((stage, i) => {
    const next = posthogFunnel[i + 1]
    const rate = stage.count > 0 ? (next.count / stage.count) * 100 : 0
    return {
      transition: `${stage.name} → ${next.name}`,
      rate: Math.round(rate),
      converted: next.count,
      dropped: stage.count - next.count,
    }
  })

  // Calculate drop-off for unified funnel
  const unifiedDropoffs = unifiedStages.slice(0, -1).map((stage: any, i: number) => {
    const next = unifiedStages[i + 1]
    const dropoff = stage.count - next.count
    const dropoffRate = stage.count > 0 ? Math.round((dropoff / stage.count) * 100) : 0
    return {
      transition: `${stage.name} → ${next.name}`,
      dropoff,
      dropoffRate,
      rate: 100 - dropoffRate,
    }
  })

  // Find biggest drop-off
  const biggestDropoff = unifiedDropoffs.reduce(
    (max: any, d: any) => (d.dropoffRate > (max?.dropoffRate || 0) ? d : max),
    null
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Funnels</h1>
          <p className="text-sm text-gray-500">Unified journey from signup to retention</p>
        </div>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">ACTIVATION RATE</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold">{unifiedFunnel.activationRate || 0}%</span>
              </div>
              <p className="text-indigo-200 text-sm mt-1">Signed up → First Post</p>
            </div>
            <ConfidenceBadge sampleSize={unifiedFunnel.totalMembers || 0} />
          </div>
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-6 text-white">
          <p className="text-emerald-100 text-sm font-medium">ENGAGEMENT RATE</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold">{unifiedFunnel.engagementRate || 0}%</span>
          </div>
          <p className="text-emerald-200 text-sm mt-1">First Post → Got Engagement</p>
        </div>
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg p-6 text-white">
          <p className="text-violet-100 text-sm font-medium">LOGIN CONVERSION</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold">{posthogConversion}%</span>
          </div>
          <p className="text-violet-200 text-sm mt-1">Login Started → Completed (PostHog)</p>
        </div>
      </div>

      {/* Data Quality Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-amber-800 mb-1">Data Quality Note</h3>
        <p className="text-amber-700 text-sm">
          PostHog "Screen View" is not the same as "App Open". The unified funnel below uses Supabase member data
          for accurate acquisition → activation → retention tracking. PostHog login funnel is shown separately for login-specific analysis.
        </p>
      </div>

      {/* Unified Funnel (Primary) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Unified User Journey</h2>
            <p className="text-sm text-gray-500">Acquisition → Activation → Retention (Supabase)</p>
          </div>
          {biggestDropoff && (
            <div className="text-right">
              <p className="text-sm font-medium text-red-600">Biggest Drop: {biggestDropoff.dropoffRate}%</p>
              <p className="text-xs text-gray-500">{biggestDropoff.transition}</p>
            </div>
          )}
        </div>

        {unifiedFunnelData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} users (${props.payload.rate}%)`,
                    props.payload.name
                  ]}
                />
                <Funnel dataKey="count" data={unifiedFunnelData} isAnimationActive>
                  <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={11} />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="count" fontSize={12} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Stage-by-Stage Drop-off</h3>
              <div className="space-y-3">
                {unifiedDropoffs.map((d: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{d.transition}</span>
                      <span className={d.dropoffRate > 50 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                        -{d.dropoff} ({d.dropoffRate}% drop)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${d.dropoffRate > 50 ? 'bg-red-500' : d.dropoffRate > 30 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No funnel data yet</p>
        )}
      </div>

      {/* Funnel Stages Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Funnel Stage Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Drop-off</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {unifiedStages.map((stage: any, i: number) => (
                <tr key={i} className={i > 0 && unifiedStages[i-1].count - stage.count > unifiedStages[i-1].count * 0.5 ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{stage.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{stage.count}</td>
                  <td className="px-4 py-3 text-sm text-right">{stage.rate}%</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">
                    {i > 0 ? `-${unifiedStages[i-1].count - stage.count}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {stage.count >= 30 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">reliable</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">low sample</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PostHog Login Funnel (Secondary) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Login Funnel</h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">PostHog</span>
        </div>
        {posthogFunnel.length > 0 && posthogFunnel.some(s => s.count > 0) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={180}>
              <FunnelChart>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Funnel dataKey="count" data={posthogFunnel} isAnimationActive>
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="count" fontSize={14} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {phConversionStages.map((stage, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{stage.transition}</span>
                  <span className={stage.rate >= 50 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                    {stage.rate}% ({stage.dropped} dropped)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No login events yet</p>
        )}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg p-4 ${(unifiedFunnel.activationRate || 0) >= 30 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <h3 className={`font-semibold mb-1 ${(unifiedFunnel.activationRate || 0) >= 30 ? 'text-green-800' : 'text-amber-800'}`}>
            Activation Health
          </h3>
          <p className={`text-sm ${(unifiedFunnel.activationRate || 0) >= 30 ? 'text-green-700' : 'text-amber-700'}`}>
            {(unifiedFunnel.activationRate || 0) >= 30
              ? `${unifiedFunnel.activationRate}% activation is healthy for a community app.`
              : `${unifiedFunnel.activationRate || 0}% is below 30% benchmark. Focus on first post experience.`}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-1">Priority Fix</h3>
          <p className="text-red-700 text-sm">
            {biggestDropoff
              ? `${biggestDropoff.transition} loses ${biggestDropoff.dropoffRate}% of users. Investigate this step.`
              : 'Need more data to identify biggest drop-off.'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-1">Data Source</h3>
          <p className="text-blue-700 text-sm">
            Unified funnel uses Supabase member activity. PostHog login funnel tracks app-level auth events separately.
          </p>
        </div>
      </div>
    </div>
  )
}
