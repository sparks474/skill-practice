import { getSkill } from '../data/skills'
import { DEFAULT_ENGINE_CONFIG, type EngineConfig, type Rotation } from '../types'
import { PracticeRuntime } from '../engine/runtime'

/**
 * 最適タイミングで先行入力しつつ開幕を完走できるか検証する。
 */
export function simulateOpener(
  rotation: Rotation,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): {
  ok: boolean
  stepsCompleted: number
  totalSteps: number
  elapsedMs: number
  otherFails: number
  log: string[]
} {
  const rt = new PracticeRuntime(rotation, config)
  const log: string[] = []
  const maxMs = 180_000
  const tick = 10

  for (let t = 0; t <= maxMs; t += tick) {
    rt.advanceTo(t)
    const snap = rt.getSnapshot()
    if (snap.finished) break

    const expectedId = rt.expectedSkillId()
    if (!expectedId) break
    const skill = getSkill(expectedId)
    if (!skill) {
      log.push(`unknown skill ${expectedId}`)
      break
    }

    const wait = rt.computeWaitMs(skill)
    // 解放の直前（キュー窓内）で押す。即時可能ならすぐ押す。
    if (wait <= config.queueWindowMs) {
      const msg = rt.handleInput(expectedId)
      if (msg.startsWith('その他失敗') || msg === '押し間違い') {
        log.push(`t=${t} ${skill.nameJa}: ${msg}`)
      } else if (msg.startsWith('Perfect') || msg.startsWith('OK') || msg.startsWith('Late')) {
        log.push(`t=${t} ${skill.nameJa}: ${msg}`)
      } else if (msg.startsWith('予約')) {
        // queued
      }
    }
  }

  const summary = rt.getSummary()
  const snap = rt.getSnapshot()
  return {
    ok: snap.finished && summary.successCount === rotation.steps.length && summary.otherFail === 0,
    stepsCompleted: summary.successCount,
    totalSteps: rotation.steps.length,
    elapsedMs: snap.nowMs,
    otherFails: summary.otherFail,
    log,
  }
}
