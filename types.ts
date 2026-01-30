
// 効果タイプ
export type EffectType =
  | 'none'
  | 'mana_restore'         // マナ回復
  | 'lifesteal'            // 与ダメージ分マナ回復
  | 'poison'               // 毒付与
  | 'permanent_power_up'   // 永続パワーアップ
  | 'deck_slash_bonus'     // 山札のスラッシュ枚数ボーナス
  | 'add_buff'             // バフを付与
  | 'stat_buff'            // ステータスバフ（戦闘中）
  | 'physical_chain_haste' // 物理チェーン時ヘイスト減少
  | 'enemy_damage_taken';  // 敵の減少HP分のダメージ

// バフタイプ
export type BuffType =
  | 'charge'            // ためる（次のアタックを複数回発動）
  | 'stat_up'           // ステータスアップ
  | 'stat_down'         // ステータスダウン
  | 'base_damage_boost'; // ベースダメージ倍化（スタック制）

// プレイヤーのバフ/デバフ
export interface PlayerBuff {
  id: string;
  type: BuffType;
  name: string;
  icon: string;
  description: string;
  value: number;           // 効果量（回数、ステータス増加量など）
  stat?: 'ad' | 'ap' | 'sp' | 'mp';  // ステータス系バフの対象
}

// 効果の発動タイミング
export type EffectTrigger =
  | 'on_use'        // カード使用時
  | 'on_damage'     // ダメージ発生時
  | 'turn_end'      // ターン終了時
  | 'battle_start'; // 戦闘開始時

// カード分類
export type CardType = 'attack' | 'support';

export type Rarity = 'SSR' | 'SR' | 'R' | 'C';

// 主人公のパラメータ
export interface HeroStats {
  ad: number;  // 物理攻撃力
  ap: number;  // 魔法攻撃力
  sp: number;  // ヘイスト（速度）
  mp: number;  // マナ
}

// 効果パラメータ（柔軟な構造）
export interface EffectParams {
  value?: number;           // 汎用値
  count?: number;           // 回数
  stat?: 'ad' | 'ap' | 'sp' | 'mp';  // 対象ステータス
  duration?: 'turn' | 'battle' | 'permanent';  // 持続時間
  targetName?: string;      // 対象名（スラッシュなど）
  buffId?: string;          // バフ定義ID（BUFFS参照）
}

export interface SkillEffect {
  type: EffectType;
  trigger: EffectTrigger;
  description: string;
  params: EffectParams;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  cardType: CardType;     // アタック or サポート
  baseDamage: number;     // 基礎ダメージ
  adRatio: number;        // 物理係数（%）
  apRatio: number;        // 魔法係数（%）
  manaCost: number;
  delay: number;          // ヘイスト消費量（ディレイ）
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  effect?: SkillEffect;
  rarity: Rarity;
}

export interface BattleEvent {
  id: string;
  title: string;
  description: string;
  physicalMultiplier: number;  // 物理ダメージ倍率（1.0 = 等倍）
  magicMultiplier: number;     // 魔法ダメージ倍率（1.0 = 等倍）
  disableSupportEffects?: boolean;  // サポートカードの効果を無効化
  type: 'positive' | 'negative' | 'neutral';
}

export interface Enemy {
  name: string;
  icon: string;
  baseHP: number;
  minFloor: number;
  maxFloor: number;
  trait?: BattleEvent;
}

export type GameState = 'START' | 'PLAYING' | 'LEVEL_CLEAR' | 'BOSS_VICTORY' | 'GAME_OVER' | 'CARD_REWARD' | 'SHOP';

export interface PassiveEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'score_flat' | 'capacity_boost' | 'score_mult' | 'adjacency_to_mult' | 'sauce_mult_add' | 'max_life_boost' | 'flat_damage_bonus' | 'category_buff' | 'ad_boost' | 'ap_boost' | 'ap_mana_boost' | 'physical_haste_reduction';
  value: number;
  value2?: number;  // 複合効果用（ap_mana_boostのマナ値など）
  rarity: Rarity;
  targetCategory?: string;  // category_buff用
}

export interface CardProps {
  skill: Skill;
  onClick: () => void;
  disabled: boolean;
  mana: number;
  currentHaste: number;
  heroStats: HeroStats;
  physicalMultiplier?: number;
  magicMultiplier?: number;
  effectsDisabled?: boolean;
  lastCardWasPhysical?: boolean;  // 前のカードが物理ダメージだったか
  // 能力ダメージ計算用
  deckSlashCount?: number;        // デッキ内のスラッシュ枚数
  enemyDamageTaken?: number;      // 敵の減少HP（最大HP - 現在HP）
}
