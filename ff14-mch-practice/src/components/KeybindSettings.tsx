import { useEffect, useMemo, useState } from 'react'
import { SKILLS } from '../data/skills'
import { formatKeyLabel } from '../input/keys'
import type { EngineConfig, Keybinds } from '../types'

type Props = {
  keybinds: Keybinds
  config: EngineConfig
  onSave: (keybinds: Keybinds, config: EngineConfig) => void
  onCancel: () => void
}

export function KeybindSettings({ keybinds, config, onSave, onCancel }: Props) {
  const [draftBinds, setDraftBinds] = useState<Keybinds>(() => ({ ...keybinds }))
  const [draftConfig, setDraftConfig] = useState<EngineConfig>({ ...config })
  const [listeningId, setListeningId] = useState<string | null>(null)

  useEffect(() => {
    if (!listeningId) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key === ' ' ? 'space' : e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
      if (key === 'escape') {
        setListeningId(null)
        return
      }
      setDraftBinds((prev) => {
        const next = { ...prev }
        // 同じキーを他スキルから外す
        for (const id of Object.keys(next)) {
          if (next[id]?.key === key) {
            next[id] = { ...next[id], key: undefined }
          }
        }
        next[listeningId] = {
          ...next[listeningId],
          key,
          mouse: next[listeningId]?.mouse ?? false,
        }
        return next
      })
      setListeningId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listeningId])

  const rows = useMemo(() => SKILLS, [])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">MCH Practice</p>
          <h1>キー設定</h1>
          <p className="lead">キー割り当てとエンジン定数</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            戻る
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onSave(draftBinds, draftConfig)}
          >
            保存
          </button>
        </div>
      </header>

      <section className="editor-meta">
        <label>
          アニメロック (ms)
          <input
            type="number"
            value={draftConfig.defaultAnimationLockMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                defaultAnimationLockMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          先行入力窓 (ms)
          <input
            type="number"
            value={draftConfig.queueWindowMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                queueWindowMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          Perfect (ms)
          <input
            type="number"
            value={draftConfig.perfectWindowMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                perfectWindowMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          OK (ms)
          <input
            type="number"
            value={draftConfig.okWindowMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                okWindowMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
      </section>

      <section>
        <h2>キー割り当て</h2>
        <p className="muted">
          「変更」を押してからキーを押してください。Esc でキャンセル。クリック専用にするとホットバーからのみ入力できます。
        </p>
        <ul className="keybind-list">
          {rows.map((skill) => {
            const bind = draftBinds[skill.id] ?? {}
            return (
              <li key={skill.id}>
                <span className="keybind-name">{skill.nameJa}</span>
                <span className="muted">
                  {skill.category === 'skill' ? 'スキル' : 'アビ'}
                </span>
                <span className="key-badge">{formatKeyLabel(bind.key)}</span>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setListeningId(skill.id)}
                >
                  {listeningId === skill.id ? '入力待ち…' : '変更'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraftBinds((prev) => ({
                      ...prev,
                      [skill.id]: { ...prev[skill.id], key: undefined },
                    }))
                  }
                >
                  クリア
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(bind.mouse) || !bind.key}
                    onChange={(e) =>
                      setDraftBinds((prev) => ({
                        ...prev,
                        [skill.id]: {
                          ...prev[skill.id],
                          mouse: e.target.checked,
                        },
                      }))
                    }
                  />
                  クリック可
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
