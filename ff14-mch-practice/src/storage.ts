import { createDefaultKeybinds } from './data/defaultKeybinds'
import { createDefaultHotbarLayout, normalizeHotbarLayout } from './data/hotbarLayout'
import { SAMPLE_ROTATION } from './data/sampleRotation'
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_MOVEMENT_KEYS,
  type EngineConfig,
  type HotbarLayout,
  type Keybinds,
  type MovementKeys,
  type Rotation,
} from './types'

const ROTATIONS_KEY = 'ff14-mch-rotations'
const KEYBINDS_KEY = 'ff14-mch-keybinds'
const CONFIG_KEY = 'ff14-mch-config'
const MOVEMENT_KEY = 'ff14-mch-movement'
const HOTBAR_KEY = 'ff14-mch-hotbar'

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
    const defaults = createDefaultKeybinds()
    const saved = JSON.parse(raw) as Keybinds
    const merged: Keybinds = { ...defaults }
    for (const [id, bind] of Object.entries(saved)) {
      merged[id] = { ...defaults[id], ...bind }
    }
    // 置き換えペアのキーを揃える
    for (const [id, bind] of Object.entries(merged)) {
      const partner = bind.swapWith
      if (!partner || !merged[partner]) continue
      if (merged[partner].swapWith !== id) continue
      if (id > partner) continue
      const shared = bind.key ?? merged[partner].key
      merged[id] = { ...merged[id], key: shared }
      merged[partner] = { ...merged[partner], key: shared }
    }
    return merged
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

export function loadMovementKeys(): MovementKeys {
  if (!canUseStorage()) return { ...DEFAULT_MOVEMENT_KEYS }
  try {
    const raw = localStorage.getItem(MOVEMENT_KEY)
    if (!raw) {
      const defaults = { ...DEFAULT_MOVEMENT_KEYS }
      saveMovementKeys(defaults)
      return defaults
    }
    return { ...DEFAULT_MOVEMENT_KEYS, ...(JSON.parse(raw) as MovementKeys) }
  } catch {
    return { ...DEFAULT_MOVEMENT_KEYS }
  }
}

export function saveMovementKeys(keys: MovementKeys): void {
  if (!canUseStorage()) return
  localStorage.setItem(MOVEMENT_KEY, JSON.stringify(keys))
}

export function loadHotbarLayout(keybinds?: Keybinds): HotbarLayout {
  const binds = keybinds ?? (canUseStorage() ? loadKeybinds() : createDefaultKeybinds())
  if (!canUseStorage()) return createDefaultHotbarLayout()
  try {
    const raw = localStorage.getItem(HOTBAR_KEY)
    if (!raw) {
      const defaults = createDefaultHotbarLayout()
      saveHotbarLayout(defaults)
      return defaults
    }
    const parsed = JSON.parse(raw) as HotbarLayout
    if (
      !parsed ||
      typeof parsed.cols !== 'number' ||
      typeof parsed.rows !== 'number' ||
      !Array.isArray(parsed.slots)
    ) {
      return createDefaultHotbarLayout()
    }
    return normalizeHotbarLayout(parsed, binds)
  } catch {
    return createDefaultHotbarLayout()
  }
}

export function saveHotbarLayout(layout: HotbarLayout): void {
  if (!canUseStorage()) return
  localStorage.setItem(HOTBAR_KEY, JSON.stringify(layout))
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
