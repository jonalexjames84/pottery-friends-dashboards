'use client'

interface DateRangeSelectProps {
  value: string
  onChange: (value: string) => void
}

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    >
      <option value="7">Last 7 Days</option>
      <option value="14">Last 14 Days</option>
      <option value="30">Last 30 Days</option>
      <option value="90">Last 90 Days</option>
    </select>
  )
}
