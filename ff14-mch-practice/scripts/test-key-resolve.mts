#!/usr/bin/env tsx
/**
 * 置き換え枠キーが「押し間違い」になる回帰テスト。
 * PracticeView と同じ解決経路（skillIdForKey + expected 優先）で開幕を通す。
 */
import { createDefaultKeybinds } from '../src/data/defaultKeybinds'
import { SAMPLE_ROTATION } from '../src/data/sampleRotation'
import {
  afterSuccessfulCast,
  createInitialSwapActive,
  effectiveKey,
  slotIdFor,
} from '../src/data/skillSlots'
import { PracticeRuntime } from '../src/engine/runtime'
import { skillIdForKey } from '../src/input/keys'
import { getSkill } from '../src/data/skills'
import { DEFAULT_ENGINE_CONFIG, type ScoreEvent } from '../src/types'

const keybinds = createDefaultKeybinds()
const config = DEFAULT_ENGINE_CONFIG
let failed = 0

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    failed += 1
  } else {
    console.log(`OK: ${msg}`)
  }
}

function swapActiveFromEvents(events: ScoreEvent[]) {
  let active = createInitialSwapActive(keybinds)
  for (const e of events) {
    if (e.type === 'success') {
      active = afterSuccessfulCast(active, e.skillId, keybinds)
    }
  }
  return active
}

// --- Unit: desynced swap display must still resolve expected ---
{
  const slotCS = slotIdFor('chain_saw', 'excavator')
  const slotBH = slotIdFor('barrel_stabilizer', 'full_metal_burst')
  const keyCS = effectiveKey(keybinds, 'excavator')!
  const keyBH = effectiveKey(keybinds, 'full_metal_burst')!

  const desyncedCS = {
    ...createInitialSwapActive(keybinds),
    [slotCS]: 'chain_saw', // 表示は CS のまま（二重トグル等）
  }
  assert(
    skillIdForKey(keybinds, keyCS, desyncedCS, 'excavator') === 'excavator',
    'desynced CS slot + expected excavator → excavator',
  )
  assert(
    skillIdForKey(keybinds, keyCS, desyncedCS) === 'chain_saw',
    'desynced CS slot without expected → active (chain_saw) [legacy bug path]',
  )

  const desyncedFM = {
    ...createInitialSwapActive(keybinds),
    [slotBH]: 'barrel_stabilizer',
  }
  // after barrel success, active should be FM; force desync back to barrel
  assert(
    skillIdForKey(keybinds, keyBH, desyncedFM, 'full_metal_burst') ===
      'full_metal_burst',
    'desynced BH slot + expected FM → full_metal_burst',
  )
}

// --- Unit: stale active (toggle missed) + event rebuild ---
{
  const slot = slotIdFor('chain_saw', 'excavator')
  // 成功後も表示が CS のまま残るケース（トグル取りこぼし）
  const stale = createInitialSwapActive(keybinds)
  assert(stale[slot] === 'chain_saw', 'initial swap active is chain_saw')

  const rebuilt = swapActiveFromEvents([
    {
      type: 'success',
      skillId: 'chain_saw',
      stepIndex: 0,
      atMs: 0,
      grade: 'perfect',
      delayMs: 0,
    },
  ])
  assert(
    rebuilt[slot] === 'excavator',
    'swapActiveFromEvents with one CS success → excavator',
  )

  const key = effectiveKey(keybinds, 'excavator')!
  assert(
    skillIdForKey(keybinds, key, stale, 'excavator') === 'excavator',
    'stale active + expected excavator still resolves excavator',
  )
  assert(
    skillIdForKey(keybinds, key, stale) === 'chain_saw',
    'stale active without expected → chain_saw (user-facing miss)',
  )
}

// --- Integration: practice via keyboard resolve (like UI) ---
{
  const rt = new PracticeRuntime(SAMPLE_ROTATION, config)
  const log: string[] = []
  const maxMs = 180_000
  const tick = 10
  let wrong = 0

  for (let t = 0; t <= maxMs; t += tick) {
    rt.advanceTo(t)
    const snap = rt.getSnapshot()
    if (snap.finished) break

    const expectedId = rt.expectedSkillId()
    if (!expectedId) break
    const skill = getSkill(expectedId)
    if (!skill) break

    const key = effectiveKey(keybinds, expectedId)
    if (!key) {
      log.push(`no key for ${expectedId}`)
      wrong += 1
      break
    }

    // Intentionally desync swap display every tick (worst case old bug)
    const slotCS = slotIdFor('chain_saw', 'excavator')
    const slotBH = slotIdFor('barrel_stabilizer', 'full_metal_burst')
    const hostileActive = {
      ...swapActiveFromEvents(snap.events),
      [slotCS]: 'chain_saw',
      [slotBH]: 'barrel_stabilizer',
    }

    const resolved = skillIdForKey(
      keybinds,
      key,
      hostileActive,
      expectedId,
    )
    if (resolved !== expectedId) {
      log.push(
        `t=${t} resolve mismatch: key=${key} expected=${expectedId} got=${resolved}`,
      )
      wrong += 1
      break
    }

    const wait = rt.computeWaitMs(skill)
    if (wait <= config.queueWindowMs) {
      const msg = rt.handleInput(resolved!)
      if (msg === '押し間違い' || msg.startsWith('その他失敗')) {
        log.push(`t=${t} ${skill.nameJa}: ${msg}`)
        wrong += 1
        break
      }
    }
  }

  const summary = rt.getSummary()
  const snap = rt.getSnapshot()
  assert(wrong === 0, `no wrong_input during key-path opener (${wrong})`)
  assert(
    snap.finished &&
      summary.successCount === SAMPLE_ROTATION.steps.length &&
      summary.wrongInput === 0,
    `opener via key resolve finished clean (${summary.successCount}/${SAMPLE_ROTATION.steps.length}, wrong=${summary.wrongInput})`,
  )
  if (log.length) console.log(log.join('\n'))

  const events = rt.getSnapshot().events
  const excavatorOk = events.some(
    (e) => e.type === 'success' && e.skillId === 'excavator',
  )
  const fmOk = events.some(
    (e) => e.type === 'success' && e.skillId === 'full_metal_burst',
  )
  assert(excavatorOk, 'excavator step succeeded via shared key')
  assert(fmOk, 'full_metal_burst step succeeded via shared key')
}

// --- Contrast: without expected preference, hostile desync fails excavator ---
{
  const rt = new PracticeRuntime(SAMPLE_ROTATION, config)
  let hitWrong = false
  for (let t = 0; t <= 180_000; t += 10) {
    rt.advanceTo(t)
    if (rt.getSnapshot().finished) break
    const expectedId = rt.expectedSkillId()
    if (!expectedId) break
    const skill = getSkill(expectedId)!
    const key = effectiveKey(keybinds, expectedId)!
    const slotCS = slotIdFor('chain_saw', 'excavator')
    const hostile = {
      ...createInitialSwapActive(keybinds),
      [slotCS]: 'chain_saw',
    }
    // OLD path: no expected
    const resolved = skillIdForKey(keybinds, key, hostile)
    const wait = rt.computeWaitMs(skill)
    if (wait <= config.queueWindowMs) {
      const msg = rt.handleInput(resolved!)
      if (msg === '押し間違い') {
        hitWrong = true
        assert(
          expectedId === 'excavator' || expectedId === 'full_metal_burst',
          `legacy wrong_input at expected=${expectedId} (reproduces user bug)`,
        )
        break
      }
    }
  }
  assert(hitWrong, 'legacy path without expected preference still fails (sanity)')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll key-resolve regression checks passed')
