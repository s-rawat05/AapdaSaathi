/**
 * Alert presentation rules shared by every alert view.
 * Stored severities follow CAP (used by NDMA SACHET); residents see Low/Moderate/High/Extreme.
 */

export const SEVERITY = {
  MINOR: { label: 'Low', badge: 'bg-green-700 text-white', bar: 'bg-green-600', ring: 'border-green-600' },
  MODERATE: { label: 'Moderate', badge: 'bg-yellow-300 text-yellow-950', bar: 'bg-yellow-400', ring: 'border-yellow-400' },
  SEVERE: { label: 'High', badge: 'bg-orange-600 text-white', bar: 'bg-orange-500', ring: 'border-orange-500' },
  EXTREME: { label: 'Extreme', badge: 'bg-red-700 text-white', bar: 'bg-red-600', ring: 'border-red-600' },
}

export const severityOf = (value) => SEVERITY[value] ?? SEVERITY.MODERATE

export const RESPONSE_STATUS = {
  SAFE: { label: 'You marked yourself safe', short: 'Safe', classes: 'bg-green-100 text-green-800 border-green-300' },
  NEEDS_HELP: { label: 'You asked for help', short: 'Needs help', classes: 'bg-red-100 text-red-800 border-red-300' },
  NO_RESPONSE: { label: 'You have not responded yet', short: 'No response', classes: 'bg-slate-100 text-slate-700 border-slate-300' },
}

const firstSentence = (text) => (text ? text.split(/(?<=[.!?])\s/)[0] : '')

/** Text read out by the voice alert. Simulated alerts always say so first. */
export function buildAlertSpeech(alert, simpleLanguage) {
  const intro = alert.is_official ? 'Official emergency alert.' : 'Practice alert. This is a simulated demo, not an official warning.'
  const severity = severityOf(alert.severity).label

  if (simpleLanguage) {
    const todo = firstSentence(alert.instructions) || firstSentence(alert.description)
    return `${intro} ${alert.disaster_type} danger near ${alert.affected_location}. What to do: ${todo} Please tell us if you are safe.`
  }
  const instructions = alert.instructions ? ` Official instructions: ${alert.instructions}` : ''
  return `${intro} ${severity} severity ${alert.disaster_type} alert. ${alert.event_name}. Area: ${alert.affected_location}. ${alert.description}${instructions} Please respond: I am safe, or I need help.`
}
