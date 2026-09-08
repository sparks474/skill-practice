import { DEFAULT_JOB_ID } from './jobs'
import type { JobId, Skill } from '../types'

/**
 * 機工士アクションマスタ
 * 出典: https://jp.finalfantasyxiv.com/jobguide/machinist/ （Lv100 / Patch 7.x PvE）
 * 威力・ペット挙動は練習ツール対象外。リキャスト・ゲージ・チャージを優先して合わせる。
 */
export const SKILLS: Skill[] = [
  // —— コンボ ——
  {
    id: 'heated_split_shot',
    nameJa: 'ヒートスプリットショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0, // GCD 2.5s（回し設定）
    gauge: { delta: { heat: 5 } },
    tags: ['combo'],
  },
  {
    id: 'heated_slug_shot',
    nameJa: 'ヒートスラッグショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    gauge: { delta: { heat: 5 } },
    tags: ['combo'],
  },
  {
    id: 'heated_clean_shot',
    nameJa: 'ヒートクリーンショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    gauge: { delta: { heat: 5, battery: 10 } },
    tags: ['combo'],
  },
  {
    id: 'split_shot',
    nameJa: 'スプリットショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    gauge: { delta: { heat: 5 } },
    tags: ['combo'],
  },
  {
    id: 'slug_shot',
    nameJa: 'スラッグショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    // コンボ時のみヒート+5（練習では常時付与で近似）
    gauge: { delta: { heat: 5 } },
    tags: ['combo'],
  },
  {
    id: 'clean_shot',
    nameJa: 'クリーンショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    gauge: { delta: { heat: 5, battery: 10 } },
    tags: ['combo'],
  },

  // —— ウェポンスキル（ツール） ——
  {
    id: 'drill',
    nameJa: 'ドリル',
    category: 'skill',
    castMs: 0,
    recastMs: 20_000,
    charges: 2,
    sharedRecastGroup: 'drill_bio',
    // 公式: バッテリー上昇なし（バイオとリキャ共有）
    tags: ['tool'],
  },
  {
    id: 'air_anchor',
    nameJa: 'エアアンカー',
    category: 'skill',
    castMs: 0,
    recastMs: 40_000,
    gauge: { delta: { battery: 20 } },
    tags: ['tool'],
  },
  {
    id: 'chain_saw',
    nameJa: '回転のこぎり',
    category: 'skill',
    castMs: 0,
    recastMs: 60_000,
    gauge: { delta: { battery: 20 } },
    tags: ['tool'],
  },
  {
    id: 'excavator',
    nameJa: 'エクスカベーター',
    category: 'skill',
    castMs: 0,
    // 公式: Instant / リキャスト 2.5秒（通常GCD）。固有長CDなし
    recastMs: 0,
    gauge: { delta: { battery: 20 } },
    tags: ['tool'],
  },
  {
    id: 'bio_blaster',
    nameJa: 'バイオブラスト',
    category: 'skill',
    castMs: 0,
    recastMs: 20_000,
    charges: 2,
    sharedRecastGroup: 'drill_bio',
    tags: ['aoe', 'tool'],
  },
  {
    id: 'scattergun',
    nameJa: 'スキャッターガン',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    gauge: { delta: { heat: 10 } },
    tags: ['aoe'],
  },
  {
    id: 'auto_crossbow',
    nameJa: 'オートボウガン',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    fixedGcdMs: 1500,
    requiresOverheat: true,
    tags: ['aoe', 'overheat'],
  },

  // —— オーバーヒート／フルメタル ——
  {
    id: 'blazing_shot',
    nameJa: 'ブレイズショット',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    fixedGcdMs: 1500,
    requiresOverheat: true,
    reduceRecast: {
      skillIds: ['double_check', 'checkmate'],
      amountMs: 15_000,
    },
    tags: ['overheat'],
  },
  {
    id: 'heat_blast',
    nameJa: 'ヒートブラスト',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    fixedGcdMs: 1500,
    requiresOverheat: true,
    reduceRecast: {
      skillIds: ['gauss_round', 'ricochet', 'double_check', 'checkmate'],
      amountMs: 15_000,
    },
    tags: ['overheat'],
  },
  {
    id: 'full_metal_burst',
    nameJa: 'フルメタルバースト',
    category: 'skill',
    castMs: 0,
    recastMs: 0, // 公式リキャスト 2.5秒 = 通常GCD
    requiresFullMetal: true,
    tags: ['burst'],
  },

  // —— アビリティ ——
  {
    id: 'reassemble',
    nameJa: '整備',
    category: 'ability',
    castMs: 0,
    recastMs: 55_000,
    charges: 2,
    tags: ['buff'],
  },
  {
    id: 'hypercharge',
    nameJa: 'ハイパーチャージ',
    category: 'ability',
    castMs: 0,
    recastMs: 10_000,
    // 通常はヒート50消費。バレルの「ハイパーチャージ実行可」時は無消費（エンジン側）
    gauge: { require: { heat: 50 }, delta: { heat: -50 } },
    grantsOverheatStacks: 5,
    tags: ['gauge'],
  },
  {
    id: 'barrel_stabilizer',
    nameJa: 'バレルヒーター',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    grantsFullMetal: true,
    grantsHyperchargeReady: true,
    tags: ['burst'],
  },
  {
    id: 'wildfire',
    nameJa: 'ワイルドファイア',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['burst'],
  },
  {
    id: 'double_check',
    nameJa: 'ダブルチェック',
    category: 'ability',
    castMs: 0,
    recastMs: 30_000,
    charges: 3,
    tags: ['ogcd'],
  },
  {
    id: 'checkmate',
    nameJa: 'チェックメイト',
    category: 'ability',
    castMs: 0,
    recastMs: 30_000,
    charges: 3,
    tags: ['ogcd'],
  },
  {
    id: 'automaton_queen',
    nameJa: 'オートマトン・クイーン',
    category: 'ability',
    castMs: 0,
    recastMs: 6_000,
    sharedRecastGroup: 'queen',
    gauge: { require: { battery: 50 } },
    consumeAllBattery: true,
    tags: ['pet'],
  },
  {
    id: 'queen_overdrive',
    nameJa: 'オーバードライブ・クイーン',
    category: 'ability',
    castMs: 0,
    recastMs: 15_000,
    sharedRecastGroup: 'queen',
    tags: ['pet'],
  },
  {
    id: 'rook_autoturret',
    nameJa: 'オートタレット・ルーク',
    category: 'ability',
    castMs: 0,
    recastMs: 6_000,
    sharedRecastGroup: 'rook',
    gauge: { require: { battery: 50 } },
    consumeAllBattery: true,
    tags: ['pet'],
  },
  {
    id: 'rook_overdrive',
    nameJa: 'オーバードライブ・ルーク',
    category: 'ability',
    castMs: 0,
    recastMs: 15_000,
    sharedRecastGroup: 'rook',
    tags: ['pet'],
  },
  {
    id: 'detonator',
    nameJa: 'デトネーター',
    category: 'ability',
    castMs: 0,
    recastMs: 1_000,
    tags: ['pet'],
  },
  {
    id: 'gauss_round',
    nameJa: 'ガウスラウンド',
    category: 'ability',
    castMs: 0,
    recastMs: 30_000,
    charges: 3,
    tags: ['ogcd', 'legacy'],
  },
  {
    id: 'ricochet',
    nameJa: 'リコシェット',
    category: 'ability',
    castMs: 0,
    recastMs: 30_000,
    charges: 3,
    tags: ['ogcd', 'legacy'],
  },
  {
    id: 'tactician',
    nameJa: 'タクティシャン',
    category: 'ability',
    castMs: 0,
    recastMs: 90_000,
    tags: ['mit'],
  },
  {
    id: 'dismantle',
    nameJa: 'ウェポンブレイク',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['mit'],
  },
  {
    id: 'flamethrower',
    nameJa: 'フレイムスロアー',
    category: 'ability',
    castMs: 0,
    recastMs: 60_000,
    tags: ['aoe'],
  },
  {
    id: 'potion',
    nameJa: '薬',
    category: 'ability',
    castMs: 0,
    recastMs: 300_000, // 固有リキャスト 5分（効果なし・タイミング練習用）
    tags: ['item', 'shared'],
  },

  // =====================================================================
  // 吟遊詩人（BRD）Lv100 PvE
  // 出典: https://jp.finalfantasyxiv.com/jobguide/bard/
  // ゲージ: battery = ソウルボイス（0–100）。ヒートは未使用。
  // 詩心の確率発動・戦歌スタックは練習では簡略化（エンピリアルで SV+5 のみ）。
  // =====================================================================

  // —— ウェポンスキル（単体） ——
  {
    id: 'burst_shot',
    nameJa: 'バーストショット',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    tags: ['filler'],
  },
  {
    id: 'refulgent_arrow',
    nameJa: 'リフルジェントアロー',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    requiresHawksEye: true,
    tags: ['proc'],
  },
  {
    id: 'caustic_bite',
    nameJa: 'コースティックバイト',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    tags: ['dot'],
  },
  {
    id: 'stormbite',
    nameJa: 'ストームバイト',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    tags: ['dot'],
  },
  {
    id: 'iron_jaws',
    nameJa: 'アイアンジョー',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    tags: ['dot'],
  },
  {
    id: 'apex_arrow',
    nameJa: 'エイペックスアロー',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    // ソウルボイス 20 以上で実行、全消費。80 以上ならブラストアロー実行可
    gauge: { require: { battery: 20 } },
    consumeAllBattery: true,
    grantsBlastArrow: true,
    grantsBlastArrowMinBattery: 80,
    tags: ['gauge'],
  },
  {
    id: 'blast_arrow',
    nameJa: 'ブラストアロー',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    requiresBlastArrow: true,
    tags: ['gauge'],
  },
  {
    id: 'resonance_arrow',
    nameJa: 'レゾナンスアロー',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    requiresResonanceArrow: true,
    tags: ['burst'],
  },
  {
    id: 'radiant_encore',
    nameJa: '光神のアンコール',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    requiresRadiantEncore: true,
    tags: ['burst'],
  },

  // —— ウェポンスキル（範囲） ——
  {
    id: 'ladonsbite',
    nameJa: 'ラドンバイト',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    tags: ['aoe', 'filler'],
  },
  {
    id: 'shadowbite',
    nameJa: 'シャドウバイト',
    jobId: 'BRD',
    category: 'skill',
    castMs: 0,
    recastMs: 0,
    requiresHawksEye: true,
    tags: ['aoe', 'proc'],
  },

  // —— アビリティ（攻撃） ——
  {
    id: 'heartbreak_shot',
    nameJa: 'ハートブレイクショット',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 15_000,
    charges: 3,
    sharedRecastGroup: 'bloodletter',
    tags: ['ogcd'],
  },
  {
    id: 'rain_of_death',
    nameJa: 'レイン・オブ・デス',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 15_000,
    charges: 3,
    sharedRecastGroup: 'bloodletter',
    tags: ['aoe', 'ogcd'],
  },
  {
    id: 'empyreal_arrow',
    nameJa: 'エンピリアルアロー',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 15_000,
    // 戦歌中は詩心付与 → ソウルボイス +5（確率詩心は省略し、実行時に +5）
    gauge: { delta: { battery: 5 } },
    tags: ['ogcd'],
  },
  {
    id: 'sidewinder',
    nameJa: 'サイドワインダー',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 60_000,
    tags: ['ogcd'],
  },
  {
    id: 'pitch_perfect',
    nameJa: 'ピッチパーフェクト',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 1_000,
    // 旅神のメヌエット＋詩心スタックは練習では未シミュ（常時実行可）
    tags: ['ogcd', 'song'],
  },

  // —— 戦歌／バースト ——
  {
    id: 'the_wanderers_minuet',
    nameJa: '旅神のメヌエット',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['song', 'burst'],
  },
  {
    id: 'mages_ballad',
    nameJa: '賢人のバラード',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['song'],
  },
  {
    id: 'armys_paeon',
    nameJa: '軍神のパイオン',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['song'],
  },
  {
    id: 'barrage',
    nameJa: '乱れ撃ち',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    grantsHawksEye: true,
    grantsResonanceArrow: true,
    tags: ['burst'],
  },
  {
    id: 'raging_strikes',
    nameJa: '猛者の撃',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['burst'],
  },
  {
    id: 'battle_voice',
    nameJa: 'バトルボイス',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['burst'],
  },
  {
    id: 'radiant_finale',
    nameJa: '光神のフィナーレ',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 110_000,
    // コーダ条件は練習では未強制
    grantsRadiantEncore: true,
    tags: ['burst'],
  },

  // —— 軽減・ユーティリティ ——
  {
    id: 'troubadour',
    nameJa: 'トルバドゥール',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 90_000,
    tags: ['mit'],
  },
  {
    id: 'natures_minne',
    nameJa: '地神のミンネ',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 120_000,
    tags: ['heal'],
  },
  {
    id: 'the_wardens_paean',
    nameJa: '時神のピーアン',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 45_000,
    tags: ['utility'],
  },
  {
    id: 'repelling_shot',
    nameJa: 'リペリングショット',
    jobId: 'BRD',
    category: 'ability',
    castMs: 0,
    recastMs: 30_000,
    tags: ['utility'],
  },
]

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(
  SKILLS.map((s) => {
    const shared = s.tags?.includes('shared')
    return [s.id, { ...s, jobId: shared ? s.jobId : (s.jobId ?? 'MCH') }]
  }),
)

export function getSkill(id: string): Skill | undefined {
  return SKILL_BY_ID[id]
}

/** ジョブのスキル一覧（shared タグは全ジョブに含める） */
export function getSkillsForJob(jobId: JobId): Skill[] {
  return SKILLS.filter((s) => {
    if (s.tags?.includes('shared')) return true
    return (s.jobId ?? DEFAULT_JOB_ID) === jobId
  }).map((s) => SKILL_BY_ID[s.id] ?? s)
}

/** 同一リキャストグループに属するスキル ID 一覧 */
export function skillsInRecastGroup(group: string): Skill[] {
  return SKILLS.filter((s) => s.sharedRecastGroup === group)
}
