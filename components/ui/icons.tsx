// Shared SVG icon set — no emojis

import type { CSSProperties } from 'react'

type IconProps = {
  size?: number
  className?: string
  style?: CSSProperties
}

export function FlameIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M8 1C8 1 13 4.5 13 9a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S4.5 8 7 8c2 0 2.5-2 2.5-4S8 1 8 1Z" />
      <path d="M8 7c0 0 1.5 1.5 1.5 3A1.5 1.5 0 0 1 6.5 10c0-1 .5-1.5.5-1.5S7 10 8 10s0-1.5 0-3Z" opacity=".5" />
    </svg>
  )
}

export function TargetIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} style={style} aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TrophyIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M4 2h8v5a4 4 0 0 1-8 0V2Z" />
      <path d="M4 5H2a2 2 0 0 0 2 2" />
      <path d="M12 5h2a2 2 0 0 1-2 2" />
      <path d="M8 11v2" />
      <path d="M5.5 14h5" />
    </svg>
  )
}

export function BotIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <rect x="2" y="5" width="12" height="9" rx="2" />
      <circle cx="5.5" cy="9.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="9.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M6 12h4" />
      <path d="M8 5V3" />
      <path d="M5.5 3h5" />
    </svg>
  )
}

export function BarChartIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M2 13V8" />
      <path d="M5.5 13V4" />
      <path d="M9 13V6" />
      <path d="M12.5 13V9" />
    </svg>
  )
}

export function HomeIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M2 7.5L8 2l6 5.5V14a1 1 0 0 1-1 1H9.5v-4.5h-3V15H3a1 1 0 0 1-1-1V7.5Z" />
    </svg>
  )
}

export function CalendarIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M5 2v2" />
      <path d="M11 2v2" />
      <path d="M2 7h12" />
    </svg>
  )
}

export function SettingsIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M13.2 9.6a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 1 1-1.7 1.7l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.92V13a1.2 1.2 0 0 1-2.4 0v-.05a1 1 0 0 0-.65-.92 1 1 0 0 0-1.1.2l-.03.04a1.2 1.2 0 1 1-1.7-1.7l.04-.03a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H3a1.2 1.2 0 0 1 0-2.4h.05a1 1 0 0 0 .92-.65 1 1 0 0 0-.2-1.1l-.04-.03a1.2 1.2 0 1 1 1.7-1.7l.03.04a1 1 0 0 0 1.1.2h.05a1 1 0 0 0 .59-.92V3a1.2 1.2 0 0 1 2.4 0v.05a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.03-.04a1.2 1.2 0 1 1 1.7 1.7l-.04.03a1 1 0 0 0-.2 1.1v.05a1 1 0 0 0 .92.6H13a1.2 1.2 0 0 1 0 2.4h-.05a1 1 0 0 0-.92.6Z" />
    </svg>
  )
}

export function BoltIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M9.5 1.5 4 9h5l-2.5 5.5L14 7H9l.5-5.5Z" />
    </svg>
  )
}

export function CheckIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M2 7l3.5 3.5L12 3" />
    </svg>
  )
}

export function StarFilledIcon({ size = 12, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M6 1l1.35 2.73L10.5 4.27l-2.25 2.19.53 3.09L6 8l-2.78 1.55.53-3.09L1.5 4.27l3.15-.54L6 1Z" />
    </svg>
  )
}

export function StarEmptyIcon({ size = 12, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" className={className} style={style} aria-hidden="true">
      <path d="M6 1l1.35 2.73L10.5 4.27l-2.25 2.19.53 3.09L6 8l-2.78 1.55.53-3.09L1.5 4.27l3.15-.54L6 1Z" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M3 5l4 4 4-4" />
    </svg>
  )
}

export function CloseIcon({ size = 13, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style} aria-hidden="true">
      <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" />
    </svg>
  )
}

export function SendIcon({ size = 15, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M13.5 1.5 6.5 13 4 8 1 5.5l12.5-4Z" />
      <path d="M13.5 1.5 4 8" />
    </svg>
  )
}

export function MicIcon({ size = 15, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M7.5 1.5a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0V4a2.5 2.5 0 0 0-2.5-2.5Z" />
      <path d="M12.5 7.5v1a5 5 0 0 1-10 0v-1" />
      <line x1="7.5" y1="13.5" x2="7.5" y2="15" />
    </svg>
  )
}

export function DocumentIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9.5 2Z" />
      <path d="M9.5 2v4h4" />
      <path d="M5 9h6" />
      <path d="M5 11.5h4" />
    </svg>
  )
}

export function ShareIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <circle cx="12.5" cy="3" r="1.5" />
      <circle cx="3.5" cy="8" r="1.5" />
      <circle cx="12.5" cy="13" r="1.5" />
      <path d="M5 7.2l5.5-3.3" />
      <path d="M5 8.8l5.5 3.3" />
    </svg>
  )
}

export function SpinnerIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" opacity=".15" />
      <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M13 8H3" />
      <path d="M7 4L3 8l4 4" />
    </svg>
  )
}

export function AdminIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M8 2L3 5v3c0 3 2.5 5.5 5 6 2.5-.5 5-3 5-6V5L8 2Z" />
    </svg>
  )
}

export function AwardBadgeIcon({ size = 40, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <circle cx="20" cy="16" r="10" />
      <circle cx="20" cy="16" r="5" />
      <path d="M14 26l-4 10 10-5 10 5-4-10" />
    </svg>
  )
}

export function PilihMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 1.5C9 1.5 14 5.5 14 9.5a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S5.5 9 8 9c2 0 2.5-2 2.5-4S9 1.5 9 1.5Z" fill="var(--accent)" />
      <path d="M9 7.5c0 0 1.5 1.5 1.5 3a1.5 1.5 0 0 1-3 0c0-1 .5-1.5.5-1.5S8 11 9 11s0-1.5 0-3Z" fill="var(--accent)" opacity=".4" />
    </svg>
  )
}
