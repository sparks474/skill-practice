import type { Keybinds } from '../types'
import { SKILLS } from './skills'

/** よく使うアクション向けの初期キー配置 */
const PRESET: Keybinds = {
  heated_split_shot: { key: '1' },
  heated_slug_shot: { key: '2' },
  heated_clean_shot: { key: '3' },
  drill: { key: '4' },
  air_anchor: { key: '5' },
  chain_saw: { key: '6' },
  excavator: { key: '7' },
  blazing_shot: { key: 'f' },
  full_metal_burst: { key: 'g' },
  reassemble: { key: 'q' },
  hypercharge: { key: 'c' },
  barrel_stabilizer: { key: 'v' },
  wildfire: { key: 'r' },
  double_check: { key: 'e' },
  checkmate: { key: 't' },
  automaton_queen: { key: 'x' },
}

export function createDefaultKeybinds(): Keybinds {
  const binds: Keybinds = {}
  for (const skill of SKILLS) {
    binds[skill.id] = PRESET[skill.id]
      ? { ...PRESET[skill.id] }
      : { mouse: true }
  }
  return binds
}
