'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'
import { EmptyStateCard } from '@/components/EarlyDataBanner'

export default function ReachPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [websiteAnalytics, setWebsiteAnalytics] = useState<any>({})
  const [pageViews, setPageViews] = useState<any[]>([])
  const [posthogSummary, setPosthogSummary] = useState<any>({})
  const [trafficSources, setTrafficSources] = useState<any[]>([])
  const [topPages, setTopPages] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [unifiedFunnel, setUnifiedFunnel] = useState<any>({})
  const [posthogEvents, setPosthogEvents] = useState<any>({ loginStarted: 0, loginCompleted: 0 })
  const [impressions, setImpressions] = useState<any>({})
  const [installs, setInstalls] = useState<any>({})
  const [screenData, setScreenData] = useState<any[]>([])
  const [screenBreakdown, setScreenBreakdown] = useState<any[]>([])
  const [screenMetrics, setScreenMetrics] = useState({ totalViews: 0, uniqueUsers: 0, avgViewsPerUser: 0, topScreen: '' })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const days = parseInt(dateRange)

        const [
          webRes, pvRes, srcRes, pagesRes, devRes,
          funnelRes, phEvtRes,
          impRes, instRes,
          screenViewsRes, uniqueUsersRes,
        ] = await Promise.all([
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'websiteAnalytics', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'websitePageViews', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'websiteTrafficSources', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'websiteTopPages', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'websiteDevices', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'unifiedFunnel', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'events', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'impressions', days }) }),
          fetch('/api/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'installs', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'screenViews', days }) }),
          fetch('/api/posthog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryType: 'uniqueUsers', days }) }),
        ])

        if (webRes.ok) {
          const data = await webRes.json()
          setWebsiteAnalytics(data)
        }
        if (pvRes.ok) {
          const data = await pvRes.json()
          setPageViews(data.trend || [])
          setPosthogSummary(data.summary || {})
        }
        if (srcRes.ok) {
          const data = await srcRes.json()
          setTrafficSources(data.sources || [])
        }
        if (pagesRes.ok) {
          const data = await pagesRes.json()
          setTopPages(data.pages || [])
        }
        if (devRes.ok) {
          const data = await devRes.json()
          setDevices(data.devices || [])
        }
        if (funnelRes.ok) setUnifiedFunnel(await funnelRes.json())
        if (phEvtRes.ok) {
          const phData = await phEvtRes.json()
          const events = phData.results || []
          const loginStarted = new Set(events.filter((e: any) => e.event === 'login_started').map((e: any) => e.distinct_id)).size
          const loginCompleted = new Set(events.filter((e: any) => e.event === 'login_completed').map((e: any) => e.distinct_id)).size
          setPosthogEvents({ loginStarted, loginCompleted })
        }
        if (impRes.ok) setImpressions(await impRes.json())
        if (instRes.ok) setInstalls(await instRes.json())

        // Process screen views
        if (screenViewsRes.ok && uniqueUsersRes.ok) {
          const svData = await screenViewsRes.json()
          const uuData = await uniqueUsersRes.json()
          const screenSeries = svData.results || []
          const uniqueUsersSeries = uuData.results || []

          const dateMap = new Map<string, number>()
          for (const series of screenSeries) {
            const dates = series.days || series.labels || []
            const counts = series.data || []
            for (let i = 0; i < dates.length; i++) {
              const date = (dates[i] || '').split('T')[0]
              if (date) dateMap.set(date, (dateMap.get(date) || 0) + (counts[i] || 0))
            }
          }
          const dailyData = Array.from(dateMap.entries()).map(([date, count]) => ({ date, views: count })).sort((a, b) => a.date.localeCompare(b.date))
          setScreenData(dailyData)

          const totalViews = dailyData.reduce((sum, d) => sum + d.views, 0)
          const breakdown = screenSeries
            .map((series: any) => {
              const views = (series.data || []).reduce((a: number, b: number) => a + b, 0)
              return { screen: series.breakdown_value || series.label || 'Unknown', views, percentage: totalViews > 0 ? ((views / totalViews) * 100).toFixed(1) : '0' }
            })
            .filter((s: any) => s.views > 0)
            .sort((a: any, b: any) => b.views - a.views)
          setScreenBreakdown(breakdown)

          const uniqueUsers = uniqueUsersSeries.length > 0
            ? (uniqueUsersSeries[0].data || []).reduce((a: number, b: number) => a + b, 0)
            : 0

          setScreenMetrics({
            totalViews,
            uniqueUsers,
            avgViewsPerUser: uniqueUsers > 0 ? Math.round((totalViews / uniqueUsers) * 10) / 10 : 0,
            topScreen: breakdown[0]?.screen || 'N/A',
          })
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reach data...</div>
      </div>
    )
  }

  // Website analytics
  const webSummary = websiteAnalytics.summary || {}
  const signupTrend = websiteAnalytics.trend || []
  const platforms = websiteAnalytics.platforms || []
  const totalSignups = webSummary.totalSignups || 0
  const activationRate = unifiedFunnel.activationRate || 0
  const signupsThisWeek = webSummary.signupsThisWeek || 0
  const weeklyChange = webSummary.weeklyChange || 0

  // PostHog website
  const totalPageViews = posthogSummary.totalPageViews || 0
  const uniqueVisitors = posthogSummary.uniqueVisitors || 0
  const pageViewsChange = posthogSummary.pageViewsChange || 0
  const visitorSignupRate = uniqueVisitors > 0 ? ((totalSignups / uniqueVisitors) * 100).toFixed(1) : '0'

  // App store funnel
  const totalImpressions = impressions.total || 0
  const totalInstalls = installs.total || 0
  const installRate = totalImpressions > 0 ? ((totalInstalls / totalImpressions) * 100).toFixed(1) : '0'
  const installSignupRate = totalInstalls > 0 ? ((totalSignups / totalInstalls) * 100).toFixed(1) : '0'

  // Funnel
  const funnelStages = unifiedFunnel.stages || []
  const loginConversion = posthogEvents.loginStarted > 0
    ? Math.round((posthogEvents.loginCompleted / posthogEvents.loginStarted) * 100)
    : 0

  // Filter active chart days
  const activePageViewDays = pageViews.filter(d => d.pageViews > 0 || d.visitors > 0)
  const activeSignupDays = signupTrend.filter((d: any) => d.signups > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reach</h1>
          <p className="text-sm text-gray-500">Are we getting in front of people and getting them into the app?</p>
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* North Star Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm font-medium">Total Signups</p>
          <p className="text-4xl font-bold mt-1">{totalSignups}</p>
          <p className={`text-sm mt-1 ${weeklyChange >= 0 ? 'text-white/90' : 'text-red-200'}`}>
            {weeklyChange >= 0 ? '+' : ''}{weeklyChange}% WoW
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Website Visitors</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{uniqueVisitors.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${pageViewsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pageViewsChange >= 0 ? '+' : ''}{pageViewsChange}% vs last period
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Visitor → Signup</p>
          <p className="text-4xl font-bold text-indigo-600 mt-1">{visitorSignupRate}%</p>
          <p className="text-sm text-gray-500 mt-1">conversion rate</p>
        </div>

        <div className={`rounded-xl p-6 text-white ${activationRate >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : activationRate >= 30 ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
          <p className="text-white/80 text-sm font-medium">Activation Rate</p>
          <p className="text-4xl font-bold mt-1">{activationRate}%</p>
          <p className="text-white/70 text-sm mt-1">Signup → Engaged</p>
        </div>
      </div>

      {/* App Store Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">App Store Funnel</h2>
        <p className="text-sm text-gray-500 mb-4">Impressions → Installs → Signups</p>

        {totalImpressions > 0 || totalInstalls > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{totalImpressions.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Impressions</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-3xl font-bold text-indigo-600">{totalInstalls.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Installs</p>
                <p className="text-xs text-indigo-600 mt-1">{installRate}% of impressions</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{totalSignups}</p>
                <p className="text-sm text-gray-500">Signups</p>
                <p className="text-xs text-blue-600 mt-1">{installSignupRate}% of installs</p>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Impressions by Platform</p>
                <div className="space-y-1">
                  {Object.entries(impressions.platforms || {}).filter(([, v]) => (v as number) > 0).map(([platform, count]) => (
                    <div key={platform} className="flex justify-between text-sm">
                      <span className="text-gray-600">{platform}</span>
                      <span className="font-medium text-gray-900">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Installs by Platform</p>
                <div className="space-y-1">
                  {Object.entries(installs.platforms || {}).filter(([, v]) => (v as number) > 0).map(([platform, count]) => (
                    <div key={platform} className="flex justify-between text-sm">
                      <span className="text-gray-600">{platform}</span>
                      <span className="font-medium text-gray-900">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <EmptyStateCard title="No App Store Data" description="Impressions and installs data will appear once populated in the impressions/installs tables." />
        )}
      </div>

      {/* Website Traffic + Signup Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Traffic</h2>
          {activePageViewDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activePageViewDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="pageViews" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Page Views" />
                <Area type="monotone" dataKey="visitors" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No PostHog website data yet
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Signup Trend</h2>
          {activeSignupDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activeSignupDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="signups" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Signups" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No signup data yet
            </div>
          )}
        </div>
      </div>

      {/* Traffic Sources */}
      {trafficSources.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trafficSources.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="visitors" fill="#6366f1" name="Visitors" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Pages & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topPages.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topPages.slice(0, 10).map((page: any, i: number) => (
                    <tr key={i} className={i === 0 ? 'bg-indigo-50' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-900 truncate max-w-[200px]">{page.path}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">{page.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {devices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
            <div className="space-y-3">
              {devices.map((device: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{device.device}</span>
                    <span className="text-gray-500">{device.visitors.toLocaleString()} ({device.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${device.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Platform breakdown from Supabase */}
            {platforms.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Signup Platform Breakdown</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={platforms} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="platform" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name="Signups" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Early Activation (from Funnel) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Early Activation</h2>
        <p className="text-sm text-gray-500 mb-4">First steps of the user journey</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className={`rounded-lg p-4 text-center ${activationRate >= 50 ? 'bg-green-50' : activationRate >= 30 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <p className="text-sm text-gray-500">Activation Rate</p>
            <p className={`text-3xl font-bold ${activationRate >= 50 ? 'text-green-600' : activationRate >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{activationRate}%</p>
            <p className="text-xs text-gray-500">Signup → Engaged</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Login Conversion</p>
            <p className="text-3xl font-bold text-gray-900">{loginConversion}%</p>
            <p className="text-xs text-gray-500">Started → Completed</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Biggest Drop-off</p>
            {funnelStages.length > 1 ? (() => {
              const dropoffs = funnelStages.slice(0, -1).map((s: any, i: number) => {
                const next = funnelStages[i + 1]
                return { from: s.name, to: next.name, dropRate: s.count > 0 ? Math.round(((s.count - next.count) / s.count) * 100) : 0 }
              })
              const biggest = dropoffs.reduce((max: any, d: any) => d.dropRate > (max?.dropRate || 0) ? d : max, null)
              return (
                <>
                  <p className="text-3xl font-bold text-red-600">{biggest?.dropRate || 0}%</p>
                  <p className="text-xs text-gray-500">{biggest?.from} → {biggest?.to}</p>
                </>
              )
            })() : (
              <>
                <p className="text-3xl font-bold text-gray-400">--</p>
                <p className="text-xs text-gray-500">Need data</p>
              </>
            )}
          </div>
        </div>

        {funnelStages.length > 0 && (
          <div className="space-y-3">
            {funnelStages.slice(0, 2).map((stage: any, i: number) => {
              const isDropoff = i > 0 && funnelStages[i-1].count - stage.count > funnelStages[i-1].count * 0.4
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-medium ${isDropoff ? 'text-red-600' : 'text-gray-700'}`}>{stage.name}</span>
                    <span className="text-gray-500">{stage.count} ({stage.rate}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full ${isDropoff ? 'bg-red-400' : 'bg-indigo-500'}`} style={{ width: `${stage.rate}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Screen Views & Session Depth */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Screen Views & Session Depth</h2>
        <p className="text-sm text-gray-500 mb-4">How users navigate through the app (PostHog)</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className={`rounded-lg p-4 text-center ${screenMetrics.avgViewsPerUser >= 5 ? 'bg-green-50' : screenMetrics.avgViewsPerUser >= 3 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <p className="text-2xl font-bold text-gray-900">{screenMetrics.avgViewsPerUser}</p>
            <p className="text-xs text-gray-500">Screens/User</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{screenMetrics.totalViews.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Views</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{screenMetrics.uniqueUsers}</p>
            <p className="text-xs text-gray-500">Unique Users</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600 truncate">{screenMetrics.topScreen}</p>
            <p className="text-xs text-gray-500">Top Screen</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {screenData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Daily Screen Views</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={screenData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Views" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {screenBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Screens</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {screenBreakdown.slice(0, 8).map((row: any, i: number) => (
                      <tr key={i} className={i === 0 ? 'bg-indigo-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.screen}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">{row.views.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-600">{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Questions & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions & Actions</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Is the top of funnel growing?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {signupsThisWeek} signups this week ({weeklyChange >= 0 ? '+' : ''}{weeklyChange}% WoW), {uniqueVisitors.toLocaleString()} website visitors.
              {weeklyChange >= 20
                ? ' Great momentum — keep marketing efforts going.'
                : weeklyChange >= 0
                  ? ' Stable. Consider new channels to accelerate growth.'
                  : ' Declining. Investigate what changed.'}
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-medium text-gray-900">Are visitors converting?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {visitorSignupRate}% visitor → signup rate.
              {parseFloat(visitorSignupRate) >= 5
                ? ' Strong conversion. Focus on driving more traffic.'
                : parseFloat(visitorSignupRate) >= 2
                  ? ' Average. Test landing page variations and CTAs.'
                  : ' Low. Review landing page, messaging, and signup friction.'}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Are new users activating?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {activationRate}% activation rate (Signup → Engaged).
              {activationRate >= 50
                ? ' Excellent onboarding — users find value quickly.'
                : activationRate >= 30
                  ? ' Solid. Focus on the biggest funnel drop-off.'
                  : ' Below benchmark. Prioritize onboarding improvements.'}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Are users exploring the app?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {screenMetrics.avgViewsPerUser} screens per user session.
              {screenMetrics.avgViewsPerUser >= 5
                ? ' Great depth — users are discovering features.'
                : screenMetrics.avgViewsPerUser >= 3
                  ? ' Moderate. Consider better navigation hints or onboarding tour.'
                  : ' Low. Users may not be finding value. Check onboarding flow.'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Website data from PostHog. Signups from Supabase. App store data from impressions/installs tables.
      </p>
    </div>
  )
}
