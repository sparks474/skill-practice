import { useEffect, useMemo, useState } from 'react'
import { HotbarLayoutEditor } from './HotbarLayoutEditor'
import { normalizeHotbarLayout } from '../data/hotbarLayout'
import { SKILLS } from '../data/skills'
import {
  assignKey,
  effectiveKey,
  getSwapPartner,
  setSwapPartner,
} from '../data/skillSlots'
import { formatKeyLabel } from '../input/keys'
import type {
  EngineConfig,
  HotbarLayout,
  Keybinds,
  MovementDirection,
  MovementKeys,
} from '../types'

type Props = {
  keybinds: Keybinds
  config: EngineConfig
  movementKeys: MovementKeys
  hotbarLayout: HotbarLayout
  onSave: (
    keybinds: Keybinds,
    config: EngineConfig,
    movementKeys: MovementKeys,
    hotbarLayout: HotbarLayout,
  ) => void
  onCancel: () => void
}

type ListenTarget =
  | { kind: 'skill'; skillId: string }
  | { kind: 'move'; dir: MovementDirection }

const MOVE_ROWS: { dir: MovementDirection; label: string }[] = [
  { dir: 'up', label: '上' },
  { dir: 'down', label: '下' },
  { dir: 'left', label: '左' },
  { dir: 'right', label: '右' },
]

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

function clearKeyFromMovement(
  movement: MovementKeys,
  key: string,
  except?: MovementDirection,
): MovementKeys {
  const next = { ...movement }
  const normalized = key.toLowerCase()
  for (const dir of ['up', 'down', 'left', 'right'] as MovementDirection[]) {
    if (dir === except) continue
    if (next[dir]?.toLowerCase() === normalized) {
      next[dir] = undefined
    }
  }
  return next
}

export function KeybindSettings({
  keybinds,
  config,
  movementKeys,
  hotbarLayout,
  onSave,
  onCancel,
}: Props) {
  const [draftBinds, setDraftBinds] = useState<Keybinds>(() =>
    structuredClone(keybinds),
  )
  const [draftConfig, setDraftConfig] = useState<EngineConfig>({ ...config })
  const [draftMove, setDraftMove] = useState<MovementKeys>(() => ({
    ...movementKeys,
  }))
  const [draftHotbar, setDraftHotbar] = useState<HotbarLayout>(() =>
    normalizeHotbarLayout(hotbarLayout, keybinds),
  )
  const [listening, setListening] = useState<ListenTarget | null>(null)

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

      if (listening.kind === 'skill') {
        setDraftMove((prev) => clearKeyFromMovement(prev, key))
        setDraftBinds((prev) => assignKey(prev, listening.skillId, key))
      } else {
        setDraftBinds((prev) => clearKeyFromSkills(prev, key))
        setDraftMove((prev) => ({
          ...clearKeyFromMovement(prev, key, listening.dir),
          [listening.dir]: key,
        }))
      }
      setListening(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listening])

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
          <p className="lead">キー割り当て・移動・置き換え・不要スキル</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            戻る
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onSave(draftBinds, draftConfig, draftMove, draftHotbar)}
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
        <h2>移動キー</h2>
        <p className="muted">
          練習中に押してもスキル入力にはならず、ミスにもなりません（初期は WASD）。
        </p>
        <ul className="keybind-list">
          {MOVE_ROWS.map(({ dir, label }) => {
            const listeningHere =
              listening?.kind === 'move' && listening.dir === dir
            return (
              <li key={dir} className="keybind-row">
                <span className="keybind-name">移動・{label}</span>
                <span className="muted">移動</span>
                <span className="key-badge">
                  {formatKeyLabel(draftMove[dir])}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setListening({ kind: 'move', dir })}
                >
                  {listeningHere ? '入力待ち…' : '変更'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraftMove((prev) => ({ ...prev, [dir]: undefined }))
                  }
                >
                  クリア
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <HotbarLayoutEditor
        layout={draftHotbar}
        keybinds={draftBinds}
        onChange={setDraftHotbar}
      />

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
            const listeningHere =
              listening?.kind === 'skill' && listening.skillId === skill.id
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
                  onClick={() =>
                    setListening({ kind: 'skill', skillId: skill.id })
                  }
                >
                  {listeningHere ? '入力待ち…' : '変更'}
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
