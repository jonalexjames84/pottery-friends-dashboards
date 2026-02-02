'use client'

import { useState, useMemo } from 'react'
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
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { DateRangeSelect } from '@/components/DateRangeSelect'
import { PlatformSelect } from '@/components/PlatformSelect'
import { generateSampleImpressions, generateSampleInstalls } from '@/lib/sample-data'

export default function ImpressionsPage() {
  const [dateRange, setDateRange] = useState('30')
  const [platform, setPlatform] = useState('All')

  const { impressions, installs, dailyData, platformData } = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))

    const rawImpressions = generateSampleImpressions(startDate, endDate)
    const rawInstalls = generateSampleInstalls(startDate, endDate)

    // Filter by platform if needed
    const filteredImpressions = platform === 'All'
      ? rawImpressions
      : rawImpressions.filter(i => i.platform === platform)
    const filteredInstalls = platform === 'All'
      ? rawInstalls
      : rawInstalls.filter(i => i.platform === platform)

    // Calculate totals
    const totalImpressions = filteredImpressions.reduce((sum, i) => sum + i.count, 0)
    const totalInstalls = filteredInstalls.reduce((sum, i) => sum + i.count, 0)

    // Group by date for line chart
    const dateMap = new Map<string, { impressions: number; installs: number }>()
    filteredImpressions.forEach(i => {
      const date = i.created_at.split('T')[0]
      const existing = dateMap.get(date) || { impressions: 0, installs: 0 }
      existing.impressions += i.count
      dateMap.set(date, existing)
    })
    filteredInstalls.forEach(i => {
      const date = i.created_at.split('T')[0]
      const existing = dateMap.get(date) || { impressions: 0, installs: 0 }
      existing.installs += i.count
      dateMap.set(date, existing)
    })

    const dailyData = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Group by platform for bar chart
    const platformMap = new Map<string, { impressions: number; installs: number }>()
    rawImpressions.forEach(i => {
      const existing = platformMap.get(i.platform) || { impressions: 0, installs: 0 }
      existing.impressions += i.count
      platformMap.set(i.platform, existing)
    })
    rawInstalls.forEach(i => {
      const existing = platformMap.get(i.platform) || { impressions: 0, installs: 0 }
      existing.installs += i.count
      platformMap.set(i.platform, existing)
    })

    const platformData = Array.from(platformMap.entries())
      .map(([platform, data]) => ({ platform, ...data }))

    return {
      impressions: totalImpressions,
      installs: totalInstalls,
      dailyData,
      platformData,
    }
  }, [dateRange, platform])

  const conversionRate = impressions > 0 ? ((installs / impressions) * 100).toFixed(2) : '0.00'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impressions & Installs</h1>
        <div className="flex gap-4">
          <div className="w-40">
            <DateRangeSelect value={dateRange} onChange={setDateRange} />
          </div>
          <div className="w-40">
            <PlatformSelect value={platform} onChange={setPlatform} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard title="Total Impressions" value={impressions.toLocaleString()} />
        <MetricCard title="Total Installs" value={installs.toLocaleString()} />
        <MetricCard title="Conversion Rate" value={`${conversionRate}%`} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={2} />
            <Line type="monotone" dataKey="installs" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={platformData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="impressions" fill="#6366f1" />
            <Bar dataKey="installs" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
