import { createDefaultKeybinds } from './data/defaultKeybinds'
import { SAMPLE_ROTATION } from './data/sampleRotation'
import {
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  type Keybinds,
  type Rotation,
} from './types'

const ROTATIONS_KEY = 'ff14-mch-rotations'
const KEYBINDS_KEY = 'ff14-mch-keybinds'
const CONFIG_KEY = 'ff14-mch-config'

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadRotations(): Rotation[] {
  if (!canUseStorage()) return [cloneSample()]
  try {
    const raw = localStorage.getItem(ROTATIONS_KEY)
    if (!raw) {
      const initial = [cloneSample()]
      saveRotations(initial)
      return initial
    }
    const parsed = JSON.parse(raw) as Rotation[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [cloneSample()]
      saveRotations(initial)
      return initial
    }
    // サンプルが消えていたら先頭に戻す
    if (!parsed.some((r) => r.isSample || r.id === SAMPLE_ROTATION.id)) {
      return [cloneSample(), ...parsed]
    }
    return parsed
  } catch {
    return [cloneSample()]
  }
}

export function saveRotations(rotations: Rotation[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(ROTATIONS_KEY, JSON.stringify(rotations))
}

export function loadKeybinds(): Keybinds {
  if (!canUseStorage()) return createDefaultKeybinds()
  try {
    const raw = localStorage.getItem(KEYBINDS_KEY)
    if (!raw) {
      const defaults = createDefaultKeybinds()
      saveKeybinds(defaults)
      return defaults
    }
    return { ...createDefaultKeybinds(), ...(JSON.parse(raw) as Keybinds) }
  } catch {
    return createDefaultKeybinds()
  }
}

export function saveKeybinds(keybinds: Keybinds): void {
  if (!canUseStorage()) return
  localStorage.setItem(KEYBINDS_KEY, JSON.stringify(keybinds))
}

export function loadConfig(): EngineConfig {
  if (!canUseStorage()) return { ...DEFAULT_ENGINE_CONFIG }
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) {
      const defaults = { ...DEFAULT_ENGINE_CONFIG }
      saveConfig(defaults)
      return defaults
    }
    return { ...DEFAULT_ENGINE_CONFIG, ...(JSON.parse(raw) as EngineConfig) }
  } catch {
    return { ...DEFAULT_ENGINE_CONFIG }
  }
}

export function saveConfig(config: EngineConfig): void {
  if (!canUseStorage()) return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function cloneSample(): Rotation {
  return {
    ...SAMPLE_ROTATION,
    initialGauges: { ...SAMPLE_ROTATION.initialGauges },
    steps: SAMPLE_ROTATION.steps.map((s) => ({ ...s })),
    updatedAt: Date.now(),
  }
}

export function createEmptyRotation(name = '新しい回し'): Rotation {
  return {
    id: `rot-${crypto.randomUUID()}`,
    name,
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 0 },
    steps: [],
    updatedAt: Date.now(),
  }
}
