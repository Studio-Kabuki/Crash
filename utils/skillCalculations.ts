import { Skill, HeroStats } from '../types';

interface DamageMultipliers {
  physicalMultiplier: number;
  magicMultiplier: number;
}

interface HasteCalculationParams {
  skill: Skill;
  physicalHasteReduction: number;  // パッシブによる削減率 (0-100)
  lastCardWasPhysical: boolean;     // 前のカードが物理だったか
}

interface HasteCalculationResult {
  actualDelay: number;              // 最終的なヘイスト消費
  originalDelay: number;            // 元のヘイスト値
  hasPhysicalDamage: boolean;       // 物理ダメージを含むカードか
  isHasteReduced: boolean;          // パッシブで削減されているか
  isPhysicalChainActive: boolean;   // physical_chain_haste効果が発動しているか
  hasPhysicalChainEffect: boolean;  // physical_chain_haste効果を持っているか
  physicalChainBonus: number;       // physical_chain_haste効果による削減量
  hasteReductionBonus: number;      // パッシブによる削減量
}

/**
 * ヘイスト消費を計算する共通関数
 * - 迅速の刃パッシブ: 物理ダメージを含むカードのヘイスト消費を削減率分減らす
 * - physical_chain_haste効果: 前のカードが物理なら固定値減少
 * - 両方適用可能で、最終結果は0以上
 */
export function calculateHaste(params: HasteCalculationParams): HasteCalculationResult {
  const { skill, physicalHasteReduction, lastCardWasPhysical } = params;

  const originalDelay = skill.delay;

  // 物理ダメージを含むカード判定（物理係数 > 0）
  const hasPhysicalDamage = skill.adRatio > 0;

  // physical_chain_haste効果の計算（physical_chain_haste_drawも同様）
  const hasPhysicalChainEffect = skill.effect?.type === 'physical_chain_haste' || skill.effect?.type === 'physical_chain_haste_draw';
  const isPhysicalChainActive = hasPhysicalChainEffect && lastCardWasPhysical;
  const physicalChainBonus = isPhysicalChainActive
    ? (skill.effect?.params.value || 10)
    : 0;

  // 迅速の刃パッシブの計算（元のdelay値に対して計算）
  const hasteReductionBonus = hasPhysicalDamage && physicalHasteReduction > 0
    ? Math.floor(originalDelay * physicalHasteReduction / 100)
    : 0;
  const isHasteReduced = hasteReductionBonus > 0;

  // 両方の削減を適用（マイナスにはならない）
  const actualDelay = Math.max(0, originalDelay - physicalChainBonus - hasteReductionBonus);

  return {
    actualDelay,
    originalDelay,
    hasPhysicalDamage,
    isHasteReduced,
    isPhysicalChainActive,
    hasPhysicalChainEffect,
    physicalChainBonus,
    hasteReductionBonus
  };
}

interface DamageCalculationParams {
  skill: Skill;
  heroStats: HeroStats;
  multipliers: DamageMultipliers;
  baseDoubleStacks?: number;  // 集中バフのスタック数
}

/**
 * スキルのダメージを計算する共通関数
 */
export function calculateDamage(params: DamageCalculationParams): number {
  const { skill, heroStats, multipliers, baseDoubleStacks = 0 } = params;

  let baseDmg = skill.baseDamage || 0;

  // 集中バフ適用
  if (baseDoubleStacks > 0) {
    baseDmg *= Math.pow(2, baseDoubleStacks);
  }

  const hasPhysical = skill.adRatio > 0;
  const hasMagic = skill.apRatio > 0;

  // 基礎ダメージの倍率適用
  let scaledBaseDmg = 0;
  if (hasPhysical && hasMagic) {
    const halfBase = baseDmg / 2;
    scaledBaseDmg = Math.floor(halfBase * multipliers.physicalMultiplier + halfBase * multipliers.magicMultiplier);
  } else if (hasPhysical) {
    scaledBaseDmg = Math.floor(baseDmg * multipliers.physicalMultiplier);
  } else if (hasMagic) {
    scaledBaseDmg = Math.floor(baseDmg * multipliers.magicMultiplier);
  } else {
    scaledBaseDmg = baseDmg;
  }

  // 係数ダメージ計算
  const physicalDmg = Math.floor(heroStats.ad * skill.adRatio / 100 * multipliers.physicalMultiplier);
  const magicDmg = Math.floor(heroStats.ap * skill.apRatio / 100 * multipliers.magicMultiplier);

  // 征服者などのカード固有倍率を適用
  const skillMultiplier = skill.multiplier ?? 1.0;
  const totalDamage = Math.floor((scaledBaseDmg + physicalDmg + magicDmg) * skillMultiplier);

  return Math.max(0, totalDamage);
}

interface EffectDamageParams {
  skill: Skill;
  deckSlashCount: number;
  enemyDamageTaken: number;
  effectsDisabled?: boolean;
}

interface EffectDamageResult {
  effectDamage: number;
  effectDamageType: 'physical' | 'base' | 'none';
}

/**
 * スキルの能力ダメージを計算する共通関数
 */
export function calculateEffectDamage(params: EffectDamageParams): EffectDamageResult {
  const { skill, deckSlashCount, enemyDamageTaken, effectsDisabled = false } = params;

  let effectDamage = 0;
  let effectDamageType: 'physical' | 'base' | 'none' = 'none';

  if (skill.effect && !effectsDisabled) {
    if (skill.effect.type === 'deck_slash_bonus') {
      const bonusPerSlash = skill.effect.params.value || 30;
      effectDamage = deckSlashCount * bonusPerSlash;
      effectDamageType = 'physical';
    } else if (skill.effect.type === 'enemy_damage_taken') {
      const ratio = (skill.effect.params.value || 100) / 100;
      effectDamage = Math.floor(enemyDamageTaken * ratio);
      effectDamageType = 'base';
    }
  }

  return { effectDamage, effectDamageType };
}
