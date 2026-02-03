'use client'

export function EarlyDataBanner({ totalUsers }: { totalUsers: number }) {
  if (totalUsers >= 100) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-800">Early Stage Data</h3>
          <p className="text-xs sm:text-sm text-blue-700 mt-1">
            You have <strong>{totalUsers}</strong> users so far. These metrics will become more reliable as your community grows.
            We recommend waiting until you have 100+ users before making major product decisions based on this data.
          </p>
        </div>
      </div>
    </div>
  )
}

export function EmptyStateCard({
  title,
  description,
  actionText,
  actionHref
}: {
  title: string
  description: string
  actionText?: string
  actionHref?: string
}) {
  return (
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      {actionText && actionHref && (
        <a
          href={actionHref}
          className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          {actionText}
          <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  )
}

export function SampleDataIndicator({ isSampleData }: { isSampleData: boolean }) {
  if (!isSampleData) return null

  return (
    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-2">
      Sample Data
    </span>
  )
}
