
import React, { useState, useEffect } from 'react';
import { Skill, CardProps } from '../types';
import { Swords, Zap, Ban, Wand2, Hexagon } from 'lucide-react';
import { calculateHaste, calculateEffectDamage } from '../utils/skillCalculations';

export const Card: React.FC<CardProps> = ({
  skill,
  onClick,
  disabled,
  mana,
  currentHaste,
  heroStats,
  physicalMultiplier = 1,
  magicMultiplier = 1,
  effectsDisabled = false,
  lastCardWasPhysical = false,
  deckSlashCount = 0,
  enemyDamageTaken = 0,
  physicalHasteReduction = 0
}) => {
  const [imgSrc, setImgSrc] = useState<string>(skill.icon);
  const [hasError, setHasError] = useState<boolean>(false);

  // skillが変わった場合に画像をリセット
  useEffect(() => {
    setImgSrc(skill.icon);
    setHasError(false);
  }, [skill.icon]);

  // ダメージ計算（基礎ダメージも倍率適用）
  const baseDamage = skill.baseDamage || 0;
  // マイナス係数は「係数なし」として扱う（ベースダメージのみ攻撃）
  const hasPhysicalRatio = skill.adRatio > 0;
  const hasMagicRatio = skill.apRatio > 0;
  const isPhysicalNegative = skill.adRatio < 0;
  const isMagicNegative = skill.apRatio < 0;
  // 表示用：マイナス係数があるかどうか
  const hasNegativeRatio = isPhysicalNegative || isMagicNegative;

  // 基礎ダメージの倍率適用
  let scaledBaseDamage = 0;
  if (hasPhysicalRatio && hasMagicRatio) {
    // ミックス: 半分ずつ割り振って計算
    const halfBase = baseDamage / 2;
    scaledBaseDamage = Math.floor(halfBase * physicalMultiplier + halfBase * magicMultiplier);
  } else if (hasPhysicalRatio) {
    // 物理のみ: 物理倍率を適用
    scaledBaseDamage = Math.floor(baseDamage * physicalMultiplier);
  } else if (hasMagicRatio) {
    // 魔法のみ: 魔法倍率を適用
    scaledBaseDamage = Math.floor(baseDamage * magicMultiplier);
  } else {
    // 係数なし: 倍率の影響を受けない（真のダメージ）
    scaledBaseDamage = baseDamage;
  }

  // マイナス係数の場合はベースダメージから差し引く
  const physicalDamage = Math.floor(heroStats.ad * skill.adRatio / 100 * physicalMultiplier);
  const magicDamage = Math.floor(heroStats.ap * skill.apRatio / 100 * magicMultiplier);
  // ダメージは0以下にならない
  const totalDamage = Math.max(0, scaledBaseDamage + physicalDamage + magicDamage);

  const hasBaseDamage = baseDamage > 0;
  // マイナス係数のみの場合もベースダメージのみ扱い
  const hasOnlyBaseDamage = hasBaseDamage && !hasPhysicalRatio && !hasMagicRatio;
  const hasMixedDamage = hasPhysicalRatio && hasMagicRatio;  // 物理+魔法の混合

  // 能力ダメージの計算（共通関数を使用）
  const { effectDamage, effectDamageType } = calculateEffectDamage({
    skill,
    deckSlashCount,
    enemyDamageTaken,
    effectsDisabled
  });

  // 最終ダメージ（通常ダメージ + 能力ダメージ）
  const finalDisplayDamage = totalDamage + effectDamage;
  // 能力ダメージ系のカードは常にダメージありとして扱う
  const hasEffectDamageSkill = skill.effect?.type === 'deck_slash_bonus' || skill.effect?.type === 'enemy_damage_taken';
  const hasDamage = hasBaseDamage || hasPhysicalRatio || hasMagicRatio || effectDamage > 0 || hasEffectDamageSkill;

  const isPhysicalUp = physicalMultiplier > 1;
  const isPhysicalDown = physicalMultiplier < 1;
  const isMagicUp = magicMultiplier > 1;
  const isMagicDown = magicMultiplier < 1;

  // ヘイスト計算（共通関数を使用）
  const hasteResult = calculateHaste({
    skill,
    physicalHasteReduction,
    lastCardWasPhysical
  });
  const {
    actualDelay,
    isHasteReduced,
    isPhysicalChainActive,
    hasPhysicalChainEffect
  } = hasteResult;

  const canAffordMana = mana >= skill.manaCost;
  const canAffordHaste = currentHaste >= actualDelay;
  const canAfford = canAffordMana && canAffordHaste;

  // レアリティに応じた枠色
  const getRarityBorderColor = () => {
    if (!canAfford) return 'border-red-900';
    if (skill.rarity === 'SSR') return 'border-yellow-500';
    if (skill.rarity === 'SR') return 'border-orange-400';
    if (skill.rarity === 'R') return 'border-purple-500';
    return 'border-slate-600';
  };

  const handleImgError = () => {
    setImgSrc('https://img.icons8.com/fluency/144/star.png');
    setHasError(true);
  };

  const isDisabled = disabled || !canAfford;

  return (
    <div
      onClick={isDisabled ? undefined : onClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      className={`
        relative group
        flex flex-col items-center justify-start
        w-28 h-[14rem]
        bg-slate-900 border-2 rounded-lg
        ${getRarityBorderColor()}
        shadow-2xl
        transition-all duration-150
        ${isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer active:translate-y-1 active:shadow-none hover:-translate-y-2 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
        }
        overflow-hidden
      `}
    >
      {/* ヘッダーライン: ヘイスト | マナ */}
      <div className={`
        w-full flex items-center justify-between px-2 py-1 border-b z-20
        ${skill.cardType === 'support' ? 'bg-teal-900/50 border-teal-700' : 'bg-slate-800 border-slate-700'}
      `}>
        {/* ヘイスト（DELAY） */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
          isPhysicalChainActive || isHasteReduced
            ? 'bg-green-500 text-white'
            : actualDelay > 0
              ? 'bg-white text-slate-900'
              : 'text-slate-400'
        }`}>
          <Zap className="w-4 h-4" />
          <span className="text-[0.65rem] font-black">
            {/* いずれかの削減が適用されている場合 */}
            {(isPhysicalChainActive || isHasteReduced) ? (
              <><s className="text-green-200">{skill.delay}</s> {actualDelay}</>
            ) : hasPhysicalChainEffect ? (
              /* physical_chain_haste効果あり、だが前が物理じゃない場合は潜在的な削減値を表示 */
              <>{skill.delay}<span className="text-[0.5rem] text-slate-500">→{Math.max(0, skill.delay - (skill.effect?.params.value || 10) - hasteResult.hasteReductionBonus)}</span></>
            ) : (
              actualDelay
            )}
          </span>
        </div>

        {/* マナ */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
          skill.manaCost > 0
            ? canAfford
              ? 'bg-blue-500 text-white'
              : 'bg-red-500 text-white'
            : 'text-slate-400'
        }`}>
          <Hexagon className="w-4 h-4" />
          <span className="text-[0.65rem] font-black">{skill.manaCost}</span>
        </div>
      </div>

      {/* アイコン */}
      <div className="w-12 h-12 mt-2 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 z-10">
          <img
              src={imgSrc}
              alt={skill.name}
              onError={handleImgError}
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              loading="lazy"
          />
      </div>

      {/* スキル名 */}
      <div className="text-center mt-1 z-10">
          <h3 className="font-bold text-slate-100 text-[0.7rem] leading-tight tracking-wide">
            {skill.name}
          </h3>
      </div>

      {/* カードタイプ */}
      <span className={`text-[0.5rem] font-black leading-none mt-0.5 py-0.5 z-10 ${
        skill.cardType === 'support'
          ? 'text-teal-400'
          : 'text-orange-400'
      }`}>
        {skill.cardType === 'support' ? 'サポート' : 'アタック'}
      </span>

      {/* ダメージ表記 */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5 z-10">
        {hasDamage && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded leading-tight ${
            effectDamageType === 'physical'
              ? 'bg-orange-600'  // 能力ダメージ（物理）
              : effectDamageType === 'base' && totalDamage === 0
                ? 'bg-white'  // 能力ダメージのみ（ベース）
                : hasOnlyBaseDamage
                  ? 'bg-white'  // 基礎ダメージのみは白背景
                  : hasMixedDamage
                    ? 'bg-gradient-to-br from-orange-600 to-cyan-500'  // 物理+魔法は斜めグラデ
                    : hasMagicRatio
                      ? (isMagicDown ? 'bg-red-600' : 'bg-cyan-600')  // 魔法のみ
                      : (isPhysicalDown ? 'bg-red-600' : 'bg-orange-600')  // 物理のみ
          }`}>
            <span className={`text-[0.75rem] font-black ${(hasOnlyBaseDamage || (effectDamageType === 'base' && totalDamage === 0)) ? 'text-slate-900' : 'text-white'}`}>
              {finalDisplayDamage}
            </span>
            <span className={`text-[0.5rem] font-bold ${(hasOnlyBaseDamage || (effectDamageType === 'base' && totalDamage === 0)) ? 'text-slate-700' : 'text-white'}`}>ダメージ</span>
            {(isPhysicalUp || isMagicUp) && <span className="text-[0.5rem] text-green-300 font-black">↑</span>}
            {(isPhysicalDown || isMagicDown) && <span className={`text-[0.5rem] font-black ${hasOnlyBaseDamage ? 'text-red-600' : 'text-white'}`}>↓</span>}
          </div>
        )}
        {!hasDamage && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600 bg-transparent leading-tight">
            <span className="text-[0.75rem] font-black text-slate-500">-</span>
            <span className="text-[0.5rem] font-bold text-slate-500">ダメージなし</span>
          </div>
        )}
      </div>

      {/* Effect Description with Formula */}
      <div className={`w-full flex-1 rounded-b px-2 py-1 border-t flex flex-col items-center justify-start mt-0.5 ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
          {/* 計算式（1行目） */}
          {hasDamage && (
            <div className="flex items-center gap-0.5 text-[0.6rem] font-bold text-slate-400 mb-0.5">
              <span>=</span>
              {hasBaseDamage && <span>{baseDamage}</span>}
              {/* プラス係数 */}
              {hasBaseDamage && hasPhysicalRatio && <span>+</span>}
              {hasPhysicalRatio && (
                <>
                  <Swords className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-400">×{(skill.adRatio / 100).toFixed(1)}</span>
                </>
              )}
              {hasPhysicalRatio && hasMagicRatio && <span>+</span>}
              {hasMagicRatio && (
                <>
                  <Wand2 className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-400">×{(skill.apRatio / 100).toFixed(1)}</span>
                </>
              )}
              {/* マイナス係数（減算として表示） */}
              {isPhysicalNegative && (
                <>
                  <Swords className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">×{(skill.adRatio / 100).toFixed(1)}</span>
                </>
              )}
              {isMagicNegative && (
                <>
                  <Wand2 className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">×{(skill.apRatio / 100).toFixed(1)}</span>
                </>
              )}
              {/* 能力ダメージ */}
              {effectDamage > 0 && (hasBaseDamage || hasPhysicalRatio || hasMagicRatio || isPhysicalNegative || isMagicNegative) && <span>+</span>}
              {skill.effect?.type === 'deck_slash_bonus' && (
                <span className="text-purple-400">スラ{deckSlashCount}×{skill.effect.params.value}</span>
              )}
              {skill.effect?.type === 'enemy_damage_taken' && (
                <span className="text-indigo-400">減{enemyDamageTaken}×{(skill.effect.params.value || 100) / 100}={effectDamage}</span>
              )}
            </div>
          )}
          {/* 効果説明（目立つ） */}
          {skill.effect?.description && (
            <p className={`text-[0.55rem] text-center leading-relaxed font-medium whitespace-pre-line ${effectsDisabled ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                {skill.effect.description.replace(/\\n/g, '\n')}
            </p>
          )}
          {/* フレーバーテキスト（目立たない） */}
          {skill.flavorText && (
            <p className="text-[0.5rem] text-center leading-relaxed whitespace-pre-line text-slate-500 italic mt-0.5">
                {skill.flavorText.replace(/\\n/g, '\n')}
            </p>
          )}
      </div>

      {!canAfford && (
        <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
          <Ban className="text-red-500 opacity-50 mb-1" size={32} />
          <span className="text-[0.625rem] text-red-400 font-bold">
            {!canAffordHaste ? 'HASTE不足' : 'MANA不足'}
          </span>
        </div>
      )}
    </div>
  );
};
