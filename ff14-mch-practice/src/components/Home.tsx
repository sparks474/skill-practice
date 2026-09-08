import { JOBS, jobNameJa } from '../data/jobs'
import type { JobId, Rotation } from '../types'

type Props = {
  rotations: Rotation[]
  selectedJob: JobId
  onSelectedJobChange: (jobId: JobId) => void
  onPractice: (id: string) => void
  onFreePractice: () => void
  onEdit: (id: string) => void
  onCreate: (jobId: JobId) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
  onOpenKeybinds: () => void
}

export function Home({
  rotations,
  selectedJob,
  onSelectedJobChange,
  onPractice,
  onFreePractice,
  onEdit,
  onCreate,
  onDelete,
  onOpenSettings,
  onOpenKeybinds,
}: Props) {
  const visible = rotations.filter((r) => r.jobId === selectedJob)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>スキル回し練習</h1>
          <p className="lead">指示どおりの手順を、時間どおりに押す練習ツール</p>
        </div>
        <div className="header-actions">
          <label className="job-select">
            ジョブ
            <select
              value={selectedJob}
              onChange={(e) =>
                onSelectedJobChange(e.target.value as JobId)
              }
            >
              {JOBS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nameJa}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn primary" onClick={onFreePractice}>
            フリー練習
          </button>
          <button type="button" className="btn ghost" onClick={onOpenSettings}>
            設定
          </button>
          <button type="button" className="btn ghost" onClick={onOpenKeybinds}>
            キーバインド
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onCreate(selectedJob)}
          >
            回しを追加
          </button>
        </div>
      </header>

      <section className="rotation-list" aria-label="回し一覧">
        {visible.length === 0 ? (
          <p className="muted">
            {jobNameJa(selectedJob)}の回しはまだありません。「回しを追加」から作成できます。
          </p>
        ) : null}
        {visible.map((rot) => (
          <article key={rot.id} className="rotation-row">
            <div className="rotation-main">
              <h2>{rot.name}</h2>
              <p>
                {jobNameJa(rot.jobId)} · {rot.steps.length}手 · GCD{' '}
                {(rot.gcdMs / 1000).toFixed(2)}s
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => onEdit(rot.id)}
              >
                編集
              </button>
              {!rot.isSample ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    if (confirm(`「${rot.name}」を削除しますか？`))
                      onDelete(rot.id)
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
