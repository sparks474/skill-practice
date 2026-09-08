#!/usr/bin/env tsx
/**
 * 踊り子スキルデータの基本検証。
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

function castOk(msg: string): boolean {
  return (
    msg.includes('発動') ||
    msg.startsWith('空き') ||
    msg.includes('ゲージ溢れ')
  )
}

const dnc = getSkillsForJob('DNC')
assert(dnc.length >= 25, `DNC skill count >=25 (got ${dnc.length})`)
assert(dnc.some((s) => s.id === 'cascade'), 'has cascade')
assert(dnc.some((s) => s.id === 'saber_dance'), 'has saber_dance')
assert(dnc.some((s) => s.id === 'potion'), 'shared potion on DNC')
assert(getSkill('en_avant')?.charges === 3, 'en avant 3 charges')
assert(
  getSkill('standard_step')?.sharedRecastGroup ===
    getSkill('finishing_move')?.sharedRecastGroup,
  'standard shares with finishing move',
)
assert(getSkill('technical_step')?.recastMs === 120_000, 'tech step 120s')
assert(getSkill('flourish')?.recastMs === 60_000, 'flourish 60s')
assert(getSkill('shield_samba')?.recastMs === 90_000, 'samba 90s')

{
  const rotation: Rotation = {
    id: 'dnc-test',
    name: 'dnc',
    jobId: 'DNC',
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 50 },
    updatedAt: 0,
    steps: [
      { skillId: 'flourish' },
      { skillId: 'reverse_cascade' },
      { skillId: 'fan_dance' },
      { skillId: 'fan_dance_iii' },
      { skillId: 'saber_dance' },
      { skillId: 'devilment' },
      { skillId: 'starfall_dance' },
      { skillId: 'standard_step' },
      { skillId: 'emboite' },
      { skillId: 'entrechat' },
      { skillId: 'standard_finish' },
      { skillId: 'last_dance' },
    ],
  }
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  assert(castOk(rt.handleInput('flourish')), 'flourish')
  assert(rt.getSnapshot().hasSilkenSymmetry, 'symmetry from flourish')
  assert(rt.getSnapshot().hasFinishingMove, 'FM from flourish')
  rt.advanceTo(700)
  assert(castOk(rt.handleInput('reverse_cascade')), 'reverse cascade')
  assert(rt.getSnapshot().overheatStacks === 1, 'feather +1')
  rt.advanceTo(1400)
  assert(castOk(rt.handleInput('fan_dance')), 'fan dance')
  assert(rt.getSnapshot().overheatStacks === 0, 'feather consumed')
  rt.advanceTo(2100)
  assert(castOk(rt.handleInput('fan_dance_iii')), 'fan dance III')
  rt.advanceTo(3200)
  assert(castOk(rt.handleInput('saber_dance')), 'saber at esprit 50')
  assert(rt.getSnapshot().gauges.battery === 0, 'esprit spent')
  rt.advanceTo(3900)
  assert(castOk(rt.handleInput('devilment')), 'devilment')
  assert(rt.getSnapshot().hasStarfall, 'starfall ready')
  rt.advanceTo(6400)
  assert(castOk(rt.handleInput('starfall_dance')), 'starfall')
  // starfall 後 GCD 8900
  rt.advanceTo(8900)
  assert(castOk(rt.handleInput('standard_step')), 'standard step')
  assert(rt.getSnapshot().hasDanceMode, 'dance mode')
  rt.advanceTo(10_400)
  assert(castOk(rt.handleInput('emboite')), 'emboite')
  rt.advanceTo(11_400)
  assert(castOk(rt.handleInput('entrechat')), 'entrechat')
  rt.advanceTo(12_400)
  assert(castOk(rt.handleInput('standard_finish')), 'standard finish')
  assert(!rt.getSnapshot().hasDanceMode, 'dance mode ended')
  assert(rt.getSnapshot().hasLastDance, 'last dance ready')
  rt.advanceTo(13_900)
  assert(castOk(rt.handleInput('last_dance')), 'last dance')
  assert(rt.getSnapshot().finished, 'rotation finished')
}

{
  const rotation: Rotation = {
    id: 'dnc-esprit-fail',
    name: 'dnc',
    jobId: 'DNC',
    gcdMs: 2500,
    initialGauges: { heat: 0, battery: 40 },
    updatedAt: 0,
    steps: [{ skillId: 'saber_dance' }],
  }
  const rt = new PracticeRuntime(rotation, DEFAULT_ENGINE_CONFIG)
  rt.advanceTo(0)
  const msg = rt.handleInput('saber_dance')
  assert(msg.includes('エスプリ'), `saber blocked (${msg})`)
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll DNC skill tests passed')
