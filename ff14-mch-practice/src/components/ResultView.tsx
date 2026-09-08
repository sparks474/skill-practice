import type { PracticeSummary } from '../types'
import { getSkill } from '../data/skills'

type Props = {
  summary: PracticeSummary
  rotationName: string
  onRetry: () => void
  onHome: () => void
}

export function ResultView({ summary, rotationName, onRetry, onHome }: Props) {
  const rate =
    summary.totalSteps === 0
      ? 0
      : Math.round((summary.successCount / summary.totalSteps) * 100)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">MCH Practice</p>
          <h1>結果</h1>
          <p className="lead">{rotationName}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={onHome}>
            ホーム
          </button>
          <button type="button" className="btn primary" onClick={onRetry}>
            もう一度
          </button>
        </div>
      </header>

      <section className="result-summary">
        <p className="result-score">
          正解 {summary.successCount} / {summary.totalSteps}
          <span className="muted">（{rate}%）</span>
        </p>
        <ul className="result-stats">
          <li>Perfect: {summary.perfect}</li>
          <li>OK: {summary.ok}</li>
          <li>Late: {summary.late}</li>
          <li>押し間違い: {summary.wrongInput}</li>
          <li>その他失敗: {summary.otherFail}</li>
          <li>先行入力使用: {summary.queueUsed}</li>
          <li>経過: {(summary.elapsedMs / 1000).toFixed(1)}s</li>
        </ul>
      </section>

      <section>
        <h2>イベント</h2>
        <ol className="event-log">
          {summary.events.map((e, i) => {
            const skill = getSkill(e.skillId)
            if (e.type === 'success') {
              return (
                <li key={i}>
                  #{e.stepIndex + 1} {skill?.nameJa ?? e.skillId} —{' '}
                  <strong>{e.grade}</strong> +{Math.round(e.delayMs)}ms
                  {e.usedQueue ? '（予約）' : ''}
                </li>
              )
            }
            if (e.type === 'wrong_input') {
              const expected = getSkill(e.expectedSkillId)
              return (
                <li key={i} className="bad">
                  押し間違い: {skill?.nameJa ?? e.skillId}（正: {expected?.nameJa}）
                </li>
              )
            }
            return (
              <li key={i} className="bad">
                その他失敗: {skill?.nameJa ?? e.skillId} — {e.reason}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
