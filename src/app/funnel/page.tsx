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

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc']

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [posthogFunnel, setPosthogFunnel] = useState<any[]>([])
  const [supabaseFunnel, setSupabaseFunnel] = useState<any[]>([])
  const [posthogConversion, setPosthogConversion] = useState(0)
  const [supabaseConversion, setSupabaseConversion] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch PostHog login funnel
        const phRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: parseInt(dateRange) }),
        })

        if (phRes.ok) {
          const phData = await phRes.json()
          const events = phData.results || []

          const screenUsers = new Set(events.filter((e: any) => e.event === '$screen').map((e: any) => e.distinct_id))
          const loginStartedUsers = new Set(events.filter((e: any) => e.event === 'login_started').map((e: any) => e.distinct_id))
          const loginCompletedUsers = new Set(events.filter((e: any) => e.event === 'login_completed').map((e: any) => e.distinct_id))

          const phFunnel = [
            { name: 'App Opened', count: screenUsers.size, fill: COLORS[0] },
            { name: 'Login Started', count: loginStartedUsers.size, fill: COLORS[1] },
            { name: 'Login Completed', count: loginCompletedUsers.size, fill: COLORS[2] },
          ]
          setPosthogFunnel(phFunnel)

          const conv = loginStartedUsers.size > 0 ? (loginCompletedUsers.size / loginStartedUsers.size) * 100 : 0
          setPosthogConversion(Math.round(conv))
        }

        // Fetch Supabase activation funnel
        const sbRes = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'activationFunnel' }),
        })

        if (sbRes.ok) {
          const sbData = await sbRes.json()
          const stages = sbData.stages || []
          const sbFunnel = stages.map((s: any, i: number) => ({
            name: s.name,
            count: s.count,
            fill: COLORS[i % COLORS.length],
          }))
          setSupabaseFunnel(sbFunnel)

          if (stages.length >= 2 && stages[0].count > 0) {
            setSupabaseConversion(Math.round((stages[1].count / stages[0].count) * 100))
          }
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

  // Calculate conversion stages for Supabase
  const sbConversionStages = supabaseFunnel.slice(0, -1).map((stage, i) => {
    const next = supabaseFunnel[i + 1]
    const rate = stage.count > 0 ? (next.count / stage.count) * 100 : 0
    return {
      transition: `${stage.name} → ${next.name}`,
      rate: Math.round(rate),
      converted: next.count,
      dropped: stage.count - next.count,
    }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Funnels</h1>
          <p className="text-sm text-gray-500">Conversion analysis from both data sources</p>
        </div>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg p-6 text-white">
          <p className="text-violet-100 text-sm font-medium">LOGIN CONVERSION (PostHog)</p>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-bold">{posthogConversion}%</span>
            <span className="text-violet-100">of login attempts succeed</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg p-6 text-white">
          <p className="text-indigo-100 text-sm font-medium">ACTIVATION RATE (Supabase)</p>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-bold">{supabaseConversion}%</span>
            <span className="text-indigo-100">of members made first post</span>
          </div>
        </div>
      </div>

      {/* Funnels Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* PostHog Login Funnel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Login Funnel</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">PostHog</span>
          </div>
          {posthogFunnel.length > 0 && posthogFunnel.some(s => s.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <FunnelChart>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Funnel dataKey="count" data={posthogFunnel} isAnimationActive>
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="count" fontSize={14} fontWeight="bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {phConversionStages.map((stage, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{stage.transition}</span>
                    <span className={stage.rate >= 50 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                      {stage.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No login events yet</p>
          )}
        </div>

        {/* Supabase Activation Funnel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Activation Funnel</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Supabase</span>
          </div>
          {supabaseFunnel.length > 0 && supabaseFunnel.some(s => s.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <FunnelChart>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Funnel dataKey="count" data={supabaseFunnel} isAnimationActive>
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="count" fontSize={14} fontWeight="bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {sbConversionStages.map((stage, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{stage.transition}</span>
                    <span className={stage.rate >= 50 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                      {stage.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No activation data yet</p>
          )}
        </div>
      </div>

      {/* Detailed Conversion Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Drop-off</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posthogFunnel.map((stage, i) => (
                <tr key={`ph-${i}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{stage.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{stage.count}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {i === 0 ? '100%' : posthogFunnel[0].count > 0
                      ? `${Math.round((stage.count / posthogFunnel[0].count) * 100)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">
                    {i > 0 ? posthogFunnel[i-1].count - stage.count : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">PostHog</span>
                  </td>
                </tr>
              ))}
              {supabaseFunnel.map((stage, i) => (
                <tr key={`sb-${i}`} className="bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{stage.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{stage.count}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {i === 0 ? '100%' : supabaseFunnel[0].count > 0
                      ? `${Math.round((stage.count / supabaseFunnel[0].count) * 100)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">
                    {i > 0 ? supabaseFunnel[i-1].count - stage.count : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Supabase</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-1">Biggest Drop-off</h3>
          <p className="text-amber-700 text-sm">
            {sbConversionStages.length > 0
              ? `${sbConversionStages.reduce((min, s) => s.rate < min.rate ? s : min).transition} at ${sbConversionStages.reduce((min, s) => s.rate < min.rate ? s : min).rate}%`
              : 'Need more data'}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-1">Best Conversion</h3>
          <p className="text-green-700 text-sm">
            {sbConversionStages.length > 0
              ? `${sbConversionStages.reduce((max, s) => s.rate > max.rate ? s : max).transition} at ${sbConversionStages.reduce((max, s) => s.rate > max.rate ? s : max).rate}%`
              : 'Need more data'}
          </p>
        </div>
      </div>
    </div>
  )
}
