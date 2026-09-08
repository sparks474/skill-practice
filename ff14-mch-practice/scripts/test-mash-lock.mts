#!/usr/bin/env tsx
/**
 * 先行入力連打の残りが、発動直後の硬直中に押し間違いになる問題の回帰テスト。
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
    { skillId: 'reassemble' }, // ability
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
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  const msg = rt.handleInput('reassemble')
  assert(msg.startsWith('発動'), `first cast ok (${msg})`)

  // 硬直中に同じスキルを連打（先行入力の残り想定）
  const lockUntil = rt.getSnapshot().animLockUntil
  assert(lockUntil > 0, `anim lock set (${lockUntil})`)

  for (let t = 10; t < lockUntil; t += 50) {
    rt.advanceTo(t)
    const r = rt.handleInput('reassemble')
    assert(r === '硬直中（無視）', `mash at t=${t} ignored (${r})`)
  }

  assert(
    rt.getSummary().wrongInput === 0,
    `no wrong_input during lock mash (${rt.getSummary().wrongInput})`,
  )

  // 硬直明け後に同じスキルを押すと押し間違い
  rt.advanceTo(lockUntil)
  const after = rt.handleInput('reassemble')
  assert(after === '押し間違い', `after lock is wrong_input (${after})`)
  assert(rt.getSummary().wrongInput === 1, 'exactly one wrong after lock')
}

{
  // 硬直中でも「別スキル」の押し間違いは従来どおり
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  rt.handleInput('reassemble')
  rt.advanceTo(100)
  const msg = rt.handleInput('drill') // neither last cast nor expected (air_anchor)
  assert(msg === '押し間違い', `other skill during lock is miss (${msg})`)
}

{
  // キュー発火直後の連打も無視
  const rt = new PracticeRuntime(rotation, {
    ...DEFAULT_ENGINE_CONFIG,
    queueWindowMs: 500,
  })
  // reassemble first immediately
  rt.advanceTo(0)
  rt.handleInput('reassemble')
  const afterRe = rt.getSnapshot().animLockUntil
  // queue air_anchor near end of anim lock
  rt.advanceTo(Math.max(0, afterRe - 100))
  const q = rt.handleInput('air_anchor')
  assert(q.startsWith('予約') || q.startsWith('発動'), `queue or cast (${q})`)
  // flush
  rt.advanceTo(afterRe + 10)
  const snap = rt.getSnapshot()
  assert(
    snap.events.some((e) => e.type === 'success' && e.skillId === 'air_anchor') ||
      rt.expectedSkillId() === 'air_anchor',
    'air_anchor progressed or still expected',
  )
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nmash-during-lock checks passed')
