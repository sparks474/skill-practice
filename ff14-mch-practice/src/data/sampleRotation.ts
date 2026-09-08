import type { Rotation } from '../types'

/**
 * 機工 開幕（サンプル）
 * 参考: https://game8.jp/ff14/614477 （GCD 2.50 想定）
 * ※チェックメイト／ダブルチェックの先後はどちらでも可
 */
export const SAMPLE_ROTATION: Rotation = {
  id: 'sample-mch-opener',
  name: '機工 開幕（サンプル）',
  jobId: 'MCH',
  gcdMs: 2500,
  // 開幕練習用にヒート満タン開始（実戦の持ち越し想定）
  initialGauges: { heat: 100, battery: 0 },
  isSample: true,
  note: 'Game8 Lv100開幕（GCD2.50）準拠の練習用手順。整備は開始5秒前・薬は開始2秒前想定。ヒートは持ち越し想定で100開始。チェック2種の先後はどちらでも可。',
  updatedAt: Date.UTC(2026, 8, 8),
  steps: [
    // 1-2 プル前
    { skillId: 'reassemble' },
    { skillId: 'potion' },
    // 3-5 アンカー＋チェック2種
    { skillId: 'air_anchor' },
    { skillId: 'checkmate' },
    { skillId: 'double_check' },
    // 6-8 ドリル＋バレル → のこぎり
    { skillId: 'drill' },
    { skillId: 'barrel_stabilizer' },
    { skillId: 'chain_saw' },
    // 9-11 エクスカベーター＋クイーン＋整備
    { skillId: 'excavator' },
    { skillId: 'automaton_queen' },
    { skillId: 'reassemble' },
    // 12-14 ドリル＋チェックメイト＋WF
    { skillId: 'drill' },
    { skillId: 'checkmate' },
    { skillId: 'wildfire' },
    // 15-17 フルメタル＋ダブルチェック＋ハイチャ
    { skillId: 'full_metal_burst' },
    { skillId: 'double_check' },
    { skillId: 'hypercharge' },
    // 18-27 ハイパーチャージコンボ（ブレイズ×5＋チェック織り）
    { skillId: 'blazing_shot' },
    { skillId: 'checkmate' },
    { skillId: 'blazing_shot' },
    { skillId: 'double_check' },
    { skillId: 'blazing_shot' },
    { skillId: 'checkmate' },
    { skillId: 'blazing_shot' },
    { skillId: 'double_check' },
    { skillId: 'blazing_shot' },
    { skillId: 'checkmate' },
    // 28-30 ドリル＋チェック
    { skillId: 'drill' },
    { skillId: 'double_check' },
    { skillId: 'checkmate' },
    // 31-34 基本コンボ開始
    { skillId: 'heated_split_shot' },
    { skillId: 'double_check' },
    { skillId: 'heated_slug_shot' },
    { skillId: 'heated_clean_shot' },
  ],
}
