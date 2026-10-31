/** Thin, failure-tolerant wrappers around the Web Speech and Vibration APIs. */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export const vibrationSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'en-IN') || voices.find((v) => v.lang?.startsWith('en')) || null
}

/**
 * Speak text, replacing anything currently being read.
 * Browsers may block speech until the user has interacted with the page,
 * which is why every alert also has a manual "Read aloud" button.
 */
export function speak(text, { rate = 0.95 } = {}) {
  if (!speechSupported() || !text) return false
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = rate
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    synth.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

// Long-short-long pattern, distinguishable from ordinary notification buzzes
export const EMERGENCY_VIBRATION = [500, 200, 500, 200, 900]

export function vibrate(pattern = EMERGENCY_VIBRATION) {
  if (!vibrationSupported()) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}
