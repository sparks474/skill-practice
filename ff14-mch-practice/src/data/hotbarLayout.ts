import { DEFAULT_SWAP_PAIRS, getSwapPartner } from './skillSlots'
import type { HotbarLayout, JobId, Keybinds } from '../types'

export const HOTBAR_COLS = 12
export const HOTBAR_ROWS_DEFAULT = 2

/** 初期ホットバーに載せるスキル（置き換えペアは代表 ID のみ） */
export const DEFAULT_HOTBAR_SKILL_IDS = [
  'reassemble',
  'potion',
  'air_anchor',
  'drill',
  'chain_saw',
  'double_check',
  'checkmate',
  'barrel_stabilizer',
  'wildfire',
  'hypercharge',
  'blazing_shot',
  'automaton_queen',
  'heated_split_shot',
  'heated_slug_shot',
  'heated_clean_shot',
] as const

const DEFAULT_HOTBAR_BY_JOB: Partial<Record<JobId, readonly string[]>> = {
  MCH: DEFAULT_HOTBAR_SKILL_IDS,
  BRD: [
    'the_wanderers_minuet',
    'raging_strikes',
    'battle_voice',
    'radiant_finale',
    'barrage',
    'empyreal_arrow',
    'sidewinder',
    'heartbreak_shot',
    'pitch_perfect',
    'apex_arrow',
    'resonance_arrow',
    'radiant_encore',
    'burst_shot',
    'caustic_bite',
    'stormbite',
    'iron_jaws',
    'refulgent_arrow',
    'potion',
  ],
}

export function createDefaultHotbarLayout(jobId: JobId = 'MCH'): HotbarLayout {
  const cols = HOTBAR_COLS
  const rows = HOTBAR_ROWS_DEFAULT
  const slots: (string | null)[] = Array.from(
    { length: cols * rows },
    () => null,
  )
  const ids = DEFAULT_HOTBAR_BY_JOB[jobId] ?? []
  ids.forEach((id, i) => {
    if (i < slots.length) slots[i] = id
  })
  return { cols, rows, slots }
}

/** 置き換えペアは代表 ID（DEFAULT_SWAP_PAIRS の先頭、なければ辞書順）に正規化 */
export function canonicalHotbarSkillId(
  skillId: string,
  keybinds: Keybinds,
): string {
  const partner = getSwapPartner(keybinds, skillId)
  if (!partner) return skillId
  for (const [a, b] of DEFAULT_SWAP_PAIRS) {
    if (
      (a === skillId && b === partner) ||
      (b === skillId && a === partner)
    ) {
      return a
    }
  }
  return [skillId, partner].sort()[0]
}

export function normalizeHotbarLayout(
  layout: HotbarLayout,
  keybinds: Keybinds,
): HotbarLayout {
  const size = layout.cols * layout.rows
  const slots = layout.slots.slice(0, size)
  while (slots.length < size) slots.push(null)

  const seen = new Set<string>()
  const normalized = slots.map((id) => {
    if (!id) return null
    const canon = canonicalHotbarSkillId(id, keybinds)
    if (seen.has(canon)) return null
    if (keybinds[canon]?.unused) return null
    seen.add(canon)
    return canon
  })

  return { cols: layout.cols, rows: layout.rows, slots: normalized }
}

export function placeOnHotbar(
  layout: HotbarLayout,
  toIndex: number,
  skillId: string,
  fromIndex: number | null,
  keybinds: Keybinds,
): HotbarLayout {
  const slots = layout.slots.slice()
  const canon = canonicalHotbarSkillId(skillId, keybinds)
  if (toIndex < 0 || toIndex >= slots.length) return layout

  // パレットから／別セルから：既存の同じスキル位置を空ける
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === canon && i !== fromIndex) slots[i] = null
  }

  if (fromIndex != null && fromIndex >= 0 && fromIndex < slots.length) {
    const displaced = slots[toIndex]
    slots[toIndex] = canon
    slots[fromIndex] = displaced === canon ? null : displaced
  } else {
    slots[toIndex] = canon
  }

  return { ...layout, slots }
}

export function clearHotbarSlot(
  layout: HotbarLayout,
  index: number,
): HotbarLayout {
  const slots = layout.slots.slice()
  if (index < 0 || index >= slots.length) return layout
  slots[index] = null
  return { ...layout, slots }
}

export function resizeHotbarRows(
  layout: HotbarLayout,
  rows: number,
): HotbarLayout {
  const nextRows = Math.max(1, Math.min(6, rows))
  const size = layout.cols * nextRows
  const slots = layout.slots.slice(0, size)
  while (slots.length < size) slots.push(null)
  return { cols: layout.cols, rows: nextRows, slots }
}

export function resizeHotbarCols(
  layout: HotbarLayout,
  cols: number,
): HotbarLayout {
  const nextCols = Math.max(4, Math.min(16, cols))
  if (nextCols === layout.cols) return layout

  const { rows, cols: oldCols, slots } = layout
  const next: (string | null)[] = Array.from(
    { length: nextCols * rows },
    () => null,
  )
  const overflow: string[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < oldCols; c++) {
      const id = slots[r * oldCols + c]
      if (!id) continue
      if (c < nextCols) {
        next[r * nextCols + c] = id
      } else {
        overflow.push(id)
      }
    }
  }

  for (const id of overflow) {
    const empty = next.findIndex((s) => s == null)
    if (empty >= 0) next[empty] = id
  }

  return { cols: nextCols, rows, slots: next }
}
