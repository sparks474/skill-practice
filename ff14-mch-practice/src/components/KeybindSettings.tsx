import { useEffect, useMemo, useState } from 'react'
import { HotbarLayoutEditor } from './HotbarLayoutEditor'
import { normalizeHotbarLayout } from '../data/hotbarLayout'
import { JOBS, jobNameJa } from '../data/jobs'
import { getSkillsForJob } from '../data/skills'
import {
  assignKey,
  effectiveKey,
  getSwapPartner,
  setSwapPartner,
} from '../data/skillSlots'
import { formatKeyLabel } from '../input/keys'
import type { HotbarLayout, JobId, Keybinds, MovementKeys } from '../types'

type Props = {
  jobId: JobId
  keybinds: Keybinds
  movementKeys: MovementKeys
  hotbarLayout: HotbarLayout
  onJobChange: (jobId: JobId) => void
  onSave: (keybinds: Keybinds, hotbarLayout: HotbarLayout) => void
  onCancel: () => void
}

function clearKeyFromSkills(keybinds: Keybinds, key: string): Keybinds {
  const next: Keybinds = { ...keybinds }
  const normalized = key.toLowerCase()
  for (const id of Object.keys(next)) {
    if (next[id]?.key?.toLowerCase() === normalized) {
      next[id] = { ...next[id], key: undefined }
    }
  }
  return next
}

function isMovementKey(movement: MovementKeys, key: string): boolean {
  const n = key.toLowerCase()
  return (
    movement.up?.toLowerCase() === n ||
    movement.down?.toLowerCase() === n ||
    movement.left?.toLowerCase() === n ||
    movement.right?.toLowerCase() === n
  )
}

export function KeybindSettings({
  jobId,
  keybinds,
  movementKeys,
  hotbarLayout,
  onJobChange,
  onSave,
  onCancel,
}: Props) {
  const skills = useMemo(() => getSkillsForJob(jobId), [jobId])
  const [draftBinds, setDraftBinds] = useState<Keybinds>(() =>
    structuredClone(keybinds),
  )
  const [draftHotbar, setDraftHotbar] = useState<HotbarLayout>(() =>
    normalizeHotbarLayout(hotbarLayout, keybinds),
  )
  const [listening, setListening] = useState<string | null>(null)

  useEffect(() => {
    if (!listening) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      const key =
        e.key === ' '
          ? 'space'
          : e.key.length === 1
            ? e.key.toLowerCase()
            : e.key.toLowerCase()
      if (key === 'escape') {
        setListening(null)
        return
      }
      if (isMovementKey(movementKeys, key)) {
        // 移動キーとは衝突させない
        setListening(null)
        return
      }
      setDraftBinds((prev) =>
        assignKey(clearKeyFromSkills(prev, key), listening, key),
      )
      setListening(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listening, movementKeys])

  const rows = useMemo(() => {
    const list = [...skills]
    list.sort((a, b) => {
      const au = draftBinds[a.id]?.unused ? 1 : 0
      const bu = draftBinds[b.id]?.unused ? 1 : 0
      if (au !== bu) return au - bu
      return 0
    })
    return list
  }, [draftBinds, skills])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>キーバインド</h1>
          <p className="lead">ホットバー配置・キー割り当て（ジョブ別）</p>
        </div>
        <div className="header-actions">
          <label className="job-select">
            ジョブ
            <select
              value={jobId}
              onChange={(e) => onJobChange(e.target.value as JobId)}
            >
              {JOBS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nameJa}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost" onClick={onCancel}>
            戻る
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onSave(draftBinds, draftHotbar)}
          >
            保存
          </button>
        </div>
      </header>

      {skills.length === 0 ? (
        <p className="muted">
          {jobNameJa(jobId)}
          のスキルデータはまだありません。機工士以外は今後追加予定です。
        </p>
      ) : null}

      <HotbarLayoutEditor
        layout={draftHotbar}
        keybinds={draftBinds}
        skills={skills}
        onChange={setDraftHotbar}
      />

      <section>
        <h2>キー割り当て</h2>
        <p className="muted">
          「変更」でキー割り当て。置き換えを設定すると同じキー枠でトグルします。不要にチェックするとグレーアウトして末尾へ移動し、練習ホットバーから外れます。
        </p>
        <ul className="keybind-list">
          {rows.map((skill) => {
            const bind = draftBinds[skill.id] ?? {}
            const unused = Boolean(bind.unused)
            const partnerId = getSwapPartner(draftBinds, skill.id)
            const keyLabel = formatKeyLabel(effectiveKey(draftBinds, skill.id))
            const listeningHere = listening === skill.id
            return (
              <li
                key={skill.id}
                className={unused ? 'keybind-row unused' : 'keybind-row'}
              >
                <span className="keybind-name">{skill.nameJa}</span>
                <span className="muted">
                  {skill.category === 'skill' ? 'スキル' : 'アビ'}
                </span>
                <span className="key-badge">{keyLabel}</span>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={unused}
                  onClick={() => setListening(skill.id)}
                >
                  {listeningHere ? '入力待ち…' : '変更'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={unused}
                  onClick={() =>
                    setDraftBinds((prev) =>
                      assignKey(prev, skill.id, undefined),
                    )
                  }
                >
                  クリア
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={
                      Boolean(bind.mouse) ||
                      !effectiveKey(draftBinds, skill.id)
                    }
                    disabled={unused}
                    onChange={(e) =>
                      setDraftBinds((prev) => {
                        const next = { ...prev }
                        const partner = getSwapPartner(prev, skill.id)
                        next[skill.id] = {
                          ...next[skill.id],
                          mouse: e.target.checked,
                        }
                        if (partner) {
                          next[partner] = {
                            ...next[partner],
                            mouse: e.target.checked,
                          }
                        }
                        return next
                      })
                    }
                  />
                  クリック可
                </label>
                <label className="check swap-select">
                  置き換え
                  <select
                    disabled={unused}
                    value={partnerId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value || undefined
                      setDraftBinds((prev) =>
                        setSwapPartner(prev, skill.id, value),
                      )
                    }}
                  >
                    <option value="">なし</option>
                    {skills
                      .filter((s) => s.id !== skill.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameJa}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={unused}
                    onChange={(e) => {
                      const nextUnused = e.target.checked
                      const next = {
                        ...draftBinds,
                        [skill.id]: {
                          ...draftBinds[skill.id],
                          unused: nextUnused,
                        },
                      }
                      setDraftBinds(next)
                      setDraftHotbar((hb) => normalizeHotbarLayout(hb, next))
                    }}
                  />
                  不要
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
