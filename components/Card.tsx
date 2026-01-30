
import React, { useState, useEffect } from 'react';
import { Skill, CardProps } from '../types';
import { Swords, Flame, Sparkles, Zap, Ban, Star, Shield, Wand2 } from 'lucide-react';

export const Card: React.FC<CardProps> = ({ 
  skill, 
  onClick, 
  disabled, 
  mana,
  marketModifier = 1, 
  effectsDisabled = false 
}) => {
  const [imgSrc, setImgSrc] = useState<string>(skill.icon);
  const [hasError, setHasError] = useState<boolean>(false);

  // skillが変わった場合に画像をリセット
  useEffect(() => {
    setImgSrc(skill.icon);
    setHasError(false);
  }, [skill.icon]);

  const adjustedPower = Math.floor(skill.power * marketModifier);
  const isUp = marketModifier > 1;
  const canAfford = mana >= skill.manaCost;

  const handleImgError = () => {
    setImgSrc('https://img.icons8.com/fluency/144/star.png');
    setHasError(true);
  };

  const getCategoryLabel = () => {
    switch(skill.category) {
      case 'physical': return { label: '物理', color: 'text-orange-400 bg-orange-950/40 border-orange-800' };
      case 'magic': return { label: '魔法', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800' };
      case 'buff': return { label: '補助', color: 'text-green-400 bg-green-950/40 border-green-800' };
      default: return { label: '一般', color: 'text-slate-400 bg-slate-950/40 border-slate-800' };
    }
  };

  const categoryInfo = getCategoryLabel();

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
        p-2
      `}
    >
      {/* Category Attribute Label (Top Left) */}
      <div className={`
        absolute top-0 left-0 text-[0.5rem] font-black px-1.5 py-0.5 rounded-br border-r border-b z-20 flex items-center gap-0.5
        ${categoryInfo.color}
      `}>
        {categoryInfo.label}
      </div>

      {/* Power Indicator (Top Right) */}
      <div className={`
        absolute top-0 right-0 text-[0.625rem] font-bold px-2 py-0.5 rounded-bl border-l border-b z-10 flex items-center gap-0.5
        ${isUp ? 'bg-indigo-900 text-indigo-200 border-indigo-700' : 'bg-slate-800 text-slate-300 border-slate-700'}
      `}>
        ATK:{adjustedPower}
        {isUp && <Zap size={8} />}
      </div>

      {/* Category Icon Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        {skill.category === 'physical' && <Swords size={80} />}
        {skill.category === 'magic' && <Wand2 size={80} />}
        {skill.category === 'buff' && <Sparkles size={80} />}
      </div>

      {/* Content */}
      <div className="mt-4 flex flex-col items-center justify-center w-full z-10 px-1">
        <div className="w-12 h-12 mb-2 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
            <img 
                src={imgSrc} 
                alt={skill.name} 
                onError={handleImgError}
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                loading="lazy"
            />
        </div>
        <div className="text-center mb-1">
            <h3 className="font-bold text-slate-100 text-[0.7rem] leading-tight tracking-wide">
            {skill.name}
            </h3>
        </div>
      </div>

      {/* Mana Cost bar */}
      <div className="w-full h-0.5 bg-slate-800 rounded-full my-2 overflow-hidden">
         <div className="h-full bg-blue-500" style={{ width: `${Math.min((skill.manaCost / 50) * 100, 100)}%` }}></div>
      </div>

      {/* Effect Description */}
      <div className={`w-full rounded p-1.5 border flex-1 flex items-center justify-center relative ${effectsDisabled ? 'bg-slate-950 border-slate-800' : 'bg-slate-800/50 border-slate-700'}`}>
          <p className={`text-[0.5625rem] text-center leading-tight font-medium ${effectsDisabled ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
              {skill.effect ? skill.effect.description : "通常技"}
          </p>
      </div>

      {/* Mana Cost Footer */}
      <div className={`
        mt-2 w-full flex items-center justify-center gap-1 py-1 rounded border text-[0.625rem] font-black
        ${canAfford ? 'bg-blue-900/40 text-blue-300 border-blue-800' : 'bg-red-950 text-red-400 border-red-900'}
      `}>
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
        {skill.manaCost} Mana
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
