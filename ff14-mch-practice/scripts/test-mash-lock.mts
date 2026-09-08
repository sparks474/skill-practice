#!/usr/bin/env tsx
/**
 * 発動後の連打猶予中に、直前スキルの再入力が押し間違いにならないことを検証。
 */
import { PracticeRuntime } from '../src/engine/runtime'
import { DEFAULT_ENGINE_CONFIG, type Rotation } from '../src/types'

const rotation: Rotation = {
  id: 'mash-lock',
  name: 'mash test',
  jobId: 'MCH',
  gcdMs: 2500,
  initialGauges: { heat: 100, battery: 0 },
  updatedAt: 0,
  steps: [
    { skillId: 'reassemble' },
    { skillId: 'air_anchor' },
  ],
}

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
  const config = {
    ...DEFAULT_ENGINE_CONFIG,
    defaultAnimationLockMs: 670,
    remashGraceMs: 1000,
  }
  const rt = new PracticeRuntime(rotation, config)
  rt.advanceTo(0)
  const msg = rt.handleInput('reassemble')
  assert(msg.startsWith('発動'), `first cast ok (${msg})`)

  const lockUntil = rt.getSnapshot().animLockUntil
  assert(lockUntil === 670, `anim lock 670 (${lockUntil})`)

  // 硬直中
  rt.advanceTo(500)
  assert(
    rt.handleInput('reassemble') === '連打猶予（無視）',
    'during anim lock ignored',
  )

  // 硬直明け〜猶予内（670〜1000）
  rt.advanceTo(800)
  assert(
    rt.handleInput('reassemble') === '連打猶予（無視）',
    'after lock but within grace ignored',
  )
  assert(rt.getSummary().wrongInput === 0, 'no wrong during grace')

  // 猶予明け
  rt.advanceTo(1000)
  assert(
    rt.handleInput('reassemble') === '押し間違い',
    'after grace is wrong_input',
  )
  assert(rt.getSummary().wrongInput === 1, 'one wrong after grace')
}

{
  // 猶予 < 硬直でも硬直中は無視（max）
  const rt = new PracticeRuntime(rotation, {
    ...DEFAULT_ENGINE_CONFIG,
    defaultAnimationLockMs: 670,
    remashGraceMs: 200,
  })
  rt.advanceTo(0)
  rt.handleInput('reassemble')
  rt.advanceTo(400)
  assert(
    rt.handleInput('reassemble') === '連打猶予（無視）',
    'short grace still covers anim lock',
  )
  rt.advanceTo(670)
  assert(
    rt.handleInput('reassemble') === '押し間違い',
    'after max(lock,grace) is miss',
  )
}

{
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  rt.handleInput('reassemble')
  rt.advanceTo(100)
  assert(
    rt.handleInput('drill') === '押し間違い',
    'other skill during grace is miss',
  )
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nremash-grace checks passed')
