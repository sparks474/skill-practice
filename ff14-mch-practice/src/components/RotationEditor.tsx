import { useMemo, useState } from 'react'
import { SKILLS } from '../data/skills'
import type { Rotation, SkillCategory } from '../types'

type Props = {
  rotation: Rotation
  onSave: (rotation: Rotation) => void
  onCancel: () => void
}

export function RotationEditor({ rotation, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Rotation>(() => ({
    ...rotation,
    initialGauges: { ...rotation.initialGauges },
    steps: rotation.steps.map((s) => ({ ...s })),
  }))
  const [filter, setFilter] = useState<'all' | SkillCategory>('all')
  const [query, setQuery] = useState('')

  const filteredSkills = useMemo(() => {
    return SKILLS.filter((s) => {
      if (filter !== 'all' && s.category !== filter) return false
      if (query && !s.nameJa.includes(query)) return false
      return true
    })
  }, [filter, query])

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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">MCH Practice</p>
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
        <label className="full">
          メモ
          <input
            value={draft.note ?? ''}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
      </section>

      <div className="editor-grid">
        <section>
          <h2>手順（{draft.steps.length}）</h2>
          <ol className="step-list">
            {draft.steps.map((step, i) => {
              const skill = SKILLS.find((s) => s.id === step.skillId)
              return (
                <li key={`${step.skillId}-${i}`}>
                  <span className="step-idx">{i + 1}</span>
                  <select
                    value={step.skillId}
                    onChange={(e) => updateStep(i, e.target.value)}
                  >
                    {SKILLS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameJa}（{s.category === 'skill' ? 'スキル' : 'アビ'}）
                      </option>
                    ))}
                  </select>
                  <span className="muted">
                    {skill?.category === 'skill' ? 'スキル' : 'アビ'}
                  </span>
                  <button type="button" className="btn ghost" onClick={() => moveStep(i, -1)}>
                    ↑
                  </button>
                  <button type="button" className="btn ghost" onClick={() => moveStep(i, 1)}>
                    ↓
                  </button>
                  <button type="button" className="btn danger" onClick={() => removeStep(i)}>
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
                <button type="button" className="btn ghost wide" onClick={() => addSkill(s.id)}>
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
