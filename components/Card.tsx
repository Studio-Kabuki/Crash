
import React, { useState, useEffect } from 'react';
import { Skill, CardProps } from '../types';
import { Zap, Ban, Users } from 'lucide-react';
import { calculateDamage } from '../utils/skillCalculations';

export const Card: React.FC<CardProps> = ({
  skill,
  onClick,
  disabled,
  mana,
  currentHaste,
  heroStats,
  damageMultiplier = 1,
  effectsDisabled = false,
  enemyDamageTaken = 0,
  effectiveEmployees,
  extraDelay = 0
}) => {
  const [imgSrc, setImgSrc] = useState<string>(skill.icon);
  const [hasError, setHasError] = useState<boolean>(false);

  // skillが変わった場合に画像をリセット
  useEffect(() => {
    setImgSrc(skill.icon);
    setHasError(false);
  }, [skill.icon]);

  // 実効社員数（デバフ適用後）を使用
  const actualEmployees = effectiveEmployees ?? heroStats.employees;
  const effectiveHeroStats = { ...heroStats, employees: actualEmployees };

  // ダメージ計算（デバフ適用後の社員数を使用）
  const totalDamage = calculateDamage({
    skill,
    heroStats: effectiveHeroStats,
    damageMultiplier
  });

  // 能力ダメージの計算
  let effectDamage = 0;
  if (skill.effect && !effectsDisabled) {
    if (skill.effect.type === 'enemy_damage_taken') {
      const ratio = (skill.effect.params.value || 100) / 100;
      effectDamage = Math.floor(enemyDamageTaken * ratio);
    }
  }

  // 最終ダメージ（通常ダメージ + 能力ダメージ）
  const finalDisplayDamage = totalDamage + effectDamage;
  const hasDamage = skill.baseDamage > 0 || skill.employeeRatio !== 0 || effectDamage > 0;

  // 実際のヘイスト消費（油断デバフ等の追加分を含む）
  const actualDelay = skill.delay + (skill.cardType === 'attack' ? extraDelay : 0);

  const canAffordHaste = currentHaste >= actualDelay;
  const canAfford = canAffordHaste;

  // ワークスタイル属性に応じた枠色
  const getRarityBorderColor = () => {
    if (!canAfford) return 'border-red-900';
    if (skill.rarity === 'BLACK') return 'border-red-500';
    if (skill.rarity === 'WHITE') return 'border-green-500';
    return 'border-slate-500';  // NEUTRAL
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
      {/* ヘッダーライン: ヘイスト | 士気 */}
      <div className={`
        w-full flex items-center justify-between px-2 py-1 border-b z-20
        ${skill.cardType === 'support' ? 'bg-teal-900/50 border-teal-700' : 'bg-slate-800 border-slate-700'}
      `}>
        {/* ヘイスト（DELAY） */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
          actualDelay > 0
            ? 'bg-white text-slate-900'
            : 'text-slate-400'
        }`}>
          <Zap className="w-4 h-4" />
          <span className="text-[0.65rem] font-black">{actualDelay}</span>
        </div>

        {/* ワークスタイル変化 */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
          skill.workStyleChange && skill.workStyleChange > 0
            ? 'bg-green-600 text-white'
            : skill.workStyleChange && skill.workStyleChange < 0
              ? 'bg-red-600 text-white'
              : 'text-slate-400'
        }`}>
          <span className="text-sm">{skill.workStyleChange && skill.workStyleChange > 0 ? '😇' : skill.workStyleChange && skill.workStyleChange < 0 ? '😈' : '⚖️'}</span>
          <span className="text-[0.65rem] font-black">
            {skill.workStyleChange ? (skill.workStyleChange > 0 ? `+${skill.workStyleChange}` : skill.workStyleChange) : '±0'}
          </span>
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

      {/* 進捗表記 */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5 z-10">
        {hasDamage && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded leading-tight ${
            skill.employeeRatio < 0
              ? 'bg-purple-600'  // マイナス係数（ハッカソンなど）
              : skill.employeeRatio > 0
                ? 'bg-orange-600'  // 社員数スケール
                : 'bg-white'  // ベースダメージのみ
          }`}>
            <span className={`text-[0.75rem] font-black ${skill.employeeRatio === 0 ? 'text-slate-900' : 'text-white'}`}>
              {finalDisplayDamage}
            </span>
            <span className={`text-[0.5rem] font-bold ${skill.employeeRatio === 0 ? 'text-slate-700' : 'text-white'}`}>進捗</span>
          </div>
        )}
        {!hasDamage && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600 bg-transparent leading-tight">
            <span className="text-[0.75rem] font-black text-slate-500">-</span>
            <span className="text-[0.5rem] font-bold text-slate-500">進捗なし</span>
          </div>
        )}
      </div>

      {/* Effect Description with Formula */}
      <div className={`w-full flex-1 rounded-b px-2 py-1 border-t flex flex-col items-center justify-start mt-0.5 ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
          {/* 計算式（1行目） */}
          {hasDamage && (
            <div className="flex items-center gap-0.5 text-[0.6rem] font-bold text-slate-400 mb-0.5">
              <span>=</span>
              {skill.baseDamage > 0 && <span>{skill.baseDamage}</span>}
              {skill.baseDamage > 0 && skill.employeeRatio !== 0 && (
                <span>{skill.employeeRatio > 0 ? '+' : ''}</span>
              )}
              {skill.employeeRatio !== 0 && (
                <>
                  <Users className="w-3 h-3 text-amber-400" />
                  <span className={skill.employeeRatio < 0 ? 'text-purple-400' : 'text-amber-400'}>
                    ×{(skill.employeeRatio / 100).toFixed(1)}
                  </span>
                </>
              )}
              {/* 能力ダメージ */}
              {effectDamage > 0 && (skill.baseDamage > 0 || skill.employeeRatio !== 0) && <span>+</span>}
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
            HASTE不足
          </span>
        </div>
      )}
    </div>
  );
};
