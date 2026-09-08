import { useEffect, useState } from 'react'
import { formatKeyLabel } from '../input/keys'
import type {
  EngineConfig,
  MovementDirection,
  MovementKeys,
} from '../types'

type Props = {
  config: EngineConfig
  movementKeys: MovementKeys
  /** キーバインド側でスキルキーと衝突しないよう、保存時に呼ぶ */
  onSave: (config: EngineConfig, movementKeys: MovementKeys) => void
  onCancel: () => void
}

const MOVE_ROWS: { dir: MovementDirection; label: string }[] = [
  { dir: 'up', label: '上' },
  { dir: 'down', label: '下' },
  { dir: 'left', label: '左' },
  { dir: 'right', label: '右' },
]

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

export function SettingsView({
  config,
  movementKeys,
  onSave,
  onCancel,
}: Props) {
  const [draftConfig, setDraftConfig] = useState<EngineConfig>({ ...config })
  const [draftMove, setDraftMove] = useState<MovementKeys>(() => ({
    ...movementKeys,
  }))
  const [listening, setListening] = useState<MovementDirection | null>(null)

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
      setDraftMove((prev) => ({
        ...clearKeyFromMovement(prev, key, listening),
        [listening]: key,
      }))
      setListening(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listening])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>設定</h1>
          <p className="lead">エンジン定数・移動キー（全ジョブ共通）</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            戻る
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => onSave(draftConfig, draftMove)}
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
          連打猶予 (ms)
          <input
            type="number"
            value={draftConfig.remashGraceMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                remashGraceMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          発動遊び (ms)
          <input
            type="number"
            value={draftConfig.activationSlackMs}
            onChange={(e) =>
              setDraftConfig({
                ...draftConfig,
                activationSlackMs: Number(e.target.value) || 0,
              })
            }
          />
        </label>
      </section>
      <p className="muted result-hint">
        連打猶予は、スキル発動からその時間だけ「直前と同じスキル」の再入力を押し間違いにしません（硬直より短くしても硬直中は無視します）。
        発動遊びは、使えるようになってからその時間までの遅れを空き時間に含めません（予約発火や FPS
        の誤差用、初期 100ms）。
      </p>

      <section>
        <h2>移動キー</h2>
        <p className="muted">
          練習中に押してもスキル入力にはならず、ミスにもなりません（初期は WASD）。
        </p>
        <ul className="keybind-list">
          {MOVE_ROWS.map(({ dir, label }) => {
            const listeningHere = listening === dir
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
                  onClick={() => setListening(dir)}
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
    </div>
  )
}
