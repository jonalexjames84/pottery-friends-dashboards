'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { EmptyStateCard } from '@/components/EarlyDataBanner'

export default function RevenuePage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>({})
  const [websiteAnalytics, setWebsiteAnalytics] = useState<any>({})
  const [studioHealth, setStudioHealth] = useState<any[]>([])
  const [studioStats, setStudioStats] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [overviewRes, webRes, healthRes, studioRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'overview' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'websiteAnalytics' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'studioHealth' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'studioStats' }),
          }),
        ])

        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (webRes.ok) setWebsiteAnalytics(await webRes.json())
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setStudioHealth(Array.isArray(healthData) ? healthData : healthData.studios || [])
        }
        if (studioRes.ok) {
          const studioData = await studioRes.json()
          setStudioStats(studioData.studios || [])
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
        <div className="text-gray-500">Loading revenue data...</div>
      </div>
    )
  }

  const webSummary = websiteAnalytics.summary || {}
  const studioSignups = webSummary.studioSignups || 0
  const totalStudios = overview.totalStudios || 0
  const activeStudios = studioStats.filter((s: any) => (s.memberCount || 0) > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500">Revenue tracking and early monetization signals</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <span className="text-amber-600 font-bold text-lg">$</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Revenue tracking is coming</p>
            <p className="text-sm text-gray-600">
              Full revenue metrics (MRR, subscriptions, churn) will be available once monetization launches.
              For now, track studio pipeline and early signals below.
            </p>
          </div>
        </div>
      </div>

      {/* Studio Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Studio Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <p className="text-4xl font-bold text-purple-600">{studioSignups}</p>
            <p className="text-sm text-gray-600 mt-1">Studio Signups</p>
            <p className="text-xs text-gray-500">From beta signup form</p>
          </div>
          <div className="text-center p-6 bg-indigo-50 rounded-lg">
            <p className="text-4xl font-bold text-indigo-600">{activeStudios}</p>
            <p className="text-sm text-gray-600 mt-1">Active Studios</p>
            <p className="text-xs text-gray-500">With at least 1 member</p>
          </div>
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <p className="text-4xl font-bold text-blue-600">{totalStudios}</p>
            <p className="text-sm text-gray-600 mt-1">Total Studios</p>
            <p className="text-xs text-gray-500">All-time created</p>
          </div>
        </div>
      </div>

      {/* Studio Health */}
      {studioHealth && studioHealth.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Studio Health</h2>
          <p className="text-sm text-gray-500 mb-4">Engagement per member by studio — potential paying customers</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={studioHealth.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="engagementPerMember" fill="#6366f1" name="Engagement/Member" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Studio detail table */}
          {studioStats.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Studio</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Members</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studioStats.slice(0, 10).map((studio: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{studio.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{studio.memberCount || 0}</td>
                      <td className="px-4 py-3">
                        {(studio.memberCount || 0) >= 5 ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                        ) : (studio.memberCount || 0) > 0 ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Growing</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Future Metrics Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmptyStateCard
          title="Monthly Recurring Revenue (MRR)"
          description="Track MRR growth once studio subscriptions launch. Will show total MRR, net new MRR, and churn."
        />
        <EmptyStateCard
          title="Subscription Rate"
          description="Percentage of studios converting from free to paid. Target: track trial → paid conversion funnel."
        />
        <EmptyStateCard
          title="Average Revenue Per Studio (ARPS)"
          description="Revenue per paying studio per month. Will help optimize pricing tiers and feature packaging."
        />
        <EmptyStateCard
          title="Revenue Churn"
          description="Monthly revenue lost from studio downgrades or cancellations. Key metric for business health."
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        Studio data from Supabase. Revenue metrics will be added when monetization launches.
      </p>
    </div>
  )
}
