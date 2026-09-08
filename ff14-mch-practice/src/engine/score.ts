import type { PracticeSummary, ScoreEvent } from '../types'

export function summarizeEvents(
  events: ScoreEvent[],
  totalSteps: number,
  elapsedMs: number,
): PracticeSummary {
  let successCount = 0
  let wrongInput = 0
  let otherFail = 0
  let idleWasteMs = 0

  for (const e of events) {
    if (e.type === 'success') {
      successCount += 1
      // 1手目は開始待ちなので空き時間に含めない
      if (e.stepIndex > 0) {
        idleWasteMs += e.idleMs
      }
    } else if (e.type === 'wrong_input') {
      wrongInput += 1
    } else if (e.type === 'other_fail') {
      otherFail += 1
    }
  }

  return {
    totalSteps,
    successCount,
    wrongInput,
    otherFail,
    idleWasteMs,
    events: [...events],
    elapsedMs,
  }
}
