'use client'

import { useState, useMemo } from 'react'
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
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'
import { generateSampleFunnelEvents } from '@/lib/sample-data'

const FUNNEL_STAGES = ['app_open', 'sign_up', 'onboarding_complete', 'first_action'] as const
const STAGE_LABELS: Record<string, string> = {
  app_open: 'App Open',
  sign_up: 'Sign Up',
  onboarding_complete: 'Onboarding Complete',
  first_action: 'First Action',
}

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState('30')

  const { stageCounts, funnelData, conversionData } = useMemo(() => {
    const events = generateSampleFunnelEvents()

    // Count unique users at each stage
    const stageCounts: Record<string, number> = {}
    for (const stage of FUNNEL_STAGES) {
      const uniqueUsers = new Set(
        events.filter(e => e.event_type === stage).map(e => e.user_id)
      )
      stageCounts[stage] = uniqueUsers.size
    }

    // Format for funnel chart
    const funnelData = FUNNEL_STAGES.map((stage, index) => ({
      name: STAGE_LABELS[stage],
      value: stageCounts[stage],
      fill: ['#6366f1', '#ef4444', '#10b981', '#a855f7'][index],
    }))

    // Calculate conversion rates between stages
    const conversionData = []
    for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
      const current = FUNNEL_STAGES[i]
      const next = FUNNEL_STAGES[i + 1]
      const conversionRate = stageCounts[current] > 0
        ? (stageCounts[next] / stageCounts[current]) * 100
        : 0
      const dropOffRate = 100 - conversionRate

      conversionData.push({
        transition: `${STAGE_LABELS[current]} → ${STAGE_LABELS[next]}`,
        shortLabel: `${STAGE_LABELS[current].split(' ')[0]} → ${STAGE_LABELS[next].split(' ')[0]}`,
        conversionRate: Math.round(conversionRate * 10) / 10,
        dropOffRate: Math.round(dropOffRate * 10) / 10,
        usersConverted: stageCounts[next],
        usersDropped: stageCounts[current] - stageCounts[next],
      })
    }

    return { stageCounts, funnelData, conversionData }
  }, [dateRange])

  const worstConversion = conversionData.reduce((min, curr) =>
    curr.conversionRate < min.conversionRate ? curr : min
  )
  const bestConversion = conversionData.reduce((max, curr) =>
    curr.conversionRate > max.conversionRate ? curr : max
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">First-Time User Funnel</h1>
        <div className="w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {FUNNEL_STAGES.map(stage => (
          <MetricCard
            key={stage}
            title={STAGE_LABELS[stage]}
            value={stageCounts[stage].toLocaleString()}
          />
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Funnel dataKey="value" data={funnelData} isAnimationActive>
              <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stage Conversion Rates</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drop-off Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users Converted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users Dropped</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversionData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.transition}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.conversionRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.dropOffRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.usersConverted.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.usersDropped.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={conversionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="conversionRate" fill="#10b981" name="Conversion Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Biggest Drop-off</h3>
          <p className="text-red-700">
            <strong>{worstConversion.transition}</strong> with {worstConversion.dropOffRate}% drop-off rate ({worstConversion.usersDropped} users)
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Best Converting Stage</h3>
          <p className="text-green-700">
            <strong>{bestConversion.transition}</strong> with {bestConversion.conversionRate}% conversion rate
          </p>
        </div>
      </div>
    </div>
  )
}
