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

/** 吟遊詩人向けの初期キー配置 */
const BRD_PRESET: Keybinds = {
  burst_shot: { key: '1' },
  caustic_bite: { key: '2' },
  stormbite: { key: '3' },
  iron_jaws: { key: '4' },
  apex_arrow: { key: '5' },
  resonance_arrow: { key: '6' },
  radiant_encore: { key: '7' },
  refulgent_arrow: { key: 'f' },
  heartbreak_shot: { key: 'e' },
  empyreal_arrow: { key: 't' },
  sidewinder: { key: 'g' },
  pitch_perfect: { key: 'r' },
  the_wanderers_minuet: { key: 'q' },
  mages_ballad: { key: '8' },
  armys_paeon: { key: '9' },
  barrage: { key: 'c' },
  raging_strikes: { key: 'v' },
  battle_voice: { key: 'b' },
  radiant_finale: { key: 'x' },
  potion: { key: 'z' },
}

/** 踊り子向けの初期キー配置 */
const DNC_PRESET: Keybinds = {
  cascade: { key: '1' },
  fountain: { key: '2' },
  reverse_cascade: { key: '3' },
  fountainfall: { key: '4' },
  saber_dance: { key: '5' },
  last_dance: { key: '6' },
  starfall_dance: { key: '7' },
  standard_step: { key: 'q' },
  technical_step: { key: 'e' },
  flourish: { key: 'r' },
  devilment: { key: 't' },
  fan_dance: { key: 'f' },
  fan_dance_iii: { key: 'g' },
  fan_dance_iv: { key: 'b' },
  shield_samba: { key: 'c' },
  curing_waltz: { key: 'v' },
  potion: { key: 'z' },
}

const PRESETS: Partial<Record<JobId, Keybinds>> = {
  MCH: MCH_PRESET,
  BRD: BRD_PRESET,
  DNC: DNC_PRESET,
}

const SWAP_JOBS: JobId[] = ['MCH', 'BRD', 'DNC']

export function createDefaultKeybinds(jobId: JobId = 'MCH'): Keybinds {
  const skills = getSkillsForJob(jobId)
  const preset = PRESETS[jobId] ?? {}
  const binds: Keybinds = {}
  for (const skill of skills) {
    binds[skill.id] = preset[skill.id]
      ? { ...preset[skill.id] }
      : { mouse: true }
  }

  if (SWAP_JOBS.includes(jobId)) {
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
