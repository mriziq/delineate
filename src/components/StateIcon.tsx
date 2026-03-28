/**
 * SVG icon for Linear workflow states.
 * Renders state-specific icons: dashed circle (backlog), empty circle (unstarted),
 * half-filled circle (started), checkmark circle (completed), cancelled circle.
 */
interface Props {
  type: string
  color: string
  size?: number
}

export default function StateIcon({ type, color, size = 14 }: Props) {
  const t = type.toLowerCase()

  if (t === 'backlog') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" strokeDasharray="2.5 2.5" />
      </svg>
    )
  }

  if (t === 'unstarted') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
      </svg>
    )
  }

  if (t === 'started') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
        <path d="M7 1.5 A5.5 5.5 0 0 1 7 12.5" fill={color} />
      </svg>
    )
  }

  if (t === 'completed') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" fill={color} stroke={color} strokeWidth="1.5" />
        <path d="M4.5 7l2 2 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }

  if (t === 'cancelled' || t === 'canceled') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  // Fallback: simple filled dot
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" fill={color} />
    </svg>
  )
}
