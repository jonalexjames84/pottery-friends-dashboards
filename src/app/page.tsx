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
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9', '#f0abfc']

function ConfidenceBadge({ isSignificant, sampleSize }: { isSignificant: boolean; sampleSize: number }) {
  if (isSignificant) {
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
        n={sampleSize} (reliable)
      </span>
    )
  }
  return (
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
      n={sampleSize} (low confidence)
    </span>
  )
}

function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
}: {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
}) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
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
  const [unifiedActive, setUnifiedActive] = useState<any>({})
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [engagementDist, setEngagementDist] = useState<any>({})
  const [resurrection, setResurrection] = useState<any>({})
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [studioHealth, setStudioHealth] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [activeRes, funnelRes, distRes, resRes, wowRes, healthRes] = await Promise.all([
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
            body: JSON.stringify({ queryType: 'engagementDistribution' }),
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

        if (activeRes.ok) setUnifiedActive(await activeRes.json())
        if (funnelRes.ok) setUnifiedFunnel(await funnelRes.json())
        if (distRes.ok) setEngagementDist(await distRes.json())
        if (resRes.ok) setResurrection(await resRes.json())
        if (wowRes.ok) setWowMetrics(await wowRes.json())
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
  const funnelStages = unifiedFunnel.stages || []

  // Format funnel data for chart
  const funnelData = funnelStages.map((stage: any, index: number) => ({
    name: stage.name,
    value: stage.count,
    rate: stage.rate,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pottery Friends</h1>
        <p className="text-gray-500 text-sm mb-4">Product Health Dashboard (Unified Metrics)</p>

        {/* North Star Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">NORTH STAR METRIC</p>
              <div className="flex items-baseline gap-4 mt-1">
                <span className="text-4xl font-bold">{unifiedActive.activeMembers || 0}</span>
                <span className="text-indigo-100">Weekly Active Members</span>
              </div>
              <p className="text-indigo-200 text-sm mt-2">
                {unifiedActive.activityRate || 0}% of {unifiedActive.totalMembers || 0} members active (any Supabase action)
              </p>
            </div>
            <ConfidenceBadge
              isSignificant={unifiedActive.isStatisticallySignificant}
              sampleSize={unifiedActive.sampleSize || 0}
            />
          </div>
        </div>

        {/* User Segmentation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500">New Users Active</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{unifiedActive.newUserActive || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Joined last 14 days</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500">Returning Users Active</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{unifiedActive.returningUserActive || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Joined 14+ days ago</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500">Resurrected Users</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{resurrection.resurrectedUsers || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{resurrection.resurrectionRate || 0}% of churned came back</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500">Churned Users</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{resurrection.churnedUsers || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Inactive 14+ days</p>
          </div>
        </div>

        {/* WoW Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard title="Posts" value={thisWeek.posts || 0} change={changes.posts} />
          <MetricCard title="Likes" value={thisWeek.likes || 0} change={changes.likes} />
          <MetricCard title="Comments" value={thisWeek.comments || 0} change={changes.comments} />
          <MetricCard title="Follows" value={thisWeek.follows || 0} change={changes.follows} />
          <MetricCard title="New Members" value={thisWeek.new_members || 0} change={changes.newMembers} />
        </div>
      </div>

      {/* Unified Funnel + Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Unified User Journey</h2>
              <p className="text-sm text-gray-500">Acquisition → Activation → Retention</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{unifiedFunnel.activationRate || 0}%</p>
              <p className="text-xs text-gray-500">Activation Rate</p>
            </div>
          </div>
          {funnelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <FunnelChart>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} users (${props.payload.rate}%)`,
                      props.payload.name
                    ]}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={11} />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={12} fontWeight="bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1">
                {funnelStages.slice(0, -1).map((stage: any, i: number) => {
                  const next = funnelStages[i + 1]
                  const dropoff = stage.count - next.count
                  const dropoffRate = stage.count > 0 ? Math.round((dropoff / stage.count) * 100) : 0
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{stage.name} → {next.name}</span>
                      <span className={dropoffRate > 50 ? 'text-red-600 font-medium' : 'text-amber-600'}>
                        -{dropoff} ({dropoffRate}% drop)
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No funnel data</p>
          )}
        </div>

        {/* Engagement Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Engagement Distribution</h2>
              <p className="text-sm text-gray-500">Per-post engagement stats</p>
            </div>
            {engagementDist.isSkewed && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                Skewed distribution
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Median</p>
              <p className="text-3xl font-bold text-gray-900">{engagementDist.medianEngagement || 0}</p>
              <p className="text-xs text-gray-500">interactions/post</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Mean</p>
              <p className="text-3xl font-bold text-gray-900">{engagementDist.meanEngagement || 0}</p>
              <p className="text-xs text-gray-500">interactions/post</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Posts with 0 engagement</span>
              <span className="text-sm font-medium text-red-600">
                {engagementDist.postsZeroEngagement || 0} ({engagementDist.zeroEngagementRate || 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">75th percentile</span>
              <span className="text-sm font-medium text-gray-900">{engagementDist.p75Engagement || 0} interactions</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">90th percentile</span>
              <span className="text-sm font-medium text-gray-900">{engagementDist.p90Engagement || 0} interactions</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total posts analyzed</span>
              <span className="text-sm font-medium text-gray-900">{engagementDist.totalPosts || 0}</span>
            </div>
          </div>

          {engagementDist.isSkewed && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Mean ({engagementDist.meanEngagement}) is much higher than median ({engagementDist.medianEngagement}).
                A few viral posts are skewing the average. Use median for a more representative view.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Studio Health */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
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

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-1">Activation Insight</h3>
          <p className="text-green-700 text-sm">
            {(unifiedFunnel.activationRate || 0) >= 30
              ? `${unifiedFunnel.activationRate}% activation is healthy for a community app.`
              : `${unifiedFunnel.activationRate || 0}% activation is below 30% benchmark. Focus on first post experience.`}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-1">Biggest Drop-off</h3>
          <p className="text-amber-700 text-sm">
            {funnelStages.length > 1 ? (
              (() => {
                let maxDrop = { from: '', to: '', rate: 0 }
                for (let i = 0; i < funnelStages.length - 1; i++) {
                  const dropRate = funnelStages[i].count > 0
                    ? ((funnelStages[i].count - funnelStages[i+1].count) / funnelStages[i].count) * 100
                    : 0
                  if (dropRate > maxDrop.rate) {
                    maxDrop = { from: funnelStages[i].name, to: funnelStages[i+1].name, rate: Math.round(dropRate) }
                  }
                }
                return `${maxDrop.from} → ${maxDrop.to} loses ${maxDrop.rate}% of users.`
              })()
            ) : 'Need more funnel data'}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-1">User Health</h3>
          <p className="text-blue-700 text-sm">
            {unifiedActive.newUserActive || 0} new + {unifiedActive.returningUserActive || 0} returning active.
            {(resurrection.resurrectionRate || 0) > 10
              ? ` ${resurrection.resurrectionRate}% resurrection rate is promising!`
              : ' Focus on re-engaging churned users.'}
          </p>
        </div>
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
        Unified metrics from Supabase (posts, likes, comments, follows). PostHog data on detail pages.
      </div>
    </div>
  )
}
