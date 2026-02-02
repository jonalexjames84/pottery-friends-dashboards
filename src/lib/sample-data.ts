// Sample data generators for when Supabase is not configured

export function generateSampleImpressions(startDate: Date, endDate: Date) {
  const data = []
  const current = new Date(startDate)
  let dayIndex = 0

  while (current <= endDate) {
    const platforms = ['iOS', 'Android', 'Web'] as const
    for (const platform of platforms) {
      data.push({
        id: `imp-${dayIndex}-${platform}`,
        created_at: current.toISOString(),
        platform,
        count: Math.floor(800 + dayIndex * 20 + Math.random() * 200),
      })
    }
    current.setDate(current.getDate() + 1)
    dayIndex++
  }

  return data
}

export function generateSampleInstalls(startDate: Date, endDate: Date) {
  const data = []
  const current = new Date(startDate)
  let dayIndex = 0

  while (current <= endDate) {
    const platforms = ['iOS', 'Android', 'Web'] as const
    for (const platform of platforms) {
      data.push({
        id: `inst-${dayIndex}-${platform}`,
        created_at: current.toISOString(),
        platform,
        count: Math.floor(80 + dayIndex * 2 + Math.random() * 20),
      })
    }
    current.setDate(current.getDate() + 1)
    dayIndex++
  }

  return data
}

export function generateSampleFunnelEvents() {
  const events = []
  const eventTypes = ['app_open', 'sign_up', 'onboarding_complete', 'first_action'] as const
  const dropOffRates = [1, 0.7, 0.5, 0.35] // Percentage of users reaching each stage

  for (let userId = 0; userId < 100; userId++) {
    for (let i = 0; i < eventTypes.length; i++) {
      if (Math.random() < dropOffRates[i]) {
        events.push({
          id: `evt-${userId}-${i}`,
          user_id: `user-${userId}`,
          event_type: eventTypes[i],
          created_at: new Date().toISOString(),
        })
      } else {
        break
      }
    }
  }

  return events
}

export function generateSampleRetentionData(numWeeks: number) {
  const baseRetention = [100, 45, 35, 30, 27, 25, 23, 22]
  const cohorts = []

  for (let week = 0; week < numWeeks; week++) {
    const weekData = {
      cohort: `Week ${week + 1}`,
      cohortSize: Math.floor(500 + Math.random() * 1500),
      retention: baseRetention.map((base, dayIndex) => {
        const variance = (Math.random() - 0.5) * 6
        const weekBonus = (numWeeks - week - 1) * 0.5
        return Math.max(0, Math.min(100, base + variance + weekBonus))
      }),
    }
    cohorts.push(weekData)
  }

  return cohorts
}
