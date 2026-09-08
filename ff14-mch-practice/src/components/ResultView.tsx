import type { PracticeSummary } from '../types'
import { getSkill } from '../data/skills'

type Props = {
  summary: PracticeSummary
  rotationName: string
  onRetry: () => void
  onHome: () => void
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function ResultView({ summary, rotationName, onRetry, onHome }: Props) {
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
        <ul className="result-stats">
          <li>
            押し間違い
            <strong>{summary.wrongInput}</strong>
          </li>
          <li>
            空き時間（無駄）
            <strong>{formatMs(summary.idleWasteMs)}</strong>
          </li>
          {summary.otherFail > 0 ? (
            <li>
              その他失敗
              <strong>{summary.otherFail}</strong>
            </li>
          ) : null}
        </ul>
        <p className="muted result-hint">
          空き時間は、次スキルが使えるようになってから押すまでの合計です（開始の1手目は除く）。先行入力で待ち続ければ短くなります。
        </p>
      </section>

      <section>
        <h2>内訳</h2>
        <ol className="event-log">
          {summary.events.map((e, i) => {
            const skill = getSkill(e.skillId)
            if (e.type === 'success') {
              const showIdle = e.stepIndex > 0 && e.idleMs > 0
              return (
                <li key={i} className={showIdle ? 'waste' : undefined}>
                  #{e.stepIndex + 1} {skill?.nameJa ?? e.skillId}
                  {showIdle ? ` — 空き +${Math.round(e.idleMs)}ms` : ''}
                  {e.usedQueue ? '（予約）' : ''}
                </li>
              )
            }
            if (e.type === 'wrong_input') {
              const expected = getSkill(e.expectedSkillId)
              return (
                <li key={i} className="bad">
                  押し間違い: {skill?.nameJa ?? e.skillId}（正:{' '}
                  {expected?.nameJa}）
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
