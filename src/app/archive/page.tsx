import Link from 'next/link'

const archivedReports = [
  {
    href: '/archive/impressions',
    title: 'Screen Views & Navigation',
    description: 'PostHog screen view analytics, session depth, and navigation patterns across app screens.',
  },
  {
    href: '/archive/funnel',
    title: 'Activation Funnel',
    description: 'Signup-to-engaged user funnel with stage-by-stage conversion rates and drop-off analysis.',
  },
  {
    href: '/archive/engagement',
    title: 'Community Engagement',
    description: 'Posts, likes, comments, follows, engagement distribution, and studio performance.',
  },
  {
    href: '/archive/website',
    title: 'Website & Signups',
    description: 'Beta signup funnel from potteryfriends.com with PostHog traffic and platform breakdown.',
  },
]

export default function ArchivePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Archived Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Full-detail legacy reports from before the KPI dashboard restructure
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {archivedReports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
            <p className="text-sm text-gray-500 mt-2">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
