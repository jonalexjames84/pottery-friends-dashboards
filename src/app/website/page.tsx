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
  const [signupTrend, setSignupTrend] = useState<any[]>([])
  const [platforms, setPlatforms] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch website analytics from Supabase
        const res = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryType: 'websiteAnalytics',
            days: parseInt(dateRange)
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setSummary(data.summary || {})
          setSignupTrend(data.trend || [])
          setPlatforms(data.platforms || [])
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

  // Extract summary metrics from Supabase
  const totalSignups = summary.totalSignups || 0
  const betaSignups = summary.betaSignups || 0
  const activatedUsers = summary.activatedUsers || 0
  const activeUsers = summary.activeUsers || 0
  const activationRate = summary.activationRate || 0
  const weeklyChange = summary.weeklyChange || 0
  const signupsThisWeek = summary.signupsThisWeek || 0
  const signupsLastWeek = summary.signupsLastWeek || 0
  const studioSignups = summary.studioSignups || 0
  const iosSignups = summary.iosSignups || 0
  const androidSignups = summary.androidSignups || 0

  // Calculate health indicators
  const activationHealth = activationRate >= 70 ? 'healthy' : activationRate >= 40 ? 'okay' : 'needs-attention'
  const growthHealth = weeklyChange >= 10 ? 'healthy' : weeklyChange >= 0 ? 'okay' : 'needs-attention'

  // Top platform
  const topPlatform = platforms.length > 0
    ? platforms.reduce((max, p) => (p.count || 0) > (max.count || 0) ? p : max, platforms[0])
    : null

  // Filter active days for chart
  const activeDays = signupTrend.filter(d => d.signups > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website & Signups</h1>
          <p className="text-sm text-gray-500">Beta signup funnel from potteryfriends.com</p>
          {totalSignups < 50 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({totalSignups} signups) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm font-medium">Beta Signups</p>
          <p className="text-4xl font-bold mt-1">{totalSignups}</p>
          <p className={`text-sm mt-1 ${weeklyChange >= 0 ? 'text-white/90' : 'text-red-200'}`}>
            {weeklyChange >= 0 ? '+' : ''}{weeklyChange}% vs last week
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">This Week</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{signupsThisWeek}</p>
          <p className="text-sm text-gray-500 mt-1">
            vs {signupsLastWeek} last week
          </p>
        </div>

        <div className={`rounded-xl p-6 text-white ${
          activationHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          activationHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Activation Rate</p>
          <p className="text-4xl font-bold mt-1">{activationRate}%</p>
          <p className="text-white/70 text-sm mt-1">
            {activatedUsers} created profiles
          </p>
        </div>

        <div className={`rounded-xl p-6 text-white ${
          activeUsers > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          'bg-gradient-to-r from-amber-500 to-orange-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Active This Week</p>
          <p className="text-4xl font-bold mt-1">{activeUsers}</p>
          <p className="text-white/70 text-sm mt-1">from beta signups</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl"></span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{iosSignups}</p>
              <p className="text-xs text-gray-500">iOS Signups</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{androidSignups}</p>
              <p className="text-xs text-gray-500">Android Signups</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studioSignups}</p>
              <p className="text-xs text-gray-500">Studio Signups</p>
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
                {topPlatform?.platform || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Top Platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signup Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Signup Trend</h2>
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
                  dataKey="signups"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  name="Signups"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No signup data yet
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={platforms}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="platform"
                  label={({ platform, count }) => `${platform}: ${count}`}
                  labelLine={false}
                >
                  {platforms.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No platform data yet
            </div>
          )}
        </div>
      </div>

      {/* Signup Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Beta Signup Funnel</h2>
        <div className="space-y-4">
          {[
            { name: 'Beta Signups', count: totalSignups, rate: 100 },
            { name: 'Created Profile', count: activatedUsers, rate: activationRate },
            { name: 'Active This Week', count: activeUsers, rate: totalSignups > 0 ? Math.round((activeUsers / totalSignups) * 100) : 0 },
          ].map((stage, i) => {
            const isDropoff = i > 0 && stage.rate < 50
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
                    style={{ width: `${stage.rate}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Summary</h2>
        <p className="text-sm text-gray-500 mb-6">Beta signup to active user journey</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <span className="text-3xl mb-2">🧪</span>
            <p className="text-2xl font-bold text-gray-900">{betaSignups}</p>
            <p className="text-xs text-gray-500">Beta Signups</p>
            <p className="text-xs text-purple-600 mt-1">100%</p>
          </div>

          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-2xl font-bold text-gray-900">{activatedUsers}</p>
            <p className="text-xs text-gray-500">Created Profile</p>
            <p className="text-xs text-indigo-600 mt-1">{activationRate}%</p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <span className="text-3xl mb-2">🔥</span>
            <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            <p className="text-xs text-gray-500">Active This Week</p>
            <p className="text-xs text-blue-600 mt-1">
              {totalSignups > 0 ? Math.round((activeUsers / totalSignups) * 100) : 0}%
            </p>
          </div>

          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <span className="text-3xl mb-2">🏢</span>
            <p className="text-2xl font-bold text-gray-900">{studioSignups}</p>
            <p className="text-xs text-gray-500">Studio Signups</p>
            <p className="text-xs text-emerald-600 mt-1">
              {totalSignups > 0 ? Math.round((studioSignups / totalSignups) * 100) : 0}% of total
            </p>
          </div>
        </div>
      </div>

      {/* Questions to Answer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-medium text-gray-900">Are beta testers converting to active users?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {activatedUsers} of {totalSignups} beta testers created profiles ({activationRate}%).
              {activationRate >= 70
                ? " → Great activation! Beta testers are finding value."
                : activationRate >= 40
                  ? " → Good progress. Some drop-off at onboarding."
                  : " → Low activation. Check onboarding flow and first-time experience."}
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-medium text-gray-900">Are activated users staying active?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {activeUsers} of {activatedUsers} activated users are active this week.
              {activatedUsers > 0 && (activeUsers / activatedUsers) >= 0.5
                ? " → Strong retention! Users are engaged."
                : " → Some users going dormant. Consider re-engagement campaigns."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Which platform is driving signups?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> iOS: {iosSignups}, Android: {androidSignups}.
              {iosSignups > androidSignups
                ? " → iOS dominant. Consider prioritizing iOS features."
                : androidSignups > iosSignups
                  ? " → Android dominant. Ensure Android experience is polished."
                  : " → Even split. Support both platforms equally."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Are studios signing up?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {studioSignups} of {totalSignups} signups are from studios ({totalSignups > 0 ? Math.round((studioSignups / totalSignups) * 100) : 0}%).
              {studioSignups > 0
                ? " → Studios are interested! Follow up on studio features."
                : " → No studio signups yet. Consider studio-focused marketing."}
            </p>
          </div>

          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Is signup rate growing?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {signupsThisWeek} this week vs {signupsLastWeek} last week ({weeklyChange >= 0 ? '+' : ''}{weeklyChange}%).
              {weeklyChange >= 20
                ? " → Great momentum! Keep marketing efforts going."
                : weeklyChange >= 0
                  ? " → Stable. Consider new channels to accelerate."
                  : " → Declining. Investigate what changed."}
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
        Beta signup data from Supabase. Updates in real-time.
      </p>
    </div>
  )
}
