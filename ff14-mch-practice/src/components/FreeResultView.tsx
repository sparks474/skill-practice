import { getSkill } from '../data/skills'
import type { FreePracticeSummary } from '../types'

type Props = {
  summary: FreePracticeSummary
  jobNameJa: string
  onRetry: () => void
  onHome: () => void
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function FreeResultView({
  summary,
  jobNameJa,
  onRetry,
  onHome,
}: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="brand">Skill Practice</p>
          <h1>フリー練習 結果</h1>
          <p className="lead">
            {jobNameJa} · {formatMs(summary.elapsedMs)}
          </p>
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
            発動数
            <strong>{summary.castCount}</strong>
          </li>
          <li>
            空き時間（無駄）
            <strong>{formatMs(summary.idleWasteMs)}</strong>
          </li>
          <li>
            ヒート溢れ
            <strong>{summary.heatOverflow}</strong>
          </li>
          <li>
            バッテリー溢れ
            <strong>{summary.batteryOverflow}</strong>
          </li>
          {summary.failCount > 0 ? (
            <li>
              失敗
              <strong>{summary.failCount}</strong>
            </li>
          ) : null}
        </ul>
        <p className="muted result-hint">
          空き時間は、GCD・硬直・詠唱が空いているのに Weaponskill
          を押さなかった合計です（発動遊び以内は除く）。ゲージ溢れは、すでに
          100 のゲージへさらに加算したときです。
        </p>
      </section>

      <section>
        <h2>ログ</h2>
        <ol className="event-log">
          {summary.events.length === 0 ? (
            <li className="muted">記録なし</li>
          ) : null}
          {summary.events.map((e, i) => {
            const skill = getSkill(e.skillId)
            const name = skill?.nameJa ?? e.skillId
            const t = `${(e.atMs / 1000).toFixed(2)}s`
            if (e.type === 'cast') {
              return (
                <li key={i}>
                  {t} 発動: {name}
                  {e.usedQueue ? '（予約）' : ''}
                </li>
              )
            }
            if (e.type === 'gauge_overflow') {
              const g = e.gauge === 'heat' ? 'ヒート' : 'バッテリー'
              return (
                <li key={i} className="waste">
                  {t} ゲージ溢れ（{g}）: {name}
                </li>
              )
            }
            return (
              <li key={i} className="bad">
                {t} 失敗: {name} — {e.reason}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
