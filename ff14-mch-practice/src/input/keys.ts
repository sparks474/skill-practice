/** KeyboardEvent から保存用のキー文字列を正規化 */
export function normalizeKeyEvent(e: KeyboardEvent): string {
  const key = e.key
  if (key === ' ') return 'space'
  if (key.length === 1) return key.toLowerCase()
  return key.toLowerCase()
}

export function formatKeyLabel(key: string | undefined): string {
  if (!key) return '—'
  if (key === 'space') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  return key
}

/** keybinds から skillId を逆引き */
export function skillIdForKey(
  keybinds: Record<string, { key?: string; mouse?: boolean }>,
  key: string,
): string | null {
  const normalized = key.toLowerCase()
  for (const [skillId, bind] of Object.entries(keybinds)) {
    if (bind.key && bind.key.toLowerCase() === normalized) return skillId
  }
  return null
}
