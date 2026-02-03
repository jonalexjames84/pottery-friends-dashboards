'use client'

export function EarlyDataBanner({ totalUsers }: { totalUsers: number }) {
  if (totalUsers >= 100) return null

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
      <span className="text-amber-500">*</span>
      <span>Directional data ({totalUsers} users) — metrics become more reliable at 100+ users</span>
    </div>
  )
}

export function DirectionalFlag({ sampleSize }: { sampleSize: number }) {
  if (sampleSize >= 100) return null

  return (
    <span className="text-amber-500 ml-1" title={`Based on ${sampleSize} users - directional only`}>*</span>
  )
}

export function EmptyStateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="mx-auto h-10 w-10 text-gray-400 mb-2">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
