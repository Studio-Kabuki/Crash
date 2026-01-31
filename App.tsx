
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Skill, PassiveEffect, BattleEvent, Enemy, Rarity, HeroStats, PlayerBuff } from './types';
import { loadGameData, GameData, createSkillWithId, BuffDefinition, HeroInitialData } from './utils/dataLoader';
import { calculateHaste } from './utils/skillCalculations';
import { useDragScroll } from './hooks/useDragScroll';
import { Card } from './components/Card';
import { Tooltip } from './components/Tooltip';
import { AnimatedNumber } from './components/AnimatedNumber';
import PlayerStatusPanel from './components/PlayerStatusPanel';
import {
  RotateCcw, Swords, Skull, Zap, ArrowRight, ScrollText,
  ShieldAlert, Sparkles, Ghost, Hexagon,
  CheckCircle2, Info, Award, Undo2, Layers, PlusCircle,
  X, Search, Biohazard, Heart, HeartCrack, Coffee, Coins, ShoppingCart, Check,
  ZapOff, Star, BookOpen, Settings, RefreshCw, Trash2, Trophy, Clock, Users, Flame
} from 'lucide-react';

// フォールバック付き画像コンポーネント
const SafeImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => { setImgSrc(src); }, [src]);
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      onError={() => setImgSrc('https://img.icons8.com/fluency/240/star.png')} 
    />
  );
};

const App: React.FC = () => {
  // ゲームデータ（CSVからロード）
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [gameState, setGameState] = useState<GameState>('START');
  const [level, setLevel] = useState<number>(1);
  const [stack, setStack] = useState<Skill[]>([]);
  const [hand, setHand] = useState<Skill[]>([]);
  
  const [permanentDeck, setPermanentDeck] = useState<Skill[]>([]);
  const [deck, setDeck] = useState<Skill[]>([]); 
  
  const [cardRewards, setCardRewards] = useState<Skill[]>([]);
  
  const [currentComboPower, setCurrentComboPower] = useState<number>(0);

  // デフォルト初期値（CSVロード前のフォールバック）
  const defaultHeroStats: HeroStats = { employees: 10, sp: 30, mp: 50 };
  const defaultMana = 50;
  const defaultLife = 3;
  const defaultEvent: BattleEvent = {
    id: 'calm',
    title: '通常業務',
    description: '特に問題はありません。',
    physicalMultiplier: 1.0,
    magicMultiplier: 1.0,
    type: 'neutral'
  };

  // ワークスタイル（ホワイト/ブラック度）
  const [workStyle, setWorkStyle] = useState<number>(0);

  const [battleEvent, setBattleEvent] = useState<BattleEvent>(defaultEvent);

  const [mana, setMana] = useState<number>(defaultMana);
  const [life, setLife] = useState<number>(defaultLife);
  const [gold, setGold] = useState<number>(0);

  const [passives, setPassives] = useState<PassiveEffect[]>([]);
  const [shopOptions, setShopOptions] = useState<PassiveEffect[]>([]);

  // 主人公パラメータ
  const [heroStats, setHeroStats] = useState<HeroStats>(defaultHeroStats);

  // Shop specific states
  const [shopCards, setShopCards] = useState<Skill[]>([]);
  const [shopPassives, setShopPassives] = useState<PassiveEffect[]>([]);
  const [purchasedPassiveIds, setPurchasedPassiveIds] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasBoughtShopService, setHasBoughtShopService] = useState<boolean>(false);
  const [isCardRemoveOverlayOpen, setIsCardRemoveOverlayOpen] = useState<boolean>(false);

  // Status Effects
  const [isEnemyPoisoned, setIsEnemyPoisoned] = useState<boolean>(false);

  // プレイヤーバフ/デバフ
  const [playerBuffs, setPlayerBuffs] = useState<PlayerBuff[]>([]);

  // ワークスタイルイベント表示
  const [workStyleEvent, setWorkStyleEvent] = useState<{ icon: string; title: string; message: string } | null>(null);

  // ヘイスト（行動力）システム - 使用済みヘイストを追跡
  const [usedHaste, setUsedHaste] = useState<number>(0);

  // 手札システム
  const [baseHandSize, setBaseHandSize] = useState<number>(3); // 基礎手札枚数
  const [isProcessingCard, setIsProcessingCard] = useState<boolean>(false); // カード処理中フラグ

  // 炎上演出
  const [isBurning, setIsBurning] = useState<boolean>(false);

  // Deck Overlay State
  const [isDeckOverlayOpen, setIsDeckOverlayOpen] = useState<boolean>(false);

  // Bestiary Overlay State
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);

  // Card Dex Overlay State
  const [isCardDexOpen, setIsCardDexOpen] = useState<boolean>(false);

  // Discard Pile Overlay State (使用済みカード)
  const [isDiscardOpen, setIsDiscardOpen] = useState<boolean>(false);

  // Shop Overlay State
  const [isShopOverlayOpen, setIsShopOverlayOpen] = useState<boolean>(false);

  // Card Reward Overlay State
  const [isCardRewardOverlayOpen, setIsCardRewardOverlayOpen] = useState<boolean>(false);

  // Ability Reward Overlay State (エリート撃破後)
  const [isAbilityRewardOverlayOpen, setIsAbilityRewardOverlayOpen] = useState<boolean>(false);

  // Ability List Overlay State (所持アビリティ一覧)
  const [isAbilityListOverlayOpen, setIsAbilityListOverlayOpen] = useState<boolean>(false);

  // DECK/USEDボタンの光るエフェクト
  const [isDeckGlowing, setIsDeckGlowing] = useState<boolean>(false);
  const [isUsedGlowing, setIsUsedGlowing] = useState<boolean>(false);

  // Debug Menu Overlay State
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  // Passcode Modal State
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [passcodeTarget, setPasscodeTarget] = useState<'bestiary' | 'cardDex' | 'debug' | null>(null);
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<boolean>(false);
  const [isPasscodeVerified, setIsPasscodeVerified] = useState<boolean>(false);
  const CORRECT_PASSCODE = '1212';

  // Monster & Animation States
  const [isMonsterShaking, setIsMonsterShaking] = useState<boolean>(false);
  const [isMonsterAttacking, setIsMonsterAttacking] = useState<boolean>(false);
  const [isPlayerTakingDamage, setIsPlayerTakingDamage] = useState<boolean>(false);
  const [turnResetMessage, setTurnResetMessage] = useState<boolean>(false);
  const [isVictoryEffect, setIsVictoryEffect] = useState<boolean>(false);
  const [victoryQuitInfo, setVictoryQuitInfo] = useState<{ blackDegree: number; quitCount: number; blackReduced?: boolean } | null>(null);

  const [projectile, setProjectile] = useState<{ icon: string; id: string } | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy>({ name: '', icon: '', baseHP: 0, minFloor: 0, maxFloor: 0, dropsAbility: 'N' });
  const [progress, setProgress] = useState<number>(0);  // 売上（0から増えて目標に達したらクリア）
  const [floatingDamages, setFloatingDamages] = useState<{ id: string; value: number; isMana?: boolean; isPoison?: boolean }[]>([]);

  // 手札エリアのドラッグスクロール
  const { containerRef: handContainerRef, shouldPreventClick, containerProps: handContainerProps } = useDragScroll({ threshold: 10 });

  // デスマーチバフのスタック数を取得
  const getDeathMarchStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'deathmarch').reduce((sum, b) => sum + b.value, 0);
  };

  // バグスタック数を取得
  const getBugStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'bug').reduce((sum, b) => sum + b.value, 0);
  };

  // 休職スタック数を取得（社員-20%/stack）
  const getKyushokuStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'kyushoku').reduce((sum, b) => sum + b.value, 0);
  };

  // 油断スタック数を取得（アタックのヘイスト+5/stack）
  const getYudanStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'yudan').reduce((sum, b) => sum + b.value, 0);
  };

  // 一致団結スタック数を取得（+50%/stack、加算）
  const getUnityStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'unity').reduce((sum, b) => sum + b.value, 0);
  };

  // 一致団結によるダメージ倍率（加算: 1 + stacks * 0.5）
  const getUnityMultiplier = (): number => {
    return 1 + getUnityStacks() * 0.5;
  };

  // 集中スタック数を取得（x1.4/stack、乗算）
  const getFocusStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'focus').reduce((sum, b) => sum + b.value, 0);
  };

  // 集中によるダメージ倍率（乗算: 1.4^stacks）
  const getFocusMultiplier = (): number => {
    return Math.pow(1.4, getFocusStacks());
  };

  // ガチャスタック数を取得（^1.5累乗）
  const getGachaStacks = (): number => {
    return playerBuffs.filter(b => b.type === 'gacha').reduce((sum, b) => sum + b.value, 0);
  };

  // ガチャによるダメージ倍率（累乗: damage^(1.5*stacks)）
  // 注: この関数はダメージ値を受け取って累乗を適用する
  const applyGachaPower = (damage: number): number => {
    const stacks = getGachaStacks();
    if (stacks === 0) return damage;
    // 1スタックにつき1.5乗
    // 複数スタック時は (damage^1.5)^stacks = damage^(1.5*stacks)
    return Math.floor(Math.pow(damage, Math.pow(1.5, stacks)));
  };

  // nextCardFreeバフがあるか（デスマーチ: 次のカードディレイ0）
  const hasNextCardFree = (): boolean => {
    return playerBuffs.some(b => b.type === 'nextCardFree');
  };

  // ヘイスト（行動力）の最大値（デスマーチボーナス、締切延長バフ含む）
  const maxHaste = useMemo(() => {
    const base = heroStats.sp + passives.reduce((acc, p) => p.type === 'capacity_boost' ? acc + p.value : acc, 0);
    const deathMarchBonus = playerBuffs.filter(b => b.type === 'deathmarch').reduce((sum, b) => sum + b.value, 0) * 10;
    const deadlineExtend = playerBuffs.filter(b => b.type === 'deadline_extend').reduce((sum, b) => sum + b.value, 0);
    return base + deathMarchBonus + deadlineExtend;
  }, [heroStats.sp, passives, playerBuffs]);

  // 残りヘイスト（表示・判定用）
  const remainingHaste = maxHaste - usedHaste;

  // ヘイストが0以下かどうか
  const isHasteEmpty = remainingHaste <= 0;

  const maxMana = useMemo(() => {
    const baseMana = gameData?.heroData.mana ?? defaultMana;
    return baseMana + passives.reduce((acc, p) => p.type === 'score_flat' ? acc + p.value : acc, 0);
  }, [passives, gameData]);

  const maxLife = useMemo(() => {
    const baseLife = gameData?.heroData.life ?? defaultLife;
    return baseLife + passives.reduce((acc, p) => p.type === 'max_life_boost' ? acc + p.value : acc, 0);
  }, [passives, gameData]);

  const totalFlatDamageBonus = useMemo(() => {
    return passives.reduce((acc, p) => p.type === 'flat_damage_bonus' ? acc + p.value : acc, 0);
  }, [passives]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // パスコード確認関数
  const openWithPasscode = (target: 'bestiary' | 'cardDex' | 'debug') => {
    // 既に認証済みなら直接開く
    if (isPasscodeVerified) {
      if (target === 'bestiary') setIsBestiaryOpen(true);
      else if (target === 'cardDex') setIsCardDexOpen(true);
      else if (target === 'debug') setIsDebugOpen(true);
      return;
    }
    setPasscodeTarget(target);
    setPasscodeInput('');
    setPasscodeError(false);
    setIsPasscodeModalOpen(true);
  };

  const handlePasscodeSubmit = () => {
    if (passcodeInput === CORRECT_PASSCODE) {
      setIsPasscodeModalOpen(false);
      setIsPasscodeVerified(true); // 認証済みフラグをON
      if (passcodeTarget === 'bestiary') setIsBestiaryOpen(true);
      else if (passcodeTarget === 'cardDex') setIsCardDexOpen(true);
      else if (passcodeTarget === 'debug') setIsDebugOpen(true);
      setPasscodeInput('');
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  // デバッグ機能
  const debugAddCard = (skill: Skill) => {
    const newCard = createSkillWithId(skill);
    setPermanentDeck(prev => [...prev, newCard]);
    setDeck(prev => [...prev, newCard]);
  };

  const debugRerollHand = () => {
    // 手札をデッキに戻してシャッフル
    const newDeck = shuffle([...deck, ...hand]);
    // handSize枚を新しい手札として取る
    const cardsToDraw = Math.min(handSize, newDeck.length);
    const newHand = newDeck.slice(0, cardsToDraw);
    // デッキから手札分を除く
    setDeck(newDeck.slice(cardsToDraw));
    setHand(newHand);
  };

  const debugAddPassive = (passive: PassiveEffect) => {
    setPassives(prev => [...prev, passive]);
    if (passive.type === 'score_flat') {
      setMana(prev => Math.min(prev + passive.value, maxMana + passive.value));
    }
    if (passive.type === 'max_life_boost') {
      setLife(prev => Math.min(prev + passive.value, maxLife + passive.value));
    }
  };

  const debugFullRestore = () => {
    setUsedHaste(0);
    setMana(maxMana);
  };

  // バフを付与する関数
  const addBuff = (buffId: string, customValue?: number) => {
    const buffDef = gameData?.buffs[buffId];
    if (!buffDef) {
      console.warn(`Buff definition not found: ${buffId}`);
      return;
    }

    const valueToAdd = customValue ?? buffDef.defaultValue;

    // base_damage_boost、strength、deadline_extendの場合、既存のバフがあればスタックを加算
    if (buffDef.type === 'base_damage_boost' || buffDef.type === 'strength' || buffDef.type === 'deadline_extend') {
      setPlayerBuffs(prev => {
        const existingBuff = prev.find(b => b.type === buffDef.type);
        if (existingBuff) {
          return prev.map(b =>
            b.type === buffDef.type ? { ...b, value: b.value + valueToAdd } : b
          );
        } else {
          const newBuff: PlayerBuff = {
            id: generateId(),
            type: buffDef.type,
            name: buffDef.name,
            icon: buffDef.icon,
            description: buffDef.description,
            value: valueToAdd,
            stat: buffDef.stat
          };
          return [...prev, newBuff];
        }
      });
      return;
    }

    const newBuff: PlayerBuff = {
      id: generateId(),
      type: buffDef.type,
      name: buffDef.name,
      icon: buffDef.icon,
      description: buffDef.description,
      value: valueToAdd,
      stat: buffDef.stat
    };

    setPlayerBuffs(prev => [...prev, newBuff]);
  };

  // 戦闘終了時にバフをリセット
  const clearBattleBuffs = () => {
    setPlayerBuffs([]);
  };

  // ワークスタイルイベント判定（アタックカード使用後に呼ばれる）
  // 現在は無効化されているが、将来使う可能性があるため残す
  const checkWorkStyleEvent = () => {
    // ブラック度が高いほど発動確率が上がる
    const triggerChance = workStyle;  // 0〜100%

    if (triggerChance <= 0 || Math.random() * 100 >= triggerChance) return;

    // イベントタイプを決定（バグ0の時は炎上を除外）
    const bugCount = getBugStacks();

    let eventTypes: string[];
    if (bugCount === 0) {
      eventTypes = ['bug', 'kyushoku'];
    } else {
      eventTypes = ['bug', 'kyushoku', 'enjou'];
    }

    const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    if (selectedEvent === 'bug') {
      // バグ追加
      addBuff('BUG');
      setWorkStyleEvent({
        icon: '🐛',
        title: 'バグ発生！',
        message: '急いで書いたコードにバグが混入...'
      });
    } else if (selectedEvent === 'kyushoku') {
      // 休職追加
      addBuff('KYUSHOKU');
      setWorkStyleEvent({
        icon: '😵',
        title: '休職発生！',
        message: '過労で社員が体調を崩した...'
      });
    } else if (selectedEvent === 'enjou') {
      // 炎上！バグを全消費して進捗減少
      const progressLoss = Math.floor(currentEnemy.baseHP * bugCount * 0.1);
      setProgress(prev => Math.max(0, prev - progressLoss));
      // バグを全て削除
      setPlayerBuffs(prev => prev.filter(b => b.type !== 'bug'));
      setWorkStyleEvent({
        icon: '🔥',
        title: '炎上発生！',
        message: `バグが多すぎて進捗が下がった！ (進捗-${progressLoss})`
      });
    }

    // イベント表示を4秒後に消す（カード使用でも消える）
    setTimeout(() => setWorkStyleEvent(null), 4000);
  };

  // CSVからゲームデータをロード
  useEffect(() => {
    loadGameData().then(data => {
      setGameData(data);
      setIsLoading(false);
    });
  }, []);

  const isTargetMet = progress >= currentEnemy.baseHP && currentEnemy.baseHP > 0;

  const getCardPrice = (rarity: Rarity) => {
    if (rarity === 'BLACK') return 40;
    if (rarity === 'WHITE') return 40;
    return 30;  // NEUTRAL
  };

  const getPassivePrice = (rarity: Rarity) => {
    if (rarity === 'BLACK') return 50;
    if (rarity === 'WHITE') return 50;
    return 40;  // NEUTRAL
  };

  const LIFE_RECOVERY_PRICE = 50;
  const CARD_REMOVE_PRICE = 50;

  // workStyle に基づく重み付け抽選
  // ブラック度が高い→BLACKが出やすい、ホワイト度が高い→WHITEが出やすい
  const weightedRandomSelect = <T extends { rarity: Rarity }>(items: T[], count: number): T[] => {
    const getWeight = (rarity: Rarity) => {
      const baseWeight = 3;
      const bonus = workStyle / 20;  // 0~100 → 0~5のボーナス

      if (rarity === 'BLACK') {
        // ブラック度が高いほどBLACKカードが出やすい
        return baseWeight + bonus;
      }
      if (rarity === 'WHITE') {
        // ブラック度が高いほどWHITEカードが出にくい
        return Math.max(1, baseWeight - bonus);
      }
      return baseWeight;  // NEUTRAL は常に均等
    };

    const selected: T[] = [];
    const pool = [...items];

    for (let i = 0; i < count && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, item) => sum + getWeight(item.rarity), 0);
      let random = Math.random() * totalWeight;

      for (let j = 0; j < pool.length; j++) {
        random -= getWeight(pool[j].rarity);
        if (random <= 0) {
          selected.push(pool[j]);
          pool.splice(j, 1);
          break;
        }
      }
    }
    return selected;
  };

  // デッキをシャッフルするユーティリティ
  const shuffle = (array: Skill[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // 手札サイズ（アビリティボーナス込み）
  const handSize = useMemo(() => {
    const handSizeBonus = passives.filter(p => p.type === 'hand_size_boost').reduce((sum, p) => sum + p.value, 0);
    return baseHandSize + handSizeBonus;
  }, [baseHandSize, passives]);

  // 物理のみカードのヘイスト削減率（迅速の刃パッシブ）- 直接計算
  const physicalHasteReduction = passives.filter(p => p.type === 'physical_haste_reduction').reduce((sum, p) => sum + p.value, 0);

  // 手札を引く（手札が0枚のときにhandSize枚まで引く）
  const drawHand = useCallback((currentDeck: Skill[], remainingHaste: number, currentStack?: Skill[], currentHandSize?: number) => {
    const targetHandSize = currentHandSize ?? handSize;

    if (remainingHaste <= 0) {
      setHand([]);
      return;
    }

    let availableDeck = [...currentDeck];
    const stackToUse = currentStack ?? stack;

    // デッキが足りない場合、捨て札をシャッフルして山札に戻す（精神統一ダミーカードは除外）
    if (availableDeck.length < targetHandSize) {
      const realCards = stackToUse.filter(s => s.id !== 'rest');
      if (realCards.length > 0) {
        const recycledCards = shuffle([...realCards]);
        availableDeck = [...availableDeck, ...recycledCards];
      }
    }

    // まだ足りなければあるだけ引く
    const cardsToDraw = Math.min(targetHandSize, availableDeck.length);
    if (cardsToDraw === 0) {
      setHand([]);
      setDeck([]);
      return;
    }

    // シャッフルしてから引く
    const shuffledDeck = shuffle(availableDeck);
    const newHand = shuffledDeck.slice(0, cardsToDraw);
    const newDeck = shuffledDeck.slice(cardsToDraw);

    setHand(newHand);
    setDeck(newDeck);
    // 捨て札から戻した場合はスタックをクリアし、コンボパワーもリセット
    if (availableDeck.length > currentDeck.length) {
      setStack([]);
      setCurrentComboPower(0);
    }
  }, [handSize, stack]);

  // カード効果でドロー（上限なし、現在の手札に追加）
  const drawCards = useCallback((count: number, currentHand: Skill[], currentDeck: Skill[], currentStack: Skill[]) => {
    if (count <= 0) return { newHand: currentHand, newDeck: currentDeck, newStack: currentStack };

    let availableDeck = [...currentDeck];
    // 精神統一ダミーカードは除外
    let stackToRecycle = currentStack.filter(s => s.id !== 'rest');

    // 山札が足りない場合、捨て札をシャッフルして山札に追加
    if (availableDeck.length < count && stackToRecycle.length > 0) {
      availableDeck = [...availableDeck, ...shuffle(stackToRecycle)];
      stackToRecycle = [];
    }

    // 引けるだけ引く
    const cardsToDraw = Math.min(count, availableDeck.length);
    const drawnCards = availableDeck.slice(0, cardsToDraw);
    const remainingDeck = availableDeck.slice(cardsToDraw);

    return {
      newHand: [...currentHand, ...drawnCards],
      newDeck: remainingDeck,
      newStack: stackToRecycle
    };
  }, []);

  const getEnemyForLevel = (lvl: number) => {
      if (!gameData) return { name: '', icon: '', baseHP: 0, minFloor: 0, maxFloor: 0, dropsAbility: 'N' as const };
      // 1階層1種類: 該当フロアの最初の敵を返す
      const enemy = gameData.enemies.find(e => lvl >= e.minFloor && lvl <= e.maxFloor);
      return enemy || gameData.enemies[gameData.enemies.length - 1];
  };

  const startGame = () => {
    if (!gameData) return;

    // スターターデッキから初期デッキを作成（デフォルトは最初のデッキ）
    const starterDeck = gameData.starterDecks[0];
    const startDeck: Skill[] = [];
    if (starterDeck) {
      starterDeck.cards.forEach(({ skill, count }) => {
        for (let i = 0; i < count; i++) {
          startDeck.push(createSkillWithId(skill));
        }
      });
    }

    setPermanentDeck(startDeck);
    const battleDeck = shuffle(startDeck);

    setDeck(battleDeck);
    setStack([]);
    setCurrentComboPower(0);
    setPassives([]);
    const heroData = gameData?.heroData;
    setMana(heroData?.mana ?? defaultMana);
    setLife(heroData?.life ?? defaultLife);
    setGold(0);
    setLevel(1);
    setHeroStats(heroData?.stats ?? defaultHeroStats);
    setGameState('PLAYING');
    setIsDeckOverlayOpen(false);
    setIsEnemyPoisoned(false);
    setUsedHaste(0);
    setPlayerBuffs([]);

    const initialEnemy = getEnemyForLevel(1);
    setCurrentEnemy(initialEnemy);
    setProgress(0);  // 進捗は0から開始
    setBattleEvent(initialEnemy.trait || (gameData?.traits['NEUTRAL'] ?? defaultEvent));

    // 初期手札を引く（パッシブがないのでbaseHandSize枚）
    const cardsToDraw = Math.min(baseHandSize, battleDeck.length);
    const initialHand = battleDeck.slice(0, cardsToDraw);
    setHand(initialHand);
    setDeck(battleDeck.slice(cardsToDraw));
  };

  const nextLevel = useCallback((updatedPermanentDeck?: Skill[]) => {
    const sourceDeck = updatedPermanentDeck || permanentDeck;
    
    setStack([]);
    setCurrentComboPower(0);
    setMana(maxMana);
    
    setLevel(prev => {
        const nextLvl = prev + 1;
        setGameState('PLAYING');
        setIsDeckOverlayOpen(false);
        setIsEnemyPoisoned(false);
        setUsedHaste(0);
        setPlayerBuffs([]);

        const battleDeck = shuffle(sourceDeck);

        const nextEnemy = getEnemyForLevel(nextLvl);
        setCurrentEnemy(nextEnemy);
        setProgress(0);  // 進捗は0から開始
        setBattleEvent(nextEnemy.trait || (gameData?.traits['NEUTRAL'] ?? defaultEvent));

        // handSize枚引く（デッキから引いた分を除く）
        const cardsToDraw = Math.min(handSize, battleDeck.length);
        const nextHand = battleDeck.slice(0, cardsToDraw);
        setHand(nextHand);
        setDeck(battleDeck.slice(cardsToDraw));
        return nextLvl;
    });
  }, [permanentDeck, maxMana, handSize]);

  const generateShopInventory = () => {
    if (!gameData) return;
    // Generate 5 random cards with rarity weighting
    const selectedCards = weightedRandomSelect(gameData.skillPool, 5);
    setShopCards(selectedCards.map(s => createSkillWithId(s)));

    // maxStack に基づいて所持制限をチェック
    const ownedCounts = new Map<string, number>();
    passives.forEach(p => ownedCounts.set(p.id, (ownedCounts.get(p.id) || 0) + 1));
    const filteredPassivePool = (gameData.passivePool || []).filter(p => {
      if (p.maxStack === 0) return true;  // 無制限
      const owned = ownedCounts.get(p.id) || 0;
      return owned < p.maxStack;
    });

    // Generate 3 random passives with rarity weighting
    const selectedPassives = weightedRandomSelect(filteredPassivePool, 3);
    setShopPassives(selectedPassives);

    setPurchasedIds(new Set());
    setPurchasedPassiveIds(new Set());
    setHasBoughtShopService(false);
  };

  const enterShop = () => {
    generateShopInventory();
    setGameState('SHOP');
  };

  const handleBuyCard = (card: Skill) => {
    const price = getCardPrice(card.rarity);
    if (gold < price) return;

    setGold(prev => prev - price);
    setPermanentDeck(prev => [...prev, card]);
    setPurchasedIds(prev => new Set(prev).add(card.id));
  };

  const handleBuyPassive = (passive: PassiveEffect) => {
    if (purchasedPassiveIds.has(passive.id)) return;
    const price = getPassivePrice(passive.rarity);
    if (gold < price) return;

    setGold(prev => prev - price);
    setPassives(prev => [...prev, passive]);
    setPurchasedPassiveIds(prev => new Set(prev).add(passive.id));

    // Immediate stat effects
    if (passive.type === 'score_flat') {
        setMana(prev => Math.min(prev + passive.value, maxMana + passive.value));
    }
    if (passive.type === 'max_life_boost') {
        setLife(prev => Math.min(prev + passive.value, maxLife + passive.value));
    }
    if (passive.type === 'ad_boost') {
        setHeroStats(prev => ({ ...prev, ad: prev.ad + passive.value }));
    }
    if (passive.type === 'ap_boost') {
        setHeroStats(prev => ({ ...prev, ap: prev.ap + passive.value }));
    }
    if (passive.type === 'ap_mana_boost') {
        setHeroStats(prev => ({ ...prev, ap: prev.ap + passive.value }));
        setMana(prev => Math.min(prev + (passive.value2 || 0), maxMana + (passive.value2 || 0)));
    }
  };

  const handleBuyLife = () => {
    if (gold < LIFE_RECOVERY_PRICE || life >= maxLife || hasBoughtShopService) return;

    setGold(prev => prev - LIFE_RECOVERY_PRICE);
    setLife(prev => Math.min(maxLife, prev + 1));
    setHasBoughtShopService(true);
  };

  const handleBuyCardRemove = () => {
    if (gold < CARD_REMOVE_PRICE || hasBoughtShopService || permanentDeck.length <= 1) return;

    setGold(prev => prev - CARD_REMOVE_PRICE);
    setIsCardRemoveOverlayOpen(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setPermanentDeck(prev => prev.filter(c => c.id !== cardId));
    setDeck(prev => prev.filter(c => c.id !== cardId));
    setHand(prev => prev.filter(c => c.id !== cardId));
    setIsCardRemoveOverlayOpen(false);
    setHasBoughtShopService(true);
  };

  const generateShopOptions = (commonOnly: boolean = false) => {
    let pool = [...(gameData?.passivePool || [])];
    if (commonOnly) {
      pool = pool.filter(p => p.rarity === 'C');
    }
    // SR/SSRは同じアビリティ（同じid）を重複して持てない
    const ownedHighRarityIds = passives
      .filter(p => p.rarity === 'SR' || p.rarity === 'SSR')
      .map(p => p.id);
    pool = pool.filter(p => {
      if (p.rarity === 'SR' || p.rarity === 'SSR') {
        return !ownedHighRarityIds.includes(p.id);
      }
      return true;
    });
    const shuffled = pool.sort(() => 0.5 - Math.random());
    setShopOptions(shuffled.slice(0, 3));
  };

  const generateCardRewards = () => {
    if (!gameData) return;
    const shuffled = [...gameData.skillPool].sort(() => 0.5 - Math.random());
    setCardRewards(shuffled.slice(0, 3).map(s => createSkillWithId(s)));
  };

  const selectPassive = (passive: PassiveEffect) => {
    setPassives(prev => [...prev, passive]);
    if (passive.type === 'score_flat') {
        setMana(prev => Math.min(prev + passive.value, maxMana + passive.value));
    }
    if (passive.type === 'max_life_boost') {
        setLife(prev => Math.min(prev + passive.value, maxLife + passive.value));
    }
    if (passive.type === 'ad_boost') {
        setHeroStats(prev => ({ ...prev, ad: prev.ad + passive.value }));
    }
    if (passive.type === 'ap_boost') {
        setHeroStats(prev => ({ ...prev, ap: prev.ap + passive.value }));
    }
    if (passive.type === 'ap_mana_boost') {
        setHeroStats(prev => ({ ...prev, ap: prev.ap + passive.value }));
        setMana(prev => Math.min(prev + (passive.value2 || 0), maxMana + (passive.value2 || 0)));
    }
    setIsAbilityRewardOverlayOpen(false);

    // エリート(Y)ならカード選択へ、ザコ(C)なら次のバトルへ
    if (currentEnemy?.dropsAbility === 'Y') {
      generateCardRewards();
      setGameState('CARD_REWARD');
      setIsCardRewardOverlayOpen(true);
    } else {
      // コモンアビリティドロップ（ザコ）の場合は次のバトルへ
      handleBattleWinFinish(permanentDeck);
    }
  };

  const selectRewardCard = (skill: Skill) => {
    const newPermanent = [...permanentDeck, skill];
    setPermanentDeck(newPermanent);
    handleBattleWinFinish(newPermanent);
  };

  const handleBattleWinFinish = (updatedDeck: Skill[]) => {
    // ショップ遷移は一時的に無効化（機能は残す）
    // if (level % 4 === 3) {
    //   enterShop();
    // } else {
    //   nextLevel(updatedDeck);
    // }
    nextLevel(updatedDeck);
  };

  // サポートカードの効果が無効化されているかチェック
  const isEffectDisabled = (skill: Skill) => {
    if (!battleEvent.disableSupportEffects) return false;
    return skill.cardType === 'support';  // サポートカードのみ無効化
  };

  // BASE_DOUBLEバフのスタック数を取得
  const getBaseDoubleStacks = (): number => {
    const baseDoubleBuff = playerBuffs.find(b => b.type === 'base_damage_boost');
    return baseDoubleBuff ? baseDoubleBuff.value : 0;
  };

  // 有効社員数を計算（加算→乗算の順序、最低0）
  const getEffectiveEmployees = (): number => {
    // 1. 加算を全て計算
    const baseEmployees = heroStats.employees;
    const passiveAdd = passives.filter(p => p.type === 'employee_add').reduce((sum, p) => sum + p.value, 0);
    const strengthAdd = getStrengthValue();
    const totalAdd = baseEmployees + passiveAdd + strengthAdd;

    // 2. 倍率を全て掛け算（employee_mult は %値、50 = 0.5倍）
    const multipliers = passives.filter(p => p.type === 'employee_mult').map(p => p.value / 100);
    const totalMult = multipliers.reduce((acc, m) => acc * m, 1.0);

    // 3. 休職デバフ（1スタックにつき-20%）
    const kyushokuStacks = getKyushokuStacks();
    const kyushokuMult = Math.max(0, 1 - kyushokuStacks * 0.2);

    // 4. 最低値は0
    return Math.max(0, Math.floor(totalAdd * totalMult * kyushokuMult));
  };

  // スキルの基本ダメージを計算
  const getSkillBaseDamage = (s: Skill, applyBaseDouble: boolean = true) => {
    let baseDmg = s.baseDamage || 0;

    // BASE_DOUBLEバフがあればベースダメージを2倍
    if (applyBaseDouble && getBaseDoubleStacks() > 0 && baseDmg > 0) {
      baseDmg = baseDmg * 2;
    }

    // 有効社員数を取得（パッシブ効果適用済み）
    const effectiveEmployees = getEffectiveEmployees();

    // 社員数ダメージ計算
    const employeeDmg = Math.floor(effectiveEmployees * (s.employeeRatio || 0) / 100);

    // 征服者などのカード固有倍率を適用
    const skillMultiplier = s.multiplier ?? 1.0;
    const totalDamage = Math.floor((baseDmg + employeeDmg) * skillMultiplier);

    // ダメージは0未満にならない
    return Math.max(0, totalDamage);
  };

  // バフを集約（同じタイプのバフをまとめてvalueを合計、スタック数も追跡）
  interface AggregatedBuff extends PlayerBuff {
    stackCount: number;
  }

  // バフの優先順位（収益計算順: 加算→掛け算→乗算）
  const getBuffPriority = (type: string): number => {
    switch (type) {
      case 'strength': return 1;   // 応援（加算）
      case 'unity': return 2;      // スクラム（加算%）
      case 'focus': return 3;      // フロー（乗算）
      case 'gacha': return 4;      // ガチャ（累乗）
      case 'charge': return 10;
      case 'parry': return 11;
      case 'nextCardFree': return 12;
      default: return 50;
    }
  };

  const getAggregatedBuffs = (): AggregatedBuff[] => {
    const buffMap = new Map<string, AggregatedBuff>();
    playerBuffs.forEach(buff => {
      const key = `${buff.type}-${buff.stat || ''}`;
      if (buffMap.has(key)) {
        const existing = buffMap.get(key)!;
        existing.value += buff.value;
        existing.stackCount += 1;
      } else {
        buffMap.set(key, { ...buff, stackCount: 1 });
      }
    });
    // 優先順位でソート
    return Array.from(buffMap.values()).sort((a, b) => getBuffPriority(a.type) - getBuffPriority(b.type));
  };

  // chargeバフがあるかチェック（ダメージ表示用）
  const getChargeMultiplier = (): number => {
    const chargeBuff = playerBuffs.find(b => b.type === 'charge');
    return chargeBuff ? chargeBuff.value : 1;
  };

  // 筋力バフの合計値を取得
  const getStrengthValue = (): number => {
    return playerBuffs
      .filter(b => b.type === 'strength')
      .reduce((sum, b) => sum + b.value, 0);
  };

  // 前のカードがアタックだったかチェック
  const wasLastCardAttack = (): boolean => {
    if (stack.length === 0) return false;
    const lastCard = stack[stack.length - 1];
    return lastCard.cardType === 'attack';
  };
  const enemyDamageTaken = progress;  // 進捗 = 与えたダメージ量

  const calculateComboPower = (skills: Skill[], chargeMultiplier: number = 1) => {
    let basePower = 0;
    let totalMultiplier = 1.0;

    skills.forEach((s) => {
        let p = getSkillBaseDamage(s);
        if (!isEffectDisabled(s) && s.effect) {
          if (s.effect.type === 'deck_slash_bonus') {
            const targetName = s.effect.params.targetName || 'スラッシュ';
            const slashCount = deck.filter(d => d.name.includes(targetName)).length;
            p += (slashCount * (s.effect.params.value || 0));
          }
          if (s.effect.type === 'enemy_damage_taken') {
            // 祖国のために：敵の減少HP×係数のダメージ
            const ratio = (s.effect.params.value || 100) / 100;
            p += Math.floor(enemyDamageTaken * ratio);
          }
        }

        // アタックカードならchargeバフの倍率を適用（最後のアタックカードにのみ）
        basePower += p;
    });

    passives.forEach(p => { if (p.type === 'score_mult') totalMultiplier += p.value; });
    let finalPower = Math.floor(basePower * totalMultiplier);
    if (skills.length > 0) finalPower += totalFlatDamageBonus;
    return finalPower;
  };

  const handleDeadline = (currentGold?: number) => {
    // 締切判定: ゴールド >= ノルマ（目標売上）ならクリア
    const quota = currentEnemy.baseHP;
    // 引数で渡された場合はそれを使う（state更新が反映されていない場合対策）
    const goldToCheck = currentGold ?? gold;

    if (goldToCheck >= quota) {
      // ノルマ達成！勝利エフェクト
      setIsVictoryEffect(true);

      // ブラック度効果: 戦闘後にブラック度%の社員が退職（計算のみ先に行う）
      let employeesToQuit = 0;
      const blackDegree = workStyle;
      if (workStyle > 0) {
        const quitRate = blackDegree / 100;  // 0〜1
        employeesToQuit = Math.floor(heroStats.employees * quitRate);
      }

      setTimeout(() => {
        // 勝利エフェクト完了後、退職を適用
        if (employeesToQuit > 0) {
          setHeroStats(prev => ({
            ...prev,
            employees: Math.max(1, prev.employees - employeesToQuit)
          }));
        }
        // ブラック度を半分にする
        const newWorkStyle = Math.floor(workStyle / 2);
        setWorkStyle(newWorkStyle);
        // 退職情報を保存（VICTORY画面で表示用）- ブラック度減少情報も追加
        setVictoryQuitInfo(workStyle > 0 ? { blackDegree, quitCount: employeesToQuit, blackReduced: true } : null);

        setTimeout(() => {
          setIsVictoryEffect(false);  // ダイアログ表示時にリセット
          const dropType = currentEnemy?.dropsAbility || 'N';
          if (dropType === 'Y') {
            // エリート: 全レアリティアビリティ→カード
            setGameState('BOSS_VICTORY');
            generateShopOptions(false);
            setIsAbilityRewardOverlayOpen(true);
          } else if (dropType === 'C') {
            // ザコ: コモンアビリティのみ→カードなし
            setGameState('ABILITY_REWARD');
            generateShopOptions(true);
            setIsAbilityRewardOverlayOpen(true);
          } else {
            // 通常: カードのみ
            generateCardRewards();
            setGameState('CARD_REWARD');
            setIsCardRewardOverlayOpen(true);
          }
        }, 400);
      }, 1200);  // 昇天エフェクトの時間
    } else {
      // ノルマ未達成！攻撃エフェクト → ゲームオーバー
      setIsMonsterAttacking(true);
      setTimeout(() => {
        setIsMonsterAttacking(false);
        setIsPlayerTakingDamage(true);
        const newLife = life - 1;
        setLife(newLife);
        // デスマーチバフを全て解除
        setPlayerBuffs(prev => prev.filter(b => b.type !== 'deathmarch'));
        setTimeout(() => {
          setIsPlayerTakingDamage(false);
          if (newLife <= 0) {
            setGameState('GAME_OVER');
          } else {
            // ライフが残っていれば続行（追加ターン）
            setTurnResetMessage(true);
            setUsedHaste(0);
            setTimeout(() => setTurnResetMessage(false), 1000);
          }
        }, 500);
      }, 800);
    }
  };

  // 後方互換性のためのエイリアス
  const handleEnemyAttack = handleDeadline;

  const handleRest = () => {
    if (remainingHaste <= 0 || turnResetMessage || isMonsterAttacking) return;

    // 休憩ボタンはヘイストを10消費して何もしない（ターンを終わらせたい時用）
    const restDelay = 10;
    const newUsedHaste = Math.round(usedHaste + restDelay);
    setUsedHaste(newUsedHaste);

    if (newUsedHaste >= maxHaste) {
        handleDeadline(gold);  // 休憩中はゴールド変わらないので現在値
    }
  };

  const selectSkill = (skill: Skill) => {
    if (remainingHaste <= 0 || isMonsterAttacking || turnResetMessage || isProcessingCard) return;

    setIsProcessingCard(true); // カード処理開始

    // イベント表示を消す
    setWorkStyleEvent(null);

    // パリィバフは次のカード使用で消える（敵攻撃時の処理は handleEnemyAttack で）
    setPlayerBuffs(prev => prev.filter(b => b.type !== 'parry'));

    setProjectile({ icon: skill.icon, id: generateId() });

    // 手札から使用カードを削除
    let newHand = hand.filter(h => h.id !== skill.id);

    // 山札からカードを抜く（手札にあったカードなので通常は山札にはない）
    let newDeck = deck.filter(d => d.id !== skill.id);

    // ファイナルスラッシュ発動時の特殊処理：手札・山札の「スラッシュ」を捨て札へ
    let removedCards: Skill[] = [];
    if (skill.name === 'ファイナルスラッシュ') {
        // 手札と山札から「スラッシュ」の名前を持つカードを捨て札に送る
        const handSlashes = newHand.filter(c => c.name.includes('スラッシュ'));
        const deckSlashes = newDeck.filter(c => c.name.includes('スラッシュ'));
        removedCards = [...handSlashes, ...deckSlashes];
        newHand = newHand.filter(c => !c.name.includes('スラッシュ'));
        newDeck = newDeck.filter(c => !c.name.includes('スラッシュ'));
    }

    setHand(newHand);
    setDeck(newDeck);

    // ブラック度変化（0〜100の範囲）
    if (skill.workStyleChange) {
      setWorkStyle(prev => Math.max(0, Math.min(100, prev + skill.workStyleChange)));
    }

    // ディレイ計算（油断デバフ: アタックカードのヘイスト+5/stack）
    const yudanPenalty = skill.cardType === 'attack' ? getYudanStacks() * 5 : 0;
    // nextCardFreeバフがある場合はディレイ0（デスマーチ効果）
    const isNextCardFree = hasNextCardFree();
    const actualDelay = isNextCardFree ? 0 : skill.delay + yudanPenalty;

    // nextCardFreeバフを消費
    if (isNextCardFree) {
      setPlayerBuffs(prev => prev.filter(b => b.type !== 'nextCardFree'));
    }

    setTimeout(() => {
        setIsMonsterShaking(true);
        setTimeout(() => setIsMonsterShaking(false), 300);
        setProjectile(null);

        // mana_consume_damage効果: マナを全消費してダメージに変換
        let consumedManaForDamage = 0;
        if (skill.effect?.type === 'mana_consume_damage' && !isEffectDisabled(skill)) {
          consumedManaForDamage = mana;
          setMana(0);
        } else {
          // 通常のマナ消費/回復（上限をmaxManaに制限）
          setMana(prev => Math.min(maxMana, prev - skill.manaCost));
        }

        // ヘイスト消費（使用済みに加算）
        const newUsedHaste = Math.round(usedHaste + actualDelay);
        setUsedHaste(newUsedHaste);

        let newStack = [...stack, skill, ...removedCards];

        // アタックカードの場合、すべてのchargeバフを消費して合計発動回数を計算
        let repeatCount = 1;
        if (skill.cardType === 'attack') {
          const chargeBuffs = playerBuffs.filter(b => b.type === 'charge');
          if (chargeBuffs.length > 0) {
            // すべてのchargeバフのvalueを合計
            repeatCount = chargeBuffs.reduce((sum, buff) => sum + buff.value, 0);
            // すべてのchargeバフを消費
            setPlayerBuffs(prev => prev.filter(b => b.type !== 'charge'));
          }
        }

        // ベースダメージを持つカードの場合、BASE_DOUBLEバフを1スタック消費
        if (skill.baseDamage > 0) {
          setPlayerBuffs(prev => {
            const baseDoubleBuff = prev.find(b => b.type === 'base_damage_boost');
            if (baseDoubleBuff && baseDoubleBuff.value > 1) {
              // スタックを1減らす
              return prev.map(b =>
                b.type === 'base_damage_boost' ? { ...b, value: b.value - 1 } : b
              );
            } else if (baseDoubleBuff && baseDoubleBuff.value === 1) {
              // 最後の1スタックなのでバフを削除
              return prev.filter(b => b.type !== 'base_damage_boost');
            }
            return prev;
          });
        }

        // 応援バフは戦闘中永続（減少しない）

        // 現在のカードのダメージを直接計算（休職などで社員数が変わっても過去カードに影響しない）
        const currentCardDamage = getSkillBaseDamage(skill);
        let damageDealt = currentCardDamage * repeatCount;

        // スタック内の除去カード（ファイナルスラッシュ用）のダメージも追加
        const removedCardsDamage = removedCards.reduce((sum, card) => sum + getSkillBaseDamage(card), 0);
        damageDealt += removedCardsDamage;

        // バフによるダメージ倍率を適用
        // 計算式: (ベース + 社員数ダメージ) × 一致団結(加算) × 集中(乗算) → ガチャ(累乗)
        damageDealt = Math.floor(damageDealt * getUnityMultiplier() * getFocusMultiplier());
        // ガチャバフ: 最終ダメージを1.5乗（スタック数分適用）
        damageDealt = applyGachaPower(damageDealt);

        const newTotalPower = currentComboPower + damageDealt;
        const poisonDmg = isEnemyPoisoned ? 30 : 0;

        // mana_consume_damage: 消費士気×係数のダメージを追加
        let manaConsumeDmg = 0;
        if (consumedManaForDamage > 0 && skill.effect?.type === 'mana_consume_damage') {
          const ratio = (skill.effect.params.value || 100) / 100;
          manaConsumeDmg = Math.floor(consumedManaForDamage * ratio);
        }

        let finalDamage = damageDealt + poisonDmg + manaConsumeDmg;

        // ARMORトレイト: 閾値以下のダメージを無効化
        if (battleEvent.armorThreshold && finalDamage > 0 && finalDamage <= battleEvent.armorThreshold) {
            finalDamage = 0;
        }

        // ダメージは0以上に制限（マイナスダメージによる回復を防ぐ）
        const actualDamage = Math.max(0, finalDamage);

        // 進捗を加算（ゲージ表示用、目標超過も許可）
        const newProgress = progress + actualDamage;
        setProgress(newProgress);
        // ブラック度効果: カード使用後に確率で炎上（全財産喪失＋このカードのダメージ無効）
        // ブラック度100で30%の確率
        let didBurn = false;
        if (workStyle > 0) {
          const blackDegree = workStyle;  // 0〜100
          const loseChance = blackDegree * 0.3 / 100;  // 0〜0.3 (0〜30%)
          if (Math.random() < loseChance) {
            didBurn = true;
            // 炎上演出を表示
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 2500);
          }
        }

        // 稼いだ分だけゴールド（売上）も増える（炎上時は0）
        const finalGold = didBurn ? 0 : gold + actualDamage;
        setGold(finalGold);
        setCurrentComboPower(newTotalPower);
        setStack(newStack);

        // 炎上時はダメージ表示しない
        if (!didBurn) {
          const damageId = generateId();
          setFloatingDamages(prev => [...prev, { id: damageId, value: actualDamage }]);
          if (poisonDmg > 0) {
            const pId = generateId();
            setFloatingDamages(prev => [...prev, { id: pId, value: poisonDmg, isPoison: true }]);
            setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== pId)), 1000);
          }
          setTimeout(() => setFloatingDamages(prev => prev.filter(d => d.id !== damageId)), 1000);
        }

        // ワークスタイルイベント判定は現在無効化
        // if (skill.cardType === 'attack') {
        //   checkWorkStyleEvent();
        // }

        // カード効果をrepeatCount回実行（ためるバフ対応）
        // 炎上時はダメージ系効果（lifesteal、magic_lifesteal）はスキップ、バフ系効果は発動
        if (skill.effect && !isEffectDisabled(skill)) {
          for (let i = 0; i < repeatCount; i++) {
           if (skill.effect.type === 'lifesteal' && !didBurn) {
              // 1回あたりのダメージで回復（repeatCountは既にactualDamageの計算で考慮されているため1回分）
              const perHitDamage = Math.floor(actualDamage / repeatCount);
              setMana(prev => Math.min(maxMana, prev + perHitDamage));
              const mhId = generateId();
              setFloatingDamages(prev => [...prev, { id: mhId, value: perHitDamage, isMana: true }]);
              setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
           }
           if (skill.effect.type === 'magic_lifesteal' && !didBurn) {
              // ダメージ分士気回復
              const perHitDmg = Math.floor(perHitDamage);
              if (perHitDmg > 0) {
                setMana(prev => Math.min(maxMana, prev + perHitDmg));
                const mhId = generateId();
                setFloatingDamages(prev => [...prev, { id: mhId, value: perHitDmg, isMana: true }]);
                setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
              }
           }
           if (skill.effect.type === 'poison') setIsEnemyPoisoned(true);
           if (skill.effect.type === 'mana_recovery') {
              const recoveryAmount = skill.effect.params.value || 30;
              setMana(prev => Math.min(maxMana, prev + recoveryAmount));
              const mhId = generateId();
              setFloatingDamages(prev => [...prev, { id: mhId, value: recoveryAmount, isMana: true }]);
              setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
           }
           if (skill.effect.type === 'add_buff' && skill.effect.params.buffId) {
             addBuff(skill.effect.params.buffId, skill.effect.params.value);
           }
           if (skill.effect.type === 'add_strength') {
             // 筋力バフを付与（パラメータで指定された値、デフォルト20）
             const strengthAmount = skill.effect.params.value || 20;
             addBuff('STRENGTH', strengthAmount);
           }
           if (skill.effect.type === 'double_strength') {
             // 前がアタックなら筋力2倍
             if (wasLastCardAttack()) {
               setPlayerBuffs(prev => {
                 const strengthBuff = prev.find(b => b.type === 'strength');
                 if (strengthBuff) {
                   return prev.map(b =>
                     b.type === 'strength' ? { ...b, value: b.value * 2 } : b
                   );
                 }
                 return prev;
               });
             }
           }
           if (skill.effect.type === 'add_slash_to_deck') {
             // 0コスト・0ヘイストのコーディングを戦闘中デッキに追加
             const cardCount = skill.effect.params.value || 3;
             const baseCard: Omit<Skill, 'id'> = {
               name: 'コーディング',
               icon: 'https://img.icons8.com/fluency/144/source-code.png',
               cardType: 'attack',
               baseDamage: 20,
               employeeRatio: 100,
               manaCost: 0,
               delay: 0,
               color: 'bg-slate-700',
               borderColor: 'border-slate-400',
               heightClass: 'h-8',
               widthClass: 'w-56',
               borderRadiusClass: 'rounded-sm',
               rarity: 'C' as const
             };
             const newCards: Skill[] = [];
             for (let i = 0; i < cardCount; i++) {
               newCards.push({ ...baseCard, id: generateId() });
             }
             newDeck = [...newDeck, ...newCards];
             setDeck(newDeck);
           }
           if (skill.effect.type === 'add_parry') {
             // パリィバフを付与
             addBuff('PARRY', 1);
           }
           if (skill.effect.type === 'add_time') {
             // 締切を増やす（バフを付与してmaxHasteを増加）
             const timeValue = skill.effect.params.value || 2;
             addBuff('DEADLINE_EXTEND', timeValue);
           }
           if (skill.effect.type === 'clear_buffs') {
             // バフ・デバフを全て解除
             setPlayerBuffs([]);
           }
           if (skill.effect.type === 'cost_gold_percent') {
             // ノルマの%分ゴールドを引く
             const percentValue = skill.effect.params.value || 20;
             const quota = currentEnemy.baseHP;
             const costAmount = Math.floor(quota * percentValue / 100);
             setGold(prev => Math.max(0, prev - costAmount));
           }
           if (skill.effect.type === 'permanent_power_up') {
             // 倍率を増加（使用するたび+30%）
             const multiplierIncrease = (skill.effect.params.value || 30) / 100;
             const updateSkillMultiplier = (s: Skill) => {
               if (s.id !== skill.id) return s;
               const currentMultiplier = s.multiplier ?? 1.0;
               return { ...s, multiplier: currentMultiplier + multiplierIncrease };
             };
             // permanentDeck、deck、newStackすべてを更新
             setPermanentDeck(prev => prev.map(updateSkillMultiplier));
             setDeck(prev => prev.map(updateSkillMultiplier));
             // newStackも更新（現在の戦闘で反映させるため）
             newStack = newStack.map(updateSkillMultiplier);
           }
           if (skill.effect.type === 'draw') {
             // カード効果でドロー（上限なし）
             const drawCount = skill.effect.params.value || 1;
             const drawResult = drawCards(drawCount, newHand, newDeck, newStack);
             newHand = drawResult.newHand;
             newDeck = drawResult.newDeck;
             newStack = drawResult.newStack;
           }
           if (skill.effect.type === 'discard_magic_mana') {
             // 捨て札のサポートカード×valueの士気回復＋1ドロー
             const supportCardCount = newStack.filter(s => s.cardType === 'support').length;
             const manaPerCard = skill.effect.params.value || 10;
             const recoveryAmount = supportCardCount * manaPerCard;
             if (recoveryAmount > 0) {
               setMana(prev => Math.min(maxMana, prev + recoveryAmount));
               const mhId = generateId();
               setFloatingDamages(prev => [...prev, { id: mhId, value: recoveryAmount, isMana: true }]);
               setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
             }
             // 1ドロー
             const drawResult = drawCards(1, newHand, newDeck, newStack);
             newHand = drawResult.newHand;
             newDeck = drawResult.newDeck;
             newStack = drawResult.newStack;
           }
           if (skill.effect.type === 'add_copy_to_deck') {
             // このカードのコピーをデッキに追加
             const cardCopy = { ...skill, id: generateId() };
             newDeck = [...newDeck, cardCopy];
           }
           if (skill.effect.type === 'discard_redraw') {
             // 手札を全て捨てて、捨てた数+1枚ドロー
             const discardCount = newHand.length;
             newStack = [...newStack, ...newHand];
             newHand = [];
             const drawResult = drawCards(discardCount + 1, newHand, newDeck, newStack);
             newHand = drawResult.newHand;
             newDeck = drawResult.newDeck;
             newStack = drawResult.newStack;
           }
           if (skill.effect.type === 'physical_chain_haste_draw') {
             // 前がアタックカードならドロー
             if (wasLastCardAttack()) {
               const drawCount = skill.effect.params.drawValue || 1;
               const drawResult = drawCards(drawCount, newHand, newDeck, newStack);
               newHand = drawResult.newHand;
               newDeck = drawResult.newDeck;
               newStack = drawResult.newStack;
             }
           }
          }
          // draw/discard_magic_mana/add_copy_to_deck/discard_redraw/physical_chain_haste_draw効果の最終結果を反映
          if (skill.effect.type === 'draw' || skill.effect.type === 'discard_magic_mana' || skill.effect.type === 'add_copy_to_deck' || skill.effect.type === 'discard_redraw' || skill.effect.type === 'physical_chain_haste_draw') {
            setHand(newHand);
            setDeck(newDeck);
            if (newStack.length === 0 && stack.length > 0) {
              setStack([]);
            }
          }
        }

        // MANA_DRAINトレイト: カード使用後にマナを減少
        if (battleEvent.manaDrainAmount) {
            setMana(prev => Math.max(0, prev - battleEvent.manaDrainAmount!));
        }

        // 目標達成でも即クリアしない（追加開発可能）
        // 締切時にゴールドでクリア判定

        // カードを使ったら残りの手札を捨て札に送り、3枚ドロー
        newStack = [...newStack, ...newHand];
        newHand = [];
        const drawResult = drawCards(3, newHand, newDeck, newStack);
        setHand(drawResult.newHand);
        setDeck(drawResult.newDeck);
        setStack(drawResult.newStack);

        // ヘイストを使い切ったら締切判定
        if (newUsedHaste >= maxHaste) {
             handleDeadline(finalGold);
        }
        setIsProcessingCard(false); // カード処理終了
    }, 450);
  };

  const getRarityColor = (rarity: Rarity) => {
    switch(rarity) {
        case 'SSR': return 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)] bg-yellow-950/20';
        case 'R': return 'border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.2)] bg-slate-800/20';
        case 'C': return 'border-orange-800 bg-orange-950/10';
        default: return 'border-slate-700';
    }
  };

  // ローディング画面
  if (isLoading || !gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[1rem] font-bold text-slate-400">Loading Game Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center bg-slate-950 relative overflow-hidden text-slate-100 font-sans">

      <style>{`
        html {
          /* 375px基準で16px、画面幅に比例してスケール、最大24pxまで */
          font-size: clamp(14px, calc(16px * (100vw / 375)), 24px);
        }
        @keyframes monsterShake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .monster-shake { animation: monsterShake 0.3s; animation-iteration-count: 1; }
        @keyframes monsterAttack {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(30px) scale(1.3); }
          100% { transform: translateY(0) scale(1); }
        }
        .monster-attack { animation: monsterAttack 0.4s ease-in-out forwards; }
        @keyframes monsterFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        .monster-idle { animation: monsterFloat 4s ease-in-out infinite; }
        @keyframes projectileFlyOut {
          0% { transform: translateY(120px) scale(2.5); opacity: 0; filter: blur(8px); }
          15% { opacity: 1; filter: blur(2px); }
          100% { transform: translateY(-60px) scale(0.3); opacity: 0; filter: blur(0px); }
        }
        .projectile { animation: projectileFlyOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes floatUpFade {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-70px); opacity: 0; }
        }
        .damage-pop { animation: floatUpFade 1s ease-out forwards; }
        @keyframes cardEntry {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .card-entry { animation: cardEntry 0.4s ease-out forwards; }
        .deck-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 8px; justify-items: center; }
        @keyframes redFlash { 0% { opacity: 0; } 20% { opacity: 0.6; } 100% { opacity: 0; } }
        .damage-flash { animation: redFlash 0.5s ease-out forwards; }

        @keyframes victoryAscend {
          0% { transform: translateY(0) scale(1); opacity: 1; filter: brightness(1); }
          30% { transform: translateY(-20px) scale(1.1); opacity: 1; filter: brightness(1.5); }
          100% { transform: translateY(-100px) scale(0.5); opacity: 0; filter: brightness(2); }
        }
        .victory-ascend { animation: victoryAscend 1.2s ease-in-out forwards; }

        @keyframes victoryTextPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .victory-text { animation: victoryTextPop 0.6s ease-out forwards; }

        @keyframes victoryParticle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(0.5); opacity: 0; }
        }
        .victory-particles {
          position: absolute;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          width: 200px;
        }
        .victory-particle {
          font-size: 24px;
          animation: victoryParticle 1.5s ease-out forwards;
        }

        /* 炎上演出 */
        @keyframes burnFlash {
          0%, 100% { background-color: rgba(220, 38, 38, 0.3); }
          50% { background-color: rgba(220, 38, 38, 0.6); }
        }
        @keyframes burnRise {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-100px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
        .animate-burn-flash > div:first-child {
          animation: burnFlash 0.3s ease-in-out infinite;
        }
        .animate-burn-rise {
          animation: burnRise 1.5s ease-out forwards;
        }
      `}</style>

      {isPlayerTakingDamage && <div className="fixed inset-0 z-[100] bg-red-600 pointer-events-none damage-flash mix-blend-multiply"></div>}

      {/* DECK OVERLAY */}
      {isDeckOverlayOpen && (() => {
        // 戦闘中は山札(deck)を表示、それ以外はpermanentDeckを表示
        const displayDeck = gameState === 'PLAYING' ? deck : permanentDeck;
        const deckLabel = gameState === 'PLAYING' ? 'Draw Pile' : 'Current Deck';
        return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Layers className="text-indigo-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">{deckLabel}</h2>
                <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{displayDeck.length} CARDS</span>
              </div>
              <button onClick={() => setIsDeckOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              <div className="deck-grid">
                {displayDeck.map((skill, idx) => (
                    <div key={`${skill.id}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px]">
                      <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                        <Card skill={skill} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <button onClick={() => setIsDeckOverlayOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm">Close Viewer</button>
          </div>
        </div>
        );
      })()}

      {/* ABILITY LIST OVERLAY */}
      {isAbilityListOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Award className="text-purple-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Abilities</h2>
                <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{passives.length} ABILITIES</span>
              </div>
              <button onClick={() => setIsAbilityListOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {passives.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Award size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">まだアビリティを持っていません</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {passives.map((passive, idx) => (
                    <div
                      key={`${passive.id}-${idx}`}
                      className={`p-4 rounded-xl border-2 ${
                        passive.rarity === 'SSR' ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50' :
                        passive.rarity === 'SR' ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50' :
                        passive.rarity === 'R' ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/50' :
                        'bg-slate-800/50 border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-900/50 flex items-center justify-center overflow-hidden">
                          <SafeImage src={passive.icon} alt={passive.name} className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${
                              passive.rarity === 'SSR' ? 'text-yellow-400' :
                              passive.rarity === 'SR' ? 'text-purple-400' :
                              passive.rarity === 'R' ? 'text-blue-400' :
                              'text-slate-300'
                            }`}>{passive.name}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                              passive.rarity === 'SSR' ? 'bg-yellow-500/30 text-yellow-300' :
                              passive.rarity === 'SR' ? 'bg-purple-500/30 text-purple-300' :
                              passive.rarity === 'R' ? 'bg-blue-500/30 text-blue-300' :
                              'bg-slate-600/30 text-slate-400'
                            }`}>{passive.rarity}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{passive.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setIsAbilityListOverlayOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm">Close Viewer</button>
          </div>
        </div>
      )}

      {/* SHOP OVERLAY */}
      {isShopOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-yellow-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Shop</h2>
                <span className="text-yellow-400 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full flex items-center gap-1">
                  <Coins size={14} /> {gold}G
                </span>
              </div>
              <button onClick={() => setIsShopOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {/* サービス（ライフ回復 / カード削除） */}
              <div className="mb-4 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Services</h3>
                <p className="text-xs text-slate-500 mb-2">いずれか１つのサービスだけが受けられます</p>
                {/* ライフ回復 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                    hasBoughtShopService ? 'opacity-50 border-slate-700' : 'border-red-500/50 bg-red-950/30'
                  }`}>
                    <Heart className={`w-8 h-8 text-red-500 shrink-0 ${hasBoughtShopService ? 'grayscale' : 'animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide">Life +1</h4>
                      <p className="text-xs text-slate-400">ライフを1回復</p>
                    </div>
                  </div>
                  {hasBoughtShopService ? (
                    <span className="text-sm text-green-500 font-bold px-4 shrink-0">SOLD</span>
                  ) : (
                    <button
                      onClick={handleBuyLife}
                      disabled={gold < LIFE_RECOVERY_PRICE || life >= maxLife}
                      className={`flex items-center gap-1 px-4 py-3 rounded-lg text-sm font-black shrink-0 transition-all ${
                        gold >= LIFE_RECOVERY_PRICE && life < maxLife
                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins size={16} /> {LIFE_RECOVERY_PRICE}G
                    </button>
                  )}
                </div>
                {/* カード削除 */}
                <div className="flex items-center gap-2">
                  <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                    hasBoughtShopService ? 'opacity-50 border-slate-700' : 'border-orange-500/50 bg-orange-950/30'
                  }`}>
                    <Trash2 className={`w-8 h-8 text-orange-500 shrink-0 ${hasBoughtShopService ? 'grayscale' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide">Card Remove</h4>
                      <p className="text-xs text-slate-400">カードを1枚削除</p>
                    </div>
                  </div>
                  {hasBoughtShopService ? (
                    <span className="text-sm text-green-500 font-bold px-4 shrink-0">SOLD</span>
                  ) : (
                    <button
                      onClick={handleBuyCardRemove}
                      disabled={gold < CARD_REMOVE_PRICE || permanentDeck.length <= 1}
                      className={`flex items-center gap-1 px-4 py-3 rounded-lg text-sm font-black shrink-0 transition-all ${
                        gold >= CARD_REMOVE_PRICE && permanentDeck.length > 1
                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins size={16} /> {CARD_REMOVE_PRICE}G
                    </button>
                  )}
                </div>
              </div>

              {/* アビリティ */}
              <div className="mb-4 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Abilities</h3>
                <div className="flex flex-col gap-2">
                  {shopPassives.map((passive) => {
                    const isPurchased = purchasedPassiveIds.has(passive.id);
                    const price = getPassivePrice(passive.rarity);
                    const canAfford = gold >= price;
                    return (
                      <div key={passive.id} className="flex items-center gap-2">
                        <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                          isPurchased ? 'opacity-50 border-slate-700' : getRarityColor(passive.rarity)
                        }`}>
                          <SafeImage src={passive.icon} alt={passive.name} className={`w-8 h-8 object-contain shrink-0 ${isPurchased ? 'grayscale' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide truncate">{passive.name}</h4>
                              <span className={`text-xs font-black shrink-0 ${passive.rarity === 'SSR' ? 'text-yellow-500' : passive.rarity === 'R' ? 'text-slate-300' : 'text-orange-500'}`}>{passive.rarity}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{passive.description}</p>
                          </div>
                        </div>
                        {isPurchased ? (
                          <span className="text-sm text-green-500 font-bold px-4 shrink-0">SOLD</span>
                        ) : (
                          <button
                            onClick={() => handleBuyPassive(passive)}
                            disabled={!canAfford}
                            className={`flex items-center gap-1 px-4 py-3 rounded-lg text-sm font-black shrink-0 transition-all ${
                              canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Coins size={16} /> {price}G
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* カード */}
              <div className="px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cards</h3>
                <div className="grid grid-cols-3 gap-2">
                  {shopCards.map((card) => {
                    const isPurchased = purchasedIds.has(card.id);
                    const price = getCardPrice(card.rarity);
                    const canAfford = gold >= price;
                    const ownedCount = permanentDeck.filter(d => d.name === card.name).length;

                    return (
                      <div key={card.id} className="relative flex flex-col items-center pb-1">
                        <div className="h-[180px] md:h-[210px] lg:h-[240px]">
                          <div className="transform scale-[0.8] md:scale-[0.95] lg:scale-100 origin-top">
                            <Card skill={card} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                          </div>
                        </div>
                        {ownedCount > 0 && (
                          <div className="text-slate-400 text-[9px] font-black">
                            所持:{ownedCount}
                          </div>
                        )}
                        {isPurchased ? (
                          <div className="bg-green-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Check size={12} /> SOLD
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBuyCard(card)}
                            disabled={!canAfford}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-xl transition-all ${canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                          >
                            <Coins size={12} /> {price}G
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={() => setIsShopOverlayOpen(false)} className="mt-4 w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-white">Close Shop</button>
          </div>
        </div>
      )}

      {/* CARD REMOVE OVERLAY */}
      {isCardRemoveOverlayOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Trash2 className="text-orange-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Remove Card</h2>
              </div>
              <button onClick={() => { setIsCardRemoveOverlayOpen(false); setGold(prev => prev + CARD_REMOVE_PRICE); }} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <p className="text-center text-slate-400 text-sm mb-4">削除するカードを選択してください</p>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              <div className="deck-grid">
                {permanentDeck.map((skill, idx) => (
                  <div key={`${skill.id}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px] cursor-pointer hover:scale-105" onClick={() => handleRemoveCard(skill.id)}>
                    <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                      <Card skill={skill} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                    </div>
                    <div className="absolute inset-0 bg-red-500/0 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center">
                      <Trash2 className="text-red-500 opacity-0 hover:opacity-100 transition-opacity" size={32} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD REWARD OVERLAY */}
      {isCardRewardOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto flex flex-col h-full justify-center">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <PlusCircle className="text-green-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Choose a Reward</h2>
              </div>
              <button onClick={() => setIsCardRewardOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex justify-center gap-3 md:gap-4 w-full mb-6">
              {cardRewards.map((reward, i) => (
                <div key={reward.id} className="flex-1 max-w-[140px] md:max-w-[160px] card-entry" style={{ animationDelay: `${i * 0.1}s` }}>
                  <Card
                    skill={reward}
                    onClick={() => { selectRewardCard(reward); setIsCardRewardOverlayOpen(false); }}
                    disabled={false}
                    mana={999}
                    currentHaste={999}
                    heroStats={heroStats}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsCardRewardOverlayOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-slate-400 hover:text-white transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ABILITY REWARD OVERLAY */}
      {isAbilityRewardOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-md md:max-w-lg mx-auto flex flex-col h-full justify-center">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Award className="text-indigo-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Ability Upgrade</h2>
              </div>
              <button onClick={() => setIsAbilityRewardOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex flex-col gap-3 w-full mb-6">
              {shopOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => selectPassive(option)}
                  className={`w-full bg-slate-900/80 p-4 rounded-xl border-2 hover:brightness-125 transition-all text-left flex items-center gap-4 group ${getRarityColor(option.rarity)}`}
                >
                  <SafeImage src={option.icon} alt={option.name} className="w-12 h-12 object-contain shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">{option.name}</h3>
                      <span className={`text-xs font-black px-2 py-0.5 rounded ${option.rarity === 'SSR' ? 'bg-yellow-600 text-white' : option.rarity === 'R' ? 'bg-slate-600 text-white' : 'bg-orange-600 text-white'}`}>{option.rarity}</span>
                    </div>
                    <p className="text-xs text-slate-400">{option.description}</p>
                  </div>
                  <ArrowRight className="text-slate-600 group-hover:text-indigo-400 transition-colors" size={20} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsAbilityRewardOverlayOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-slate-400 hover:text-white transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* BESTIARY OVERLAY */}
      {isBestiaryOpen && (() => {
        const normalEnemies = gameData.enemies.filter(e => e.minFloor !== e.maxFloor);
        const eliteEnemies = gameData.enemies.filter(e => e.minFloor === e.maxFloor);
        const renderEnemyCard = (enemy: Enemy, idx: number, isElite: boolean) => (
          <div key={idx} className={`bg-slate-900/80 border rounded-xl p-3 flex flex-col items-center hover:border-indigo-500/50 transition-all ${isElite ? 'border-yellow-600/50' : 'border-slate-800'}`}>
            <SafeImage src={enemy.icon} alt={enemy.name} className="w-12 h-12 md:w-16 md:h-16 object-contain mb-2" />
            <span className="text-[10px] font-black text-slate-100 uppercase tracking-wider text-center leading-tight">{enemy.name}</span>
            <div className="mt-2 flex flex-col items-center gap-1 w-full">
              <div className="flex items-center gap-1">
                <Heart size={10} className="text-red-500" />
                <span className="text-[9px] font-bold text-red-400">HP: {enemy.baseHP}</span>
              </div>
              <div className="text-[8px] font-bold text-slate-500">
                {isElite ? `F${enemy.minFloor}` : `F${enemy.minFloor} - F${enemy.maxFloor === 999 ? '∞' : enemy.maxFloor}`}
              </div>
              {enemy.trait && (
                <div className={`mt-1 px-2 py-1 rounded text-[7px] font-bold text-center w-full ${enemy.trait.type === 'positive' ? 'bg-green-900/50 text-green-400 border border-green-700/50' : enemy.trait.type === 'negative' ? 'bg-red-900/50 text-red-400 border border-red-700/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  <div className="font-black uppercase tracking-wider">{enemy.trait.title}</div>
                  <div className="mt-0.5 opacity-80">{enemy.trait.description}</div>
                </div>
              )}
            </div>
          </div>
        );
        return (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
            <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-indigo-400" size={24} />
                  <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">モンスター図鑑</h2>
                  <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{gameData.enemies.length} MONSTERS</span>
                </div>
                <button onClick={() => setIsBestiaryOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <Skull size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">ザコ敵</h3>
                    <span className="text-[10px] text-slate-600 font-bold">{normalEnemies.length}体</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {normalEnemies.map((enemy, idx) => renderEnemyCard(enemy, idx, false))}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-yellow-700/50">
                    <Star size={16} className="text-yellow-500" />
                    <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest">エリート</h3>
                    <span className="text-[10px] text-yellow-600 font-bold">{eliteEnemies.length}体</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {eliteEnemies.map((enemy, idx) => renderEnemyCard(enemy, idx, true))}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsBestiaryOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                <Undo2 size={16} /> 閉じる
              </button>
            </div>
          </div>
        );
      })()}

      {/* CARD DEX OVERLAY */}
      {isCardDexOpen && (() => {
        const allCards = gameData.allSkills;
        return (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
            <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Layers className="text-indigo-400" size={24} />
                  <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">カード図鑑</h2>
                  <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{allCards.length} CARDS</span>
                </div>
                <button onClick={() => setIsCardDexOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {/* 全カード */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <Swords size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">全カード</h3>
                    <span className="text-[10px] text-slate-600 font-bold">{allCards.length}枚</span>
                  </div>
                  <div className="deck-grid">
                    {allCards.map((skill, idx) => (
                      <div key={`card-${skill.name}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px]">
                        <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                          <Card skill={skill} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsCardDexOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                <Undo2 size={16} /> 閉じる
              </button>
            </div>
          </div>
        );
      })()}

      {/* DISCARD PILE OVERLAY (使用済みカード) */}
      {isDiscardOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <ScrollText className="text-red-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">使用済みカード</h2>
                <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{stack.length} CARDS</span>
              </div>
              <button onClick={() => setIsDiscardOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {stack.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-30">
                  <ScrollText size={48} className="text-slate-600 mb-4" />
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">まだカードを使用していません</p>
                </div>
              ) : (
                <div className="deck-grid">
                  {stack.filter(s => s.id !== 'rest').map((skill, idx) => (
                    <div key={`${skill.id}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px]">
                      <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                        <Card skill={skill} onClick={() => {}} disabled={false} mana={999} heroStats={heroStats} />
                      </div>
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-900/90 rounded text-[8px] font-black text-white uppercase tracking-wider shadow-lg">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setIsDiscardOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
              <Undo2 size={16} /> 閉じる
            </button>
          </div>
        </div>
      )}

      {/* PASSCODE MODAL */}
      {isPasscodeModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest">パスコード入力</h2>
              <button onClick={() => setIsPasscodeModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">この機能を使用するにはパスコードを入力してください</p>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
              placeholder="パスコード"
              className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-center text-xl font-bold tracking-[0.5em] text-slate-100 focus:outline-none focus:ring-2 ${passcodeError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-indigo-500'}`}
              autoFocus
            />
            {passcodeError && <p className="text-red-400 text-sm mt-2 text-center">パスコードが違います</p>}
            <button onClick={handlePasscodeSubmit} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-bold uppercase tracking-widest text-sm text-white transition-all">
              確認
            </button>
          </div>
        </div>
      )}

      {/* DEBUG MENU OVERLAY */}
      {isDebugOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Settings className="text-slate-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">デバッグメニュー</h2>
              </div>
              <button onClick={() => setIsDebugOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-6">
              {/* クイックアクション */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800">クイックアクション</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { debugFullRestore(); }} className="flex items-center gap-2 px-4 py-2 bg-green-900/50 border border-green-600 rounded-lg text-green-400 font-bold text-sm hover:bg-green-800/50 transition-all">
                    <Heart size={16} /> 締切・マナ全回復
                  </button>
                  <button onClick={() => { debugRerollHand(); }} className="flex items-center gap-2 px-4 py-2 bg-blue-900/50 border border-blue-600 rounded-lg text-blue-400 font-bold text-sm hover:bg-blue-800/50 transition-all">
                    <RefreshCw size={16} /> 手札リロール
                  </button>
                </div>
              </div>

              {/* カード追加 */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800">カードをデッキに追加</h3>
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
                  {gameData && gameData.allSkills.map((skill, idx) => (
                    <button key={`add-${skill.name}-${idx}`} onClick={() => debugAddCard(skill)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 transition-all text-left">
                      <div className="flex items-center gap-2">
                        <SafeImage src={skill.icon} alt={skill.name} className="w-6 h-6 object-contain" />
                        <span className="text-[9px] font-bold text-slate-300 truncate">{skill.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* パッシブ追加 */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800">アビリティを獲得</h3>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
                  {(gameData?.passivePool || []).map((passive, idx) => (
                    <button key={`add-passive-${passive.id}-${idx}`} onClick={() => debugAddPassive(passive)} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:border-yellow-500 transition-all text-left flex items-center gap-2">
                      <SafeImage src={passive.icon} alt={passive.name} className="w-6 h-6 object-contain" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-300 block truncate">{passive.name}</span>
                        <span className="text-[7px] text-slate-500 block truncate">{passive.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setIsDebugOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
              <Undo2 size={16} /> 閉じる
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDE PANEL - PCでのみ表示 */}
      <div className="hidden xl:flex w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex-col shadow-2xl z-30 fixed left-0 top-0 h-screen">
        <div className="flex items-center gap-2 text-indigo-400 mb-6 pb-4 border-b border-slate-800">
            <ScrollText size={20} />
            <h2 className="font-fantasy text-lg tracking-widest uppercase text-shadow">永続効果</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
            {passives.map((p, idx) => (
                <div key={idx} className="bg-slate-800/80 p-3 rounded border border-slate-700 shadow-lg flex gap-3 items-start animate-in fade-in slide-in-from-left-4 duration-500">
                    <SafeImage src={p.icon} alt={p.name} className="w-8 h-8 object-contain" />
                    <div>
                        <p className="font-bold text-slate-100 text-[11px] leading-tight uppercase tracking-wider">{p.name}</p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-1">{p.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MIDDLE - 縦長のバトルエリア */}
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg flex flex-col h-screen overflow-y-auto no-scrollbar relative">
        <header className="w-full py-1 px-4 flex justify-between items-center bg-slate-900 shadow-2xl z-50 sticky top-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
                <Skull className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" size={16} />
                <div className="flex flex-col">
                    <h1 className="text-base font-fantasy font-bold tracking-[0.05em] leading-none text-slate-100">COMBO CHRONICLE</h1>
                    <span className="text-[7px] text-red-500 font-bold uppercase tracking-widest mt-0.5">LV: {level}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 md:gap-5">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <Coins className="text-yellow-500" size={12} />
                    <span className="text-[0.6875rem] font-black text-yellow-400">{gold}G</span>
                </div>
                {gameState !== 'START' && (
                  <>
                    <div className="h-4 w-[1px] bg-slate-800"></div>
                    <button onClick={() => setGameState('START')} className="p-1 hover:bg-slate-800 rounded-full text-slate-600"><RotateCcw size={14} /></button>
                  </>
                )}
            </div>
        </header>

        <main className="flex-1 w-full max-lg mx-auto flex flex-col items-center justify-between p-1 md:p-2 pb-0 relative">
            <div className="flex-1 w-full flex flex-col justify-center items-center py-1 min-h-[160px] md:min-h-[260px] relative">
                {gameState === 'PLAYING' && (
                    <div className="flex flex-col items-center justify-center relative w-full h-full perspective-1000">
                        {turnResetMessage && (
                          <div className="absolute inset-0 z-50 flex items-center justify-center animate-in zoom-in duration-300">
                            <div className="bg-slate-950/80 backdrop-blur-sm border border-red-500/50 px-6 py-3 rounded-xl flex flex-col items-center shadow-2xl">
                                <ShieldAlert className="text-red-500 mb-2" size={32} />
                                <h3 className="text-red-400 font-fantasy font-bold text-xl tracking-widest uppercase">Damage Taken</h3>
                                <p className="text-slate-300 text-[10px] mt-1">Resetting Deck...</p>
                            </div>
                          </div>
                        )}
                        {/* 炎上演出 */}
                        {isBurning && (
                          <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-burn-flash">
                            {/* 赤い点滅オーバーレイ */}
                            <div className="absolute inset-0 bg-red-600/40 animate-pulse" />
                            {/* 炎パーティクル */}
                            <div className="absolute inset-0 overflow-hidden">
                              {[...Array(8)].map((_, i) => (
                                <Flame
                                  key={i}
                                  className="absolute text-orange-500 animate-burn-rise"
                                  size={48 + Math.random() * 32}
                                  style={{
                                    left: `${10 + i * 12}%`,
                                    bottom: '-20%',
                                    animationDelay: `${i * 0.1}s`,
                                    opacity: 0.8
                                  }}
                                />
                              ))}
                            </div>
                            {/* メッセージ */}
                            <div className="relative bg-slate-950/90 backdrop-blur-sm border-2 border-orange-500 px-8 py-6 rounded-xl flex flex-col items-center shadow-2xl animate-in zoom-in duration-300">
                                <Flame className="text-orange-500 mb-3 animate-pulse" size={56} />
                                <h3 className="text-orange-400 font-fantasy font-bold text-2xl tracking-widest uppercase mb-2">炎上</h3>
                                <p className="text-orange-200 text-sm font-bold text-center leading-relaxed">
                                  プロジェクトは炎上して<br/>全財産を失った！！
                                </p>
                            </div>
                          </div>
                        )}
                        {/* 敵名（中央上部） */}
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
                            <div className="px-3 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-[0.625rem] font-black uppercase tracking-[0.1em] text-slate-300 shadow-lg">{currentEnemy.name}</div>
                        </div>

                        {/* 階層表示とデバッグボタン（右上） */}
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 z-40 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-yellow-500/40 rounded-lg shadow-xl">
                            <Hexagon className="w-4 h-4 text-yellow-500" />
                            <span className="text-[0.75rem] font-black text-yellow-400 uppercase tracking-widest">FLOOR</span>
                            <span className="text-lg font-black text-yellow-300">{level}</span>
                          </div>
                          <button onClick={() => openWithPasscode('debug')} className="p-2 bg-slate-900/90 backdrop-blur-md border border-slate-500/40 rounded-lg shadow-xl hover:bg-slate-800 transition-all">
                            <Settings size={16} className="text-slate-400" />
                          </button>
                        </div>

                        {/* デッキビュワーボタン・アビリティボタン（左下） */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex flex-col gap-1">
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                          <button onClick={() => setIsDeckOverlayOpen(true)} className={`flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl ${isDeckGlowing ? 'border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'border-indigo-500/40'}`}>
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">
                              <AnimatedNumber value={deck.length} duration={600} onAnimatingChange={setIsDeckGlowing} />
                            </span>
                          </button>
                        </div>

                        {/* 使用済みカードビューワーボタン（右下） */}
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 z-40">
                          <button onClick={() => setIsDiscardOpen(true)} className={`flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border rounded-lg text-[9px] font-black text-red-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl ${isUsedGlowing ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-red-500/40'}`}>
                            <ScrollText size={12} />
                            <span>USED</span>
                            <span className="px-1.5 py-0.5 bg-red-600 rounded text-white text-[8px]">
                              <AnimatedNumber value={stack.length} duration={600} onAnimatingChange={setIsUsedGlowing} />
                            </span>
                          </button>
                        </div>

                        <div className={`w-32 h-32 md:w-52 md:h-52 select-none pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center ${isMonsterShaking ? 'monster-shake brightness-150 scale-110' : ''} ${isMonsterAttacking ? 'monster-attack z-50' : ''} ${isVictoryEffect ? 'victory-ascend' : 'monster-idle'}`}>
                            <SafeImage src={currentEnemy.icon} alt={currentEnemy.name} className="w-full h-full object-contain" />
                        </div>

                        {/* 勝利エフェクト */}
                        {isVictoryEffect && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                            <div className="victory-particles">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="victory-particle" style={{ animationDelay: `${i * 0.1}s` }}>✨</div>
                              ))}
                            </div>
                            <div className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] victory-text">
                              CLEAR!
                            </div>
                          </div>
                        )}

                        {/* ゴールドvsノルマゲージ（敵アイコンの下） */}
                        <div className="w-40 md:w-64 h-4 md:h-5 bg-slate-950 rounded border border-slate-800 shadow-2xl overflow-hidden relative mt-1">
                            <div className={`h-full transition-all duration-500 ${gold >= currentEnemy.baseHP ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-yellow-400'}`} style={{ width: `${Math.min(100, (gold / currentEnemy.baseHP) * 100)}%` }}></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                              <Coins className="w-3 h-3 mr-1" /> {gold} / ノルマ {currentEnemy.baseHP}
                            </span>
                        </div>

                        {/* 敵のtrait表示 */}
                        {battleEvent.title && (
                          <div className={`mt-3 px-4 py-2 rounded-lg border ${battleEvent.type === 'positive' ? 'bg-green-900/50 border-green-600' : 'bg-red-900/50 border-red-600'} z-20`}>
                            <div className="flex items-center gap-2">
                              <Zap size={18} className={battleEvent.type === 'positive' ? 'text-green-400' : 'text-red-400'} />
                              <span className="text-sm font-black text-white uppercase tracking-wider">{battleEvent.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">{battleEvent.description}</p>
                          </div>
                        )}

                        {floatingDamages.map(dmg => (
                          <div key={dmg.id} className={`absolute z-50 pointer-events-none damage-pop font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] font-fantasy ${dmg.isMana ? 'text-blue-400 text-xl' : dmg.isPoison ? 'text-green-500 text-lg' : 'text-red-500 text-2xl'}`} style={{ top: '45%' }}>{dmg.isMana ? `+${dmg.value}` : `-${dmg.value}`}</div>
                        ))}
                        {projectile && <div className="absolute flex items-center justify-center pointer-events-none z-50"><SafeImage src={projectile.icon} alt="attack" className="w-12 h-12 md:w-20 md:h-20 object-contain projectile" /></div>}

                        {/* ワークスタイルイベント表示 */}
                        {workStyleEvent && (
                          <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none animate-in fade-in zoom-in duration-300">
                            <div className={`px-6 py-4 rounded-xl border-2 shadow-2xl backdrop-blur-sm ${
                              workStyleEvent.icon === '🔥' ? 'bg-red-900/90 border-red-500' :
                              workStyleEvent.icon === '🐛' ? 'bg-yellow-900/90 border-yellow-500' :
                              workStyleEvent.icon === '😵' ? 'bg-purple-900/90 border-purple-500' :
                              'bg-blue-900/90 border-blue-500'
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className="text-4xl">{workStyleEvent.icon}</span>
                                <div>
                                  <p className="text-xl font-black text-white">{workStyleEvent.title}</p>
                                  <p className="text-sm text-slate-300">{workStyleEvent.message}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                )}

                {gameState === 'CARD_REWARD' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex flex-col gap-1">
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                        </div>

                        {/* 勝利アイコン */}
                        <div className="relative mb-4">
                            <div className="w-28 h-28 bg-gradient-to-b from-green-900/50 to-emerald-950/50 rounded-full flex items-center justify-center border-4 border-green-600/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                                <Award className="text-green-400" size={56} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Victory!</span>
                            </div>
                        </div>

                        {/* 退職情報・ブラック度減少 */}
                        {victoryQuitInfo && (
                          <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-600/50 rounded-lg text-center space-y-1">
                            {victoryQuitInfo.quitCount > 0 && (
                              <p className="text-sm text-red-300">
                                😈 ブラック度により、社員の{victoryQuitInfo.blackDegree}%（{victoryQuitInfo.quitCount}人）が退職
                              </p>
                            )}
                            {victoryQuitInfo.blackReduced && (
                              <p className="text-sm text-blue-300">
                                😇 ブラック度が50%下がった（{victoryQuitInfo.blackDegree}% → {Math.floor(victoryQuitInfo.blackDegree / 2)}%）
                              </p>
                            )}
                          </div>
                        )}

                        {/* プレイヤー情報（社員数・ゴールド） */}
                        <div className="flex items-center gap-4 mb-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-300">{heroStats.employees}人</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-300">{gold}G</span>
                          </div>
                        </div>

                        {/* ボタン群 */}
                        <div className="flex flex-col gap-3 w-48">
                            <button
                                onClick={() => setIsCardRewardOverlayOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-black text-white uppercase tracking-widest transition-all shadow-lg hover:shadow-green-500/30"
                            >
                                <PlusCircle size={18} /> 報酬を見る
                            </button>
                            <button
                                onClick={() => handleBattleWinFinish(permanentDeck)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-black text-slate-200 uppercase tracking-widest transition-all"
                            >
                                <ArrowRight size={18} /> 次へ進む
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'ABILITY_REWARD' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex flex-col gap-1">
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                        </div>

                        {/* 勝利アイコン（ザコ用） */}
                        <div className="relative mb-4">
                            <div className="w-28 h-28 bg-gradient-to-b from-green-900/50 to-emerald-950/50 rounded-full flex items-center justify-center border-4 border-green-600/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                                <Award className="text-green-400" size={56} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Victory!</span>
                            </div>
                        </div>

                        {/* 退職情報・ブラック度減少 */}
                        {victoryQuitInfo && (
                          <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-600/50 rounded-lg text-center space-y-1">
                            {victoryQuitInfo.quitCount > 0 && (
                              <p className="text-sm text-red-300">
                                😈 ブラック度により、社員の{victoryQuitInfo.blackDegree}%（{victoryQuitInfo.quitCount}人）が退職
                              </p>
                            )}
                            {victoryQuitInfo.blackReduced && (
                              <p className="text-sm text-blue-300">
                                😇 ブラック度が50%下がった（{victoryQuitInfo.blackDegree}% → {Math.floor(victoryQuitInfo.blackDegree / 2)}%）
                              </p>
                            )}
                          </div>
                        )}

                        {/* プレイヤー情報（社員数・ゴールド） */}
                        <div className="flex items-center gap-4 mb-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-300">{heroStats.employees}人</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-300">{gold}G</span>
                          </div>
                        </div>

                        {/* ボタン群 */}
                        <div className="flex flex-col gap-3 w-48">
                            <button
                                onClick={() => setIsAbilityRewardOverlayOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-black text-white uppercase tracking-widest transition-all shadow-lg hover:shadow-green-500/30"
                            >
                                <Award size={18} /> 報酬を見る
                            </button>
                            <button
                                onClick={() => handleBattleWinFinish(permanentDeck)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-black text-slate-200 uppercase tracking-widest transition-all"
                            >
                                <ArrowRight size={18} /> 次へ進む
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'BOSS_VICTORY' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex flex-col gap-1">
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                        </div>

                        {/* エリート勝利アイコン */}
                        <div className="relative mb-4">
                            <div className="w-28 h-28 bg-gradient-to-b from-indigo-900/50 to-purple-950/50 rounded-full flex items-center justify-center border-4 border-indigo-600/50 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                                <Star className="text-indigo-400" size={56} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Elite Down!</span>
                            </div>
                        </div>

                        {/* 退職情報・ブラック度減少 */}
                        {victoryQuitInfo && (
                          <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-600/50 rounded-lg text-center space-y-1">
                            {victoryQuitInfo.quitCount > 0 && (
                              <p className="text-sm text-red-300">
                                😈 ブラック度により、社員の{victoryQuitInfo.blackDegree}%（{victoryQuitInfo.quitCount}人）が退職
                              </p>
                            )}
                            {victoryQuitInfo.blackReduced && (
                              <p className="text-sm text-blue-300">
                                😇 ブラック度が50%下がった（{victoryQuitInfo.blackDegree}% → {Math.floor(victoryQuitInfo.blackDegree / 2)}%）
                              </p>
                            )}
                          </div>
                        )}

                        {/* プレイヤー情報（社員数・ゴールド） */}
                        <div className="flex items-center gap-4 mb-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-300">{heroStats.employees}人</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-300">{gold}G</span>
                          </div>
                        </div>

                        {/* ボタン群 */}
                        <div className="flex flex-col gap-3 w-48">
                            <button
                                onClick={() => setIsAbilityRewardOverlayOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-black text-white uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/30"
                            >
                                <Award size={18} /> 報酬を見る
                            </button>
                            <button
                                onClick={() => handleBattleWinFinish(permanentDeck)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-black text-slate-200 uppercase tracking-widest transition-all"
                            >
                                <ArrowRight size={18} /> 次へ進む
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'SHOP' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex flex-col gap-1">
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                        </div>

                        {/* 商人アイコン */}
                        <div className="relative mb-4">
                            <div className="w-28 h-28 bg-gradient-to-b from-yellow-900/50 to-amber-950/50 rounded-full flex items-center justify-center border-4 border-yellow-600/50 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                                <ShoppingCart className="text-yellow-400" size={56} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Merchant</span>
                            </div>
                        </div>

                        {/* プレイヤー情報（社員数・ゴールド） */}
                        <div className="flex items-center gap-4 mb-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-300">{heroStats.employees}人</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-300">{gold}G</span>
                          </div>
                        </div>

                        {/* ボタン群 */}
                        <div className="flex flex-col gap-3 w-48">
                            <button
                                onClick={() => setIsShopOverlayOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl text-sm font-black text-white uppercase tracking-widest transition-all shadow-lg hover:shadow-yellow-500/30"
                            >
                                <ShoppingCart size={18} /> ショップを開く
                            </button>
                            <button
                                onClick={() => nextLevel()}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-black text-slate-200 uppercase tracking-widest transition-all"
                            >
                                <ArrowRight size={18} /> 先に進む
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full bg-slate-900 border-t border-slate-800 p-3 md:p-5 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 mb-safe min-h-[280px] md:min-h-[320px] flex flex-col">
            {gameState === 'START' && (
                <div className="flex flex-col items-center justify-center flex-1 gap-5 py-4">
                    <h2 className="text-xl md:text-2xl font-fantasy font-bold text-slate-100 tracking-widest uppercase">Combo Chronicle</h2>
                    <button onClick={startGame} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-10 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-widest"><Swords size={18} /> 戦闘開始</button>
                    <button onClick={() => openWithPasscode('bestiary')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-10 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all uppercase tracking-widest"><BookOpen size={18} /> モンスター図鑑</button>
                    <button onClick={() => openWithPasscode('cardDex')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-10 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all uppercase tracking-widest"><Layers size={18} /> カード図鑑</button>
                </div>
            )}
            {gameState === 'PLAYING' && (
                <div className="flex flex-col gap-2 flex-1">
                    {/* ホワイト・ブラックゲージ */}
                    <div className="flex flex-col gap-2 w-full">
                      {/* ブラック度ゲージ（0〜100） */}
                      <div className="flex items-center gap-2">
                        <Tooltip content="ブラック度（100が最大）&#10;高いほど炎上リスクが上がり、戦闘後に社員が退職する">
                          <div className="flex items-center gap-1 w-14 cursor-pointer select-none hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
                            <span className="text-lg pointer-events-none">😈</span>
                            <span className="text-[0.5rem] font-black text-red-400 pointer-events-none">BLACK</span>
                          </div>
                        </Tooltip>
                        <div className="flex-1 h-6 bg-slate-950 rounded border border-slate-700 relative overflow-hidden">
                          {/* ブラック度ゲージ（左から右へ伸びる） */}
                          <div
                            className="absolute left-0 h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300"
                            style={{ width: `${workStyle}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20">
                            {workStyle}
                          </span>
                        </div>
                      </div>

                      {/* 基礎パラメータとBUFFS */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {/* 基礎パラメータ 社員数 */}
                        <div className="flex items-center gap-2">
                          <Tooltip content={"社員数が多いほど、一部のカードの進捗が増える。\n採用活動などで増やせる。"}>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/50 border border-amber-700/50 rounded cursor-pointer hover:bg-amber-900/50 transition-colors">
                              <span className="text-[0.5rem] font-black text-amber-400">社員数</span>
                              <span className="text-[0.625rem] font-black text-amber-300">{getEffectiveEmployees()}</span>
                            </div>
                          </Tooltip>
                        </div>
                        {/* BUFFS */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[0.625rem] font-black text-slate-500 uppercase shrink-0">BUFFS:</span>
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            {getAggregatedBuffs().map(buff => (
                              <Tooltip key={buff.id} content={
                                buff.type === 'unity' ? '収益のベース値に加算' :
                                buff.type === 'focus' ? '値を倍倍に' :
                                buff.type === 'gacha' ? '倍どころじゃない、累乗だ!!' :
                                buff.type === 'strength' ? 'このゲームだけ手伝ってくれる!' :
                                buff.description
                              }>
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all animate-in fade-in zoom-in duration-300 shrink-0 cursor-pointer ${
                                    buff.type === 'charge'
                                      ? 'bg-yellow-900/50 border-yellow-600'
                                      : buff.type === 'stat_up'
                                      ? 'bg-green-900/50 border-green-600'
                                      : buff.type === 'base_damage_boost'
                                      ? 'bg-cyan-900/50 border-cyan-600'
                                      : buff.type === 'strength'
                                      ? 'bg-orange-900/50 border-orange-600'
                                      : buff.type === 'deathmarch'
                                      ? 'bg-orange-900/50 border-orange-600'
                                      : buff.type === 'bug'
                                      ? 'bg-yellow-900/50 border-yellow-600'
                                      : buff.type === 'kyushoku'
                                      ? 'bg-purple-900/50 border-purple-600'
                                      : buff.type === 'yudan'
                                      ? 'bg-blue-900/50 border-blue-600'
                                      : 'bg-red-900/50 border-red-600'
                                  }`}
                                >
                                  {/* スクラム・フロー・ガチャはアイコン非表示 */}
                                  {buff.type !== 'unity' && buff.type !== 'focus' && buff.type !== 'gacha' && (
                                    <SafeImage src={buff.icon} alt={buff.name} className="w-5 h-5 object-contain" />
                                  )}
                                  <span className={`text-[0.75rem] font-black whitespace-nowrap ${
                                    buff.type === 'charge'
                                      ? 'text-yellow-400'
                                      : buff.type === 'stat_up'
                                      ? 'text-green-400'
                                      : buff.type === 'base_damage_boost'
                                      ? 'text-cyan-400'
                                      : buff.type === 'strength'
                                      ? 'text-orange-400'
                                      : buff.type === 'deathmarch'
                                      ? 'text-orange-400'
                                      : buff.type === 'bug'
                                      ? 'text-yellow-400'
                                      : buff.type === 'kyushoku'
                                      ? 'text-purple-400'
                                      : buff.type === 'yudan'
                                      ? 'text-blue-400'
                                      : buff.type === 'unity'
                                      ? 'text-green-400'
                                      : buff.type === 'focus'
                                      ? 'text-indigo-400'
                                      : buff.type === 'gacha'
                                      ? 'text-pink-400'
                                      : buff.type === 'nextCardFree'
                                      ? 'text-red-400'
                                      : 'text-red-400'
                                  }`}>
                                    {/* スクラム・フロー・ガチャは記号のみ、応援は社員、それ以外は通常名 */}
                                    {buff.type === 'unity' ? '+' : buff.type === 'focus' ? '×' : buff.type === 'gacha' ? '^' : buff.type === 'strength' ? '社員' : buff.name}
                                    {buff.stackCount > 1 && buff.type !== 'unity' && buff.type !== 'focus' && buff.type !== 'strength' && buff.type !== 'gacha' && ` x${buff.stackCount}`}
                                    {buff.stat && ` +${buff.value}`}
                                    {buff.type === 'base_damage_boost' && ` x${buff.value}`}
                                    {buff.type === 'strength' && ` +${buff.stackCount * 20}`}
                                    {buff.type === 'unity' && `${buff.stackCount * 50}%`}
                                    {buff.type === 'focus' && `${Math.pow(1.4, buff.stackCount).toFixed(2)}`}
                                    {buff.type === 'gacha' && `${Math.pow(1.5, buff.stackCount).toFixed(2)}乗`}
                                    {buff.type === 'deathmarch' && ` (+${buff.stackCount * 10}締切)`}
                                    {buff.type === 'bug' && ` (炎上時-${buff.stackCount * 10}%)`}
                                    {buff.type === 'kyushoku' && ` (-${buff.stackCount * 20}%社員)`}
                                    {buff.type === 'yudan' && ` (+${buff.stackCount * 5}締切)`}
                                  </span>
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-[15rem]">
                        {hand.length > 0 ? (
                            <div
                                ref={handContainerRef}
                                {...handContainerProps}
                                className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 min-h-[14rem] select-none"
                            >
                                <div className="flex justify-center gap-1.5 md:gap-3 animate-in slide-in-from-bottom-4 min-w-fit px-8">
                                {hand.map((item, idx) => (
                                    <div key={`hand-${item.id}-${idx}`} className="flex-shrink-0">
                                        <Card
                                            skill={item}
                                            onClick={() => { if (!shouldPreventClick()) selectSkill(item); }}
                                            disabled={isMonsterAttacking || !!turnResetMessage}
                                            mana={mana}
                                            currentHaste={remainingHaste}
                                            heroStats={heroStats}
                                            damageMultiplier={1.0}
                                            effectsDisabled={isEffectDisabled(item)}
                                            enemyDamageTaken={enemyDamageTaken}
                                            effectiveEmployees={getEffectiveEmployees()}
                                            extraDelay={getYudanStacks() * 5}
                                        />
                                    </div>
                                ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-4 min-h-[14rem]">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest block">手札がなくなりました</span>
                            </div>
                        )}
                    </div>

                    {/* 締切ゲージ（カードの下） */}
                    <div className="flex items-center gap-2 mt-2 px-4">
                      <Tooltip content={"締切ゲージが最大になると締切判定。\nノルマ達成ならクリア、未達成なら敗北。"}>
                        <div className="flex items-center gap-1 cursor-pointer select-none hover:bg-slate-800/50 rounded px-1 transition-colors">
                          <Clock className="w-4 h-4 text-slate-300 pointer-events-none" />
                          <span className="text-[0.5rem] font-black text-slate-300 pointer-events-none">締切</span>
                        </div>
                      </Tooltip>
                      <div className="flex-1 h-5 bg-slate-950 rounded border border-slate-700 relative overflow-hidden">
                        {/* 1区切りグリッド */}
                        <div className="absolute inset-0 flex z-10">
                          {[...Array(maxHaste)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-slate-600 last:border-r-0" />
                          ))}
                        </div>
                        {/* ゲージ本体 */}
                        <div
                          className={`h-full transition-all duration-300 relative ${
                            usedHaste / maxHaste > 0.8
                              ? 'bg-gradient-to-r from-red-500 to-red-300'
                              : 'bg-gradient-to-r from-slate-400 to-white'
                          }`}
                          style={{ width: `${(usedHaste / maxHaste) * 100}%` }}
                        />
                        {/* 数値表示 */}
                        <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20">
                          {usedHaste} / {maxHaste}
                        </span>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <p className="text-center text-[10px] text-slate-500 mt-1">締切に届かないとき用↓</p>
                    <div className="flex justify-center gap-2 mt-0.5">
                      {/* 精神統一ボタン */}
                      <button
                        onClick={handleRest}
                        disabled={remainingHaste < 10 || isMonsterAttacking || turnResetMessage}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                          remainingHaste >= 10 && !isMonsterAttacking && !turnResetMessage
                            ? 'bg-slate-800 hover:bg-slate-700 border-indigo-500/50 active:scale-95'
                            : 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Coffee className="text-indigo-400" size={16} />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">休憩</span>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white text-slate-900">
                          <Zap className="w-3 h-3" />
                          <span className="text-[8px] font-black">10</span>
                        </div>
                      </button>
                      {/* 締切確定ボタン */}
                      <button
                        onClick={() => handleDeadline(gold)}
                        disabled={isMonsterAttacking || turnResetMessage}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                          !isMonsterAttacking && !turnResetMessage
                            ? gold >= currentEnemy.baseHP
                              ? 'bg-green-950 hover:bg-green-900 border-green-500/50 active:scale-95'
                              : 'bg-red-950 hover:bg-red-900 border-red-500/50 active:scale-95'
                            : 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {gold >= currentEnemy.baseHP ? (
                          <>
                            <Trophy className="text-green-400" size={16} />
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">締切確定</span>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-500 text-white">
                              <Trophy className="w-3 h-3" />
                              <span className="text-[8px] font-black">クリア</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <HeartCrack className="text-red-400" size={16} />
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">締切確定</span>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500 text-white">
                              <HeartCrack className="w-3 h-3" />
                              <span className="text-[8px] font-black">-1</span>
                            </div>
                          </>
                        )}
                      </button>
                    </div>
                </div>
            )}
            {gameState === 'BOSS_VICTORY' && (
                <div className="flex flex-col flex-1 gap-2">
                    {/* ステータスパネル（バトル中と同じ） */}
                    <PlayerStatusPanel
                        life={life}
                        maxLife={maxLife}
                        currentHaste={maxHaste}
                        maxHaste={maxHaste}
                        mana={mana}
                        maxMana={maxMana}
                        gold={gold}
                        heroStats={heroStats}
                        workStyle={workStyle}
                        showHasteGauge={true}
                        showManaGauge={true}
                        showGold={true}
                        showDeckButton={false}
                    />
                </div>
            )}
            {gameState === 'CARD_REWARD' && (
                <div className="flex flex-col flex-1 gap-2">
                    {/* ステータスパネル（バトル中と同じ） */}
                    <PlayerStatusPanel
                        life={life}
                        maxLife={maxLife}
                        currentHaste={maxHaste}
                        maxHaste={maxHaste}
                        mana={mana}
                        maxMana={maxMana}
                        gold={gold}
                        heroStats={heroStats}
                        workStyle={workStyle}
                        showHasteGauge={true}
                        showManaGauge={true}
                        showGold={true}
                        showDeckButton={false}
                    />
                </div>
            )}
            {gameState === 'ABILITY_REWARD' && (
                <div className="flex flex-col flex-1 gap-2">
                    {/* ステータスパネル（バトル中と同じ） */}
                    <PlayerStatusPanel
                        life={life}
                        maxLife={maxLife}
                        currentHaste={maxHaste}
                        maxHaste={maxHaste}
                        mana={mana}
                        maxMana={maxMana}
                        gold={gold}
                        heroStats={heroStats}
                        workStyle={workStyle}
                        showHasteGauge={true}
                        showManaGauge={true}
                        showGold={true}
                        showDeckButton={false}
                    />
                </div>
            )}
            {gameState === 'SHOP' && (
                <div className="flex flex-col flex-1 gap-2">
                    {/* ステータスパネル（バトル中と同じ） */}
                    <PlayerStatusPanel
                        life={life}
                        maxLife={maxLife}
                        currentHaste={maxHaste}
                        maxHaste={maxHaste}
                        mana={mana}
                        maxMana={maxMana}
                        gold={gold}
                        heroStats={heroStats}
                        workStyle={workStyle}
                        showHasteGauge={true}
                        showManaGauge={true}
                        showGold={true}
                        showDeckButton={false}
                    />
                </div>
            )}
            {gameState === 'GAME_OVER' && (
                <div className="text-center space-y-3 py-4 flex-1 flex flex-col justify-center animate-in zoom-in">
                    <Ghost size={24} className="text-red-500 mx-auto" />
                    <h2 className="text-2xl font-fantasy font-bold text-red-500 tracking-widest uppercase">You Died</h2>
                    <button onClick={startGame} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold py-2 px-8 rounded-lg border border-red-900/50 transition-all text-[10px] uppercase tracking-[0.1em]">Retry Journey</button>
                </div>
            )}
            </div>
        </main>
      </div>
      {/* RIGHT PANEL - COMBO HISTORY - PCでのみ表示 */}
      <div className="hidden xl:flex w-80 bg-slate-950 border-l border-slate-900 p-6 flex-col shadow-2xl z-40 fixed right-0 top-0 h-screen">
        <div className="flex items-center gap-2 text-slate-400 mb-6 pb-4 border-b border-slate-900"><ScrollText size={20} /><h2 className="font-fantasy text-sm tracking-[0.3em] uppercase">Combo History</h2></div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
            {stack.length === 0 ? <div className="flex flex-col items-center justify-center h-40 opacity-10 italic text-[10px] text-center uppercase tracking-widest space-y-4"><Swords size={40} /><p>スキルを選択して<br/>コンボを開始せよ</p></div> : 
            stack.map((item, idx) => {
                const isSkipped = item.delay === 0;
                return (
                    <div key={idx} className={`flex justify-between items-start text-[11px] group border-b border-slate-900 pb-2 animate-in slide-in-from-right-2 duration-300 ${isSkipped ? 'bg-indigo-900/10 border-indigo-900/30' : ''}`}>
                        <div className="flex gap-3">
                            {item.id === 'rest' ? <Coffee className="text-indigo-400" size={16} /> : <SafeImage src={item.icon} className="w-6 h-6 object-contain" alt={item.name} />}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300 uppercase tracking-widest">{item.name}</span>
                                    {isSkipped && <span className="text-[0.4375rem] bg-yellow-600 text-white px-1 rounded font-black">DELAY 0</span>}
                                </div>
                                {item.effect && <p className="text-[9px] leading-tight mt-1 text-indigo-400 font-bold">{item.effect.description}</p>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default App;
