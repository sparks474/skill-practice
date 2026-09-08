import type { JobId, JobInfo } from '../types'

/** 選択可能なジョブ（スキルデータはジョブごとに段階追加） */
export const JOBS: readonly JobInfo[] = [
  { id: 'MCH', nameJa: '機工士', shortJa: '機工' },
  { id: 'BRD', nameJa: '吟遊詩人', shortJa: '詩人' },
  { id: 'DNC', nameJa: '踊り子', shortJa: '踊り' },
  { id: 'RPR', nameJa: 'リーパー', shortJa: 'リパ' },
]

export const DEFAULT_JOB_ID: JobId = 'MCH'

export function isJobId(value: unknown): value is JobId {
  return typeof value === 'string' && JOBS.some((j) => j.id === value)
}

export function getJob(jobId: JobId): JobInfo {
  return JOBS.find((j) => j.id === jobId) ?? JOBS[0]
}

export function jobNameJa(jobId: JobId): string {
  return getJob(jobId).nameJa
}
