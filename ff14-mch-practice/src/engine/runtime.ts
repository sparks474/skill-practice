import { getSkill, SKILLS } from '../data/skills'
import type {
  EngineConfig,
  Gauges,
  PracticeSummary,
  Rotation,
  ScoreEvent,
  Skill,
} from '../types'
import { summarizeEvents } from './score'

export type ChargeState = {
  charges: number
  nextChargeAt: number | null
  /** チャージ制でないときの readyAt */
  readyAt: number
}

export type SkillCooldownView = {
  /** 自身リキャスト／次チャージまでの残り ms（GCD・硬直は含まない） */
  remainingMs: number
  charges?: number
  maxCharges?: number
}

export type RuntimeSnapshot = {
  nowMs: number
  stepIndex: number
  finished: boolean
  gauges: Gauges
  overheatStacks: number
  hasFullMetal: boolean
  hasHyperchargeReady: boolean
  hasHawksEye: boolean
  hasBlastArrow: boolean
  hasResonanceArrow: boolean
  hasRadiantEncore: boolean
  gcdReadyAt: number
  animLockUntil: number
  castUntil: number
  queuedSkillId: string | null
  lastFeedback: string | null
  events: ScoreEvent[]
  cooldowns: Record<string, SkillCooldownView>
}

type InternalState = {
  nowMs: number
  stepIndex: number
  finished: boolean
  gauges: Gauges
  overheatStacks: number
  hasFullMetal: boolean
  hasHyperchargeReady: boolean
  hasHawksEye: boolean
  hasBlastArrow: boolean
  hasResonanceArrow: boolean
  hasRadiantEncore: boolean
  gcdReadyAt: number
  animLockUntil: number
  castUntil: number
  chargeMap: Map<string, ChargeState>
  queued: { skillId: string; pressedAt: number } | null
  events: ScoreEvent[]
  lastFeedback: string | null
  started: boolean
  /** 直前に成功発動したスキル（連打猶予用） */
  lastCastSkillId: string | null
  /** この時刻未満は lastCastSkillId の再入力を無視 */
  sameSkillIgnoreUntil: number
}

function clampGauge(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export class PracticeRuntime {
  private readonly rotation: Rotation
  private readonly config: EngineConfig
  private state: InternalState

  constructor(rotation: Rotation, config: EngineConfig) {
    this.rotation = rotation
    this.config = config
    this.state = this.createInitialState()
  }

  private createInitialState(): InternalState {
    const chargeMap = new Map<string, ChargeState>()
    // 回しに出てくる／マスタ全件のチャージ初期化は入力時に lazy でもよいが、
    // 最初から全スキル分用意する
    return {
      nowMs: 0,
      stepIndex: 0,
      finished: false,
      gauges: { ...this.rotation.initialGauges },
      overheatStacks: 0,
      hasFullMetal: false,
      hasHyperchargeReady: false,
      hasHawksEye: false,
      hasBlastArrow: false,
      hasResonanceArrow: false,
      hasRadiantEncore: false,
      gcdReadyAt: 0,
      animLockUntil: 0,
      castUntil: 0,
      chargeMap,
      queued: null,
      events: [],
      lastFeedback: null,
      started: false,
      lastCastSkillId: null,
      sameSkillIgnoreUntil: 0,
    }
  }

  reset(): void {
    this.state = this.createInitialState()
  }

  getSnapshot(): RuntimeSnapshot {
    this.refreshCharges(this.state.nowMs)
    return {
      nowMs: this.state.nowMs,
      stepIndex: this.state.stepIndex,
      finished: this.state.finished,
      gauges: { ...this.state.gauges },
      overheatStacks: this.state.overheatStacks,
      hasFullMetal: this.state.hasFullMetal,
      hasHyperchargeReady: this.state.hasHyperchargeReady,
      hasHawksEye: this.state.hasHawksEye,
      hasBlastArrow: this.state.hasBlastArrow,
      hasResonanceArrow: this.state.hasResonanceArrow,
      hasRadiantEncore: this.state.hasRadiantEncore,
      gcdReadyAt: this.state.gcdReadyAt,
      animLockUntil: this.state.animLockUntil,
      castUntil: this.state.castUntil,
      queuedSkillId: this.state.queued?.skillId ?? null,
      lastFeedback: this.state.lastFeedback,
      events: [...this.state.events],
      cooldowns: this.buildCooldowns(),
    }
  }

  private buildCooldowns(): Record<string, SkillCooldownView> {
    const out: Record<string, SkillCooldownView> = {}
    for (const skill of SKILLS) {
      if (skill.charges == null && skill.recastMs <= 0) continue
      out[skill.id] = this.cooldownFromState(skill, this.getChargeState(skill))
    }
    return out
  }

  private cooldownFromState(skill: Skill, cs: ChargeState): SkillCooldownView {
    if (skill.charges != null) {
      const remainingMs =
        cs.nextChargeAt != null
          ? Math.max(0, cs.nextChargeAt - this.state.nowMs)
          : 0
      return {
        remainingMs,
        charges: cs.charges,
        maxCharges: skill.charges,
      }
    }
    if (skill.recastMs > 0) {
      return {
        remainingMs: Math.max(0, cs.readyAt - this.state.nowMs),
      }
    }
    return { remainingMs: 0 }
  }

  getSummary(): PracticeSummary {
    return summarizeEvents(
      this.state.events,
      this.rotation.steps.length,
      this.state.nowMs,
    )
  }

  expectedSkillId(): string | null {
    if (this.state.finished) return null
    return this.rotation.steps[this.state.stepIndex]?.skillId ?? null
  }

  /** シミュレーション／UI 共通: 時刻を進め、キュー発火を処理 */
  advanceTo(nowMs: number): void {
    if (nowMs < this.state.nowMs) return
    this.state.nowMs = nowMs
    this.refreshCharges(nowMs)
    this.tryFlushQueue()
  }

  /**
   * ユーザー入力。戻り値は UI 向けの短いメッセージ。
   */
  handleInput(skillId: string): string {
    if (this.state.finished) return '終了済み'
    this.state.started = true
    this.refreshCharges(this.state.nowMs)

    const expected = this.expectedSkillId()
    if (!expected) {
      this.state.finished = true
      return '終了'
    }

    if (skillId !== expected) {
      // A→B で A 連打の残り: 発動後の連打猶予中は押し間違いにしない
      if (
        this.state.lastCastSkillId != null &&
        skillId === this.state.lastCastSkillId &&
        this.state.nowMs < this.state.sameSkillIgnoreUntil
      ) {
        return '連打猶予（無視）'
      }
      const event: ScoreEvent = {
        type: 'wrong_input',
        skillId,
        expectedSkillId: expected,
        stepIndex: this.state.stepIndex,
        atMs: this.state.nowMs,
      }
      this.state.events.push(event)
      this.state.lastFeedback = '押し間違い'
      // 不正解ではステップを進めない。キューは維持してよいが誤入力で消さない
      return '押し間違い'
    }

    const skill = getSkill(skillId)
    if (!skill) {
      this.recordOtherFail(skillId, '未知のスキル')
      return 'その他失敗'
    }

    const readyAt = this.computeReadyAt(skill)
    const wait = readyAt - this.state.nowMs

    if (wait <= 0) {
      return this.executeSkill(skill, readyAt, false)
    }

    if (wait <= this.config.queueWindowMs) {
      this.state.queued = { skillId, pressedAt: this.state.nowMs }
      this.state.lastFeedback = `予約: ${skill.nameJa}`
      return this.state.lastFeedback
    }

    // 早すぎる正解入力は無視（採点しない）
    this.state.lastFeedback = null
    return '早すぎ（無視）'
  }

  private tryFlushQueue(): void {
    const q = this.state.queued
    if (!q || this.state.finished) return

    const expected = this.expectedSkillId()
    if (expected !== q.skillId) {
      this.state.queued = null
      return
    }

    const skill = getSkill(q.skillId)
    if (!skill) {
      this.state.queued = null
      return
    }

    const readyAt = this.computeReadyAt(skill)
    if (this.state.nowMs >= readyAt) {
      this.state.queued = null
      this.executeSkill(skill, readyAt, true)
    }
  }

  private executeSkill(
    skill: Skill,
    readyAt: number,
    usedQueue: boolean,
  ): string {
    const conditionError = this.checkConditions(skill)
    if (conditionError) {
      this.recordOtherFail(skill.id, conditionError)
      return `その他失敗: ${conditionError}`
    }

    const rawIdleMs = Math.max(0, this.state.nowMs - readyAt)
    const slack = Math.max(0, this.config.activationSlackMs)
    // 遊び時間以内は空きとして扱わない
    const idleMs = Math.max(0, rawIdleMs - slack)
    const stepIndex = this.state.stepIndex

    this.applyExecution(skill)

    this.state.events.push({
      type: 'success',
      skillId: skill.id,
      stepIndex,
      idleMs,
      usedQueue,
      atMs: this.state.nowMs,
    })

    this.state.stepIndex += 1
    if (this.state.stepIndex >= this.rotation.steps.length) {
      this.state.finished = true
    }

    // 1手目は開始待ちのため空き表示しない。以降は空きがあれば示す。
    if (stepIndex === 0 || idleMs <= 0) {
      this.state.lastFeedback = usedQueue
        ? `発動（予約）: ${skill.nameJa}`
        : `発動: ${skill.nameJa}`
    } else {
      this.state.lastFeedback = `空き +${Math.round(idleMs)}ms`
    }
    return this.state.lastFeedback
  }

  private recordOtherFail(skillId: string, reason: string): void {
    this.state.events.push({
      type: 'other_fail',
      skillId,
      stepIndex: this.state.stepIndex,
      reason,
      atMs: this.state.nowMs,
    })
    this.state.lastFeedback = `その他失敗: ${reason}`
  }

  private chargeKey(skill: Skill): string {
    return skill.sharedRecastGroup ?? skill.id
  }

  private skillForChargeKey(key: string): Skill | undefined {
    const direct = getSkill(key)
    if (direct) return direct
    return SKILLS.find((s) => s.sharedRecastGroup === key)
  }

  private getChargeState(skill: Skill): ChargeState {
    const key = this.chargeKey(skill)
    let cs = this.state.chargeMap.get(key)
    if (!cs) {
      const max = skill.charges ?? 1
      cs = {
        charges: skill.charges != null ? max : 1,
        nextChargeAt: null,
        readyAt: 0,
      }
      this.state.chargeMap.set(key, cs)
    }
    return cs
  }

  private refreshCharges(nowMs: number): void {
    for (const key of this.state.chargeMap.keys()) {
      const skill = this.skillForChargeKey(key)
      if (!skill?.charges) continue
      const cs = this.state.chargeMap.get(key)!
      const max = skill.charges
      while (
        cs.charges < max &&
        cs.nextChargeAt != null &&
        nowMs >= cs.nextChargeAt
      ) {
        cs.charges += 1
        if (cs.charges >= max) {
          cs.nextChargeAt = null
        } else {
          cs.nextChargeAt += skill.recastMs
        }
      }
    }
  }

  /**
   * このスキルが「タイマー上」いつ撃てるようになる／なったか（ゲージ条件は別）。
   * now ではクランプしない（遅れ判定のため過去時刻も返す）。
   */
  computeReadyAt(skill: Skill): number {
    const cs = this.getChargeState(skill)
    let ownReady: number
    if (skill.charges != null) {
      // チャージ残があれば自身リキャ制約なし（0）
      ownReady = cs.charges > 0 ? 0 : (cs.nextChargeAt ?? Number.POSITIVE_INFINITY)
    } else if (skill.recastMs > 0) {
      ownReady = cs.readyAt
    } else {
      ownReady = 0
    }

    const anim = this.state.animLockUntil
    const cast = this.state.castUntil

    if (skill.category === 'ability') {
      return Math.max(anim, cast, ownReady)
    }
    return Math.max(this.state.gcdReadyAt, anim, cast, ownReady)
  }

  /** 待ち時間（先行入力判定用）。now 未満なら 0 */
  computeWaitMs(skill: Skill): number {
    return Math.max(0, this.computeReadyAt(skill) - this.state.nowMs)
  }

  private checkConditions(skill: Skill): string | null {
    if (this.state.nowMs < this.state.animLockUntil) return 'アニメロック中'
    if (this.state.nowMs < this.state.castUntil) return '詠唱中'

    if (skill.category === 'skill' && this.state.nowMs < this.state.gcdReadyAt) {
      return 'GCD中'
    }

    const cs = this.getChargeState(skill)
    if (skill.charges != null) {
      if (cs.charges <= 0) return 'チャージ不足'
    } else if (skill.recastMs > 0 && this.state.nowMs < cs.readyAt) {
      return 'リキャスト中'
    }

    if (skill.requiresOverheat && this.state.overheatStacks <= 0) {
      return 'オーバーヒートが必要'
    }
    if (skill.requiresFullMetal && !this.state.hasFullMetal) {
      return 'フルメタル準備が必要'
    }
    if (skill.requiresHawksEye && !this.state.hasHawksEye) {
      return 'ホークアイが必要'
    }
    if (skill.requiresBlastArrow && !this.state.hasBlastArrow) {
      return 'ブラストアロー実行可が必要'
    }
    if (skill.requiresResonanceArrow && !this.state.hasResonanceArrow) {
      return 'レゾナンスアロー実行可が必要'
    }
    if (skill.requiresRadiantEncore && !this.state.hasRadiantEncore) {
      return '光神のアンコール実行可が必要'
    }

    const req = skill.gauge?.require
    const freeHypercharge =
      skill.id === 'hypercharge' && this.state.hasHyperchargeReady
    if (!freeHypercharge && req?.heat != null && this.state.gauges.heat < req.heat) {
      return 'ヒート不足'
    }
    if (req?.battery != null && this.state.gauges.battery < req.battery) {
      return this.rotation.jobId === 'BRD' ? 'ソウルボイス不足' : 'バッテリー不足'
    }

    return null
  }

  private applyExecution(skill: Skill): void {
    const lock =
      skill.animationLockMs ?? this.config.defaultAnimationLockMs
    this.state.animLockUntil = this.state.nowMs + lock
    this.state.lastCastSkillId = skill.id
    // 硬直と連打猶予の長い方まで、同じスキル再入力を無視
    const grace = Math.max(0, this.config.remashGraceMs)
    this.state.sameSkillIgnoreUntil = Math.max(
      this.state.animLockUntil,
      this.state.nowMs + grace,
    )

    if (skill.castMs > 0) {
      this.state.castUntil = this.state.nowMs + skill.castMs
    }

    if (skill.category === 'skill') {
      const gcd = skill.fixedGcdMs ?? this.rotation.gcdMs
      this.state.gcdReadyAt = this.state.nowMs + gcd
    }

    // リキャスト／チャージ
    const cs = this.getChargeState(skill)
    if (skill.charges != null) {
      cs.charges -= 1
      if (cs.nextChargeAt == null) {
        cs.nextChargeAt = this.state.nowMs + skill.recastMs
      }
    } else if (skill.recastMs > 0) {
      cs.readyAt = this.state.nowMs + skill.recastMs
    }

    // ゲージ
    const batteryBefore = this.state.gauges.battery
    const freeHypercharge =
      skill.id === 'hypercharge' && this.state.hasHyperchargeReady
    if (freeHypercharge) {
      this.state.hasHyperchargeReady = false
    } else {
      const delta = skill.gauge?.delta
      if (delta?.heat) {
        this.state.gauges.heat = clampGauge(this.state.gauges.heat + delta.heat)
      }
    }
    const delta = skill.gauge?.delta
    if (delta?.battery) {
      this.state.gauges.battery = clampGauge(
        this.state.gauges.battery + delta.battery,
      )
    }
    if (skill.consumeAllBattery) {
      this.state.gauges.battery = 0
    }

    if (skill.grantsOverheatStacks) {
      this.state.overheatStacks += skill.grantsOverheatStacks
    }
    if (skill.requiresOverheat) {
      this.state.overheatStacks = Math.max(0, this.state.overheatStacks - 1)
    }
    if (skill.grantsFullMetal) {
      this.state.hasFullMetal = true
    }
    if (skill.requiresFullMetal) {
      this.state.hasFullMetal = false
    }
    if (skill.grantsHyperchargeReady) {
      this.state.hasHyperchargeReady = true
    }

    if (skill.grantsHawksEye) {
      this.state.hasHawksEye = true
    }
    if (skill.requiresHawksEye) {
      this.state.hasHawksEye = false
    }
    if (skill.grantsBlastArrow) {
      const min = skill.grantsBlastArrowMinBattery
      if (min == null || batteryBefore >= min) {
        this.state.hasBlastArrow = true
      }
    }
    if (skill.requiresBlastArrow) {
      this.state.hasBlastArrow = false
    }
    if (skill.grantsResonanceArrow) {
      this.state.hasResonanceArrow = true
    }
    if (skill.requiresResonanceArrow) {
      this.state.hasResonanceArrow = false
    }
    if (skill.grantsRadiantEncore) {
      this.state.hasRadiantEncore = true
    }
    if (skill.requiresRadiantEncore) {
      this.state.hasRadiantEncore = false
    }

    if (skill.reduceRecast) {
      for (const id of skill.reduceRecast.skillIds) {
        const target = getSkill(id)
        if (!target) continue
        const tcs = this.getChargeState(target)
        if (target.charges != null) {
          // チャージ回復時刻を早める
          if (tcs.nextChargeAt != null) {
            tcs.nextChargeAt = Math.max(
              this.state.nowMs,
              tcs.nextChargeAt - skill.reduceRecast.amountMs,
            )
          }
          // チャージが満タンでなければ、実質的に1チャージ分短縮として
          // nextChargeAt を縮めたうえで即時リフレッシュ
          this.refreshCharges(this.state.nowMs)
        } else if (target.recastMs > 0) {
          tcs.readyAt = Math.max(
            this.state.nowMs,
            tcs.readyAt - skill.reduceRecast.amountMs,
          )
        }
      }
    }
  }
}
