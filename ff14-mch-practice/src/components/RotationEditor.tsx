import { useMemo, useState } from 'react'
import { JOBS, jobNameJa } from '../data/jobs'
import { getSkill, getSkillsForJob } from '../data/skills'
import type { JobId, Keybinds, Rotation, SkillCategory } from '../types'

type Props = {
  rotation: Rotation
  keybinds: Keybinds
  onSave: (rotation: Rotation) => void
  onCancel: () => void
}

export function RotationEditor({ rotation, keybinds, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Rotation>(() => ({
    ...rotation,
    jobId: rotation.jobId,
    initialGauges: { ...rotation.initialGauges },
    steps: rotation.steps.map((s) => ({ ...s })),
  }))
  const [filter, setFilter] = useState<'all' | SkillCategory>('all')
  const [query, setQuery] = useState('')

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
      steps[index] = { skillId }
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

  function addSkill(skillId: string) {
    setDraft((d) => ({
      ...d,
      steps: [...d.steps, { skillId }],
    }))
  }

  function changeJob(jobId: JobId) {
    setDraft((d) => ({
      ...d,
      jobId,
      // ジョブ変更時は他ジョブの手順をクリア
      steps: d.jobId === jobId ? d.steps : [],
    }))
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>回し編集</h1>
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
          <ol className="step-list">
            {draft.steps.map((step, i) => {
              const skill = getSkill(step.skillId)
              return (
                <li key={`${step.skillId}-${i}`}>
                  <span className="step-idx">{i + 1}</span>
                  <select
                    value={step.skillId}
                    onChange={(e) => updateStep(i, e.target.value)}
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
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => moveStep(i, 1)}
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
                  className="btn ghost wide"
                  onClick={() => addSkill(s.id)}
                >
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
