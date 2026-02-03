'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MetricCard } from '@/components/MetricCard'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [posthogStats, setPosthogStats] = useState<any>({})
  const [supabaseStats, setSupabaseStats] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch PostHog data
        const phRes = await fetch('/api/posthog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'events', days: 7 }),
        })
        if (phRes.ok) {
          const phData = await phRes.json()
          const events = phData.results || []
          const screenViews = events.filter((e: any) => e.event === '$screen').length
          const uniqueUsers = new Set(events.map((e: any) => e.distinct_id)).size
          const logins = events.filter((e: any) => e.event === 'login_completed').length
          setPosthogStats({ screenViews, uniqueUsers, logins })
        }

        // Fetch Supabase data (using secure aggregate functions)
        const sbRes = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryType: 'overview' }),
        })
        if (sbRes.ok) {
          const sbData = await sbRes.json()
          setSupabaseStats(sbData)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Pottery Friends Dashboards
      </h1>
      <p className="text-gray-600 mb-8">
        Combined analytics from PostHog and Supabase
      </p>

      {/* Quick Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Last 7 Days Overview</h2>
        {loading ? (
          <div className="text-gray-500">Loading stats...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <MetricCard title="Screen Views" value={posthogStats.screenViews || 0} />
            <MetricCard title="Active Users" value={posthogStats.uniqueUsers || 0} />
            <MetricCard title="Logins" value={posthogStats.logins || 0} />
            <MetricCard title="Members" value={supabaseStats.totalMembers || 0} />
            <MetricCard title="Posts" value={supabaseStats.totalPosts || 0} />
            <MetricCard title="Engagement" value={(supabaseStats.totalLikes || 0) + (supabaseStats.totalComments || 0) + (supabaseStats.totalFollows || 0)} />
          </div>
        )}
      </div>

      {/* Dashboard Links */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/impressions"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📱</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Screen Views
          </h3>
          <p className="text-gray-600 text-sm">
            App screen views and navigation patterns from PostHog
          </p>
          <div className="mt-3 text-indigo-600 text-sm font-medium">View dashboard →</div>
        </Link>

        <Link
          href="/funnel"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">🔄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Login Funnel
          </h3>
          <p className="text-gray-600 text-sm">
            User login flow conversion rates from PostHog
          </p>
          <div className="mt-3 text-indigo-600 text-sm font-medium">View dashboard →</div>
        </Link>

        <Link
          href="/retention"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📈</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Retention
          </h3>
          <p className="text-gray-600 text-sm">
            Daily active users and retention metrics from PostHog
          </p>
          <div className="mt-3 text-indigo-600 text-sm font-medium">View dashboard →</div>
        </Link>

        <Link
          href="/engagement"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">💬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Engagement
          </h3>
          <p className="text-gray-600 text-sm">
            Posts, likes, comments, and follows from Supabase
          </p>
          <div className="mt-3 text-indigo-600 text-sm font-medium">View dashboard →</div>
        </Link>
      </div>

      {/* Data Sources */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Data Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">PostHog:</span>
            <span className="text-gray-600 ml-2">Screen views, logins, sessions, user behavior</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Supabase:</span>
            <span className="text-gray-600 ml-2">Members, studios, posts, likes, comments, follows</span>
          </div>
        </div>
      </div>
    </div>
  )
}
