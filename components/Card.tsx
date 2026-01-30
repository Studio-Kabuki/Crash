
import React, { useState, useEffect } from 'react';
import { Skill, CardProps } from '../types';
import { Swords, Zap, Ban, Wand2, Hexagon } from 'lucide-react';

export const Card: React.FC<CardProps> = ({
  skill,
  onClick,
  disabled,
  mana,
  heroStats,
  physicalMultiplier = 1,
  magicMultiplier = 1,
  effectsDisabled = false
}) => {
  const [imgSrc, setImgSrc] = useState<string>(skill.icon);
  const [hasError, setHasError] = useState<boolean>(false);

  // skillが変わった場合に画像をリセット
  useEffect(() => {
    setImgSrc(skill.icon);
    setHasError(false);
  }, [skill.icon]);

  // ダメージ計算（基礎ダメージ + 物理/魔法係数）
  const baseDamage = skill.baseDamage || 0;
  const physicalDamage = Math.floor(heroStats.ad * skill.adRatio / 100 * physicalMultiplier);
  const magicDamage = Math.floor(heroStats.ap * skill.apRatio / 100 * magicMultiplier);
  const totalDamage = baseDamage + physicalDamage + magicDamage;

  const hasBaseDamage = baseDamage > 0;
  const hasPhysicalRatio = skill.adRatio > 0;
  const hasMagicRatio = skill.apRatio > 0;
  const hasOnlyBaseDamage = hasBaseDamage && !hasPhysicalRatio && !hasMagicRatio;
  const hasDamage = hasBaseDamage || hasPhysicalRatio || hasMagicRatio;

  // 計算式を生成（例: "基礎70 + 100%AD"）
  const formulaParts: string[] = [];
  if (hasBaseDamage) formulaParts.push(`基礎${baseDamage}`);
  if (hasPhysicalRatio) formulaParts.push(`${skill.adRatio}%AD`);
  if (hasMagicRatio) formulaParts.push(`${skill.apRatio}%AP`);
  const formula = formulaParts.join(' + ');

  const isPhysicalUp = physicalMultiplier > 1;
  const isPhysicalDown = physicalMultiplier < 1;
  const isMagicUp = magicMultiplier > 1;
  const isMagicDown = magicMultiplier < 1;
  const canAfford = mana >= skill.manaCost;

  const handleImgError = () => {
    setImgSrc('https://img.icons8.com/fluency/144/star.png');
    setHasError(true);
  };

  return (
    <button
      onClick={canAfford ? onClick : undefined}
      disabled={disabled || !canAfford}
      className={`
        relative group
        flex flex-col items-center justify-start
        w-28 h-[14rem]
        bg-slate-900 border-2 rounded-lg
        ${canAfford ? 'border-slate-700' : 'border-red-900'}
        shadow-2xl
        transition-all duration-150
        active:translate-y-1 active:shadow-none
        hover:-translate-y-2 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]
        disabled:opacity-40 disabled:cursor-not-allowed
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
          skill.delay > 0
            ? 'bg-white text-slate-900'
            : 'text-slate-400'
        }`}>
          <Zap className="w-4 h-4" />
          <span className="text-[0.65rem] font-black">{skill.delay}</span>
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

      {/* ダメージと係数表記 */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5 z-10">
        {hasDamage && (
          <div className={`flex flex-col items-center px-2 py-0.5 rounded leading-tight ${
            hasOnlyBaseDamage
              ? 'bg-white'  // 基礎ダメージのみは白背景
              : hasMagicRatio && !hasPhysicalRatio
                ? (isMagicDown ? 'bg-red-600' : 'bg-indigo-600')  // 魔法のみ
                : (isPhysicalDown ? 'bg-red-600' : 'bg-orange-600')  // 物理含む
          }`}>
            <div className="flex items-center gap-1">
              {hasOnlyBaseDamage ? (
                <Swords className="w-3 h-3 text-slate-700" />
              ) : hasMagicRatio && !hasPhysicalRatio ? (
                <Wand2 className="w-3 h-3 text-white" />
              ) : (
                <Swords className="w-3 h-3 text-white" />
              )}
              <span className={`text-[0.75rem] font-black ${hasOnlyBaseDamage ? 'text-slate-900' : 'text-white'}`}>
                {totalDamage}
              </span>
              <span className={`text-[0.5rem] font-bold ${hasOnlyBaseDamage ? 'text-slate-700' : 'text-white'}`}>ダメージ</span>
              {(isPhysicalUp || isMagicUp) && <span className="text-[0.5rem] text-green-300 font-black">↑</span>}
              {(isPhysicalDown || isMagicDown) && <span className={`text-[0.5rem] font-black ${hasOnlyBaseDamage ? 'text-red-600' : 'text-white'}`}>↓</span>}
            </div>
            <span className={`text-[0.5rem] font-bold leading-none ${hasOnlyBaseDamage ? 'text-slate-500' : 'text-white/70'}`}>({formula})</span>
          </div>
        )}
        {!hasDamage && (
          <div className="flex flex-col items-center px-2 py-0.5 rounded border border-slate-600 bg-transparent leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-[0.75rem] font-black text-slate-500">-</span>
              <span className="text-[0.5rem] font-bold text-slate-500">ダメージなし</span>
            </div>
            <span className="text-[0.5rem] text-slate-600 leading-none">-</span>
          </div>
        )}
      </div>

      {/* カードタイプ */}
      <span className={`text-[0.5rem] font-black leading-none mt-0.5 py-0.5 z-10 ${
        skill.cardType === 'support'
          ? 'text-teal-400'
          : 'text-orange-400'
      }`}>
        {skill.cardType === 'support' ? 'サポート' : 'アタック'}
      </span>

      {/* Effect Description */}
      <div className={`w-full flex-1 rounded-b px-2 py-1 border-t flex items-start justify-center mt-0.5 ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
          <p className={`text-[0.55rem] text-center leading-relaxed font-medium ${effectsDisabled ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
              {skill.effect ? skill.effect.description : "通常技"}
          </p>
      </div>

      {!canAfford && (
        <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
          <Ban className="text-red-500 opacity-50 mb-1" size={32} />
          <span className="text-[0.625rem] text-red-400 font-bold">MANA不足</span>
        </div>
      )}
    </button>
  );
};
