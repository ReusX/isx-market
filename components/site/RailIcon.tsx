import type { RailIcon as Name } from './rails'
import { InkIcon } from './InkIcon'

/* The rail draws from the shared ink set (inkIcons.ts); rail names match the
   set's keys one for one. */
export function RailIcon({ name }: { name: Name }) {
  return <InkIcon name={name} size={18} className="iqr-ico" />
}
