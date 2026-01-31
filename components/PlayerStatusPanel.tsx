import React from 'react';
import { Heart, HeartCrack, Zap, Hexagon, Users, Coins, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface HeroStats {
  employees: number;
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
  workStyle?: number;  // ホワイト/ブラック度 (-100 ~ +100)
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
  workStyle = 0,
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

  // ワークスタイルの表示
  const getWorkStyleLabel = () => {
    if (workStyle >= 50) return 'ホワイト';
    if (workStyle >= 20) return 'ややホワイト';
    if (workStyle > -20) return '普通';
    if (workStyle > -50) return 'ややブラック';
    return 'ブラック';
  };

  const getWorkStyleColor = () => {
    if (workStyle >= 50) return 'text-green-400';
    if (workStyle >= 20) return 'text-green-300';
    if (workStyle > -20) return 'text-slate-400';
    if (workStyle > -50) return 'text-red-300';
    return 'text-red-400';
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

      {/* 士気ゲージ */}
      {showManaGauge && (
        <div className="flex items-center gap-2">
          <Tooltip content={"一部のカードの使用時に消費する。\n戦闘終了時に回復する。\n上限を超えて回復は出来ない。"}>
            <div className="flex items-center gap-1 w-14 cursor-pointer hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
              <Hexagon className="w-4 h-4 text-blue-400" />
              <span className="text-[0.5rem] font-black text-blue-400">士気</span>
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
          <Tooltip content={"社員数が多いほど、一部のカードの進捗が増える。\n採用活動などで増やせる。"}>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/50 border border-amber-700/50 rounded cursor-pointer hover:bg-amber-900/50 transition-colors">
              <Users className="w-3 h-3 text-amber-400" />
              <span className="text-[0.5rem] font-black text-amber-400">社員</span>
              <span className="text-[0.625rem] font-black text-amber-300">{heroStats.employees}</span>
            </div>
          </Tooltip>
          <Tooltip content={`ホワイト/ブラック度: ${workStyle}\n+がホワイト、-がブラック\nカードによって変化する`}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
              workStyle >= 20
                ? 'bg-green-950/50 border border-green-700/50 hover:bg-green-900/50'
                : workStyle <= -20
                  ? 'bg-red-950/50 border border-red-700/50 hover:bg-red-900/50'
                  : 'bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50'
            }`}>
              {workStyle >= 0 ? (
                <TrendingUp className={`w-3 h-3 ${getWorkStyleColor()}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${getWorkStyleColor()}`} />
              )}
              <span className={`text-[0.5rem] font-black ${getWorkStyleColor()}`}>{getWorkStyleLabel()}</span>
              <span className={`text-[0.625rem] font-black ${getWorkStyleColor()}`}>{workStyle > 0 ? `+${workStyle}` : workStyle}</span>
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
