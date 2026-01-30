
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

  // ダメージ計算（物理/魔法別々に倍率適用）
  const physicalDamage = Math.floor(heroStats.ad * skill.adRatio / 100 * physicalMultiplier);
  const magicDamage = Math.floor(heroStats.ap * skill.apRatio / 100 * magicMultiplier);
  const hasPhysicalDamage = skill.adRatio > 0;
  const hasMagicDamage = skill.apRatio > 0;
  const hasDamage = hasPhysicalDamage || hasMagicDamage;

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
        w-full h-[14rem]
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
      {/* ヘッダーライン: ヘイスト | カードタイプ | マナ */}
      <div className={`
        w-full flex items-center justify-between px-2 py-1 border-b z-20
        ${skill.cardType === 'support' ? 'bg-teal-900/50 border-teal-700' : 'bg-slate-800 border-slate-700'}
      `}>
        {/* ヘイスト（DELAY） */}
        <div className="flex items-center gap-0.5">
          <Zap className="w-3 h-3 text-slate-300" />
          <span className="text-[0.5rem] font-black text-slate-300">{skill.delay}</span>
        </div>

        {/* カードタイプ */}
        <span className={`text-[0.4rem] font-black px-1.5 py-0.5 rounded ${
          skill.cardType === 'support'
            ? 'bg-teal-600 text-white'
            : 'bg-orange-600 text-white'
        }`}>
          {skill.cardType === 'support' ? 'サポート' : 'アタック'}
        </span>

        {/* マナ */}
        <div className={`flex items-center gap-0.5 ${canAfford ? 'text-blue-400' : 'text-red-400'}`}>
          <Hexagon className="w-3 h-3" />
          <span className="text-[0.5rem] font-black">{skill.manaCost}</span>
        </div>
      </div>

      {/* アイコン */}
      <div className="w-14 h-14 mt-2 flex items-center justify-center group-hover:scale-125 transition-transform duration-300 z-10">
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
      <div className="flex flex-col items-center gap-0.5 mt-1 z-10">
        {hasPhysicalDamage && (
          <div className="flex items-center gap-1">
            <Swords className={`w-3 h-3 ${isPhysicalDown ? 'text-red-400' : 'text-orange-400'}`} />
            <span className={`text-[0.6rem] font-black ${isPhysicalUp ? 'text-green-300' : isPhysicalDown ? 'text-red-300' : 'text-orange-300'}`}>
              {physicalDamage}
            </span>
            <span className="text-[0.45rem] text-orange-400/70">(AD×{skill.adRatio}%)</span>
            {isPhysicalUp && <span className="text-[0.4rem] text-green-300">↑</span>}
            {isPhysicalDown && <span className="text-[0.4rem] text-red-300">↓</span>}
          </div>
        )}
        {hasMagicDamage && (
          <div className="flex items-center gap-1">
            <Wand2 className={`w-3 h-3 ${isMagicDown ? 'text-red-400' : 'text-indigo-400'}`} />
            <span className={`text-[0.6rem] font-black ${isMagicUp ? 'text-green-300' : isMagicDown ? 'text-red-300' : 'text-indigo-300'}`}>
              {magicDamage}
            </span>
            <span className="text-[0.45rem] text-indigo-400/70">(AP×{skill.apRatio}%)</span>
            {isMagicUp && <span className="text-[0.4rem] text-green-300">↑</span>}
            {isMagicDown && <span className="text-[0.4rem] text-red-300">↓</span>}
          </div>
        )}
        {!hasDamage && (
          <span className="text-[0.5rem] text-slate-500">ダメージなし</span>
        )}
      </div>

      {/* Effect Description */}
      <div className={`w-full flex-1 rounded-b p-2 border-t flex items-start justify-center mt-1 ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
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
