import { useEffect, useMemo, useRef, useState } from 'react'
import { getSkill } from '../data/skills'
import { PracticeRuntime, type RuntimeSnapshot } from '../engine/runtime'
import { formatKeyLabel, normalizeKeyEvent, skillIdForKey } from '../input/keys'
import type {
  EngineConfig,
  Keybinds,
  PracticeSummary,
  Rotation,
} from '../types'

type Props = {
  rotation: Rotation
  keybinds: Keybinds
  config: EngineConfig
  onFinish: (summary: PracticeSummary) => void
  onAbort: () => void
}

const HOTBAR_IDS = [
  'reassemble',
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
  config,
  onFinish,
  onAbort,
}: Props) {
  const runtimeRef = useRef<PracticeRuntime | null>(null)
  const startWallRef = useRef<number>(0)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const [snap, setSnap] = useState<RuntimeSnapshot | null>(null)
  const [running, setRunning] = useState(false)

  const hotbar = useMemo(() => {
    const ids = new Set<string>([
      ...HOTBAR_IDS,
      ...rotation.steps.map((s) => s.skillId),
    ])
    return [...ids]
      .map((id) => getSkill(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
  }, [rotation.steps])

  function sync() {
    const rt = runtimeRef.current
    if (!rt) return
    setSnap(rt.getSnapshot())
  }

  function start() {
    runtimeRef.current = new PracticeRuntime(rotation, config)
    startWallRef.current = performance.now()
    setRunning(true)
    sync()
  }

  useEffect(() => {
    start()
    // 回転／設定が変わったら練習をやり直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation.id, config])

  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => {
      const rt = runtimeRef.current
      if (!rt) return
      const elapsed = performance.now() - startWallRef.current
      rt.advanceTo(elapsed)
      const s = rt.getSnapshot()
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
  }, [running])

  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = normalizeKeyEvent(e)
      const skillId = skillIdForKey(keybinds, key)
      if (!skillId) return
      e.preventDefault()
      const rt = runtimeRef.current
      if (!rt) return
      const elapsed = performance.now() - startWallRef.current
      rt.advanceTo(elapsed)
      rt.handleInput(skillId)
      sync()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, keybinds])

  function clickSkill(skillId: string) {
    const bind = keybinds[skillId]
    if (bind?.key && bind.mouse === false) return
    const rt = runtimeRef.current
    if (!rt || !running) return
    const elapsed = performance.now() - startWallRef.current
    rt.advanceTo(elapsed)
    rt.handleInput(skillId)
    sync()
  }

  if (!snap) return null

  const expectedId = rotation.steps[snap.stepIndex]?.skillId
  const expected = expectedId ? getSkill(expectedId) : null
  const upcoming = rotation.steps
    .slice(snap.stepIndex + 1, snap.stepIndex + 5)
    .map((s) => getSkill(s.skillId)?.nameJa ?? s.skillId)

  const gcdTotal = rotation.gcdMs
  const gcdLeft = Math.max(0, snap.gcdReadyAt - snap.nowMs)
  const animLeft = Math.max(0, snap.animLockUntil - snap.nowMs)
  const gcdPct = gcdTotal <= 0 ? 0 : Math.min(100, (gcdLeft / gcdTotal) * 100)
  const animPct = Math.min(
    100,
    (animLeft / Math.max(1, config.defaultAnimationLockMs)) * 100,
  )

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
        <div className="timer">
          <div className="gauge-label">
            <span>硬直</span>
            <span>{(animLeft / 1000).toFixed(2)}s</span>
          </div>
          <div className="gauge-track">
            <div className="gauge-fill anim" style={{ width: `${animPct}%` }} />
          </div>
        </div>
      </section>

      <section className="hotbar" aria-label="ホットバー">
        {hotbar.map((skill) => {
          const bind = keybinds[skill.id]
          const isNext = skill.id === expectedId
          return (
            <button
              key={skill.id}
              type="button"
              className={`hotbar-btn ${isNext ? 'next' : ''}`}
              onClick={() => clickSkill(skill.id)}
            >
              <span className="hotbar-name">{skill.nameJa}</span>
              <span className="hotbar-key">{formatKeyLabel(bind?.key)}</span>
            </button>
          )
        })}
      </section>
    </div>
  )
}
