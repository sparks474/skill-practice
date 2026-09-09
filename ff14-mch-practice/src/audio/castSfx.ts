/**
 * スキル発動 SE
 * 素材: https://soundeffect-lab.info/ （戦闘系・拳銃発射）
 * ファイル: public/sounds/handgun-firing1.mp3
 */

const CAST_SFX_PATH = 'sounds/handgun-firing1.mp3'

function castSfxUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${CAST_SFX_PATH}`
}

/** 発動のたびに新規再生（連打でも途切れにくくする） */
export function playSkillCastSfx(): void {
  try {
    const audio = new Audio(castSfxUrl())
    audio.volume = 0.55
    void audio.play().catch(() => {
      // 自動再生制限などで失敗しても練習は継続
    })
  } catch {
    // Audio 非対応環境は無視
  }
}
