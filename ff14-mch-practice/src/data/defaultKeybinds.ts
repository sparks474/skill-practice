import type { JobId, Keybinds } from '../types'
import { getSkillsForJob } from './skills'
import { DEFAULT_SWAP_PAIRS } from './skillSlots'

/** よく使うアクション向けの初期キー配置（機工） */
const MCH_PRESET: Keybinds = {
  heated_split_shot: { key: '1' },
  heated_slug_shot: { key: '2' },
  heated_clean_shot: { key: '3' },
  drill: { key: '4' },
  air_anchor: { key: '5' },
  chain_saw: { key: '6' },
  blazing_shot: { key: 'f' },
  reassemble: { key: 'q' },
  hypercharge: { key: 'c' },
  barrel_stabilizer: { key: 'v' },
  wildfire: { key: 'r' },
  double_check: { key: 'e' },
  checkmate: { key: 't' },
  automaton_queen: { key: 'x' },
}

const PRESETS: Partial<Record<JobId, Keybinds>> = {
  MCH: MCH_PRESET,
}

export function createDefaultKeybinds(jobId: JobId = 'MCH'): Keybinds {
  const skills = getSkillsForJob(jobId)
  const preset = PRESETS[jobId] ?? {}
  const binds: Keybinds = {}
  for (const skill of skills) {
    binds[skill.id] = preset[skill.id]
      ? { ...preset[skill.id] }
      : { mouse: true }
  }

  if (jobId === 'MCH') {
    for (const [a, b] of DEFAULT_SWAP_PAIRS) {
      if (!binds[a] || !binds[b]) continue
      const sharedKey = binds[a]?.key ?? binds[b]?.key
      binds[a] = {
        ...binds[a],
        swapWith: b,
        key: sharedKey,
        mouse: binds[a]?.mouse ?? true,
      }
      binds[b] = {
        ...binds[b],
        swapWith: a,
        key: sharedKey,
        mouse: binds[b]?.mouse ?? binds[a]?.mouse ?? true,
      }
    }
  }

  return binds
}
