import { useEffect, useMemo, useRef, useState } from 'react'
import { getSkill } from '../data/skills'
import {
  afterSuccessfulCast,
  createInitialSwapActive,
  effectiveKey,
  getSwapPartner,
  slotIdFor,
} from '../data/skillSlots'
import { PracticeRuntime, type RuntimeSnapshot } from '../engine/runtime'
import { formatKeyLabel, isMovementKey, normalizeKeyEvent, skillIdForKey } from '../input/keys'
import type {
  EngineConfig,
  Keybinds,
  MovementKeys,
  PracticeSummary,
  Rotation,
} from '../types'

type Props = {
  rotation: Rotation
  keybinds: Keybinds
  movementKeys: MovementKeys
  config: EngineConfig
  onFinish: (summary: PracticeSummary) => void
  onAbort: () => void
}

const HOTBAR_IDS = [
  'reassemble',
  'potion',
  'air_anchor',
  'drill',
  'chain_saw',
  'excavator',
  'double_check',
  'checkmate',
  'barrel_stabilizer',
  'wildfire',
  'full_metal_burst',
  'hypercharge',
  'blazing_shot',
  'automaton_queen',
  'heated_split_shot',
  'heated_slug_shot',
  'heated_clean_shot',
]

export function PracticeView({
  rotation,
  keybinds,
  movementKeys,
  config,
  onFinish,
  onAbort,
}: Props) {
  const runtimeRef = useRef<PracticeRuntime | null>(null)
  const startWallRef = useRef<number>(0)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const swapActiveRef = useRef<Record<string, string>>(
    createInitialSwapActive(keybinds),
  )
  const [snap, setSnap] = useState<RuntimeSnapshot | null>(null)
  const [running, setRunning] = useState(false)
  const [swapActive, setSwapActive] = useState<Record<string, string>>(() =>
    createInitialSwapActive(keybinds),
  )

  const hotbar = useMemo(() => {
    const ids = new Set<string>([
      ...HOTBAR_IDS,
      ...rotation.steps.map((s) => s.skillId),
    ])
    const result: string[] = []
    const seenSlots = new Set<string>()

    for (const id of ids) {
      if (keybinds[id]?.unused) continue
      const skill = getSkill(id)
      if (!skill) continue

      const partner = getSwapPartner(keybinds, id)
      if (partner) {
        const slot = slotIdFor(id, partner)
        if (seenSlots.has(slot)) continue
        seenSlots.add(slot)
        const activeId = swapActive[slot] ?? id
        const activeSkill = getSkill(activeId)
        if (activeSkill && !keybinds[activeId]?.unused) {
          result.push(activeId)
        }
        continue
      }
      result.push(id)
    }

    return result
      .map((id) => getSkill(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
  }, [rotation.steps, keybinds, swapActive])

  function sync() {
    const rt = runtimeRef.current
    if (!rt) return
    setSnap(rt.getSnapshot())
  }

  function applyInput(skillId: string) {
    const rt = runtimeRef.current
    if (!rt || !running) return
    const beforeEvents = rt.getSnapshot().events.length
    const elapsed = performance.now() - startWallRef.current
    rt.advanceTo(elapsed)
    rt.handleInput(skillId)
    const after = rt.getSnapshot()
    const newEvents = after.events.slice(beforeEvents)
    const success = newEvents.find(
      (e) => e.type === 'success' && e.skillId === skillId,
    )
    if (success) {
      setSwapActive((prev) => {
        const next = afterSuccessfulCast(prev, skillId, keybinds)
        swapActiveRef.current = next
        return next
      })
    }
    setSnap(after)
  }

  function start() {
    runtimeRef.current = new PracticeRuntime(rotation, config)
    startWallRef.current = performance.now()
    const initial = createInitialSwapActive(keybinds)
    swapActiveRef.current = initial
    setSwapActive(initial)
    setRunning(true)
    sync()
  }

  useEffect(() => {
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation.id, config, keybinds])

  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => {
      const rt = runtimeRef.current
      if (!rt) return
      const elapsed = performance.now() - startWallRef.current
      const beforeEvents = rt.getSnapshot().events.length
      rt.advanceTo(elapsed)
      const s = rt.getSnapshot()
      // キュー発火の成功でも置き換えを進める
      const newEvents = s.events.slice(beforeEvents)
      for (const e of newEvents) {
        if (e.type === 'success') {
          const next = afterSuccessfulCast(
            swapActiveRef.current,
            e.skillId,
            keybinds,
          )
          swapActiveRef.current = next
          setSwapActive(next)
        }
      }
      setSnap(s)
      if (s.finished) {
        setRunning(false)
        onFinishRef.current(rt.getSummary())
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, keybinds])

  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = normalizeKeyEvent(e)
      // 移動キーは完全無視（ミス判定もしない）
      if (isMovementKey(movementKeys, key)) {
        e.preventDefault()
        return
      }
      const skillId = skillIdForKey(keybinds, key, swapActiveRef.current)
      if (!skillId) return
      e.preventDefault()
      applyInput(skillId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, keybinds, movementKeys])

  function clickSkill(skillId: string) {
    const bind = keybinds[skillId]
    if (effectiveKey(keybinds, skillId) && bind?.mouse === false) return
    applyInput(skillId)
  }

  if (!snap) return null

  const view = snap
  const expectedId = rotation.steps[view.stepIndex]?.skillId
  const expected = expectedId ? getSkill(expectedId) : null
  const upcoming = rotation.steps
    .slice(view.stepIndex + 1, view.stepIndex + 5)
    .map((s) => getSkill(s.skillId)?.nameJa ?? s.skillId)

  const gcdTotal = rotation.gcdMs
  const gcdLeft = Math.max(0, view.gcdReadyAt - view.nowMs)
  const gcdPct = gcdTotal <= 0 ? 0 : Math.min(100, (gcdLeft / gcdTotal) * 100)

  function formatCooldown(skillId: string): string {
    const skill = getSkill(skillId)
    if (!skill) return '—'
    if (skill.charges == null && skill.recastMs <= 0) return '—'
    const cd = view.cooldowns[skillId] ?? { remainingMs: 0 }
    if (skill.charges != null && cd.maxCharges != null && cd.charges != null) {
      const chargeText = `${cd.charges}/${cd.maxCharges}`
      if (cd.charges >= cd.maxCharges || cd.remainingMs <= 0) return chargeText
      return `${chargeText} · ${(cd.remainingMs / 1000).toFixed(1)}s`
    }
    if (cd.remainingMs <= 0) return 'Ready'
    return `${(cd.remainingMs / 1000).toFixed(1)}s`
  }

  return (
    <div className="page practice">
      <header className="page-header compact">
        <div>
          <p className="brand">MCH Practice</p>
          <h1>{rotation.name}</h1>
          <p className="lead">
            {snap.stepIndex + 1} / {rotation.steps.length} ·{' '}
            {(snap.nowMs / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onAbort}>
            中断
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              start()
            }}
          >
            やり直し
          </button>
        </div>
      </header>

      <section className="practice-focus">
        <p className="next-label">次</p>
        <p className="next-skill">{expected?.nameJa ?? '—'}</p>
        <p className="upcoming">
          予告: {upcoming.length ? upcoming.join(' → ') : '（終了）'}
        </p>
        {snap.queuedSkillId ? (
          <p className="queue">
            予約: {getSkill(snap.queuedSkillId)?.nameJa ?? snap.queuedSkillId}
          </p>
        ) : (
          <p className="queue muted">予約なし</p>
        )}
        {snap.lastFeedback ? (
          <p className="feedback">{snap.lastFeedback}</p>
        ) : (
          <p className="feedback muted">入力待ち</p>
        )}
      </section>

      <section className="gauges" aria-label="ゲージ">
        <div className="gauge">
          <div className="gauge-label">
            <span>ヒート</span>
            <span>{snap.gauges.heat}</span>
          </div>
          <div className="gauge-track">
            <div
              className="gauge-fill heat"
              style={{ width: `${snap.gauges.heat}%` }}
            />
          </div>
        </div>
        <div className="gauge">
          <div className="gauge-label">
            <span>バッテリー</span>
            <span>{snap.gauges.battery}</span>
          </div>
          <div className="gauge-track">
            <div
              className="gauge-fill battery"
              style={{ width: `${snap.gauges.battery}%` }}
            />
          </div>
        </div>
        <div className="status-pills">
          <span>OH×{snap.overheatStacks}</span>
          <span>{snap.hasFullMetal ? 'フルメタル準備' : 'FMなし'}</span>
          <span>
            {snap.hasHyperchargeReady ? 'HC実行可' : 'HC通常'}
          </span>
        </div>
      </section>

      <section className="timers" aria-label="タイマー">
        <div className="timer">
          <div className="gauge-label">
            <span>GCD</span>
            <span>{(gcdLeft / 1000).toFixed(2)}s</span>
          </div>
          <div className="gauge-track">
            <div className="gauge-fill gcd" style={{ width: `${gcdPct}%` }} />
          </div>
        </div>
      </section>

      <section className="hotbar" aria-label="ホットバー">
        {hotbar.map((skill) => {
          const partner = getSwapPartner(keybinds, skill.id)
          const isNext = skill.id === expectedId
          const cd = snap.cooldowns[skill.id]
          const onCd =
            (cd?.remainingMs ?? 0) > 0 &&
            (skill.charges == null || (cd?.charges ?? 0) <= 0)
          return (
            <button
              key={partner ? slotIdFor(skill.id, partner) : skill.id}
              type="button"
              className={`hotbar-btn ${isNext ? 'next' : ''} ${partner ? 'swappable' : ''} ${onCd ? 'on-cd' : ''}`}
              onClick={() => clickSkill(skill.id)}
            >
              <span className="hotbar-name">{skill.nameJa}</span>
              <span className="hotbar-key">
                {formatKeyLabel(effectiveKey(keybinds, skill.id))}
                {partner ? ` ↔ ${getSkill(partner)?.nameJa ?? ''}` : ''}
              </span>
              <span className="hotbar-cd">{formatCooldown(skill.id)}</span>
            </button>
          )
        })}
      </section>
    </div>
  )
}
