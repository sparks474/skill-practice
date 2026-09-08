export type SkillCategory = 'skill' | 'ability'

export type Gauges = {
  heat: number
  battery: number
}

export type Skill = {
  id: string
  nameJa: string
  category: SkillCategory
  castMs: number
  recastMs: number
  charges?: number
  animationLockMs?: number
  fixedGcdMs?: number
  gauge?: {
    require?: Partial<Gauges>
    delta?: Partial<Gauges>
  }
  consumeAllBattery?: boolean
  requiresOverheat?: boolean
  grantsOverheatStacks?: number
  requiresFullMetal?: boolean
  grantsFullMetal?: boolean
  reduceRecast?: { skillIds: string[]; amountMs: number }
  /** UI グループ用の任意タグ */
  tags?: string[]
}

export type RotationStep = {
  skillId: string
}

export type Rotation = {
  id: string
  name: string
  gcdMs: number
  initialGauges: Gauges
  steps: RotationStep[]
  isSample?: boolean
  note?: string
  updatedAt: number
}

export type EngineConfig = {
  defaultAnimationLockMs: number
  queueWindowMs: number
  perfectWindowMs: number
  okWindowMs: number
}

export type KeybindEntry = {
  key?: string
  mouse?: boolean
}

export type Keybinds = Record<string, KeybindEntry>

export type TimingGrade = 'perfect' | 'ok' | 'late'

export type ScoreEvent =
  | {
      type: 'success'
      skillId: string
      stepIndex: number
      grade: TimingGrade
      delayMs: number
      usedQueue: boolean
      atMs: number
    }
  | {
      type: 'wrong_input'
      skillId: string
      expectedSkillId: string
      stepIndex: number
      atMs: number
    }
  | {
      type: 'other_fail'
      skillId: string
      stepIndex: number
      reason: string
      atMs: number
    }

export type PracticeSummary = {
  totalSteps: number
  successCount: number
  perfect: number
  ok: number
  late: number
  wrongInput: number
  otherFail: number
  queueUsed: number
  events: ScoreEvent[]
  elapsedMs: number
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  defaultAnimationLockMs: 670,
  queueWindowMs: 500,
  perfectWindowMs: 50,
  okWindowMs: 150,
}
