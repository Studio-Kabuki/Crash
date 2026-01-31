
import React, { useState, useEffect } from 'react';
import { Skill, CardProps, CardAttribute } from '../types';
import { Monitor, Palette, Music, Ban, Users } from 'lucide-react';
import { calculateDamage } from '../utils/skillCalculations';

// 属性に応じたアイコンと背景色を返す
const getAttributeStyle = (attribute: CardAttribute | undefined) => {
  switch (attribute) {
    case 'program':
      return { Icon: Monitor, bgClass: 'bg-blue-600', visible: true };
    case 'design':
      return { Icon: Palette, bgClass: 'bg-pink-600', visible: true };
    case 'sound':
      return { Icon: Music, bgClass: 'bg-purple-600', visible: true };
    default:
      return { Icon: null, bgClass: 'bg-slate-700', visible: false };
  }
};

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
      {/* ヘッダーライン: 属性 | ブラック度変化 */}
      <div className={`
        w-full flex items-center justify-between px-2 py-1 border-b z-20
        ${skill.cardType === 'support' ? 'bg-teal-900/50 border-teal-700' : 'bg-slate-800 border-slate-700'}
      `}>
        {/* 属性アイコン */}
        {(() => {
          const { Icon, bgClass, visible } = getAttributeStyle(skill.attribute);
          if (visible && Icon) {
            return (
              <div className={`flex items-center justify-center w-6 h-6 rounded ${bgClass}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            );
          }
          return <div className="w-6 h-6" />;
        })()}

        {/* ブラック度変化（+は赤/ブラック増、-は青/ブラック減、0なら非表示でスペース確保） */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
          skill.workStyleChange && skill.workStyleChange > 0
            ? 'bg-red-600 text-white'
            : skill.workStyleChange && skill.workStyleChange < 0
              ? 'bg-blue-600 text-white'
              : 'invisible'
        }`}>
          <span className="text-sm">{skill.workStyleChange && skill.workStyleChange > 0 ? '😈' : '😇'}</span>
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

      {/* 進捗表記（計算式込み） */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5 z-10">
        {hasDamage && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded leading-tight ${
            skill.employeeRatio < 0
              ? 'bg-purple-600'  // マイナス係数
              : skill.employeeRatio > 0
                ? 'bg-orange-600'  // 社員数スケール
                : 'bg-white'  // ベースダメージのみ
          }`}>
            {/* ベースダメージのみ: +100 */}
            {skill.baseDamage > 0 && skill.employeeRatio === 0 && (
              <span className="text-[0.75rem] font-black text-slate-900">+{skill.baseDamage}</span>
            )}
            {/* 社員数のみ: 👥×1.0 = +10 */}
            {skill.baseDamage === 0 && skill.employeeRatio !== 0 && (
              <>
                <Users className="w-3 h-3 text-white/60" />
                <span className="text-[0.55rem] font-medium text-white/60">×{(skill.employeeRatio / 100).toFixed(1)} =</span>
                <span className="text-[0.85rem] font-black text-white">+{finalDisplayDamage}</span>
              </>
            )}
            {/* 両方: 100+👥×1.0 = +110 */}
            {skill.baseDamage > 0 && skill.employeeRatio !== 0 && (
              <>
                <span className="text-[0.55rem] font-medium text-white/60">{skill.baseDamage}+</span>
                <Users className="w-3 h-3 text-white/60" />
                <span className="text-[0.55rem] font-medium text-white/60">×{(skill.employeeRatio / 100).toFixed(1)} =</span>
                <span className="text-[0.85rem] font-black text-white">+{finalDisplayDamage}</span>
              </>
            )}
          </div>
        )}
        {!hasDamage && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600 bg-transparent leading-tight">
            <span className="text-[0.5rem] font-bold text-slate-500">-</span>
          </div>
        )}
      </div>

      {/* Effect Description */}
      <div className={`w-full flex-1 rounded-b px-2 py-1 border-t flex flex-col items-center justify-start mt-0.5 ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
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
