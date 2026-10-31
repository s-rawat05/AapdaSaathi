import ToggleSwitch from '../ToggleSwitch'
import { speechSupported, vibrationSupported } from '../../utils/accessibility'

/** The four alert-delivery toggles, shared by the profile and settings pages. */
export default function AlertPreferences({ values, onChange, disabled }) {
  const set = (key) => (checked) => onChange({ ...values, [key]: checked })
  return (
    <div className="divide-y divide-slate-200">
      <ToggleSwitch
        label="Voice alerts"
        description="Read new emergency alerts out loud."
        checked={values.voice_alerts_enabled}
        onChange={set('voice_alerts_enabled')}
        disabled={disabled}
        note={speechSupported() ? null : 'This browser does not support voice output.'}
      />
      <ToggleSwitch
        label="Visual alerts"
        description="Flash the screen border when a new alert arrives."
        checked={values.visual_alerts_enabled}
        onChange={set('visual_alerts_enabled')}
        disabled={disabled}
      />
      <ToggleSwitch
        label="Vibration"
        description="Vibrate the phone for new alerts."
        checked={values.vibration_enabled}
        onChange={set('vibration_enabled')}
        disabled={disabled}
        note={vibrationSupported() ? null : 'Vibration is not supported on this device or browser (for example iPhone Safari).'}
      />
      <ToggleSwitch
        label="Simple language"
        description="Use short, simple sentences when alerts are read aloud."
        checked={values.simple_language_enabled}
        onChange={set('simple_language_enabled')}
        disabled={disabled}
      />
    </div>
  )
}
