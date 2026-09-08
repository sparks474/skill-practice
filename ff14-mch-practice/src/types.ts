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
  /** バレルヒーター等: ヒート消費なしでハイパーチャージ可能 */
  grantsHyperchargeReady?: boolean
  /** ドリル／バイオなどリキャスト共有グループ */
  sharedRecastGroup?: string
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
}

/** 移動キー（練習中は入力しても無視・ミス判定なし） */
export type MovementKeys = {
  up?: string
  down?: string
  left?: string
  right?: string
}

export type MovementDirection = keyof MovementKeys

/** 練習ホットバーのグリッド配置（slots[i] = skillId or null） */
export type HotbarLayout = {
  cols: number
  rows: number
  slots: (string | null)[]
}

export type KeybindEntry = {
  key?: string
  mouse?: boolean
  /** キー設定で不要扱い（グレーアウト・末尾・練習ホットバー非表示） */
  unused?: boolean
  /** 同じキー枠でトグル置き換えする相手スキル ID */
  swapWith?: string
}

export type Keybinds = Record<string, KeybindEntry>

export type ScoreEvent =
  | {
      type: 'success'
      skillId: string
      stepIndex: number
      /** 発動可能になってから実際に発動するまでの空き時間（ms） */
      idleMs: number
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
  wrongInput: number
  otherFail: number
  /**
   * クールダウン／GCD 等が開けているのにスキルを回さなかった合計時間。
   * 1手目（開始待ち）は含めない。
   */
  idleWasteMs: number
  events: ScoreEvent[]
  elapsedMs: number
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  defaultAnimationLockMs: 670,
  queueWindowMs: 500,
}

/** FF14 既定に近い WASD */
export const DEFAULT_MOVEMENT_KEYS: MovementKeys = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
}
