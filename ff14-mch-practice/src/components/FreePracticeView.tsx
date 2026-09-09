import { useEffect, useMemo, useRef, useState } from 'react'
import { playSkillCastSfx } from '../audio/castSfx'
import { getSkill } from '../data/skills'
import {
  afterSuccessfulCast,
  createInitialSwapActive,
  effectiveKey,
  getSwapPartner,
  slotIdFor,
} from '../data/skillSlots'
import {
  createFreePracticeRotation,
  FreePracticeRuntime,
  type FreeRuntimeSnapshot,
} from '../engine/freeRuntime'
import { formatKeyLabel, isMovementKey, normalizeKeyEvent, skillIdForKey } from '../input/keys'
import type {
  EngineConfig,
  FreePracticeSummary,
  FreeScoreEvent,
  HotbarLayout,
  JobId,
  Keybinds,
  MovementKeys,
} from '../types'

const COUNTDOWN_SEC = 10

type Phase = 'idle' | 'countdown' | 'recording'

type Props = {
  jobId: JobId
  jobNameJa: string
  gcdMs: number
  keybinds: Keybinds
  movementKeys: MovementKeys
  hotbarLayout: HotbarLayout
  config: EngineConfig
  onFinish: (summary: FreePracticeSummary) => void
  onAbort: () => void
}

function swapActiveFromFreeEvents(
  events: FreeScoreEvent[],
  keybinds: Keybinds,
): Record<string, string> {
  let active = createInitialSwapActive(keybinds)
  for (const e of events) {
    if (e.type === 'cast') {
      active = afterSuccessfulCast(active, e.skillId, keybinds)
    }
  }
  return active
}

function countCasts(events: FreeScoreEvent[]): number {
  return events.reduce((n, e) => (e.type === 'cast' ? n + 1 : n), 0)
}

export function FreePracticeView({
  jobId,
  jobNameJa,
  gcdMs,
  keybinds,
  movementKeys,
  hotbarLayout,
  config,
  onFinish,
  onAbort,
}: Props) {
  const runtimeRef = useRef<FreePracticeRuntime | null>(null)
  const startWallRef = useRef<number>(0)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const castCountRef = useRef(0)
  const swapActiveRef = useRef<Record<string, string>>(
    createInitialSwapActive(keybinds),
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
  const [snap, setSnap] = useState<FreeRuntimeSnapshot | null>(null)
  const [swapActive, setSwapActive] = useState<Record<string, string>>(() =>
    createInitialSwapActive(keybinds),
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

  function syncSwap(snapshot: FreeRuntimeSnapshot) {
    const next = swapActiveFromFreeEvents(snapshot.events, keybinds)
    swapActiveRef.current = next
    setSwapActive(next)
  }

  function playNewCasts(events: FreeScoreEvent[]) {
    const n = countCasts(events)
    if (n > castCountRef.current) {
      for (let i = castCountRef.current; i < n; i++) {
        playSkillCastSfx()
      }
      castCountRef.current = n
    }
  }

  function ensureRuntime() {
    if (!runtimeRef.current) {
      const rotation = createFreePracticeRotation(jobId, gcdMs)
      runtimeRef.current = new FreePracticeRuntime(rotation, config)
    }
    return runtimeRef.current
  }

  function beginCountdown() {
    const rt = ensureRuntime()
    rt.reset()
    castCountRef.current = 0
    const initial = createInitialSwapActive(keybinds)
    swapActiveRef.current = initial
    setSwapActive(initial)
    setSnap(rt.getSnapshot())
    setCountdown(COUNTDOWN_SEC)
    setPhase('countdown')
  }

  function endSession() {
    const rt = runtimeRef.current
    if (!rt || phase !== 'recording') return
    const elapsed = performance.now() - startWallRef.current
    rt.advanceTo(elapsed)
    const summary = rt.endRecording()
    setPhase('idle')
    onFinishRef.current(summary)
  }

  useEffect(() => {
    const rt = ensureRuntime()
    setSnap(rt.getSnapshot())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, gcdMs, config])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      const rt = ensureRuntime()
      rt.beginRecording()
      castCountRef.current = 0
      startWallRef.current = performance.now()
      setPhase('recording')
      setSnap(rt.getSnapshot())
      return
    }
    const t = window.setTimeout(() => {
      setCountdown((c) => c - 1)
    }, 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown])

  useEffect(() => {
    if (phase !== 'recording') return
    let raf = 0
    const loop = () => {
      const rt = runtimeRef.current
      if (!rt) return
      const elapsed = performance.now() - startWallRef.current
      rt.advanceTo(elapsed)
      const s = rt.getSnapshot()
      syncSwap(s)
      playNewCasts(s.events)
      setSnap(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, keybinds])

  useEffect(() => {
    if (phase !== 'recording') return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = normalizeKeyEvent(e)
      if (isMovementKey(movementKeys, key)) {
        e.preventDefault()
        return
      }
      const skillId = skillIdForKey(
        keybinds,
        key,
        swapActiveRef.current,
        null,
      )
      if (!skillId) return
      e.preventDefault()
      applyInput(skillId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, keybinds, movementKeys])

  function applyInput(skillId: string) {
    const rt = runtimeRef.current
    if (!rt || phase !== 'recording') return
    const elapsed = performance.now() - startWallRef.current
    rt.advanceTo(elapsed)
    rt.handleInput(skillId)
    const after = rt.getSnapshot()
    syncSwap(after)
    playNewCasts(after.events)
    setSnap(after)
  }

  function clickSkill(skillId: string) {
    if (phase !== 'recording') return
    const bind = keybinds[skillId]
    if (effectiveKey(keybinds, skillId) && bind?.mouse === false) return
    applyInput(skillId)
  }

  const view = snap
  const gcdTotal = gcdMs
  const gcdLeft = view ? Math.max(0, view.gcdReadyAt - view.nowMs) : 0
  const gcdPct = gcdTotal <= 0 ? 0 : Math.min(100, (gcdLeft / gcdTotal) * 100)

  function formatCooldown(skillId: string): string {
    if (!view) return '—'
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
    <div className="page practice free-practice">
      <header className="page-header compact">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>フリー練習</h1>
          <p className="lead">
            {jobNameJa} · GCD {(gcdMs / 1000).toFixed(2)}s
            {phase === 'recording' && view
              ? ` · ${(view.nowMs / 1000).toFixed(1)}s`
              : null}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onAbort}>
            ホーム
          </button>
          {phase === 'idle' ? (
            <button
              type="button"
              className="btn primary"
              onClick={beginCountdown}
            >
              開始
            </button>
          ) : null}
          {phase === 'countdown' ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setPhase('idle')
                setCountdown(COUNTDOWN_SEC)
              }}
            >
              キャンセル
            </button>
          ) : null}
          {phase === 'recording' ? (
            <button type="button" className="btn danger" onClick={endSession}>
              終了
            </button>
          ) : null}
        </div>
      </header>

      <section className="practice-focus">
        {phase === 'idle' ? (
          <>
            <p className="next-label">フリー練習</p>
            <p className="next-skill">開始でカウントダウン</p>
            <p className="muted">
              10秒後に記録開始。終了までに押したスキル・空き時間・ゲージ溢れを記録します。
            </p>
          </>
        ) : null}
        {phase === 'countdown' ? (
          <>
            <p className="next-label">まもなく開始</p>
            <p className="free-countdown" aria-live="polite">
              {countdown}
            </p>
            <p className="muted">キー入力はまだ受け付けません</p>
          </>
        ) : null}
        {phase === 'recording' && view ? (
          <>
            <p className="next-label">記録中</p>
            <p className="next-skill">自由に回す</p>
            <p className="upcoming">
              発動 {view.events.filter((e) => e.type === 'cast').length} · 空き{' '}
              {Math.round(view.idleWasteMs)}ms
              {jobId === 'BRD' ? (
                <>
                  {' '}
                  · SV溢れ {view.batteryOverflow}
                </>
              ) : jobId === 'DNC' ? (
                <>
                  {' '}
                  · エスプリ溢れ {view.batteryOverflow}
                </>
              ) : (
                <>
                  {' '}
                  · 溢れ ヒート
                  {view.heatOverflow} / バッテリー
                  {view.batteryOverflow}
                </>
              )}
            </p>
            {view.queuedSkillId ? (
              <p className="queue">
                予約: {getSkill(view.queuedSkillId)?.nameJa ?? view.queuedSkillId}
              </p>
            ) : (
              <p className="queue muted">予約なし</p>
            )}
            {view.lastFeedback ? (
              <p className="feedback">{view.lastFeedback}</p>
            ) : (
              <p className="feedback muted">入力待ち</p>
            )}
          </>
        ) : null}
      </section>

      {view ? (
        <>
          <section className="gauges" aria-label="ゲージ">
            {jobId === 'MCH' ? (
              <>
                <div className="gauge">
                  <div className="gauge-label">
                    <span>ヒート</span>
                    <span>{view.gauges.heat}</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill heat"
                      style={{ width: `${view.gauges.heat}%` }}
                    />
                  </div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">
                    <span>バッテリー</span>
                    <span>{view.gauges.battery}</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill battery"
                      style={{ width: `${view.gauges.battery}%` }}
                    />
                  </div>
                </div>
                <div className="status-pills">
                  <span>OH×{view.overheatStacks}</span>
                  <span>{view.hasFullMetal ? 'フルメタル準備' : 'FMなし'}</span>
                  <span>
                    {view.hasHyperchargeReady ? 'HC実行可' : 'HC通常'}
                  </span>
                </div>
              </>
            ) : null}
            {jobId === 'BRD' ? (
              <>
                <div className="gauge">
                  <div className="gauge-label">
                    <span>ソウルボイス</span>
                    <span>{view.gauges.battery}</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill battery"
                      style={{ width: `${view.gauges.battery}%` }}
                    />
                  </div>
                </div>
                <div className="status-pills">
                  <span>{view.hasHawksEye ? 'ホークアイ' : 'HEなし'}</span>
                  <span>
                    {view.hasBlastArrow ? 'ブラスト実行可' : 'ブラストなし'}
                  </span>
                  <span>
                    {view.hasResonanceArrow ? 'レゾナンス実行可' : 'レゾなし'}
                  </span>
                  <span>
                    {view.hasRadiantEncore
                      ? 'アンコール実行可'
                      : 'アンコールなし'}
                  </span>
                </div>
              </>
            ) : null}
            {jobId === 'DNC' ? (
              <>
                <div className="gauge">
                  <div className="gauge-label">
                    <span>エスプリ</span>
                    <span>{view.gauges.battery}</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill battery"
                      style={{ width: `${view.gauges.battery}%` }}
                    />
                  </div>
                </div>
                <div className="status-pills">
                  <span>幻扇×{view.overheatStacks}</span>
                  <span>{view.hasDanceMode ? 'ダンス中' : '通常'}</span>
                  <span>{view.hasSilkenSymmetry ? '対称' : '対称なし'}</span>
                  <span>{view.hasSilkenFlow ? '非対称' : '非対称なし'}</span>
                  <span>{view.hasLastDance ? 'LD可' : 'LDなし'}</span>
                  <span>{view.hasTillana ? 'ティラナ可' : 'ティラナなし'}</span>
                  <span>{view.hasStarfall ? '流星可' : '流星なし'}</span>
                  <span>
                    {view.hasDanceOfTheDawn ? '暁可' : '暁なし'}
                  </span>
                </div>
              </>
            ) : null}
          </section>

          <section className="timers" aria-label="タイマー">
            <div className="timer">
              <div className="gauge-label">
                <span>GCD</span>
                <span>{(gcdLeft / 1000).toFixed(2)}s</span>
              </div>
              <div className="gauge-track">
                <div
                  className="gauge-fill gcd"
                  style={{ width: `${gcdPct}%` }}
                />
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
                return (
                  <div key={`empty-${index}`} className="hotbar-slot empty" />
                )
              }
              const partner = getSwapPartner(keybinds, skill.id)
              const cd = view.cooldowns[skill.id]
              const onCd =
                (cd?.remainingMs ?? 0) > 0 &&
                (skill.charges == null || (cd?.charges ?? 0) <= 0)
              return (
                <button
                  key={`${partner ? slotIdFor(skill.id, partner) : skill.id}-${index}`}
                  type="button"
                  className={`hotbar-btn ${partner ? 'swappable' : ''} ${onCd ? 'on-cd' : ''} ${phase !== 'recording' ? 'disabled-look' : ''}`}
                  onClick={() => clickSkill(skill.id)}
                  disabled={phase !== 'recording'}
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
        </>
      ) : null}
    </div>
  )
}
