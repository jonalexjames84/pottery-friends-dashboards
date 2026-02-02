import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Pottery Friends Dashboards
      </h1>

      <p className="text-gray-600 mb-8">
        Welcome to the Pottery Friends analytics dashboard. Select a dashboard below to view metrics.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/impressions"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Impressions & Installs
          </h2>
          <p className="text-gray-600 text-sm">
            Track app impressions and install conversion rates across platforms.
          </p>
        </Link>

        <Link
          href="/funnel"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            User Funnel
          </h2>
          <p className="text-gray-600 text-sm">
            Analyze first-time user experience and conversion rates.
          </p>
        </Link>

        <Link
          href="/retention"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Retention
          </h2>
          <p className="text-gray-600 text-sm">
            Monitor D1-D7 retention rates and cohort analysis.
          </p>
        </Link>
      </div>

      {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Supabase credentials not configured. Dashboards will display sample data.
            Set <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> environment variables.
          </p>
        </div>
      )}
    </div>
  )
}
