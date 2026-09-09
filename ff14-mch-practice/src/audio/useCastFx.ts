import { useCallback, useEffect, useRef, useState } from 'react'
import { playSkillCastSfx } from './castSfx'

export type CastFx = {
  /** フラッシュ中のスキル ID（アニメ終了で null） */
  flashSkillId: string | null
  /** 同じスキル連打でもアニメ再発火するためのキー */
  flashKey: number
  /** フィードバック文言パルス再発火キー */
  feedbackPulseKey: number
  /** 新規発動スキル ID 列に対して SE + 視覚 FX */
  triggerCasts: (skillIds: string[]) => void
  reset: () => void
}

const FLASH_MS = 170

/**
 * 発動 SE とホットバー／フィードバック用の視覚 FX をまとめて扱う。
 */
export function useCastFx(): CastFx {
  const [flashSkillId, setFlashSkillId] = useState<string | null>(null)
  const [flashKey, setFlashKey] = useState(0)
  const [feedbackPulseKey, setFeedbackPulseKey] = useState(0)
  const clearTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current != null) {
        window.clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (clearTimerRef.current != null) {
      window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
    setFlashSkillId(null)
    setFlashKey(0)
    setFeedbackPulseKey(0)
  }, [])

  const triggerCasts = useCallback((skillIds: string[]) => {
    if (skillIds.length === 0) return
    for (const id of skillIds) {
      playSkillCastSfx()
      setFlashSkillId(id)
      setFlashKey((k) => k + 1)
      setFeedbackPulseKey((k) => k + 1)
    }
    if (clearTimerRef.current != null) {
      window.clearTimeout(clearTimerRef.current)
    }
    clearTimerRef.current = window.setTimeout(() => {
      setFlashSkillId(null)
      clearTimerRef.current = null
    }, FLASH_MS)
  }, [])

  return {
    flashSkillId,
    flashKey,
    feedbackPulseKey,
    triggerCasts,
    reset,
  }
}
