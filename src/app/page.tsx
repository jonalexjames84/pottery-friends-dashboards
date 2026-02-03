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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>({})
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [studioHealth, setStudioHealth] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [overviewRes, activeRes, funnelRes, resRes, wowRes, healthRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'overview' }),
          }),
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
            body: JSON.stringify({ queryType: 'studioHealth' }),
          }),
        ])

        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (activeRes.ok) setUnifiedActive(await activeRes.json())
        if (funnelRes.ok) setUnifiedFunnel(await funnelRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (wowRes.ok) setWowMetrics(await wowRes.json())
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setStudioHealth(Array.isArray(healthData) ? healthData : healthData.studios || [])
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
  const funnelStages = unifiedFunnel.stages || []

  // Calculate key metrics
  const totalMembers = unifiedActive.totalMembers || overview.totalMembers || 0
  const activeMembers = unifiedActive.activeMembers || 0
  const activityRate = unifiedActive.activityRate || 0
  const activationRate = unifiedFunnel.activationRate || 0
  const churnedUsers = resurrection.churnedUsers || 0

  // User health breakdown for pie chart (matches the stats grid)
  const newAndActive = unifiedActive.newUserActive || 0
  const returning = unifiedActive.returningUserActive || 0
  const inactive = Math.max(0, totalMembers - newAndActive - returning - churnedUsers)

  const userHealthData = [
    { name: 'New & Active', value: newAndActive, color: '#10b981' },
    { name: 'Returning', value: returning, color: '#3b82f6' },
    { name: 'Churned', value: churnedUsers, color: '#ef4444' },
    { name: 'Inactive', value: inactive, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Determine overall health status
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
        <h1 className="text-2xl font-bold text-gray-900">Pottery Friends Beta</h1>
        <p className="text-gray-500 text-sm">Weekly Product Review — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        {totalMembers < 100 && (
          <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
        )}
      </div>

      {/* North Star: Weekly Active Members */}
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

      {/* This Week's Numbers */}
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
        {/* Activation Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activation Funnel</h2>
              <p className="text-sm text-gray-500">New user journey (last 30 days)</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{activationRate}%</p>
              <p className="text-xs text-gray-500">reach "Engaged"</p>
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

        {/* User Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Health</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{unifiedActive.newUserActive || 0}</p>
              <p className="text-xs text-gray-500">New & Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{unifiedActive.returningUserActive || 0}</p>
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

      {/* Studio Performance */}
      {studioHealth && studioHealth.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Studio Performance</h2>
          <p className="text-sm text-gray-500 mb-4">Engagement per member by studio</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={studioHealth.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="engagementPerMember" fill="#6366f1" name="Engagement/Member" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All-Time Totals */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All-Time Totals</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {[
            { label: 'Members', value: overview.totalMembers || 0 },
            { label: 'Studios', value: overview.totalStudios || 0 },
            { label: 'Posts', value: overview.totalPosts || 0 },
            { label: 'Likes', value: overview.totalLikes || 0 },
            { label: 'Comments', value: overview.totalComments || 0 },
            { label: 'Follows', value: overview.totalFollows || 0 },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Questions & Hypotheses Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer This Week</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Are new users finding value quickly?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {activationRate}% of new signups reach "Engaged" status.
              {activationRate >= 50
                ? " → Strong! Users are finding their aha moment."
                : activationRate >= 30
                  ? " → Okay, but room to improve onboarding."
                  : " → Low. Consider guided first-post experience or better onboarding."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Is the community sticky?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {activityRate}% weekly active rate, {churnedUsers} churned users.
              {activityRate >= 40
                ? " → Great retention! Community is engaging."
                : activityRate >= 20
                  ? " → Building. Focus on reasons to return (notifications, new content)."
                  : " → Need habit-forming features. Consider push notifications or digest emails."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Are studios driving engagement?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {overview.totalStudios || 0} studios with varying engagement levels.
              {studioHealth.length > 0 && studioHealth[0].engagementPerMember > 10
                ? ` → "${studioHealth[0].name}" is leading. Learn what they're doing right.`
                : " → Studios need more activation. Consider studio leaderboards or challenges."}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Beta Hypotheses to Validate</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${activationRate >= 40 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: First post = retention driver</p>
            </div>
            <p className="text-sm text-gray-600">
              If users post within 48hrs, they're more likely to return.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: {funnelStages[2]?.count || 0} of {funnelStages[0]?.count || 0} made first post
              ({funnelStages[2]?.rate || 0}%)
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(overview.totalFollows || 0) > totalMembers * 2 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Social connections = stickiness</p>
            </div>
            <p className="text-sm text-gray-600">
              Users with 3+ follows have higher retention.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: {overview.totalFollows || 0} total follows across {totalMembers} members
              (avg {totalMembers > 0 ? ((overview.totalFollows || 0) / totalMembers).toFixed(1) : 0}/user)
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${studioHealth.some(s => s.memberCount >= 5) ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H3: Studios create belonging</p>
            </div>
            <p className="text-sm text-gray-600">
              Studio members engage more than non-studio members.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: {overview.totalStudios || 0} studios, largest has{' '}
              {studioHealth.length > 0 ? studioHealth[0].memberCount || 0 : 0} members
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${(overview.totalLikes || 0) > (overview.totalPosts || 1) * 3 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H4: Engagement begets engagement</p>
            </div>
            <p className="text-sm text-gray-600">
              Posts that get likes get more comments.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: {overview.totalLikes || 0} likes, {overview.totalComments || 0} comments on{' '}
              {overview.totalPosts || 0} posts
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/funnel" className="block p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Funnel Deep Dive</p>
          <p className="text-xs text-gray-500">Conversion analysis</p>
        </Link>
        <Link href="/retention" className="block p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Retention</p>
          <p className="text-xs text-gray-500">Cohort analysis</p>
        </Link>
        <Link href="/engagement" className="block p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Engagement</p>
          <p className="text-xs text-gray-500">Activity metrics</p>
        </Link>
        <Link href="/impressions" className="block p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="font-medium text-gray-900">Screen Views</p>
          <p className="text-xs text-gray-500">PostHog data</p>
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Data from Supabase (actions) + PostHog (sessions). Updated in real-time.
      </p>
    </div>
  )
}
