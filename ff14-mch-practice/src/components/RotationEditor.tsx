import { useMemo, useState, type DragEvent } from 'react'
import { JOBS, jobNameJa } from '../data/jobs'
import { getSkill, getSkillsForJob } from '../data/skills'
import type { JobId, Keybinds, Rotation, RotationStep, SkillCategory } from '../types'

type Props = {
  rotation: Rotation
  keybinds: Keybinds
  onSave: (rotation: Rotation) => void
  onCancel: () => void
}

/** 編集中のみ使う安定 ID（保存時は捨てる） */
type EditorStep = RotationStep & { uid: string }

type DragPayload =
  | { kind: 'reorder'; fromIndex: number }
  | { kind: 'add'; skillId: string }

const DRAG_MIME = 'application/x-rotation-editor'

function newUid(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function toEditorSteps(steps: RotationStep[]): EditorStep[] {
  return steps.map((s) => ({ skillId: s.skillId, uid: newUid() }))
}

function insertStep(
  steps: EditorStep[],
  item: EditorStep,
  fromIndex: number | null,
  insertBefore: number,
): EditorStep[] {
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

export function RotationEditor({ rotation, keybinds, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(() => ({
    ...rotation,
    jobId: rotation.jobId,
    initialGauges: { ...rotation.initialGauges },
    steps: toEditorSteps(rotation.steps),
  }))
  const [filter, setFilter] = useState<'all' | SkillCategory>('all')
  const [query, setQuery] = useState('')
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const jobSkills = useMemo(
    () => getSkillsForJob(draft.jobId),
    [draft.jobId],
  )

  const filteredSkills = useMemo(() => {
    return jobSkills.filter((s) => {
      if (keybinds[s.id]?.unused) return false
      if (filter !== 'all' && s.category !== filter) return false
      if (query && !s.nameJa.includes(query)) return false
      return true
    })
  }, [filter, query, keybinds, jobSkills])

  function updateStep(index: number, skillId: string) {
    setDraft((d) => {
      const steps = d.steps.slice()
      steps[index] = { ...steps[index], skillId }
      return { ...d, steps }
    })
  }

  function moveStep(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = index + dir
      if (j < 0 || j >= d.steps.length) return d
      const steps = d.steps.slice()
      ;[steps[index], steps[j]] = [steps[j], steps[index]]
      return { ...d, steps }
    })
  }

  function removeStep(index: number) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.filter((_, i) => i !== index),
    }))
  }

  function addSkill(skillId: string, insertBefore?: number) {
    setDraft((d) => {
      const item: EditorStep = { skillId, uid: newUid() }
      if (insertBefore == null || insertBefore >= d.steps.length) {
        return { ...d, steps: [...d.steps, item] }
      }
      return {
        ...d,
        steps: insertStep(d.steps, item, null, insertBefore),
      }
    })
  }

  function changeJob(jobId: JobId) {
    setDraft((d) => ({
      ...d,
      jobId,
      steps: d.jobId === jobId ? d.steps : [],
    }))
  }

  function readPayload(e: DragEvent): DragPayload | null {
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return null
    try {
      return JSON.parse(raw) as DragPayload
    } catch {
      return null
    }
  }

  function onDragStartStep(e: DragEvent, fromIndex: number) {
    const payload: DragPayload = { kind: 'reorder', fromIndex }
    const raw = JSON.stringify(payload)
    e.dataTransfer.setData(DRAG_MIME, raw)
    e.dataTransfer.setData('text/plain', raw)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  function onDragStartPalette(e: DragEvent, skillId: string) {
    const payload: DragPayload = { kind: 'add', skillId }
    const raw = JSON.stringify(payload)
    e.dataTransfer.setData(DRAG_MIME, raw)
    e.dataTransfer.setData('text/plain', raw)
    e.dataTransfer.effectAllowed = 'copyMove'
    setDragging(true)
  }

  function onDragEnd() {
    setDragging(false)
    setDropIndex(null)
  }

  function onDragOverSlot(e: DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) setDropIndex(index)
  }

  function onDropAt(e: DragEvent, insertBefore: number) {
    e.preventDefault()
    const payload =
      readPayload(e) ??
      (() => {
        try {
          return JSON.parse(e.dataTransfer.getData('text/plain')) as DragPayload
        } catch {
          return null
        }
      })()
    setDragging(false)
    setDropIndex(null)
    if (!payload) return

    if (payload.kind === 'add') {
      addSkill(payload.skillId, insertBefore)
      return
    }

    setDraft((d) => {
      const from = payload.fromIndex
      if (from < 0 || from >= d.steps.length) return d
      if (insertBefore === from || insertBefore === from + 1) return d
      const item = d.steps[from]
      return {
        ...d,
        steps: insertStep(d.steps, item, from, insertBefore),
      }
    })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>回し編集</h1>
          <p className="lead muted">
            手順はドラッグで並べ替え。右の一覧からドラッグまたはクリックで追加できます。
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            戻る
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              onSave({
                ...draft,
                steps: draft.steps.map(({ skillId }) => ({ skillId })),
                updatedAt: Date.now(),
              })
            }
          >
            保存
          </button>
        </div>
      </header>

      <section className="editor-meta">
        <label>
          ジョブ
          <select
            value={draft.jobId}
            disabled={Boolean(draft.isSample)}
            onChange={(e) => changeJob(e.target.value as JobId)}
          >
            {JOBS.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nameJa}
              </option>
            ))}
          </select>
        </label>
        <label>
          名前
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          GCD (ms)
          <input
            type="number"
            min={1500}
            max={3500}
            step={10}
            value={draft.gcdMs}
            onChange={(e) =>
              setDraft({ ...draft, gcdMs: Number(e.target.value) || 2500 })
            }
          />
        </label>
        {draft.jobId === 'MCH' ? (
          <>
            <label>
              初期ヒート
              <input
                type="number"
                min={0}
                max={100}
                value={draft.initialGauges.heat}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    initialGauges: {
                      ...draft.initialGauges,
                      heat: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </label>
            <label>
              初期バッテリー
              <input
                type="number"
                min={0}
                max={100}
                value={draft.initialGauges.battery}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    initialGauges: {
                      ...draft.initialGauges,
                      battery: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </label>
          </>
        ) : null}
        {draft.jobId === 'BRD' ? (
          <label>
            初期ソウルボイス
            <input
              type="number"
              min={0}
              max={100}
              value={draft.initialGauges.battery}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  initialGauges: {
                    ...draft.initialGauges,
                    battery: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </label>
        ) : null}
        {draft.jobId === 'DNC' ? (
          <label>
            初期エスプリ
            <input
              type="number"
              min={0}
              max={100}
              value={draft.initialGauges.battery}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  initialGauges: {
                    ...draft.initialGauges,
                    battery: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </label>
        ) : null}
        <label className="full">
          メモ
          <input
            value={draft.note ?? ''}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
      </section>

      {jobSkills.length === 0 ? (
        <p className="muted">
          {jobNameJa(draft.jobId)}
          のスキルデータはまだありません。機工士を選ぶか、データ追加をお待ちください。
        </p>
      ) : null}

      <div className="editor-grid">
        <section>
          <h2>手順（{draft.steps.length}）</h2>
          <ol
            className={`step-list ${dragging ? 'is-dropping' : ''}`}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropIndex(null)
              }
            }}
          >
            {draft.steps.map((step, i) => {
              const skill = getSkill(step.skillId)
              return (
                <li
                  key={step.uid}
                  className={`step-row ${dropIndex === i ? 'drop-before' : ''}`}
                  draggable
                  onDragStart={(e) => onDragStartStep(e, i)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onDragOverSlot(e, i)}
                  onDrop={(e) => onDropAt(e, i)}
                >
                  <span className="step-handle" title="ドラッグで移動" aria-hidden>
                    ⋮⋮
                  </span>
                  <span className="step-idx">{i + 1}</span>
                  <select
                    value={step.skillId}
                    onChange={(e) => updateStep(i, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {jobSkills
                      .filter(
                        (s) =>
                          !keybinds[s.id]?.unused || s.id === step.skillId,
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameJa}（
                          {s.category === 'skill' ? 'スキル' : 'アビ'}）
                          {keybinds[s.id]?.unused ? '・不要' : ''}
                        </option>
                      ))}
                  </select>
                  <span className="muted">
                    {skill?.category === 'skill' ? 'スキル' : 'アビ'}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => moveStep(i, -1)}
                    aria-label="上へ"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => moveStep(i, 1)}
                    aria-label="下へ"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => removeStep(i)}
                  >
                    削除
                  </button>
                </li>
              )
            })}
            <li
              className={`step-drop-end ${dropIndex === draft.steps.length ? 'drop-before' : ''}`}
              onDragOver={(e) => onDragOverSlot(e, draft.steps.length)}
              onDrop={(e) => onDropAt(e, draft.steps.length)}
            >
              {draft.steps.length === 0
                ? 'ここにスキルをドロップ（または右から追加）'
                : '末尾にドロップ'}
            </li>
          </ol>
        </section>

        <section>
          <h2>スキル追加</h2>
          <div className="filter-row">
            <button
              type="button"
              className={filter === 'all' ? 'btn primary' : 'btn ghost'}
              onClick={() => setFilter('all')}
            >
              すべて
            </button>
            <button
              type="button"
              className={filter === 'skill' ? 'btn primary' : 'btn ghost'}
              onClick={() => setFilter('skill')}
            >
              スキル
            </button>
            <button
              type="button"
              className={filter === 'ability' ? 'btn primary' : 'btn ghost'}
              onClick={() => setFilter('ability')}
            >
              アビリティ
            </button>
            <input
              placeholder="名前で絞り込み"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="skill-picker">
            {filteredSkills.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="btn ghost wide skill-picker-item"
                  draggable
                  onDragStart={(e) => onDragStartPalette(e, s.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => addSkill(s.id)}
                >
                  <span className="step-handle" aria-hidden>
                    ⋮⋮
                  </span>
                  <span>{s.nameJa}</span>
                  <span className="muted">
                    {s.category === 'skill' ? 'スキル' : 'アビ'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
