import type { Keybinds, MovementKeys } from '../types'
import { getSwapPartner } from '../data/skillSlots'

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
  if (key === 'arrowup') return '↑'
  if (key === 'arrowdown') return '↓'
  if (key === 'arrowleft') return '←'
  if (key === 'arrowright') return '→'
  if (key.length === 1) return key.toUpperCase()
  return key
}

export function isMovementKey(
  movement: MovementKeys,
  key: string,
): boolean {
  const normalized = key.toLowerCase()
  return (
    movement.up?.toLowerCase() === normalized ||
    movement.down?.toLowerCase() === normalized ||
    movement.left?.toLowerCase() === normalized ||
    movement.right?.toLowerCase() === normalized
  )
}

/**
 * keybinds から skillId を逆引き。
 * 置き換えペアがある場合は activeBySlot の現在スキルを返す。
 */
export function skillIdForKey(
  keybinds: Keybinds,
  key: string,
  activeBySlot?: Record<string, string>,
): string | null {
  const normalized = key.toLowerCase()
  for (const [skillId, bind] of Object.entries(keybinds)) {
    if (bind.unused) continue
    if (!bind.key || bind.key.toLowerCase() !== normalized) continue

    const partner = getSwapPartner(keybinds, skillId)
    if (!partner || !activeBySlot) return skillId

    const slot = [skillId, partner].sort().join('|')
    return activeBySlot[slot] ?? skillId
  }
  return null
}
