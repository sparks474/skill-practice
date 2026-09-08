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
    },
    null,
    2,
  ),
)
if (!result.ok) process.exit(1)
