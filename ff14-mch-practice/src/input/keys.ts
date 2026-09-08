import type { Keybinds, MovementKeys } from '../types'
import { getSwapPartner, slotIdFor } from '../data/skillSlots'

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
 * - 同じキーの置き換えペアでは expected を優先（次表示と一致させる）
 * - それ以外はホットバーの現在表示（activeBySlot）を返す
 */
export function skillIdForKey(
  keybinds: Keybinds,
  key: string,
  activeBySlot?: Record<string, string>,
  expectedSkillId?: string | null,
): string | null {
  const normalized = key.toLowerCase()
  const matches: string[] = []
  for (const [skillId, bind] of Object.entries(keybinds)) {
    if (bind.unused) continue
    if (!bind.key || bind.key.toLowerCase() !== normalized) continue
    matches.push(skillId)
  }
  if (matches.length === 0) return null

  if (expectedSkillId) {
    for (const id of matches) {
      if (id === expectedSkillId) return expectedSkillId
      const partner = getSwapPartner(keybinds, id)
      if (partner === expectedSkillId) return expectedSkillId
    }
  }

  const skillId = matches[0]
  const partner = getSwapPartner(keybinds, skillId)
  if (!partner || !activeBySlot) return skillId

  const slot = slotIdFor(skillId, partner)
  return activeBySlot[slot] ?? skillId
}
