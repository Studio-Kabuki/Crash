
export type EffectType = 'none' | 'adjacency' | 'global_mult' | 'count_bonus' | 'positional' | 'mana_refund' | 'next_action_mult' | 'next_action_double' | 'poison' | 'deck_count_bonus' | 'lifesteal_mana' | 'permanent_stack' | 'prev_turn_magic_bonus' | 'combo_skip' | 'adjacency_physical_skip';
export type Rarity = 'SSR' | 'R' | 'C';

// 主人公のパラメータ
export interface HeroStats {
  ad: number;  // 物理攻撃力
  ap: number;  // 魔法攻撃力
  sp: number;  // ヘイスト（速度）
  mp: number;  // マナ
}

export interface SkillEffect {
  type: EffectType;
  description: string;
  value: number; // Damage bonus or Multiplier
  targetName?: string; // For synergy (e.g., "Fireball")
  position?: number; // For positional bonus (e.g., "last slot")
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  power: number;
  manaCost: number;
  delay: number; // ヘイスト消費量（ディレイ）
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  effect?: SkillEffect;
  category: 'physical' | 'magic' | 'buff';
  rarity: Rarity;
}

export interface BattleEvent {
  id: string;
  title: string;
  description: string;
  targetCategory?: 'physical' | 'magic' | 'buff';
  targetSkill?: string;
  multiplier: number;
  disableEffects?: boolean;
  type: 'positive' | 'negative' | 'neutral';
}

export interface Enemy {
  name: string;
  icon: string;
  baseHP: number;
  minFloor: number;
  maxFloor: number;
  trait?: BattleEvent; // 敵固有の場の効果
}

export type GameState = 'START' | 'PLAYING' | 'LEVEL_CLEAR' | 'BOSS_VICTORY' | 'GAME_OVER' | 'CARD_REWARD' | 'SHOP' | 'BESTIARY';

export interface PassiveEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'score_flat' | 'capacity_boost' | 'score_mult' | 'category_buff' | 'adjacency_to_mult' | 'sauce_mult_add' | 'max_life_boost' | 'flat_damage_bonus' | 'combo_skip_physical';
  value: number;
  targetCategory?: 'physical' | 'magic' | 'buff';
  rarity: Rarity;
}

export interface CardProps {
  skill: Skill;
  onClick: () => void;
  disabled: boolean;
  mana: number;
  marketModifier?: number;
  effectsDisabled?: boolean;
  magicUsedLastTurn?: boolean;
}
