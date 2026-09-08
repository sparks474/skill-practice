#!/usr/bin/env tsx
/**
 * 吟遊詩人スキルデータの基本検証。
 */
import { getSkill, getSkillsForJob } from '../src/data/skills'
import { PracticeRuntime } from '../src/engine/runtime'
import { DEFAULT_ENGINE_CONFIG, type Rotation } from '../src/types'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    failed += 1
  } else {
    console.log(`OK: ${msg}`)
  }
}

const brd = getSkillsForJob('BRD')
assert(brd.length >= 20, `BRD skill count >=20 (got ${brd.length})`)
assert(brd.some((s) => s.id === 'burst_shot'), 'has burst_shot')
assert(brd.some((s) => s.id === 'apex_arrow'), 'has apex_arrow')
assert(brd.some((s) => s.id === 'potion'), 'shared potion on BRD')
assert(getSkill('heartbreak_shot')?.charges === 3, 'HB 3 charges')
assert(
  getSkill('heartbreak_shot')?.sharedRecastGroup ===
    getSkill('rain_of_death')?.sharedRecastGroup,
  'HB shares recast with RoD',
)
assert(getSkill('radiant_finale')?.recastMs === 110_000, 'RF 110s')
assert(getSkill('troubadour')?.recastMs === 90_000, 'Troubadour 90s')

{
  const rotation: Rotation = {
    id: 'brd-test',
    name: 'brd',
    jobId: 'BRD',
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 80 },
    updatedAt: 0,
    steps: [
      { skillId: 'barrage' },
      { skillId: 'refulgent_arrow' },
      { skillId: 'apex_arrow' },
      { skillId: 'blast_arrow' },
      { skillId: 'radiant_finale' },
      { skillId: 'radiant_encore' },
    ],
  }
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  assert(rt.handleInput('barrage').includes('発動'), 'barrage')
  rt.advanceTo(700)
  assert(rt.handleInput('refulgent_arrow').includes('発動'), 'refulgent after HE')
  rt.advanceTo(3200)
  assert(rt.handleInput('apex_arrow').includes('発動'), 'apex at SV80')
  assert(rt.getSnapshot().gauges.battery === 0, 'SV consumed')
  assert(rt.getSnapshot().hasBlastArrow, 'blast ready after SV80 apex')
  rt.advanceTo(5700)
  assert(rt.handleInput('blast_arrow').includes('発動'), 'blast arrow')
  rt.advanceTo(6400)
  assert(rt.handleInput('radiant_finale').includes('発動'), 'radiant finale')
  assert(rt.getSnapshot().hasRadiantEncore, 'encore ready')
  rt.advanceTo(8200)
  assert(rt.handleInput('radiant_encore').includes('発動'), 'radiant encore')
  assert(rt.getSnapshot().finished, 'rotation finished')
}

{
  const rotation: Rotation = {
    id: 'brd-he-fail',
    name: 'brd',
    jobId: 'BRD',
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 0 },
    updatedAt: 0,
    steps: [{ skillId: 'refulgent_arrow' }],
  }
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  const msg = rt.handleInput('refulgent_arrow')
  assert(msg.includes('ホークアイ'), `refulgent blocked (${msg})`)
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll BRD skill tests passed')
