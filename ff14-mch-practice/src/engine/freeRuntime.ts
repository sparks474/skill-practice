import { getSkill, SKILLS } from '../data/skills'
import type {
  EngineConfig,
  FreePracticeSummary,
  FreeScoreEvent,
  Gauges,
  JobId,
  Rotation,
  Skill,
} from '../types'
import type { ChargeState, RuntimeSnapshot, SkillCooldownView } from './runtime'

function clampGauge(n: number): number {
  return Math.max(0, Math.min(100, n))
}

/** フリー練習用のダミー回し（GCD / 初期ゲージのみ利用） */
export function createFreePracticeRotation(
  jobId: JobId,
  gcdMs = 2500,
  initialGauges: Gauges = { heat: 0, battery: 0 },
): Rotation {
  return {
    id: `free-practice-${jobId}`,
    name: 'フリー練習',
    jobId,
    gcdMs,
    initialGauges,
    steps: [],
    updatedAt: Date.now(),
  }
}

type InternalState = {
  nowMs: number
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
  lastFeedback: string | null
  lastCastSkillId: string | null
  sameSkillIgnoreUntil: number
  /** GCD+硬直+詠唱が空いてからの開始時刻。null = 撃てない */
  weaponskillReadySince: number | null
}

export type FreeRuntimeSnapshot = Omit<RuntimeSnapshot, 'stepIndex' | 'events'> & {
  recording: boolean
  idleWasteMs: number
  heatOverflow: number
  batteryOverflow: number
  events: FreeScoreEvent[]
}

/**
 * 指定回しなしのフリー練習。
 * 開始〜終了のあいだスキル発動・空き時間・ゲージ溢れを記録する。
 */
export class FreePracticeRuntime {
  private readonly rotation: Rotation
  private readonly config: EngineConfig
  private state: InternalState
  private recording = false
  private events: FreeScoreEvent[] = []
  private idleWasteMs = 0
  private heatOverflow = 0
  private batteryOverflow = 0

  constructor(rotation: Rotation, config: EngineConfig) {
    this.rotation = rotation
    this.config = config
    this.state = this.createInitialState()
  }

  private createInitialState(): InternalState {
    return {
      nowMs: 0,
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
      chargeMap: new Map(),
      queued: null,
      lastFeedback: null,
      lastCastSkillId: null,
      sameSkillIgnoreUntil: 0,
      weaponskillReadySince: 0,
    }
  }

  reset(): void {
    this.state = this.createInitialState()
    this.recording = false
    this.events = []
    this.idleWasteMs = 0
    this.heatOverflow = 0
    this.batteryOverflow = 0
  }

  /** カウントダウン終了後に呼ぶ。時計は 0 から。 */
  beginRecording(): void {
    this.reset()
    this.recording = true
    this.state.weaponskillReadySince = 0
  }

  endRecording(): FreePracticeSummary {
    if (!this.recording) {
      return this.getSummary()
    }
    this.flushIdleWaste(this.state.nowMs)
    this.recording = false
    this.state.finished = true
    this.state.queued = null
    return this.getSummary()
  }

  getSummary(): FreePracticeSummary {
    const castCount = this.events.filter((e) => e.type === 'cast').length
    const failCount = this.events.filter((e) => e.type === 'fail').length
    return {
      elapsedMs: this.state.nowMs,
      idleWasteMs: this.idleWasteMs,
      castCount,
      heatOverflow: this.heatOverflow,
      batteryOverflow: this.batteryOverflow,
      failCount,
      events: [...this.events],
    }
  }

  getSnapshot(): FreeRuntimeSnapshot {
    this.refreshCharges(this.state.nowMs)
    return {
      nowMs: this.state.nowMs,
      finished: this.state.finished,
      recording: this.recording,
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
      idleWasteMs: this.idleWasteMs,
      heatOverflow: this.heatOverflow,
      batteryOverflow: this.batteryOverflow,
      events: [...this.events],
      cooldowns: this.buildCooldowns(),
    }
  }

  advanceTo(nowMs: number): void {
    if (!this.recording || nowMs < this.state.nowMs) return
    this.state.nowMs = nowMs
    this.refreshCharges(nowMs)
    this.updateWeaponskillReadyWindow()
    this.tryFlushQueue()
  }

  handleInput(skillId: string): string {
    if (!this.recording || this.state.finished) return '待機中'
    this.refreshCharges(this.state.nowMs)

    if (
      this.state.lastCastSkillId != null &&
      skillId === this.state.lastCastSkillId &&
      this.state.nowMs < this.state.sameSkillIgnoreUntil
    ) {
      return '連打猶予（無視）'
    }

    const skill = getSkill(skillId)
    if (!skill) {
      this.recordFail(skillId, '未知のスキル')
      return '失敗'
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

    this.state.lastFeedback = null
    return '早すぎ（無視）'
  }

  private tryFlushQueue(): void {
    const q = this.state.queued
    if (!q || !this.recording || this.state.finished) return
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
    _readyAt: number,
    usedQueue: boolean,
  ): string {
    const conditionError = this.checkConditions(skill)
    if (conditionError) {
      this.recordFail(skill.id, conditionError)
      return `失敗: ${conditionError}`
    }

    // Weaponskill 発動時に、GCD 空きからの無駄時間を確定（押した時刻まで）
    let flushedIdle = 0
    if (skill.category === 'skill') {
      flushedIdle = this.flushIdleWaste(this.state.nowMs)
    }

    const overflows = this.detectOverflows(skill)
    this.applyExecution(skill)
    this.updateWeaponskillReadyWindow()

    this.events.push({
      type: 'cast',
      skillId: skill.id,
      atMs: this.state.nowMs,
      usedQueue,
    })
    for (const gauge of overflows) {
      this.events.push({
        type: 'gauge_overflow',
        skillId: skill.id,
        gauge,
        atMs: this.state.nowMs,
      })
      if (gauge === 'heat') this.heatOverflow += 1
      else this.batteryOverflow += 1
    }

    if (flushedIdle > 0) {
      this.state.lastFeedback = `空き +${Math.round(flushedIdle)}ms → ${skill.nameJa}`
    } else if (overflows.length > 0) {
      const labels = overflows
        .map((g) => (g === 'heat' ? 'ヒート' : 'バッテリー'))
        .join('・')
      this.state.lastFeedback = `ゲージ溢れ（${labels}）: ${skill.nameJa}`
    } else {
      this.state.lastFeedback = usedQueue
        ? `発動（予約）: ${skill.nameJa}`
        : `発動: ${skill.nameJa}`
    }
    return this.state.lastFeedback
  }

  /** ready 時点までの空きを加算し、窓をクリア */
  private flushIdleWaste(untilMs: number): number {
    const since = this.state.weaponskillReadySince
    if (since == null) return 0
    const slack = Math.max(0, this.config.activationSlackMs)
    const raw = Math.max(0, untilMs - since)
    const idle = Math.max(0, raw - slack)
    this.idleWasteMs += idle
    this.state.weaponskillReadySince = null
    return idle
  }

  private updateWeaponskillReadyWindow(): void {
    if (!this.recording || this.state.finished) return
    const canPress =
      this.state.nowMs >= this.state.gcdReadyAt &&
      this.state.nowMs >= this.state.animLockUntil &&
      this.state.nowMs >= this.state.castUntil
    if (canPress) {
      if (this.state.weaponskillReadySince == null) {
        this.state.weaponskillReadySince = this.state.nowMs
      }
    } else {
      this.state.weaponskillReadySince = null
    }
  }

  private detectOverflows(skill: Skill): Array<'heat' | 'battery'> {
    const out: Array<'heat' | 'battery'> = []
    const freeHypercharge =
      skill.id === 'hypercharge' && this.state.hasHyperchargeReady
    const delta = skill.gauge?.delta
    if (!freeHypercharge && delta?.heat != null && delta.heat > 0) {
      if (this.state.gauges.heat >= 100) out.push('heat')
    }
    if (delta?.battery != null && delta.battery > 0) {
      if (this.state.gauges.battery >= 100) out.push('battery')
    }
    return out
  }

  private recordFail(skillId: string, reason: string): void {
    this.events.push({
      type: 'fail',
      skillId,
      reason,
      atMs: this.state.nowMs,
    })
    this.state.lastFeedback = `失敗: ${reason}`
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

  computeReadyAt(skill: Skill): number {
    const cs = this.getChargeState(skill)
    let ownReady: number
    if (skill.charges != null) {
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

    const cs = this.getChargeState(skill)
    if (skill.charges != null) {
      cs.charges -= 1
      if (cs.nextChargeAt == null) {
        cs.nextChargeAt = this.state.nowMs + skill.recastMs
      }
    } else if (skill.recastMs > 0) {
      cs.readyAt = this.state.nowMs + skill.recastMs
    }

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
          if (tcs.nextChargeAt != null) {
            tcs.nextChargeAt = Math.max(
              this.state.nowMs,
              tcs.nextChargeAt - skill.reduceRecast.amountMs,
            )
          }
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
}
