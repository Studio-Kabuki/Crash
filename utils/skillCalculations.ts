import { Skill, HeroStats } from '../types';

interface HasteCalculationParams {
  skill: Skill;
  lastCardWasAttack: boolean;     // 前のカードがアタックだったか
}

interface HasteCalculationResult {
  actualDelay: number;              // 最終的なヘイスト消費
  originalDelay: number;            // 元のヘイスト値
}

/**
 * ヘイスト消費を計算する共通関数
 */
export function calculateHaste(params: HasteCalculationParams): HasteCalculationResult {
  const { skill } = params;

  const originalDelay = skill.delay;
  const actualDelay = Math.max(0, originalDelay);

  return {
    actualDelay,
    originalDelay
  };
}

interface DamageCalculationParams {
  skill: Skill;
  heroStats: HeroStats;
  damageMultiplier?: number;  // ダメージ倍率（敵の特性など）
  strengthValue?: number;     // 筋力バフの値（社員数に加算）
}

/**
 * スキルのダメージを計算する共通関数
 * 新計算式: baseDamage + (employees × employeeRatio / 100)
 */
export function calculateDamage(params: DamageCalculationParams): number {
  const { skill, heroStats, damageMultiplier = 1.0, strengthValue = 0 } = params;

  const baseDmg = skill.baseDamage || 0;

  // 筋力バフを社員数に加算
  const effectiveEmployees = heroStats.employees + strengthValue;

  // 社員数ダメージ計算
  const employeeDamage = Math.floor(effectiveEmployees * (skill.employeeRatio || 0) / 100);

  // 征服者などのカード固有倍率を適用
  const skillMultiplier = skill.multiplier ?? 1.0;

  // 最終ダメージ = (基礎 + 社員数ダメージ) × 倍率
  const totalDamage = Math.floor((baseDmg + employeeDamage) * skillMultiplier * damageMultiplier);

  return Math.max(0, totalDamage);
}

interface EffectDamageParams {
  skill: Skill;
  enemyDamageTaken: number;
  effectsDisabled?: boolean;
}

interface EffectDamageResult {
  effectDamage: number;
  effectDamageType: 'base' | 'none';
}

/**
 * スキルの能力ダメージを計算する共通関数
 */
export function calculateEffectDamage(params: EffectDamageParams): EffectDamageResult {
  const { skill, enemyDamageTaken, effectsDisabled = false } = params;

  let effectDamage = 0;
  let effectDamageType: 'base' | 'none' = 'none';

  if (skill.effect && !effectsDisabled) {
    if (skill.effect.type === 'enemy_damage_taken') {
      const ratio = (skill.effect.params.value || 100) / 100;
      effectDamage = Math.floor(enemyDamageTaken * ratio);
      effectDamageType = 'base';
    }
  }

  return { effectDamage, effectDamageType };
}
