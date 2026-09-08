import type { Keybinds } from '../types'

/** 初期の置き換えペア（先頭が表示初期） */
export const DEFAULT_SWAP_PAIRS: readonly [string, string][] = [
  ['chain_saw', 'excavator'],
  ['barrel_stabilizer', 'full_metal_burst'],
  ['apex_arrow', 'blast_arrow'],
]

export function slotIdFor(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function getSwapPartner(
  keybinds: Keybinds,
  skillId: string,
): string | undefined {
  const partner = keybinds[skillId]?.swapWith
  if (!partner) return undefined
  // 双方向でなければ無効扱い
  if (keybinds[partner]?.swapWith !== skillId) return undefined
  return partner
}

/** キー表示用。自分に無ければ置き換え相手のキーを使う */
export function effectiveKey(
  keybinds: Keybinds,
  skillId: string,
): string | undefined {
  const own = keybinds[skillId]?.key
  if (own) return own
  const partner = getSwapPartner(keybinds, skillId)
  if (partner) return keybinds[partner]?.key
  return undefined
}

/**
 * 置き換えペアを設定する（相互リンク）。
 * 既存の相手は解除する。partnerId が空なら解除のみ。
 */
export function setSwapPartner(
  keybinds: Keybinds,
  skillId: string,
  partnerId: string | undefined,
): Keybinds {
  const next: Keybinds = { ...keybinds }
  const ensure = (id: string) => {
    next[id] = { ...next[id] }
  }

  ensure(skillId)
  const prev = next[skillId].swapWith
  if (prev && next[prev]?.swapWith === skillId) {
    ensure(prev)
    next[prev] = { ...next[prev], swapWith: undefined }
  }

  if (!partnerId || partnerId === skillId) {
    next[skillId] = { ...next[skillId], swapWith: undefined }
    return next
  }

  ensure(partnerId)
  const partnerPrev = next[partnerId].swapWith
  if (partnerPrev && partnerPrev !== skillId && next[partnerPrev]) {
    ensure(partnerPrev)
    next[partnerPrev] = { ...next[partnerPrev], swapWith: undefined }
  }

  // キーは skillId 側を優先して共有
  const sharedKey = next[skillId].key ?? next[partnerId].key
  next[skillId] = {
    ...next[skillId],
    swapWith: partnerId,
    key: sharedKey,
  }
  next[partnerId] = {
    ...next[partnerId],
    swapWith: skillId,
    key: sharedKey,
  }
  return next
}

/** キー変更時、置き換え相手にも同じキーを載せる */
export function assignKey(
  keybinds: Keybinds,
  skillId: string,
  key: string | undefined,
): Keybinds {
  const next: Keybinds = { ...keybinds }
  // 他スキルから同じキーを外す（置き換え相手は後で戻す）
  const partner = getSwapPartner(keybinds, skillId)
  for (const id of Object.keys(next)) {
    if (id === skillId || id === partner) continue
    if (next[id]?.key === key) {
      next[id] = { ...next[id], key: undefined }
    }
  }
  next[skillId] = { ...next[skillId], key }
  if (partner) {
    next[partner] = { ...next[partner], key }
  }
  return next
}

export function createInitialSwapActive(keybinds: Keybinds): Record<string, string> {
  const active: Record<string, string> = {}
  const seen = new Set<string>()
  for (const [a, b] of DEFAULT_SWAP_PAIRS) {
    if (getSwapPartner(keybinds, a) === b) {
      const slot = slotIdFor(a, b)
      active[slot] = a
      seen.add(a)
      seen.add(b)
    }
  }
  for (const [id, bind] of Object.entries(keybinds)) {
    if (!bind.swapWith || seen.has(id)) continue
    if (getSwapPartner(keybinds, id) !== bind.swapWith) continue
    const slot = slotIdFor(id, bind.swapWith)
    if (active[slot]) continue
    // 辞書順で先の方を初期表示
    active[slot] = [id, bind.swapWith].sort()[0]
    seen.add(id)
    seen.add(bind.swapWith)
  }
  return active
}

/** 成功発動後: 撃ったスキルの枠を相手に切り替える */
export function afterSuccessfulCast(
  active: Record<string, string>,
  castSkillId: string,
  keybinds: Keybinds,
): Record<string, string> {
  const partner = getSwapPartner(keybinds, castSkillId)
  if (!partner) return active
  const slot = slotIdFor(castSkillId, partner)
  return { ...active, [slot]: partner }
}
