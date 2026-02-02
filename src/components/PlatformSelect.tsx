'use client'

interface PlatformSelectProps {
  value: string
  onChange: (value: string) => void
}

export function PlatformSelect({ value, onChange }: PlatformSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    >
      <option value="All">All Platforms</option>
      <option value="iOS">iOS</option>
      <option value="Android">Android</option>
      <option value="Web">Web</option>
    </select>
  )
}
