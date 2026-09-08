#!/usr/bin/env tsx
import { SAMPLE_ROTATION } from '../src/data/sampleRotation'
import { DEFAULT_ENGINE_CONFIG } from '../src/types'
import { simulateOpener } from '../src/engine/simulate'

const result = simulateOpener(SAMPLE_ROTATION, DEFAULT_ENGINE_CONFIG)
for (const line of result.log) {
  console.log(line)
}
console.log('---')
console.log(
  JSON.stringify(
    {
      ok: result.ok,
      stepsCompleted: result.stepsCompleted,
      totalSteps: result.totalSteps,
      elapsedMs: result.elapsedMs,
      otherFails: result.otherFails,
      idleWasteMs: result.idleWasteMs,
      wrongInput: result.wrongInput,
    },
    null,
    2,
  ),
)
if (!result.ok) process.exit(1)
if (result.idleWasteMs > 0) {
  console.error(`expected idleWasteMs=0 for optimal sim, got ${result.idleWasteMs}`)
  process.exit(1)
}
if (result.wrongInput > 0) {
  console.error(`expected wrongInput=0, got ${result.wrongInput}`)
  process.exit(1)
}
