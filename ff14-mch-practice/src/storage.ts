import { createDefaultKeybinds } from './data/defaultKeybinds'
import {
  createDefaultHotbarLayout,
  normalizeHotbarLayout,
} from './data/hotbarLayout'
import { DEFAULT_JOB_ID, isJobId } from './data/jobs'
import { SAMPLE_ROTATION } from './data/sampleRotation'
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_MOVEMENT_KEYS,
  type EngineConfig,
  type HotbarByJob,
  type HotbarLayout,
  type JobId,
  type Keybinds,
  type KeybindsByJob,
  type MovementKeys,
  type Rotation,
} from './types'

const ROTATIONS_KEY = 'ff14-mch-rotations'
const KEYBINDS_KEY = 'ff14-mch-keybinds'
const CONFIG_KEY = 'ff14-mch-config'
const MOVEMENT_KEY = 'ff14-mch-movement'
const HOTBAR_KEY = 'ff14-mch-hotbar'
const SELECTED_JOB_KEY = 'ff14-practice-selected-job'

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function normalizeRotation(raw: Partial<Rotation> & { id: string }): Rotation {
  return {
    id: raw.id,
    name: raw.name ?? '無題',
    jobId: isJobId(raw.jobId) ? raw.jobId : DEFAULT_JOB_ID,
    gcdMs: raw.gcdMs ?? 2500,
    initialGauges: {
      heat: raw.initialGauges?.heat ?? 0,
      battery: raw.initialGauges?.battery ?? 0,
    },
    steps: Array.isArray(raw.steps) ? raw.steps.map((s) => ({ ...s })) : [],
    isSample: raw.isSample,
    note: raw.note,
    updatedAt: raw.updatedAt ?? Date.now(),
  }
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
    const parsed = JSON.parse(raw) as Partial<Rotation>[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [cloneSample()]
      saveRotations(initial)
      return initial
    }
    const normalized = parsed
      .filter((r): r is Partial<Rotation> & { id: string } => Boolean(r?.id))
      .map(normalizeRotation)
    if (!normalized.some((r) => r.isSample || r.id === SAMPLE_ROTATION.id)) {
      return [cloneSample(), ...normalized]
    }
    return normalized
  } catch {
    return [cloneSample()]
  }
}

export function saveRotations(rotations: Rotation[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(ROTATIONS_KEY, JSON.stringify(rotations))
}

function mergeKeybinds(jobId: JobId, saved: Keybinds | undefined): Keybinds {
  const defaults = createDefaultKeybinds(jobId)
  if (!saved) return defaults
  const merged: Keybinds = { ...defaults }
  for (const [id, bind] of Object.entries(saved)) {
    if (!merged[id] && !defaults[id]) {
      // 旧データや他ジョブのゴミはスキップ（現ジョブに無いスキル）
      if (!(id in defaults)) continue
    }
    if (!(id in defaults)) continue
    merged[id] = { ...defaults[id], ...bind }
  }
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
}

/** 旧形式（フラット Keybinds）か新形式（ByJob）かを判別して読む */
function parseKeybindsByJob(raw: string): KeybindsByJob {
  const parsed = JSON.parse(raw) as KeybindsByJob | Keybinds
  if (!parsed || typeof parsed !== 'object') return {}
  // 新形式: トップレベルキーが JobId
  const keys = Object.keys(parsed)
  if (keys.length === 0) return {}
  if (keys.every((k) => isJobId(k))) {
    return parsed as KeybindsByJob
  }
  // 旧形式: スキル ID → bind
  return { [DEFAULT_JOB_ID]: parsed as Keybinds }
}

export function loadKeybindsByJob(): KeybindsByJob {
  if (!canUseStorage()) {
    return { [DEFAULT_JOB_ID]: createDefaultKeybinds(DEFAULT_JOB_ID) }
  }
  try {
    const raw = localStorage.getItem(KEYBINDS_KEY)
    if (!raw) {
      const initial = { [DEFAULT_JOB_ID]: createDefaultKeybinds(DEFAULT_JOB_ID) }
      saveKeybindsByJob(initial)
      return initial
    }
    const byJob = parseKeybindsByJob(raw)
    const next: KeybindsByJob = { ...byJob }
    next[DEFAULT_JOB_ID] = mergeKeybinds(
      DEFAULT_JOB_ID,
      byJob[DEFAULT_JOB_ID],
    )
    saveKeybindsByJob(next)
    return next
  } catch {
    return { [DEFAULT_JOB_ID]: createDefaultKeybinds(DEFAULT_JOB_ID) }
  }
}

export function loadKeybindsForJob(jobId: JobId): Keybinds {
  const byJob = loadKeybindsByJob()
  if (byJob[jobId]) return mergeKeybinds(jobId, byJob[jobId])
  return createDefaultKeybinds(jobId)
}

export function saveKeybindsByJob(byJob: KeybindsByJob): void {
  if (!canUseStorage()) return
  localStorage.setItem(KEYBINDS_KEY, JSON.stringify(byJob))
}

export function saveKeybindsForJob(jobId: JobId, keybinds: Keybinds): void {
  const byJob = loadKeybindsByJob()
  byJob[jobId] = keybinds
  saveKeybindsByJob(byJob)
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
    const parsed = JSON.parse(raw) as EngineConfig
    return {
      defaultAnimationLockMs:
        parsed.defaultAnimationLockMs ??
        DEFAULT_ENGINE_CONFIG.defaultAnimationLockMs,
      queueWindowMs:
        parsed.queueWindowMs ?? DEFAULT_ENGINE_CONFIG.queueWindowMs,
      remashGraceMs:
        parsed.remashGraceMs ?? DEFAULT_ENGINE_CONFIG.remashGraceMs,
    }
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

export function loadSelectedJob(): JobId {
  if (!canUseStorage()) return DEFAULT_JOB_ID
  try {
    const raw = localStorage.getItem(SELECTED_JOB_KEY)
    if (isJobId(raw)) return raw
    return DEFAULT_JOB_ID
  } catch {
    return DEFAULT_JOB_ID
  }
}

export function saveSelectedJob(jobId: JobId): void {
  if (!canUseStorage()) return
  localStorage.setItem(SELECTED_JOB_KEY, jobId)
}

/** 移動キーとスキルキーの重複をスキル側から外す */
export function clearSkillKeysConflictingWithMovement(
  keybinds: Keybinds,
  movement: MovementKeys,
): Keybinds {
  const moveSet = new Set(
    [movement.up, movement.down, movement.left, movement.right]
      .filter(Boolean)
      .map((k) => k!.toLowerCase()),
  )
  if (moveSet.size === 0) return keybinds
  let changed = false
  const next: Keybinds = { ...keybinds }
  for (const [id, bind] of Object.entries(next)) {
    if (bind.key && moveSet.has(bind.key.toLowerCase())) {
      next[id] = { ...bind, key: undefined }
      changed = true
    }
  }
  return changed ? next : keybinds
}

function parseHotbarByJob(raw: string): HotbarByJob {
  const parsed = JSON.parse(raw) as HotbarByJob | HotbarLayout
  if (!parsed || typeof parsed !== 'object') return {}
  if (
    'cols' in parsed &&
    'rows' in parsed &&
    Array.isArray((parsed as HotbarLayout).slots)
  ) {
    return { [DEFAULT_JOB_ID]: parsed as HotbarLayout }
  }
  const keys = Object.keys(parsed)
  if (keys.length > 0 && keys.every((k) => isJobId(k))) {
    return parsed as HotbarByJob
  }
  return {}
}

export function loadHotbarByJob(): HotbarByJob {
  if (!canUseStorage()) {
    return { [DEFAULT_JOB_ID]: createDefaultHotbarLayout(DEFAULT_JOB_ID) }
  }
  try {
    const raw = localStorage.getItem(HOTBAR_KEY)
    if (!raw) {
      const initial = {
        [DEFAULT_JOB_ID]: createDefaultHotbarLayout(DEFAULT_JOB_ID),
      }
      saveHotbarByJob(initial)
      return initial
    }
    return parseHotbarByJob(raw)
  } catch {
    return { [DEFAULT_JOB_ID]: createDefaultHotbarLayout(DEFAULT_JOB_ID) }
  }
}

export function loadHotbarForJob(
  jobId: JobId,
  keybinds?: Keybinds,
): HotbarLayout {
  const binds = keybinds ?? loadKeybindsForJob(jobId)
  const byJob = loadHotbarByJob()
  const layout = byJob[jobId]
  if (!layout) return createDefaultHotbarLayout(jobId)
  if (
    typeof layout.cols !== 'number' ||
    typeof layout.rows !== 'number' ||
    !Array.isArray(layout.slots)
  ) {
    return createDefaultHotbarLayout(jobId)
  }
  return normalizeHotbarLayout(layout, binds)
}

export function saveHotbarByJob(byJob: HotbarByJob): void {
  if (!canUseStorage()) return
  localStorage.setItem(HOTBAR_KEY, JSON.stringify(byJob))
}

export function saveHotbarForJob(jobId: JobId, layout: HotbarLayout): void {
  const byJob = loadHotbarByJob()
  byJob[jobId] = layout
  saveHotbarByJob(byJob)
}

export function cloneSample(): Rotation {
  return {
    ...SAMPLE_ROTATION,
    jobId: SAMPLE_ROTATION.jobId ?? DEFAULT_JOB_ID,
    initialGauges: { ...SAMPLE_ROTATION.initialGauges },
    steps: SAMPLE_ROTATION.steps.map((s) => ({ ...s })),
    updatedAt: Date.now(),
  }
}

export function createEmptyRotation(
  jobId: JobId = DEFAULT_JOB_ID,
  name = '新しい回し',
): Rotation {
  return {
    id: `rot-${crypto.randomUUID()}`,
    name,
    jobId,
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 0 },
    steps: [],
    updatedAt: Date.now(),
  }
}
