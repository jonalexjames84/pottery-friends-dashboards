'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function WeeklyReview() {
  const [loading, setLoading] = useState(true)
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [retentionCohorts, setRetentionCohorts] = useState<any>({})
  const [websiteAnalytics, setWebsiteAnalytics] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [activeRes, funnelRes, resRes, wowRes, retRes, webRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'unifiedActiveMembers', days: 7 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'unifiedFunnel' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'resurrectionRate' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'wowMetrics' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'retentionCohorts', days: 60 }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'websiteAnalytics' }),
          }),
        ])

        if (activeRes.ok) setUnifiedActive(await activeRes.json())
        if (funnelRes.ok) setUnifiedFunnel(await funnelRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (wowRes.ok) setWowMetrics(await wowRes.json())
        if (retRes.ok) setRetentionCohorts(await retRes.json())
        if (webRes.ok) setWebsiteAnalytics(await webRes.json())
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
  const funnelStages = unifiedFunnel.stages || []

  // Key metrics
  const totalMembers = unifiedActive.totalMembers || 0
  const activeMembers = unifiedActive.activeMembers || 0
  const activityRate = unifiedActive.activityRate || 0
  const activationRate = unifiedFunnel.activationRate || 0
  const churnedUsers = resurrection.churnedUsers || 0

  // Retention cohort averages
  const cohortData = retentionCohorts.cohorts || []
  const avgD1 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d1_rate || 0), 0) / cohortData.length)
    : 0
  const avgD7 = cohortData.length > 0
    ? Math.round(cohortData.reduce((sum: number, c: any) => sum + (c.d7_rate || 0), 0) / cohortData.length)
    : 0

  // Website analytics
  const webSummary = websiteAnalytics.summary || {}
  const signupsThisWeek = webSummary.signupsThisWeek || 0
  const weeklySignupChange = webSummary.weeklyChange || 0
  const studioSignups = webSummary.studioSignups || 0

  // User health breakdown for pie chart
  const newAndActive = unifiedActive.newUserActive || 0
  const returning = unifiedActive.returningUserActive || 0
  const inactive = Math.max(0, totalMembers - newAndActive - returning - churnedUsers)

  const userHealthData = [
    { name: 'New & Active', value: newAndActive, color: '#10b981' },
    { name: 'Returning', value: returning, color: '#3b82f6' },
    { name: 'Churned', value: churnedUsers, color: '#ef4444' },
    { name: 'Inactive', value: inactive, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Health status
  const healthStatus = activityRate >= 40 ? 'healthy' : activityRate >= 20 ? 'okay' : 'needs-attention'
  const healthColors = {
    'healthy': 'from-emerald-500 to-teal-600',
    'okay': 'from-amber-500 to-orange-600',
    'needs-attention': 'from-red-500 to-rose-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Review</h1>
        <p className="text-gray-500 text-sm">Pottery Friends Beta — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        {totalMembers < 100 && (
          <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
        )}
      </div>

      {/* Health Banner */}
      <div className={`bg-gradient-to-r ${healthColors[healthStatus]} rounded-xl p-6 text-white`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wide">North Star Metric</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-5xl font-bold">{activeMembers}</span>
              <span className="text-white/90 text-lg">Weekly Active Members</span>
            </div>
            <p className="text-white/70 text-sm mt-2">
              {activityRate}% of {totalMembers} total members active this week
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              healthStatus === 'healthy' ? 'bg-white/20' :
              healthStatus === 'okay' ? 'bg-white/20' : 'bg-white/30'
            }`}>
              {healthStatus === 'healthy' ? '✓ Healthy' :
               healthStatus === 'okay' ? '→ Building' : '! Focus needed'}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reach */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">R</span>
            </div>
            <h3 className="font-semibold text-gray-900">Reach</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Signups this week</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{signupsThisWeek}</span>
                {weeklySignupChange !== 0 && (
                  <span className={`text-xs ml-1 ${weeklySignupChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {weeklySignupChange >= 0 ? '+' : ''}{weeklySignupChange}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Activation rate</span>
              <span className="text-sm font-semibold text-gray-900">{activationRate}%</span>
            </div>
          </div>
        </div>

        {/* Retention */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-sm">R</span>
            </div>
            <h3 className="font-semibold text-gray-900">Retention</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">D7 retention</span>
              <span className={`text-sm font-semibold ${avgD7 >= 40 ? 'text-green-600' : avgD7 >= 20 ? 'text-amber-600' : 'text-red-600'}`}>{avgD7}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">D1 retention</span>
              <span className="text-sm font-semibold text-gray-900">{avgD1}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Churned</span>
              <span className="text-sm font-semibold text-red-600">{churnedUsers}</span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-600 font-bold text-sm">$</span>
            </div>
            <h3 className="font-semibold text-gray-900">Revenue</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Studio signups</span>
              <span className="text-sm font-semibold text-gray-900">{studioSignups}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400 italic">MRR, subscriptions</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Coming soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* This Week vs Last Week */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week vs Last Week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'New Members', value: thisWeek.new_members || 0, change: changes.newMembers },
            { label: 'Posts', value: thisWeek.posts || 0, change: changes.posts },
            { label: 'Likes', value: thisWeek.likes || 0, change: changes.likes },
            { label: 'Comments', value: thisWeek.comments || 0, change: changes.comments },
            { label: 'Follows', value: thisWeek.follows || 0, change: changes.follows },
          ].map((metric) => (
            <div key={metric.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500">{metric.label}</p>
              {metric.change !== undefined && (
                <p className={`text-xs mt-1 ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? '+' : ''}{metric.change}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Two Column: Funnel + User Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Funnel (compact) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activation Funnel</h2>
              <p className="text-sm text-gray-500">New user journey (last 30 days)</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{activationRate}%</p>
              <p className="text-xs text-gray-500">reach &quot;Engaged&quot;</p>
            </div>
          </div>

          {funnelStages.length > 0 ? (
            <div className="space-y-3">
              {funnelStages.map((stage: any, i: number) => {
                const width = stage.rate || 0
                const isDropoff = i > 0 && funnelStages[i-1].count - stage.count > funnelStages[i-1].count * 0.4
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium ${isDropoff ? 'text-red-600' : 'text-gray-700'}`}>
                        {stage.name}
                      </span>
                      <span className="text-gray-500">{stage.count} ({stage.rate}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${isDropoff ? 'bg-red-400' : 'bg-indigo-500'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Waiting for signups...</p>
          )}
        </div>

        {/* User Health (compact) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Health</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{newAndActive}</p>
              <p className="text-xs text-gray-500">New & Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{returning}</p>
              <p className="text-xs text-gray-500">Returning</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{churnedUsers}</p>
              <p className="text-xs text-gray-500">Churned (14d+)</p>
            </div>
          </div>

          {userHealthData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={userHealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {userHealthData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/reach" className="block p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold">R</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Reach</p>
              <p className="text-xs text-gray-500">Website, signups, app store</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Are we getting in front of people?</p>
        </Link>

        <Link href="/retention" className="block p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 font-bold">R</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Retention</p>
              <p className="text-xs text-gray-500">Cohorts, engagement, stickiness</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Are users sticking around?</p>
        </Link>

        <Link href="/revenue" className="block p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-600 font-bold">$</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Revenue</p>
              <p className="text-xs text-gray-500">Studios, monetization</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Are we making money?</p>
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Data from Supabase (actions) + PostHog (sessions). Updated in real-time.
      </p>
    </div>
  )
}
