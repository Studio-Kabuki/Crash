
// 効果タイプ
export type EffectType =
  | 'none'
  | 'mana_restore'         // マナ回復
  | 'lifesteal'            // 与ダメージ分マナ回復
  | 'poison'               // 毒付与
  | 'permanent_power_up'   // 永続パワーアップ
  | 'deck_slash_bonus'     // 山札のスラッシュ枚数ボーナス
  | 'discard_slash_damage' // 山札・手札のスラッシュを捨ててダメージ
  | 'add_buff'             // バフを付与
  | 'stat_buff'            // ステータスバフ（戦闘中）
  | 'physical_chain_haste' // 物理チェーン時ヘイスト減少
  | 'physical_chain_haste_draw' // 物理チェーン時ヘイスト減少＋ドロー
  | 'enemy_damage_taken'   // 敵の減少HP分のダメージ
  | 'draw'                 // カードをドロー（上限超過可能）
  | 'mana_recovery'        // マナ回復
  | 'mana_consume_damage'  // マナを全消費してダメージ
  | 'discard_magic_mana'   // 捨て札の魔法カード×値のマナ回復＋ドロー
  | 'add_copy_to_deck'     // カードのコピーをデッキに追加
  | 'discard_redraw'       // 手札を全て捨てて捨てた数+1ドロー
  | 'magic_lifesteal'      // 魔法ダメージ分マナ回復
  | 'magic_count_bonus'    // 使用した魔法カード枚数×APボーナス
  | 'add_strength'         // 筋力バフを付与
  | 'double_strength'      // 前が物理なら筋力2倍
  | 'add_slash_to_deck'    // 0コストスラッシュをデッキに追加
  | 'add_parry';           // パリィバフを付与

// バフタイプ
export type BuffType =
  | 'charge'            // ためる（次のアタックを複数回発動）
  | 'stat_up'           // ステータスアップ
  | 'stat_down'         // ステータスダウン
  | 'base_damage_boost' // ベースダメージ倍化（スタック制）
  | 'strength'          // 筋力（カード使用時10減、社員数に加算）
  | 'parry'             // パリィ（次カード使用で消滅、敵攻撃時に無敵+筋力+50）
  | 'invincible'        // 無敵（敵攻撃を無効化、スタック数分有効）
  | 'deathmarch'        // デスマーチ（スタック×10ヘイスト増加、ダメージで全解除）
  | 'bug'               // バグ（炎上時に消費、1につき進捗-10%）
  | 'kyushoku'          // 休職（社員数-20%/stack）
  | 'yudan'             // 油断（アタックのヘイスト+5/stack）
  | 'unity'             // 一致団結（+100%/stack、加算）
  | 'focus';            // 集中（x1.2^stack、乗算）

// プレイヤーのバフ/デバフ
export interface PlayerBuff {
  id: string;
  type: BuffType;
  name: string;
  icon: string;
  description: string;
  value: number;           // 効果量（回数、ステータス増加量など）
  stat?: 'employees' | 'sp' | 'mp';  // ステータス系バフの対象
}

// 効果の発動タイミング
export type EffectTrigger =
  | 'on_use'        // カード使用時
  | 'on_damage'     // ダメージ発生時
  | 'turn_end'      // ターン終了時
  | 'battle_start'; // 戦闘開始時

// カード分類
export type CardType = 'attack' | 'support';

// ワークスタイル属性（旧レアリティ）
export type Rarity = 'BLACK' | 'WHITE' | 'NEUTRAL';

// 主人公のパラメータ
export interface HeroStats {
  employees: number;  // 社員数（旧AD/AP統合）
  sp: number;         // ヘイスト（速度）
  mp: number;         // 士気（旧マナ）
}

// 効果パラメータ（柔軟な構造）
export interface EffectParams {
  value?: number;           // 汎用値
  count?: number;           // 回数
  stat?: 'employees' | 'sp' | 'mp';  // 対象ステータス
  duration?: 'turn' | 'battle' | 'permanent';  // 持続時間
  targetName?: string;      // 対象名
  buffId?: string;          // バフ定義ID（BUFFS参照）
  drawValue?: number;       // ドロー枚数
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
  employeeRatio: number;  // 社員数比率（%）
  manaCost: number;       // 士気コスト
  delay: number;          // ヘイスト消費量（ディレイ）
  workStyleChange?: number; // ホワイト/ブラック度変化
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  effect?: SkillEffect;
  rarity: Rarity;
  flavorText?: string;    // 目立たない補足テキスト
  multiplier?: number;    // ダメージ倍率（征服者など、使用するたび増加）
}

export interface BattleEvent {
  id: string;
  title: string;
  description: string;
  physicalMultiplier: number;  // 物理ダメージ倍率（1.0 = 等倍）
  magicMultiplier: number;     // 魔法ダメージ倍率（1.0 = 等倍）
  disableSupportEffects?: boolean;  // サポートカードの効果を無効化
  disableBuffEffects?: boolean;     // バフカードの効果を無効化
  armorThreshold?: number;          // この値以下のダメージを無効化
  manaDrainAmount?: number;         // カード使用後に減少させるマナ量
  type: 'positive' | 'negative' | 'neutral';
}

export interface Enemy {
  name: string;
  icon: string;
  baseHP: number;
  minFloor: number;
  maxFloor: number;
  trait?: BattleEvent;
  dropsAbility: 'N' | 'C' | 'Y';  // N: カード, C: コモンアビリティ, Y: 全アビリティ（エリート）
}

export type GameState = 'START' | 'PLAYING' | 'LEVEL_CLEAR' | 'BOSS_VICTORY' | 'ABILITY_REWARD' | 'GAME_OVER' | 'CARD_REWARD' | 'SHOP';

export interface PassiveEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'score_flat' | 'capacity_boost' | 'score_mult' | 'max_life_boost' | 'flat_damage_bonus' | 'employee_add' | 'employee_mult' | 'haste_add' | 'hand_size_boost' | 'gold_bonus';
  value: number;
  value2?: number;  // 複合効果用
  rarity: Rarity;
  maxStack: number;  // 最大所持数（0=無制限、1=重複不可、2以上=その数まで）
}

export interface CardProps {
  skill: Skill;
  onClick: () => void;
  disabled: boolean;
  mana: number;
  currentHaste: number;
  heroStats: HeroStats;
  damageMultiplier?: number;      // ダメージ倍率
  effectsDisabled?: boolean;
  // 能力ダメージ計算用
  enemyDamageTaken?: number;      // 敵の減少HP（最大HP - 現在HP）
  effectiveEmployees?: number;    // デバフ適用後の実効社員数
  extraDelay?: number;            // 追加ヘイスト消費（油断デバフ等）
}
