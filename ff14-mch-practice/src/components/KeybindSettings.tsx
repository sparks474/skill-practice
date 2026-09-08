import { useEffect, useMemo, useState } from 'react'
import { SKILLS } from '../data/skills'
import {
  assignKey,
  effectiveKey,
  getSwapPartner,
  setSwapPartner,
} from '../data/skillSlots'
import { formatKeyLabel } from '../input/keys'
import type { EngineConfig, Keybinds } from '../types'

type Props = {
  keybinds: Keybinds
  config: EngineConfig
  onSave: (keybinds: Keybinds, config: EngineConfig) => void
  onCancel: () => void
}

export function KeybindSettings({ keybinds, config, onSave, onCancel }: Props) {
  const [draftBinds, setDraftBinds] = useState<Keybinds>(() =>
    structuredClone(keybinds),
  )
  const [draftConfig, setDraftConfig] = useState<EngineConfig>({ ...config })
  const [listeningId, setListeningId] = useState<string | null>(null)

  useEffect(() => {
    if (!listeningId) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      const key =
        e.key === ' '
          ? 'space'
          : e.key.length === 1
            ? e.key.toLowerCase()
            : e.key.toLowerCase()
      if (key === 'escape') {
        setListeningId(null)
        return
      }
      setDraftBinds((prev) => assignKey(prev, listeningId, key))
      setListeningId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listeningId])

  const rows = useMemo(() => {
    const list = [...SKILLS]
    list.sort((a, b) => {
      const au = draftBinds[a.id]?.unused ? 1 : 0
      const bu = draftBinds[b.id]?.unused ? 1 : 0
      if (au !== bu) return au - bu
      return 0
    })
    return list
  }, [draftBinds])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">MCH Practice</p>
          <h1>キー設定</h1>
          <p className="lead">キー割り当て・置き換え・不要スキル</p>
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
          「変更」でキー割り当て。置き換えを設定すると同じキー枠でトグルします（例:
          回転のこぎり ↔ エクスカベーター）。不要にチェックするとグレーアウトして末尾へ移動し、練習ホットバーから外れます。
        </p>
        <ul className="keybind-list">
          {rows.map((skill) => {
            const bind = draftBinds[skill.id] ?? {}
            const unused = Boolean(bind.unused)
            const partnerId = getSwapPartner(draftBinds, skill.id)
            const keyLabel = formatKeyLabel(effectiveKey(draftBinds, skill.id))
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
                  onClick={() => setListeningId(skill.id)}
                >
                  {listeningId === skill.id ? '入力待ち…' : '変更'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={unused}
                  onClick={() =>
                    setDraftBinds((prev) => assignKey(prev, skill.id, undefined))
                  }
                >
                  クリア
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(bind.mouse) || !effectiveKey(draftBinds, skill.id)}
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
                    {SKILLS.filter((s) => s.id !== skill.id).map((s) => (
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
                    onChange={(e) =>
                      setDraftBinds((prev) => ({
                        ...prev,
                        [skill.id]: {
                          ...prev[skill.id],
                          unused: e.target.checked,
                        },
                      }))
                    }
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
