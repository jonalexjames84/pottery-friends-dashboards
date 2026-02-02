'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { generateSampleRetentionData } from '@/lib/sample-data'

const DAYS = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']

export default function RetentionPage() {
  const [weeksToShow, setWeeksToShow] = useState('4')

  const { cohorts, latestRetention, avgD1, avgD7, d7Change, retentionCurveData } = useMemo(() => {
    const numWeeks = parseInt(weeksToShow)
    const cohorts = generateSampleRetentionData(numWeeks)

    const latestRetention = cohorts[cohorts.length - 1].retention

    // Calculate averages
    const avgD1 = cohorts.reduce((sum, c) => sum + c.retention[1], 0) / cohorts.length
    const avgD7 = cohorts.reduce((sum, c) => sum + c.retention[7], 0) / cohorts.length

    // Week-over-week change for D7
    const d7Change = cohorts.length > 1
      ? cohorts[cohorts.length - 1].retention[7] - cohorts[cohorts.length - 2].retention[7]
      : 0

    // Format for retention curve
    const retentionCurveData = DAYS.map((day, index) => ({
      day,
      retention: Math.round(latestRetention[index] * 10) / 10,
    }))

    return { cohorts, latestRetention, avgD1, avgD7, d7Change, retentionCurveData }
  }, [weeksToShow])

  // Find biggest drop-off
  const drops = DAYS.slice(0, -1).map((_, i) => ({
    from: DAYS[i],
    to: DAYS[i + 1],
    drop: latestRetention[i] - latestRetention[i + 1],
  }))
  const biggestDrop = drops.reduce((max, curr) => curr.drop > max.drop ? curr : max)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">D1-D7 Retention Rate</h1>
        <div className="w-40">
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(e.target.value)}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="4">Last 4 Weeks</option>
            <option value="8">Last 8 Weeks</option>
            <option value="12">Last 12 Weeks</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="D1 Retention"
          value={`${latestRetention[1].toFixed(1)}%`}
        />
        <MetricCard
          title="D3 Retention"
          value={`${latestRetention[3].toFixed(1)}%`}
        />
        <MetricCard
          title="D7 Retention"
          value={`${latestRetention[7].toFixed(1)}%`}
        />
        <MetricCard
          title="D7 WoW Change"
          value={`${d7Change >= 0 ? '+' : ''}${d7Change.toFixed(1)}%`}
          changeType={d7Change > 0 ? 'positive' : d7Change < 0 ? 'negative' : 'neutral'}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Retention Curve (Latest Cohort)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={retentionCurveData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="retention"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cohort Retention Matrix</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                {DAYS.map(day => (
                  <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cohorts.map((cohort, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{cohort.cohort}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cohort.cohortSize.toLocaleString()}</td>
                  {cohort.retention.map((rate, dayIndex) => {
                    const intensity = Math.round((rate / 100) * 255)
                    const bgColor = `rgb(${255 - intensity * 0.4}, ${255 - intensity * 0.2}, 255)`
                    return (
                      <td
                        key={dayIndex}
                        className="px-4 py-3 text-sm text-center"
                        style={{ backgroundColor: bgColor }}
                      >
                        {rate.toFixed(1)}%
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Key Metrics</h3>
          <p className="text-blue-700 mb-1">Average D1 Retention: <strong>{avgD1.toFixed(1)}%</strong></p>
          <p className="text-blue-700">Average D7 Retention: <strong>{avgD7.toFixed(1)}%</strong></p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Biggest Drop-off</h3>
          <p className="text-amber-700">
            <strong>{biggestDrop.from} → {biggestDrop.to}</strong> ({biggestDrop.drop.toFixed(1)}% decrease)
          </p>
        </div>
      </div>
    </div>
  )
}
