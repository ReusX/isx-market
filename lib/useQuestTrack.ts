import { useEffect } from 'react'

/**
 * Fire-and-forget: silently complete a quest when the component mounts.
 * Only runs once per mount; the server enforces the daily/one-time limit.
 */
export function useQuestTrack(questId: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    fetch('/api/quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId }),
    }).catch(() => {/* silent */})
  }, [questId, enabled]) // eslint-disable-line react-hooks/exhaustive-deps
}
