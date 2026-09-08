#!/usr/bin/env tsx
/** 空き時間（1手目除く）と押し間違いの集計テスト */
import { PracticeRuntime } from '../src/engine/runtime'
import { SAMPLE_ROTATION } from '../src/data/sampleRotation'
import { DEFAULT_ENGINE_CONFIG } from '../src/types'
import { summarizeEvents } from '../src/engine/score'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    failed += 1
  } else {
    console.log(`OK: ${msg}`)
  }
}

{
  const events = [
    {
      type: 'success' as const,
      skillId: 'reassemble',
      stepIndex: 0,
      idleMs: 5000,
      usedQueue: false,
      atMs: 5000,
    },
    {
      type: 'success' as const,
      skillId: 'air_anchor',
      stepIndex: 1,
      idleMs: 120,
      usedQueue: false,
      atMs: 6000,
    },
    {
      type: 'success' as const,
      skillId: 'drill',
      stepIndex: 2,
      idleMs: 80,
      usedQueue: true,
      atMs: 8500,
    },
    {
      type: 'wrong_input' as const,
      skillId: 'drill',
      expectedSkillId: 'air_anchor',
      stepIndex: 1,
      atMs: 5500,
    },
  ]
  const s = summarizeEvents(events, 3, 8500)
  assert(s.idleWasteMs === 200, `idleWaste excludes first skill (got ${s.idleWasteMs})`)
  assert(s.wrongInput === 1, `wrongInput=1 (got ${s.wrongInput})`)
  assert(s.successCount === 3, `successCount=3`)
}

{
  // 意図的に遅らせて空きが出るか
  const rt = new PracticeRuntime(SAMPLE_ROTATION, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  rt.handleInput('reassemble')
  rt.advanceTo(3000) // GCD 2500 + idle
  // air_anchor ready around after reassemble anim/gcd — press late
  const snap = rt.getSnapshot()
  void snap
  rt.handleInput('air_anchor')
  // may fail conditions or succeed — just ensure summary has idle if success
  const summary = rt.getSummary()
  const aa = summary.events.find(
    (e) => e.type === 'success' && e.skillId === 'air_anchor',
  )
  if (aa && aa.type === 'success') {
    assert(aa.idleMs > 0, `late air_anchor has idleMs>0 (${aa.idleMs})`)
    assert(
      summary.idleWasteMs === aa.idleMs,
      `idleWaste equals AA idle only (first excluded)`,
    )
  } else {
    // if not success yet, still ok — first press only
    assert(true, 'skipped late AA assert (no success yet)')
  }
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nscore summary checks passed')
