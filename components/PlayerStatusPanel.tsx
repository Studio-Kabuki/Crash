import React from 'react';
import { Heart, HeartCrack, Zap, Hexagon, Swords, Sparkles, Coins, Layers } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface HeroStats {
  ad: number;
  ap: number;
}

interface PlayerBuff {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: React.ReactNode;
  stacks?: number;
}

interface PlayerStatusPanelProps {
  life: number;
  maxLife: number;
  currentHaste: number;
  maxHaste: number;
  mana: number;
  maxMana: number;
  gold: number;
  heroStats: HeroStats;
  playerBuffs?: PlayerBuff[];
  showHasteGauge?: boolean;
  showManaGauge?: boolean;
  showGold?: boolean;
  showDeckButton?: boolean;
  onDeckClick?: () => void;
  compact?: boolean;
}

const PlayerStatusPanel: React.FC<PlayerStatusPanelProps> = ({
  life,
  maxLife,
  currentHaste,
  maxHaste,
  mana,
  maxMana,
  gold,
  heroStats,
  playerBuffs = [],
  showHasteGauge = true,
  showManaGauge = true,
  showGold = false,
  showDeckButton = false,
  onDeckClick,
  compact = false,
}) => {
  // バフを集約（同じタイプのバフをまとめてvalueを合計）
  const getAggregatedBuffs = () => {
    const buffMap = new Map<string, PlayerBuff & { totalValue?: number }>();
    playerBuffs.forEach(buff => {
      const key = buff.type;
      if (buffMap.has(key)) {
        const existing = buffMap.get(key)!;
        existing.totalValue = (existing.totalValue || existing.stacks || 1) + (buff.stacks || 1);
      } else {
        buffMap.set(key, { ...buff, totalValue: buff.stacks || 1 });
      }
    });
    return Array.from(buffMap.values());
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${compact ? 'text-xs' : ''}`}>
      {/* ライフ表示 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {showGold && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-black text-yellow-400">{gold}G</span>
            </div>
          )}
          {showDeckButton && onDeckClick && (
            <button
              onClick={onDeckClick}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-900/30 border border-indigo-500/40 rounded-lg hover:bg-indigo-800/40 transition-all"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black text-indigo-300 uppercase">Deck</span>
            </button>
          )}
        </div>
        <Tooltip content={"ライフが0になると敗北。\nダメージを受けると、手札の最大枚数までカードを引ける。"}>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-slate-800/50 rounded px-1 transition-colors">
            <span className="text-[0.5rem] font-black text-slate-400 uppercase">Life</span>
            <div className="flex items-center gap-0.5">
              {[...Array(maxLife)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 transition-all duration-300 ${
                    i < life
                      ? 'text-red-500 fill-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                      : 'text-slate-700 fill-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </Tooltip>
      </div>

      {/* HASTEゲージ */}
      {showHasteGauge && (
        <div className="flex items-center gap-2">
          <Tooltip content={"ヘイストが最大になるとライフが減る。\nライフが減ると最大枚数までカードを引く。"}>
            <div className="flex items-center gap-1 w-14 cursor-pointer hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
              <Zap className="w-4 h-4 text-slate-300" />
              <span className="text-[0.5rem] font-black text-slate-300">HASTE</span>
            </div>
          </Tooltip>
            <div className="flex-1 h-6 bg-slate-950 rounded-l border border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 flex z-10 pointer-events-none">
                {[...Array(Math.ceil(maxHaste / 10))].map((_, i) => (
                  <div key={i} className="flex-1 border-r border-slate-600 last:border-r-0" />
                ))}
              </div>
              <div
                className={`h-full transition-all duration-300 relative pointer-events-none ${
                  (maxHaste - currentHaste) / maxHaste > 0.8
                    ? 'bg-gradient-to-r from-red-500 to-red-300'
                    : 'bg-gradient-to-r from-slate-400 to-white'
                }`}
                style={{ width: `${((maxHaste - currentHaste) / maxHaste) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20 pointer-events-none">
                {maxHaste - currentHaste} / {maxHaste}
              </span>
            </div>
          <div className={`flex items-center justify-center h-6 px-1.5 rounded-r border border-l-0 border-red-800 ${
            (maxHaste - currentHaste) / maxHaste > 0.8
              ? 'bg-red-600 animate-pulse'
              : 'bg-red-950'
          }`}>
            <HeartCrack className="w-4 h-4 text-red-300" />
            <span className="text-[0.5rem] font-black text-red-300">-1</span>
          </div>
        </div>
      )}

      {/* MANAゲージ */}
      {showManaGauge && (
        <div className="flex items-center gap-2">
          <Tooltip content={"一部のカードの使用時に消費する。\n戦闘終了時に回復する。\n上限を超えて回復は出来ない。"}>
            <div className="flex items-center gap-1 w-14 cursor-pointer hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
              <Hexagon className="w-4 h-4 text-blue-400" />
              <span className="text-[0.5rem] font-black text-blue-400">MANA</span>
            </div>
          </Tooltip>
            <div className="flex-1 h-6 bg-slate-950 rounded border border-slate-700 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 pointer-events-none"
                style={{ width: `${(mana / maxMana) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none">
                {mana} / {maxMana}
              </span>
            </div>
          {showHasteGauge && (
            <div className="flex items-center justify-center h-6 px-1.5 opacity-0">
              <HeartCrack className="w-4 h-4" />
              <span className="text-[0.5rem] font-black">-1</span>
            </div>
          )}
        </div>
      )}

      {/* 基礎パラメータ */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] font-black text-slate-500">基礎パラメータ：</span>
          <Tooltip content={"物理ダメージが上昇する。\nカードによって倍率は異なり、倍率が高いほど後半にダメージがスケールしやすい。\n\n※ミックスダメージのカードは、基礎ダメージを\n物理/魔法に半分ずつ割り振って耐性計算する。"}>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-950/50 border border-orange-700/50 rounded cursor-pointer hover:bg-orange-900/50 transition-colors">
              <Swords className="w-3 h-3 text-orange-400" />
              <span className="text-[0.5rem] font-black text-orange-400 uppercase">AD</span>
              <span className="text-[0.625rem] font-black text-orange-300">{heroStats.ad}</span>
            </div>
          </Tooltip>
          <Tooltip content={"魔法ダメージが上昇する。\n魔法の方がダメージ倍率の低いカードが多い傾向。\n\n※ミックスダメージのカードは、基礎ダメージを\n物理/魔法に半分ずつ割り振って耐性計算する。"}>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/50 border border-cyan-700/50 rounded cursor-pointer hover:bg-cyan-900/50 transition-colors">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-[0.5rem] font-black text-cyan-400 uppercase">AP</span>
              <span className="text-[0.625rem] font-black text-cyan-300">{heroStats.ap}</span>
            </div>
          </Tooltip>
        </div>
        {/* BUFFS表示（プレイ中のみ） */}
        {playerBuffs.length > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[0.5rem] font-black text-slate-500 uppercase shrink-0">BUFFS:</span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {getAggregatedBuffs().map(buff => (
                <Tooltip key={buff.id} content={buff.description}>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all animate-in fade-in zoom-in duration-300 shrink-0 cursor-pointer ${
                      buff.type === 'charge'
                        ? 'bg-yellow-900/50 border-yellow-600'
                        : buff.type === 'stat_up'
                        ? 'bg-green-900/50 border-green-600'
                        : buff.type === 'strength'
                        ? 'bg-orange-900/50 border-orange-600'
                        : buff.type === 'defensive'
                        ? 'bg-blue-900/50 border-blue-600'
                        : 'bg-purple-900/50 border-purple-600'
                    }`}
                  >
                    {buff.icon}
                    <span className="text-[0.5rem] font-black text-white">{buff.name}</span>
                    {buff.totalValue && buff.totalValue > 0 && (
                      <span className="text-[0.5rem] font-black text-yellow-400">{buff.totalValue}</span>
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStatusPanel;
