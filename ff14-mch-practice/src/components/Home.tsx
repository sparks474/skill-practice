import type { Rotation } from '../types'

type Props = {
  rotations: Rotation[]
  onPractice: (id: string) => void
  onEdit: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onOpenKeybinds: () => void
}

export function Home({
  rotations,
  onPractice,
  onEdit,
  onCreate,
  onDelete,
  onOpenKeybinds,
}: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">MCH Practice</p>
          <h1>機工士スキル回し練習</h1>
          <p className="lead">指示どおりの手順を、時間どおりに押す練習ツール</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onOpenKeybinds}>
            キー設定
          </button>
          <button type="button" className="btn" onClick={onCreate}>
            回しを追加
          </button>
        </div>
      </header>

      <section className="rotation-list" aria-label="回し一覧">
        {rotations.map((rot) => (
          <article key={rot.id} className="rotation-row">
            <div className="rotation-main">
              <h2>{rot.name}</h2>
              <p>
                {rot.steps.length}手 · GCD {(rot.gcdMs / 1000).toFixed(2)}s
                {rot.isSample ? ' · サンプル' : ''}
              </p>
              {rot.note ? <p className="muted">{rot.note}</p> : null}
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => onPractice(rot.id)}
                disabled={rot.steps.length === 0}
              >
                練習
              </button>
              <button type="button" className="btn ghost" onClick={() => onEdit(rot.id)}>
                編集
              </button>
              {!rot.isSample ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    if (confirm(`「${rot.name}」を削除しますか？`)) onDelete(rot.id)
                  }}
                >
                  削除
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
