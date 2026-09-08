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
import {
  loadHighlightNextHotbar,
  saveHighlightNextHotbar,
} from '../storage'
import type {
  EngineConfig,
  HotbarLayout,
  Keybinds,
  MovementKeys,
  PracticeSummary,
  Rotation,
  ScoreEvent,
} from '../types'

type Props = {
  rotation: Rotation
  keybinds: Keybinds
  movementKeys: MovementKeys
  hotbarLayout: HotbarLayout
  config: EngineConfig
  onFinish: (summary: PracticeSummary) => void
  onAbort: () => void
}

/** 成功イベント列から置き換え枠の現在スキルを復元（二重更新・取りこぼし防止） */
function swapActiveFromEvents(
  events: ScoreEvent[],
  keybinds: Keybinds,
): Record<string, string> {
  let active = createInitialSwapActive(keybinds)
  for (const e of events) {
    if (e.type === 'success') {
      active = afterSuccessfulCast(active, e.skillId, keybinds)
    }
  }
  return active
}

export function PracticeView({
  rotation,
  keybinds,
  movementKeys,
  hotbarLayout,
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
  const [highlightNext, setHighlightNext] = useState(() =>
    loadHighlightNextHotbar(),
  )

  const hotbarCells = useMemo(() => {
    return hotbarLayout.slots.map((layoutId) => {
      if (!layoutId) return null
      if (keybinds[layoutId]?.unused) return null
      const partner = getSwapPartner(keybinds, layoutId)
      if (partner) {
        const slot = slotIdFor(layoutId, partner)
        const activeId = swapActive[slot] ?? layoutId
        if (keybinds[activeId]?.unused) return null
        return getSkill(activeId) ?? null
      }
      return getSkill(layoutId) ?? null
    })
  }, [hotbarLayout.slots, keybinds, swapActive])

  function syncSwapFromSnapshot(snapshot: RuntimeSnapshot) {
    const next = swapActiveFromEvents(snapshot.events, keybinds)
    swapActiveRef.current = next
    setSwapActive(next)
  }

  function sync() {
    const rt = runtimeRef.current
    if (!rt) return
    const snapshot = rt.getSnapshot()
    syncSwapFromSnapshot(snapshot)
    setSnap(snapshot)
  }

  function applyInput(skillId: string) {
    const rt = runtimeRef.current
    if (!rt || !running) return
    const elapsed = performance.now() - startWallRef.current
    rt.advanceTo(elapsed)
    rt.handleInput(skillId)
    const after = rt.getSnapshot()
    syncSwapFromSnapshot(after)
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
      rt.advanceTo(elapsed)
      const s = rt.getSnapshot()
      syncSwapFromSnapshot(s)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const expected = runtimeRef.current?.expectedSkillId() ?? null
      const skillId = skillIdForKey(
        keybinds,
        key,
        swapActiveRef.current,
        expected,
      )
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
          <p className="brand">Skill Practice</p>
          <h1>{rotation.name}</h1>
          <p className="lead">
            {snap.stepIndex + 1} / {rotation.steps.length} ·{' '}
            {(snap.nowMs / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="header-actions">
          <label className="practice-toggle">
            <input
              type="checkbox"
              checked={highlightNext}
              onChange={(e) => {
                const on = e.target.checked
                setHighlightNext(on)
                saveHighlightNextHotbar(on)
              }}
            />
            次をハイライト
          </label>
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

      <section
        className="hotbar hotbar-grid"
        aria-label="ホットバー"
        style={{
          gridTemplateColumns: `repeat(${hotbarLayout.cols}, minmax(0, 1fr))`,
        }}
      >
        {hotbarCells.map((skill, index) => {
          if (!skill) {
            return <div key={`empty-${index}`} className="hotbar-slot empty" />
          }
          const partner = getSwapPartner(keybinds, skill.id)
          const isNext = highlightNext && skill.id === expectedId
          const cd = snap.cooldowns[skill.id]
          const onCd =
            (cd?.remainingMs ?? 0) > 0 &&
            (skill.charges == null || (cd?.charges ?? 0) <= 0)
          return (
            <button
              key={`${partner ? slotIdFor(skill.id, partner) : skill.id}-${index}`}
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
