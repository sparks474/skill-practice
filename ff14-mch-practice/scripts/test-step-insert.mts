#!/usr/bin/env tsx
/**
 * 回し手順の挿入／並べ替えロジック検証（RotationEditor と同式）。
 */

type Step = { skillId: string; uid: string }

function insertStep(
  steps: Step[],
  item: Step,
  fromIndex: number | null,
  insertBefore: number,
): Step[] {
  const next = steps.slice()
  if (fromIndex != null) {
    next.splice(fromIndex, 1)
  }
  const dest =
    fromIndex != null && fromIndex < insertBefore
      ? insertBefore - 1
      : insertBefore
  next.splice(Math.max(0, Math.min(dest, next.length)), 0, item)
  return next
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

const A = { skillId: 'a', uid: '1' }
const B = { skillId: 'b', uid: '2' }
const C = { skillId: 'c', uid: '3' }
const D = { skillId: 'd', uid: '4' }

{
  const out = insertStep([A, B, C, D], A, 0, 2)
  assert(
    out.map((s) => s.skillId).join('') === 'bacd',
    `move A before C → bacd (got ${out.map((s) => s.skillId).join('')})`,
  )
}

{
  const out = insertStep([A, B, C, D], D, 3, 1)
  assert(
    out.map((s) => s.skillId).join('') === 'adbc',
    `move D before B → adbc (got ${out.map((s) => s.skillId).join('')})`,
  )
}

{
  const X = { skillId: 'x', uid: '9' }
  const out = insertStep([A, B, C], X, null, 1)
  assert(
    out.map((s) => s.skillId).join('') === 'axbc',
    `add X before B → axbc (got ${out.map((s) => s.skillId).join('')})`,
  )
}

{
  const X = { skillId: 'x', uid: '9' }
  const out = insertStep([A, B], X, null, 2)
  assert(
    out.map((s) => s.skillId).join('') === 'abx',
    `add X at end → abx (got ${out.map((s) => s.skillId).join('')})`,
  )
}

if (failed > 0) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nAll step-insert tests passed')
