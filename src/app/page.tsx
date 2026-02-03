'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc']

function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  size = 'normal'
}: {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  size?: 'normal' | 'large'
}) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${size === 'large' ? 'p-6' : ''}`}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`font-semibold text-gray-900 mt-1 ${size === 'large' ? 'text-3xl' : 'text-xl'}`}>
        {value}
      </p>
      {change !== undefined && (
        <p className={`text-sm mt-1 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
          {isPositive ? '+' : ''}{change} {changeLabel}
        </p>
      )}
    </div>
  )
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>({})
  const [activeMembers, setActiveMembers] = useState<any>({})
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [activationFunnel, setActivationFunnel] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [studioHealth, setStudioHealth] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [overviewRes, activeRes, wowRes, funnelRes, cohortRes, healthRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'overview' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'activeMembers', days: 7 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'wowMetrics' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'activationFunnel' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'cohortRetention' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'studioHealth' }),
          }),
        ])

        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (activeRes.ok) setActiveMembers(await activeRes.json())
        if (wowRes.ok) setWowMetrics(await wowRes.json())
        if (funnelRes.ok) {
          const funnelData = await funnelRes.json()
          setActivationFunnel(funnelData.stages || [])
        }
        if (cohortRes.ok) {
          const cohortData = await cohortRes.json()
          setCohorts(cohortData.cohorts || [])
        }
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setStudioHealth(healthData.studios || [])
        }
      } catch (err) {
        console.error('Failed to fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const changes = wowMetrics.changes || {}
  const thisWeek = wowMetrics.thisWeek || {}

  // Format funnel data for chart
  const funnelData = activationFunnel.map((stage: any, index: number) => ({
    name: stage.name,
    value: stage.count,
    fill: COLORS[index % COLORS.length],
  }))

  // Calculate activation rate
  const activationRate = activationFunnel.length >= 2 && activationFunnel[0].count > 0
    ? ((activationFunnel[1].count / activationFunnel[0].count) * 100).toFixed(0)
    : '0'

  return (
    <div>
      {/* North Star Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pottery Friends</h1>
        <p className="text-gray-500 text-sm mb-4">Product Health Dashboard</p>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-6">
          <p className="text-indigo-100 text-sm font-medium">NORTH STAR METRIC</p>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-bold">{activeMembers.activeMembers || 0}</span>
            <span className="text-indigo-100">Weekly Active Members</span>
          </div>
          <p className="text-indigo-200 text-sm mt-2">
            {activeMembers.activityRate || 0}% of {activeMembers.totalMembers || 0} total members were active this week
          </p>
        </div>

        {/* WoW Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            title="Posts"
            value={thisWeek.posts || 0}
            change={changes.posts}
          />
          <MetricCard
            title="Likes"
            value={thisWeek.likes || 0}
            change={changes.likes}
          />
          <MetricCard
            title="Comments"
            value={thisWeek.comments || 0}
            change={changes.comments}
          />
          <MetricCard
            title="Follows"
            value={thisWeek.follows || 0}
            change={changes.follows}
          />
          <MetricCard
            title="New Members"
            value={thisWeek.new_members || 0}
            change={changes.newMembers}
          />
        </div>
      </div>

      {/* Activation Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activation Funnel</h2>
              <p className="text-sm text-gray-500">Member journey from signup to engagement</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{activationRate}%</p>
              <p className="text-xs text-gray-500">Activation Rate</p>
            </div>
          </div>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <FunnelChart>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No funnel data</p>
          )}
        </div>

        {/* Studio Health */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Studio Health</h2>
          <p className="text-sm text-gray-500 mb-4">Engagement per member by studio</p>
          {studioHealth && studioHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={studioHealth} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="engagementPerMember" fill="#6366f1" name="Engagement/Member" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No studio data</p>
          )}
        </div>
      </div>

      {/* Cohort Retention */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Cohort Retention</h2>
        <p className="text-sm text-gray-500 mb-4">% of members active by week after joining</p>
        {cohorts && cohorts.length > 0 ? (
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
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {new Date(cohort.cohort).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cohort.size}</td>
                    {['week0', 'week1', 'week2', 'week3'].map((week) => {
                      const val = cohort[week] || 0
                      const intensity = Math.min(val / 100, 1)
                      const bgColor = val > 0 ? `rgba(99, 102, 241, ${intensity * 0.7 + 0.1})` : '#f9fafb'
                      const textColor = intensity > 0.5 ? '#fff' : '#374151'
                      return (
                        <td
                          key={week}
                          className="px-4 py-3 text-sm text-center"
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

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/impressions" className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Screen Views</p>
          <p className="text-sm text-gray-500">PostHog events</p>
        </Link>
        <Link href="/funnel" className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Login Funnel</p>
          <p className="text-sm text-gray-500">PostHog events</p>
        </Link>
        <Link href="/retention" className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">DAU Trends</p>
          <p className="text-sm text-gray-500">PostHog sessions</p>
        </Link>
        <Link href="/engagement" className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Engagement</p>
          <p className="text-sm text-gray-500">Supabase activity</p>
        </Link>
      </div>

      {/* Data Sources */}
      <div className="mt-6 text-xs text-gray-400 text-center">
        Data from Supabase (community) + PostHog (app events)
      </div>
    </div>
  )
}
