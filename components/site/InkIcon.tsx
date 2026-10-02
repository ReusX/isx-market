import { INK_ICONS, type InkIconName } from './inkIcons'

/** One icon from the IQWealth ink set, tinted by currentColor. */
export function InkIcon({ name, size = 18, className }: { name: InkIconName; size?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: INK_ICONS[name] }} />
  )
}
