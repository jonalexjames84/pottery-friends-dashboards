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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { DateRangeSelect } from '@/components/DateRangeSelect'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function WebsitePage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [pageViews, setPageViews] = useState<any[]>([])
  const [trafficSources, setTrafficSources] = useState<any[]>([])
  const [topPages, setTopPages] = useState<any[]>([])
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch website analytics from PostHog or dedicated endpoint
        const [pageViewsRes, sourcesRes, pagesRes, devicesRes] = await Promise.all([
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: 'websitePageViews',
              days: parseInt(dateRange)
            }),
          }),
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: 'websiteTrafficSources',
              days: parseInt(dateRange)
            }),
          }),
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: 'websiteTopPages',
              days: parseInt(dateRange)
            }),
          }),
          fetch('/api/posthog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: 'websiteDevices',
              days: parseInt(dateRange)
            }),
          }),
        ])

        if (pageViewsRes.ok) {
          const data = await pageViewsRes.json()
          setPageViews(data.trend || [])
          setSummary(data.summary || {})
        }
        if (sourcesRes.ok) {
          const data = await sourcesRes.json()
          setTrafficSources(data.sources || [])
        }
        if (pagesRes.ok) {
          const data = await pagesRes.json()
          setTopPages(data.pages || [])
        }
        if (devicesRes.ok) {
          const data = await devicesRes.json()
          setDeviceBreakdown(data.devices || [])
        }
      } catch (err) {
        console.error('Failed to load website data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading website analytics...</div>
      </div>
    )
  }

  // Extract summary metrics
  const totalPageViews = summary.totalPageViews || 0
  const uniqueVisitors = summary.uniqueVisitors || 0
  const avgSessionDuration = summary.avgSessionDuration || 0
  const bounceRate = summary.bounceRate || 0
  const appConversions = summary.appConversions || 0
  const conversionRate = uniqueVisitors > 0
    ? Math.round((appConversions / uniqueVisitors) * 100 * 10) / 10
    : 0

  // Week-over-week changes
  const pageViewsChange = summary.pageViewsChange || 0
  const visitorsChange = summary.visitorsChange || 0
  const conversionChange = summary.conversionChange || 0

  // Calculate health indicators
  const bounceHealth = bounceRate <= 40 ? 'healthy' : bounceRate <= 60 ? 'okay' : 'needs-attention'
  const conversionHealth = conversionRate >= 5 ? 'healthy' : conversionRate >= 2 ? 'okay' : 'needs-attention'

  // Pages per session
  const pagesPerSession = uniqueVisitors > 0
    ? Math.round((totalPageViews / uniqueVisitors) * 10) / 10
    : 0

  // Top referrer
  const topReferrer = trafficSources.length > 0
    ? trafficSources.reduce((max, s) => (s.visitors || 0) > (max.visitors || 0) ? s : max, trafficSources[0])
    : null

  // Filter active days for chart
  const activeDays = pageViews.filter(d => d.pageViews > 0 || d.visitors > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1>
          <p className="text-sm text-gray-500">How is potteryfriends.com performing?</p>
          <p className="text-xs text-amber-600 mt-1">* Website tracking recently added — data may be incomplete</p>
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm font-medium">Page Views</p>
          <p className="text-4xl font-bold mt-1">{totalPageViews.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${pageViewsChange >= 0 ? 'text-white/90' : 'text-red-200'}`}>
            {pageViewsChange >= 0 ? '+' : ''}{pageViewsChange}% vs last period
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{uniqueVisitors.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${visitorsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {visitorsChange >= 0 ? '+' : ''}{visitorsChange}% vs last period
          </p>
        </div>

        <div className={`rounded-xl p-6 text-white ${
          bounceHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          bounceHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Bounce Rate</p>
          <p className="text-4xl font-bold mt-1">{bounceRate}%</p>
          <p className="text-white/70 text-sm mt-1">
            {bounceHealth === 'healthy' ? 'Healthy' : bounceHealth === 'okay' ? 'Average' : 'High'}
          </p>
        </div>

        <div className={`rounded-xl p-6 text-white ${
          conversionHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          conversionHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">App Conversions</p>
          <p className="text-4xl font-bold mt-1">{conversionRate}%</p>
          <p className="text-white/70 text-sm mt-1">{appConversions} signups from web</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📄</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pagesPerSession}</p>
              <p className="text-xs text-gray-500">Pages/Session</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⏱️</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgSessionDuration}s</p>
              <p className="text-xs text-gray-500">Avg Session</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{topReferrer?.source || 'Direct'}</p>
              <p className="text-xs text-gray-500">Top Referrer</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📱</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {deviceBreakdown.find(d => d.device === 'Mobile')?.percentage || 0}%
              </p>
              <p className="text-xs text-gray-500">Mobile Traffic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Trend</h2>
          {activeDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activeDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  name="Page Views"
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Visitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No traffic data yet — tracking will populate this chart
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
          {trafficSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="visitors"
                  nameKey="source"
                  label={({ source, percentage }) => `${source}: ${percentage}%`}
                  labelLine={false}
                >
                  {trafficSources.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No traffic source data yet
            </div>
          )}
        </div>
      </div>

      {/* Top Pages & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
          {topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.slice(0, 8).map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900 truncate">{page.path}</span>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-medium text-gray-900">{page.views?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              No page data yet
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
          {deviceBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deviceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="device" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="visitors" fill="#6366f1" name="Visitors" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              No device data yet
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Conversion Funnels</h2>
        <p className="text-sm text-gray-500 mb-6">Track conversions across each audience segment</p>

        {/* Funnel 1: Beta Testers → Users */}
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">1</span>
            Beta Testers → Active Users
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Beta Signups', value: summary.betaSignups || 0, icon: '🧪', color: 'purple' },
              { label: 'Activated', value: summary.betaActivated || 0, icon: '✅', color: 'indigo' },
              { label: 'First Post', value: summary.betaFirstPost || 0, icon: '📝', color: 'blue' },
              { label: 'Active Users', value: summary.betaActive || 0, icon: '🔥', color: 'emerald' },
            ].map((step, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl mb-1">{step.icon}</span>
                <p className="text-xl font-bold text-gray-900">{step.value}</p>
                <p className="text-xs text-gray-500">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel 2: Waitlist → Users */}
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-sm">2</span>
            Waitlisted → Active Users
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Waitlist Signups', value: summary.waitlistTotal || 0, icon: '📋', color: 'amber' },
              { label: 'Invited', value: summary.waitlistInvited || 0, icon: '📧', color: 'yellow' },
              { label: 'Converted', value: summary.waitlistConverted || 0, icon: '👤', color: 'lime' },
              { label: 'Active Users', value: summary.waitlistActive || 0, icon: '🔥', color: 'emerald' },
            ].map((step, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl mb-1">{step.icon}</span>
                <p className="text-xl font-bold text-gray-900">{step.value}</p>
                <p className="text-xs text-gray-500">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel 3: Web Users → App Users */}
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">3</span>
            Web Users → App Users
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Web Users', value: summary.webUsers || 0, icon: '🌐', color: 'blue' },
              { label: 'Saw App Promo', value: summary.sawAppPromo || 0, icon: '👀', color: 'indigo' },
              { label: 'Clicked Download', value: summary.clickedDownload || 0, icon: '⬇️', color: 'violet' },
              { label: 'App Users', value: summary.appUsers || 0, icon: '📱', color: 'emerald' },
            ].map((step, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl mb-1">{step.icon}</span>
                <p className="text-xl font-bold text-gray-900">{step.value}</p>
                <p className="text-xs text-gray-500">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel 4: Studios → Paying Customers */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-sm">4</span>
            Studios → Paying Customers 💰
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Studio Leads', value: summary.studioLeads || 0, icon: '🏢', color: 'emerald' },
              { label: 'Demo Requested', value: summary.studioDemos || 0, icon: '📞', color: 'teal' },
              { label: 'Trial Started', value: summary.studioTrials || 0, icon: '🎯', color: 'cyan' },
              { label: 'Paying', value: summary.studiosPaying || 0, icon: '💳', color: 'green' },
            ].map((step, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl mb-1">{step.icon}</span>
                <p className="text-xl font-bold text-gray-900">{step.value}</p>
                <p className="text-xs text-gray-500">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          * Tracking being implemented. Values will populate as events are captured.
        </p>
      </div>

      {/* Questions to Answer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-medium text-gray-900">Are beta testers converting to active users?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {summary.betaActivated || 0} of {summary.betaSignups || 0} beta testers activated.
              {(summary.betaSignups || 0) > 0 && (summary.betaActivated || 0) / (summary.betaSignups || 1) >= 0.5
                ? " → Great activation! Beta testers are finding value."
                : " → Low activation. Check onboarding flow and first-time experience."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Is the waitlist converting when invited?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {summary.waitlistConverted || 0} of {summary.waitlistInvited || 0} invites converted.
              {(summary.waitlistInvited || 0) > 0 && (summary.waitlistConverted || 0) / (summary.waitlistInvited || 1) >= 0.6
                ? " → Strong! Waitlist members are eager to join."
                : " → Some drop-off. Consider invite email optimization or immediate value demo."}
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-medium text-gray-900">Are web users downloading the app?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {summary.appUsers || 0} web users converted to app.
              {(summary.webUsers || 0) > 0 && (summary.appUsers || 0) / (summary.webUsers || 1) >= 0.3
                ? " → Good crossover! Web users see app value."
                : " → Low app adoption. Highlight app-only features or push notifications benefit."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Are studios converting to paid?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {summary.studiosPaying || 0} paying studios from {summary.studioLeads || 0} leads.
              {(summary.studioLeads || 0) > 0 && (summary.studiosPaying || 0) / (summary.studioLeads || 1) >= 0.1
                ? " → Revenue funnel is working! Focus on lead generation."
                : " → Pipeline needs work. Review studio value prop and pricing."}
            </p>
          </div>

          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Is website traffic growing?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {pageViewsChange >= 0 ? '+' : ''}{pageViewsChange}% page views, {visitorsChange >= 0 ? '+' : ''}{visitorsChange}% visitors vs last period.
              {pageViewsChange >= 10
                ? " → Traffic is growing! Keep marketing momentum."
                : pageViewsChange >= -5
                  ? " → Flat. Need more content marketing or paid channels."
                  : " → Declining. Investigate traffic sources and SEO."}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Website Conversion Hypotheses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <p className="font-medium text-gray-900">H1: Beta urgency drives activation</p>
            </div>
            <p className="text-sm text-gray-600">
              "Limited beta spots" messaging will increase beta → active user conversion by 25%.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: A/B test beta signup page with/without scarcity messaging.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H2: Personalized invites convert waitlist</p>
            </div>
            <p className="text-sm text-gray-600">
              Personalized "your spot is ready" emails will convert 70%+ of waitlist invites.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare generic vs personalized invite email conversion rates.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <p className="font-medium text-gray-900">H3: Push notification pitch drives app adoption</p>
            </div>
            <p className="text-sm text-gray-600">
              Highlighting "never miss a like" via app notifications will increase web → app conversion by 40%.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Add prominent "Get the app for instant notifications" CTA.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <p className="font-medium text-gray-900">H4: Member management demo converts studios</p>
            </div>
            <p className="text-sm text-gray-600">
              Interactive demo of studio member management will 3x demo request rate.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Add "See it in action" interactive demo vs static screenshots.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-teal-500"></span>
              <p className="font-medium text-gray-900">H5: Social proof accelerates all funnels</p>
            </div>
            <p className="text-sm text-gray-600">
              "Join X potters" counter and testimonials will boost all conversion rates by 20%.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Add live member counter and featured testimonials to key pages.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <p className="font-medium text-gray-900">H6: Studio ROI calculator drives paid conversion</p>
            </div>
            <p className="text-sm text-gray-600">
              An ROI calculator ("save X hours/month") will double trial → paid conversion.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Build interactive calculator showing time savings for studios.
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {/* Beta Funnel Action */}
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <span className="text-purple-600 font-bold">🧪</span>
            <div>
              <p className="font-medium text-gray-900">Maximize beta tester activation</p>
              <p className="text-sm text-gray-600">
                Create urgency with "limited spots" messaging. Send personalized onboarding emails within 1 hour of signup.
                Guide beta testers to their first post immediately.
              </p>
            </div>
          </div>

          {/* Waitlist Funnel Action */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
            <span className="text-amber-600 font-bold">📋</span>
            <div>
              <p className="font-medium text-gray-900">Optimize waitlist → user conversion</p>
              <p className="text-sm text-gray-600">
                Personalize invite emails with "your spot is ready, [Name]!" Add countdown timer for invite expiry.
                Show what they've been missing (recent community highlights).
              </p>
            </div>
          </div>

          {/* Web → App Funnel Action */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-blue-600 font-bold">📱</span>
            <div>
              <p className="font-medium text-gray-900">Drive web users to the app</p>
              <p className="text-sm text-gray-600">
                Highlight app-only benefits: push notifications ("never miss a like"), faster photo uploads, offline access.
                Add persistent "Get the app" banner on web. Deep link from notifications to app stores.
              </p>
            </div>
          </div>

          {/* Studio Funnel Action */}
          <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
            <span className="text-emerald-600 font-bold">💰</span>
            <div>
              <p className="font-medium text-gray-900">Convert studios to paying customers</p>
              <p className="text-sm text-gray-600">
                Build dedicated /studios landing page with ROI calculator. Add "book a demo" with Calendly integration.
                Offer 30-day free trial with hands-on setup support. Feature studio testimonials prominently.
              </p>
            </div>
          </div>

          {/* Traffic Growth Action */}
          {pageViewsChange < 10 && (
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <span className="text-indigo-600 font-bold">📈</span>
              <div>
                <p className="font-medium text-gray-900">Grow website traffic</p>
                <p className="text-sm text-gray-600">
                  Create pottery-focused blog content for SEO. Partner with pottery YouTubers/Instagrammers.
                  Consider Pinterest (high pottery interest). Run targeted ads to pottery subreddits/forums.
                </p>
              </div>
            </div>
          )}

          {bounceRate > 50 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">⚠️</span>
              <div>
                <p className="font-medium text-gray-900">Reduce bounce rate ({bounceRate}%)</p>
                <p className="text-sm text-gray-600">
                  Improve above-fold: clear value prop, compelling pottery imagery, immediate CTA.
                  Show social proof (member count, testimonials) immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Website analytics from PostHog. Data updates in real-time as tracking is implemented.
      </p>
    </div>
  )
}
