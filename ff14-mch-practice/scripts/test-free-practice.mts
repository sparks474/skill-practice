#!/usr/bin/env tsx
/**
 * フリー練習: スキル記録・空き時間・ゲージ溢れの基本検証。
 */
import {
  createFreePracticeRotation,
  FreePracticeRuntime,
} from '../src/engine/freeRuntime'
import { DEFAULT_ENGINE_CONFIG } from '../src/types'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    failed += 1
  } else {
    console.log(`OK: ${msg}`)
  }
}

const config = {
  ...DEFAULT_ENGINE_CONFIG,
  activationSlackMs: 100,
}

{
  const rot = createFreePracticeRotation('MCH', 2500, {
    heat: 100,
    battery: 0,
  })
  const rt = new FreePracticeRuntime(rot, config)
  rt.beginRecording()
  // 開始直後に空き 500ms → slack 100 で無駄 400
  rt.advanceTo(500)
  rt.handleInput('heated_split_shot')
  const snap = rt.getSnapshot()
  assert(
    snap.events.some(
      (e) => e.type === 'cast' && e.skillId === 'heated_split_shot',
    ),
    'cast recorded',
  )
  assert(
    snap.events.some(
      (e) =>
        e.type === 'gauge_overflow' &&
        e.gauge === 'heat' &&
        e.skillId === 'heated_split_shot',
    ),
    'heat overflow at 100',
  )
  assert(snap.heatOverflow === 1, `heatOverflow=1 (got ${snap.heatOverflow})`)
  assert(
    Math.abs(snap.idleWasteMs - 400) < 1,
    `idle ~400 after first cast (got ${snap.idleWasteMs})`,
  )
}

{
  const rot = createFreePracticeRotation('MCH', 2500, {
    heat: 0,
    battery: 0,
  })
  const rt = new FreePracticeRuntime(rot, config)
  rt.beginRecording()
  rt.advanceTo(0)
  rt.handleInput('heated_split_shot') // idle 0 within slack
  rt.advanceTo(2500)
  rt.handleInput('heated_split_shot')
  const summary = rt.endRecording()
  assert(summary.castCount === 2, `castCount=2 (got ${summary.castCount})`)
  assert(summary.heatOverflow === 0, 'no overflow from 0 heat')
  // second cast at readyAt=2500 → idle 0 (exact)
  assert(
    summary.idleWasteMs === 0,
    `no idle when on-GCD (got ${summary.idleWasteMs})`,
  )
}

{
  const rot = createFreePracticeRotation('MCH', 2500)
  const rt = new FreePracticeRuntime(rot, config)
  rt.beginRecording()
  rt.advanceTo(800)
  const summary = rt.endRecording()
  assert(
    Math.abs(summary.idleWasteMs - 700) < 1,
    `end flushes idle ~700 (got ${summary.idleWasteMs})`,
  )
  assert(summary.castCount === 0, 'no casts')
}

{
  const rot = createFreePracticeRotation('MCH', 2500, {
    heat: 100,
    battery: 100,
  })
  const rt = new FreePracticeRuntime(rot, config)
  rt.beginRecording()
  // heated_clean_shot: heat+5 battery+10
  rt.advanceTo(0)
  rt.handleInput('heated_clean_shot')
  const s = rt.getSummary()
  assert(s.heatOverflow === 1, 'clean_shot heat overflow')
  assert(s.batteryOverflow === 1, 'clean_shot battery overflow')
}

{
  const rot = createFreePracticeRotation('MCH', 2500, {
    heat: 0,
    battery: 100,
  })
  const rt = new FreePracticeRuntime(rot, config)
  rt.beginRecording()
  rt.advanceTo(0)
  rt.handleInput('air_anchor') // battery+20 only
  const s = rt.getSummary()
  assert(s.heatOverflow === 0, 'air_anchor no heat overflow')
  assert(s.batteryOverflow === 1, 'air_anchor battery overflow')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll free-practice tests passed')
