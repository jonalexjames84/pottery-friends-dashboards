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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function EngagementPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>({})
  const [dailyEngagement, setDailyEngagement] = useState<any[]>([])
  const [studioStats, setStudioStats] = useState<any[]>([])
  const [wowMetrics, setWowMetrics] = useState<any>({})
  const [engagementDist, setEngagementDist] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        const [overviewRes, trendsRes, studioRes, wowRes, distRes] = await Promise.all([
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'overview' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'engagementTrends', days: parseInt(dateRange) }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'studioStats' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'wowMetrics' }),
          }),
          fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryType: 'engagementDistribution' }),
          }),
        ])

        if (overviewRes.ok) setOverview(await overviewRes.json())
        if (trendsRes.ok) {
          const trendsData = await trendsRes.json()
          setDailyEngagement(trendsData.trends || [])
        }
        if (studioRes.ok) {
          const studioData = await studioRes.json()
          setStudioStats(studioData.studios || [])
        }
        if (wowRes.ok) setWowMetrics(await wowRes.json())
        if (distRes.ok) setEngagementDist(await distRes.json())
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
        <div className="text-gray-500">Loading engagement data...</div>
      </div>
    )
  }

  const totalMembers = overview.totalMembers || 0
  const totalPosts = overview.totalPosts || 0
  const totalLikes = overview.totalLikes || 0
  const totalComments = overview.totalComments || 0
  const totalFollows = overview.totalFollows || 0

  const changes = wowMetrics.changes || {}
  const thisWeek = wowMetrics.thisWeek || {}
  const lastWeek = wowMetrics.lastWeek || {}

  // Calculate key metrics
  const medianEngagement = engagementDist.medianEngagement || 0
  const meanEngagement = engagementDist.meanEngagement || 0
  const zeroEngagementPosts = engagementDist.postsZeroEngagement || 0
  const zeroEngagementRate = engagementDist.zeroEngagementRate || 0

  // Engagement health
  const engagementHealth = medianEngagement >= 5 ? 'healthy' : medianEngagement >= 2 ? 'okay' : 'needs-attention'

  // Total activity this week vs last week
  const totalThisWeek = (thisWeek.posts || 0) + (thisWeek.likes || 0) + (thisWeek.comments || 0)
  const totalLastWeek = (lastWeek.posts || 0) + (lastWeek.likes || 0) + (lastWeek.comments || 0)
  const weeklyTrend = totalLastWeek > 0 ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100) : 0

  // Engagement breakdown for pie chart
  const engagementBreakdown = [
    { name: 'Likes', value: totalLikes },
    { name: 'Comments', value: totalComments },
    { name: 'Follows', value: totalFollows },
  ].filter(d => d.value > 0)

  // Filter active days
  const activeDays = dailyEngagement.filter(d => d.posts > 0 || d.likes > 0 || d.comments > 0)

  // Best performing studio
  const topStudio = studioStats.length > 0
    ? studioStats.reduce((max, s) => ((s.memberCount || 0) > (max.memberCount || 0) ? s : max), studioStats[0])
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Engagement</h1>
          <p className="text-sm text-gray-500">How engaged is your community?</p>
          {totalMembers < 100 && (
            <p className="text-xs text-amber-600 mt-1">* Beta data ({totalMembers} users) — directional metrics</p>
          )}
        </div>
        <div className="w-full sm:w-40">
          <DateRangeSelect value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-6 text-white ${
          engagementHealth === 'healthy' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
          engagementHealth === 'okay' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <p className="text-white/80 text-sm font-medium">Median Engagement</p>
          <p className="text-4xl font-bold mt-1">{medianEngagement}</p>
          <p className="text-white/70 text-sm mt-1">interactions per post</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Posts</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{totalPosts}</p>
          <p className={`text-sm mt-1 ${(changes.posts || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(changes.posts || 0) >= 0 ? '+' : ''}{changes.posts || 0} this week
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Weekly Trend</p>
          <p className={`text-4xl font-bold mt-1 ${weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {weeklyTrend >= 0 ? '+' : ''}{weeklyTrend}%
          </p>
          <p className="text-sm text-gray-500 mt-1">vs last week</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Zero Engagement</p>
          <p className={`text-4xl font-bold mt-1 ${zeroEngagementRate > 30 ? 'text-red-600' : zeroEngagementRate > 15 ? 'text-amber-600' : 'text-green-600'}`}>
            {zeroEngagementRate}%
          </p>
          <p className="text-sm text-gray-500 mt-1">{zeroEngagementPosts} posts with 0 likes</p>
        </div>
      </div>

      {/* This Week Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week's Activity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Posts', value: thisWeek.posts || 0, change: changes.posts, icon: '📝' },
            { label: 'Likes', value: thisWeek.likes || 0, change: changes.likes, icon: '❤️' },
            { label: 'Comments', value: thisWeek.comments || 0, change: changes.comments, icon: '💬' },
            { label: 'Follows', value: thisWeek.follows || 0, change: changes.follows, icon: '👥' },
            { label: 'New Members', value: thisWeek.new_members || 0, change: changes.newMembers, icon: '🆕' },
          ].map((metric) => (
            <div key={metric.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl mb-1">{metric.icon}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500">{metric.label}</p>
              {metric.change !== undefined && (
                <p className={`text-xs mt-1 ${(metric.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(metric.change || 0) >= 0 ? '+' : ''}{metric.change}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity Trend</h2>
          {activeDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activeDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="likes" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Likes" />
                <Area type="monotone" dataKey="comments" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Comments" />
                <Area type="monotone" dataKey="posts" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} name="Posts" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No activity data for selected period</p>
          )}
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Engagement Mix</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{(totalLikes + totalComments + totalFollows).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Interactions</p>
            </div>
          </div>
          {engagementBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={engagementBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {engagementBreakdown.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No engagement data yet</p>
          )}
        </div>
      </div>

      {/* Engagement Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Post Performance Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{engagementDist.totalPosts || 0}</p>
            <p className="text-sm text-gray-500">Total Posts</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{zeroEngagementPosts}</p>
            <p className="text-sm text-gray-500">Zero Engagement</p>
            <p className="text-xs text-red-600">{zeroEngagementRate}%</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600">{medianEngagement}</p>
            <p className="text-sm text-gray-500">Median (50th %ile)</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{engagementDist.p75Engagement || 0}</p>
            <p className="text-sm text-gray-500">75th Percentile</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{engagementDist.p90Engagement || 0}</p>
            <p className="text-sm text-gray-500">90th Percentile</p>
          </div>
        </div>
        {engagementDist.isSkewed && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Mean ({meanEngagement}) is much higher than median ({medianEngagement}).
              A few viral posts are inflating the average. Use median for a more representative view.
            </p>
          </div>
        )}
      </div>

      {/* Studio Performance */}
      {studioStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Studios by Members</h2>
            {topStudio && (
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">{topStudio.name}</p>
                <p className="text-xs text-gray-500">Largest Studio</p>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={studioStats.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="memberCount" fill="#6366f1" name="Members" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All-Time Stats */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All-Time Stats</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {[
            { label: 'Members', value: totalMembers },
            { label: 'Studios', value: overview.totalStudios || 0 },
            { label: 'Posts', value: totalPosts },
            { label: 'Likes', value: totalLikes },
            { label: 'Comments', value: totalComments },
            { label: 'Follows', value: totalFollows },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Questions & Hypotheses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Questions to Answer</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="font-medium text-gray-900">Is content getting engagement?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Answer:</strong> Median {medianEngagement} interactions per post.
              {medianEngagement >= 5
                ? " → Great! Posts are resonating with the community."
                : medianEngagement >= 2
                  ? " → Okay. There's engagement, but room to improve feed discovery or notifications."
                  : " → Low. Consider: better content surfacing, push notifications for new posts, or community prompts."}
            </p>
          </div>

          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="font-medium text-gray-900">Are posts being seen?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {zeroEngagementRate}% of posts have zero engagement.
              {zeroEngagementRate <= 10
                ? " → Excellent! Almost all content gets interaction."
                : zeroEngagementRate <= 25
                  ? " → Some posts are being missed. Check feed algorithm or timing."
                  : " → High. Many posts are invisible. Consider notifications or featured content."}
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-medium text-gray-900">Is activity growing?</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Signal:</strong> {weeklyTrend >= 0 ? '+' : ''}{weeklyTrend}% week-over-week.
              {weeklyTrend >= 10
                ? " → Activity is growing! Keep the momentum."
                : weeklyTrend >= -10
                  ? " → Flat. Need more content creators or engagement prompts."
                  : " → Declining. Investigate: are users churning? Or just not posting?"}
            </p>
          </div>
        </div>
      </div>

      {/* Beta Hypotheses */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Engagement Hypotheses</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${medianEngagement >= 3 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H1: Photos get more likes</p>
            </div>
            <p className="text-sm text-gray-600">
              Posts with pottery photos get 3x more engagement than text-only posts.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare engagement for posts with vs without images.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${zeroEngagementRate <= 20 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <p className="font-medium text-gray-900">H2: Notifications boost engagement</p>
            </div>
            <p className="text-sm text-gray-600">
              Users with push notifications enabled have 2x higher engagement.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Segment engagement by notification settings.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H3: Studio posts get more attention</p>
            </div>
            <p className="text-sm text-gray-600">
              Posts shared to a studio feed get more engagement than personal feed posts.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Compare engagement for studio vs personal posts.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <p className="font-medium text-gray-900">H4: Comments drive more comments</p>
            </div>
            <p className="text-sm text-gray-600">
              Posts that receive a comment within 1 hour get 3x more total comments.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Test: Measure time-to-first-comment impact on total engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommended Actions</h2>

        <div className="space-y-3">
          {zeroEngagementRate > 25 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900">Reduce invisible posts ({zeroEngagementRate}% have zero engagement)</p>
                <p className="text-sm text-gray-600">
                  Consider: push notifications for new posts, better feed ranking, or "featured post" for new users.
                </p>
              </div>
            </div>
          )}

          {weeklyTrend < -10 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900">Address declining activity ({weeklyTrend}% WoW)</p>
                <p className="text-sm text-gray-600">
                  Investigate: are power users still active? Consider content prompts or challenges.
                </p>
              </div>
            </div>
          )}

          {medianEngagement < 2 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900">Improve engagement per post (median: {medianEngagement})</p>
                <p className="text-sm text-gray-600">
                  Target: 3+ interactions per post. Consider encouraging comments with prompts.
                </p>
              </div>
            </div>
          )}

          {medianEngagement >= 5 && weeklyTrend >= 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-gray-900">Engagement is healthy!</p>
                <p className="text-sm text-gray-600">
                  Focus on growing the community (more members, more content creators).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        All data from Supabase. Posts, likes, comments, and follows tracked in real-time.
      </p>
    </div>
  )
}
