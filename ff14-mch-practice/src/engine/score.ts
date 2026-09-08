import type { PracticeSummary, ScoreEvent } from '../types'

export function summarizeEvents(
  events: ScoreEvent[],
  totalSteps: number,
  elapsedMs: number,
): PracticeSummary {
  let successCount = 0
  let perfect = 0
  let ok = 0
  let late = 0
  let wrongInput = 0
  let otherFail = 0
  let queueUsed = 0

  for (const e of events) {
    if (e.type === 'success') {
      successCount += 1
      if (e.grade === 'perfect') perfect += 1
      else if (e.grade === 'ok') ok += 1
      else late += 1
      if (e.usedQueue) queueUsed += 1
    } else if (e.type === 'wrong_input') {
      wrongInput += 1
    } else if (e.type === 'other_fail') {
      otherFail += 1
    }
  }

  return {
    totalSteps,
    successCount,
    perfect,
    ok,
    late,
    wrongInput,
    otherFail,
    queueUsed,
    events: [...events],
    elapsedMs,
  }
}
