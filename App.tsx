
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Skill, PassiveEffect, BattleEvent, Enemy, Rarity, HeroStats, PlayerBuff } from './types';
import { loadGameData, GameData, DEFAULT_EVENT, createSkillWithId, BUFFS, BuffDefinition, HeroInitialData } from './utils/dataLoader';
import { Card } from './components/Card';
import { Tooltip } from './components/Tooltip';
import PlayerStatusPanel from './components/PlayerStatusPanel';
import {
  RotateCcw, Swords, Skull, Zap, ArrowRight, ScrollText,
  ShieldAlert, Sparkles, Ghost, Hexagon,
  CheckCircle2, Info, Award, Undo2, Layers, PlusCircle,
  X, Search, Biohazard, Heart, HeartCrack, Coffee, Coins, ShoppingCart, Check,
  ZapOff, Star, BookOpen, Settings, RefreshCw
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
  const [battleEvent, setBattleEvent] = useState<BattleEvent>(DEFAULT_EVENT);
  
  // デフォルト初期値（CSVロード前のフォールバック）
  const defaultHeroStats: HeroStats = { ad: 30, ap: 10, sp: 30, mp: 50 };
  const defaultMana = 50;
  const defaultLife = 2;

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
  const [hasBoughtLife, setHasBoughtLife] = useState<boolean>(false);

  // Status Effects
  const [isEnemyPoisoned, setIsEnemyPoisoned] = useState<boolean>(false);

  // プレイヤーバフ/デバフ
  const [playerBuffs, setPlayerBuffs] = useState<PlayerBuff[]>([]);

  // ヘイスト（行動力）システム
  const [currentHaste, setCurrentHaste] = useState<number>(defaultHeroStats.sp);

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

  const [projectile, setProjectile] = useState<{ icon: string; id: string } | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy>({ name: '', icon: '', baseHP: 0, minFloor: 0, maxFloor: 0, dropsAbility: 'N' });
  const [enemyHealth, setEnemyHealth] = useState<number>(0);
  const [floatingDamages, setFloatingDamages] = useState<{ id: string; value: number; isMana?: boolean; isPoison?: boolean }[]>([]);

  // ヘイスト（行動力）の最大値
  const maxHaste = useMemo(() => {
    return heroStats.sp + passives.reduce((acc, p) => p.type === 'capacity_boost' ? acc + p.value : acc, 0);
  }, [heroStats.sp, passives]);

  // ヘイストが0以下かどうか
  const isHasteEmpty = currentHaste <= 0;

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
    // 最初の3枚を新しい手札として取る
    const newHand = newDeck.slice(0, 3);
    // デッキから手札分を除く
    setDeck(newDeck.slice(3));
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
    setCurrentHaste(maxHaste);
    setMana(maxMana);
  };

  // バフを付与する関数
  const addBuff = (buffId: string, customValue?: number) => {
    const buffDef = BUFFS[buffId];
    if (!buffDef) {
      console.warn(`Buff definition not found: ${buffId}`);
      return;
    }

    const valueToAdd = customValue ?? buffDef.defaultValue;

    // base_damage_boostの場合、既存のバフがあればスタックを加算
    if (buffDef.type === 'base_damage_boost') {
      setPlayerBuffs(prev => {
        const existingBuff = prev.find(b => b.type === 'base_damage_boost');
        if (existingBuff) {
          return prev.map(b =>
            b.type === 'base_damage_boost' ? { ...b, value: b.value + valueToAdd } : b
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

  // CSVからゲームデータをロード
  useEffect(() => {
    loadGameData().then(data => {
      setGameData(data);
      setIsLoading(false);
    });
  }, []);

  const isTargetMet = enemyHealth <= 0;

  const getCardPrice = (rarity: Rarity) => {
    if (rarity === 'SSR') return 100;
    if (rarity === 'R') return 50;
    return 20;
  };

  const getPassivePrice = (rarity: Rarity) => {
    if (rarity === 'SSR') return 100;
    if (rarity === 'R') return 60;
    return 40;
  };

  const LIFE_RECOVERY_PRICE = 30;

  // レアリティに基づく重み付け抽選
  const weightedRandomSelect = <T extends { rarity: Rarity }>(items: T[], count: number): T[] => {
    const getWeight = (rarity: Rarity) => {
      if (rarity === 'SSR') return 1;  // 低確率
      if (rarity === 'R') return 3;    // 中確率
      return 6;                         // C: 高確率
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

  // 手札を引く（毎回シャッフルしてから引く）
  const drawHand = useCallback((currentDeck: Skill[], remainingHaste: number, currentStack?: Skill[]) => {
    if (remainingHaste <= 0) {
      setHand([]);
      return;
    }

    if (currentDeck.length === 0) {
      // currentStackが渡された場合はそれを使う（状態更新前の最新値）
      const stackForIds = currentStack ?? stack;
      const usedIds = [...stackForIds.map(s => s.id), ...hand.map(h => h.id)];
      const recycledDeck = shuffle(permanentDeck.filter(p => !usedIds.includes(p.id)));
      if (recycledDeck.length === 0) {
         setHand([]);
         return;
      }
      setDeck(recycledDeck);
      setHand(recycledDeck.slice(0, 3));
      return;
    }

    // カード使用後は毎回デッキをシャッフルして手札を引く
    const shuffledDeck = shuffle([...currentDeck]);
    setDeck(shuffledDeck.slice(3)); // 手札分を除いた残りをデッキに
    setHand(shuffledDeck.slice(0, 3));
  }, [permanentDeck, stack, hand]);

  const getEnemyForLevel = (lvl: number) => {
      if (!gameData) return { name: '', icon: '', baseHP: 0, minFloor: 0, maxFloor: 0 };
      const candidates = gameData.enemies.filter(e => lvl >= e.minFloor && lvl <= e.maxFloor);
      const pool = candidates.length > 0 ? candidates : [gameData.enemies[gameData.enemies.length - 1]];
      return pool[Math.floor(Math.random() * pool.length)];
  };

  const startGame = () => {
    if (!gameData) return;

    // 初期デッキ作成: スラッシュ×3, ハイスラッシュ×1, ためる×1
    const slashSkill = gameData.initialSkills.find(s => s.name === 'スラッシュ');
    const highSlashSkill = gameData.initialSkills.find(s => s.name === 'ハイスラッシュ');
    const chargeSkill = gameData.initialSkills.find(s => s.name === 'ためる');

    const startDeck: Skill[] = [];
    if (slashSkill) {
      for (let i = 0; i < 3; i++) startDeck.push(createSkillWithId(slashSkill));
    }
    if (highSlashSkill) startDeck.push(createSkillWithId(highSlashSkill));
    if (chargeSkill) startDeck.push(createSkillWithId(chargeSkill));

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
    setCurrentHaste(heroData?.stats.sp ?? defaultHeroStats.sp);
    setPlayerBuffs([]);

    const initialEnemy = getEnemyForLevel(1);
    setCurrentEnemy(initialEnemy);
    setEnemyHealth(initialEnemy.baseHP);
    setBattleEvent(initialEnemy.trait || DEFAULT_EVENT);

    const initialHand = battleDeck.slice(0, 3);
    setHand(initialHand);
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
        setCurrentHaste(heroStats.sp);
        setPlayerBuffs([]);

        const battleDeck = shuffle(sourceDeck);
        setDeck(battleDeck);
        
        const nextEnemy = getEnemyForLevel(nextLvl);
        setCurrentEnemy(nextEnemy);
        setEnemyHealth(nextEnemy.baseHP);
        setBattleEvent(nextEnemy.trait || DEFAULT_EVENT);
        
        const nextHand = battleDeck.slice(0, 3);
        setHand(nextHand);
        return nextLvl;
    });
  }, [permanentDeck, maxMana]);

  const generateShopInventory = () => {
    if (!gameData) return;
    // Generate 5 random cards with rarity weighting
    const selectedCards = weightedRandomSelect(gameData.skillPool, 5);
    setShopCards(selectedCards.map(s => createSkillWithId(s)));

    // Generate 3 random passives with rarity weighting
    const selectedPassives = weightedRandomSelect(gameData.passivePool || [], 3);
    setShopPassives(selectedPassives);

    setPurchasedIds(new Set());
    setPurchasedPassiveIds(new Set());
    setHasBoughtLife(false);
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
    if (gold < LIFE_RECOVERY_PRICE || life >= maxLife || hasBoughtLife) return;

    setGold(prev => prev - LIFE_RECOVERY_PRICE);
    setLife(prev => Math.min(maxLife, prev + 1));
    setHasBoughtLife(true);
  };

  const generateShopOptions = (commonOnly: boolean = false) => {
    let pool = [...(gameData?.passivePool || [])];
    if (commonOnly) {
      pool = pool.filter(p => p.rarity === 'C');
    }
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
    // 3, 7, 11... 階層撃破後にショップへ。それ以外は即次へ。
    if (level % 4 === 3) {
      enterShop();
    } else {
      nextLevel(updatedDeck);
    }
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

  // スキルの基本ダメージを計算（基礎ダメージも倍率適用）
  const getSkillBaseDamage = (s: Skill, applyBaseDouble: boolean = true) => {
    let baseDmg = s.baseDamage || 0;

    // BASE_DOUBLEバフがあればベースダメージを2倍
    if (applyBaseDouble && getBaseDoubleStacks() > 0 && baseDmg > 0) {
      baseDmg = baseDmg * 2;
    }

    // マイナス係数は「係数なし」として扱う（ベースダメージのみ攻撃）
    const hasPhysical = s.adRatio > 0;
    const hasMagic = s.apRatio > 0;

    // 基礎ダメージの倍率適用
    let scaledBaseDmg = 0;
    if (hasPhysical && hasMagic) {
      // ミックス: 半分ずつ割り振って計算
      const halfBase = baseDmg / 2;
      scaledBaseDmg = Math.floor(halfBase * battleEvent.physicalMultiplier + halfBase * battleEvent.magicMultiplier);
    } else if (hasPhysical) {
      // 物理のみ: 物理倍率を適用
      scaledBaseDmg = Math.floor(baseDmg * battleEvent.physicalMultiplier);
    } else if (hasMagic) {
      // 魔法のみ: 魔法倍率を適用
      scaledBaseDmg = Math.floor(baseDmg * battleEvent.magicMultiplier);
    } else {
      // 係数なし（マイナス係数含む）: 倍率の影響を受けない（真のダメージ）
      scaledBaseDmg = baseDmg;
    }

    // マイナス係数の場合はベースダメージから差し引く
    const physicalDmg = Math.floor(heroStats.ad * s.adRatio / 100 * battleEvent.physicalMultiplier);
    const magicDmg = Math.floor(heroStats.ap * s.apRatio / 100 * battleEvent.magicMultiplier);
    // ダメージは0未満にならない
    return Math.max(0, scaledBaseDmg + physicalDmg + magicDmg);
  };

  // chargeバフがあるかチェック（ダメージ表示用）
  const getChargeMultiplier = (): number => {
    const chargeBuff = playerBuffs.find(b => b.type === 'charge');
    return chargeBuff ? chargeBuff.value : 1;
  };

  // 前のカードが物理ダメージだったかチェック
  const wasLastCardPhysical = (): boolean => {
    if (stack.length === 0) return false;
    const lastCard = stack[stack.length - 1];
    return lastCard.adRatio > 0;  // 物理係数があれば物理ダメージとみなす
  };

  // 能力ダメージ計算用の値
  const deckSlashCount = deck.filter(d => d.name.includes('スラッシュ')).length;
  const enemyDamageTaken = currentEnemy.baseHP - enemyHealth;

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

  const handleEnemyAttack = (currentStack: Skill[], currentDeck: Skill[]) => {
    // 即座にフラグを設定して連打を防止
    setIsMonsterAttacking(true);
    setTimeout(() => {
      setTimeout(() => {
        setIsMonsterAttacking(false);
        setIsPlayerTakingDamage(true);
        const newLife = life - 1;
        setLife(newLife);
        setTimeout(() => {
          setIsPlayerTakingDamage(false);
          if (newLife <= 0) {
            setGameState('GAME_OVER');
          } else {
            setTurnResetMessage(true);
            const cardsToRecycle = [...currentStack];
            const newDeck = shuffle([...currentDeck, ...cardsToRecycle]);
            setDeck(newDeck);
            setStack([]);
            setCurrentComboPower(0);
            setCurrentHaste(heroStats.sp); // ヘイストをリセット
            setTimeout(() => {
              setTurnResetMessage(false);
              const nextHand = newDeck.slice(0, 3);
              setHand(nextHand);
            }, 1000);
          }
        }, 500);
      }, 400); 
    }, 800); 
  };

  const isStuckDueToMana = hand.length > 0 && hand.every(s => s.manaCost > mana);

  const handleRest = () => {
    if (currentHaste <= 0 || turnResetMessage || isMonsterAttacking) return;

    const mId = generateId();
    // マナ回復を最大値（maxMana）までに制限
    setMana(prev => Math.min(maxMana, prev + 30));
    setFloatingDamages(prev => [...prev, { id: mId, value: 30, isMana: true }]);
    setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mId)), 1000);

    // UIボタンからの精神統一はヘイストを10消費
    const restDelay = 10;
    const dummySkill: Skill = { id: 'rest', name: '精神統一', icon: '', cardType: 'support', baseDamage: 0, adRatio: 0, apRatio: 0, manaCost: 0, delay: restDelay, rarity: 'C', color: '', borderColor: '', borderRadiusClass: '', heightClass: '', widthClass: '' };
    const newStack = [...stack, dummySkill];
    setStack(newStack);

    const newHaste = Math.round(currentHaste - restDelay);
    setCurrentHaste(newHaste);

    if (newHaste <= 0) {
        handleEnemyAttack(newStack.filter(s => s.id !== 'rest'), deck);
    }
  };

  const selectSkill = (skill: Skill) => {
    if (currentHaste <= 0 || mana < skill.manaCost || isTargetMet || isMonsterAttacking || turnResetMessage) return;

    setProjectile({ icon: skill.icon, id: generateId() });

    // 山札からカードを抜く
    let newDeck = deck.filter(d => d.id !== skill.id);

    // ファイナルスラッシュ発動時の特殊処理：山札から全ての「スラッシュ」を消す → 使用済みに送る
    let removedSlashes: Skill[] = [];
    if (skill.name === 'ファイナルスラッシュ') {
        removedSlashes = newDeck.filter(d => d.name.includes('スラッシュ'));
        newDeck = newDeck.filter(d => !d.name.includes('スラッシュ'));
    }

    setDeck(newDeck);

    // ディレイ計算（物理ヘイスト半減パッシブ対応 + physical_chain_haste効果）
    const hasPhysicalHasteReduction = passives.some(p => p.type === 'physical_haste_reduction');
    const isPhysicalOnly = skill.adRatio > 0 && skill.apRatio === 0;
    let baseDelay = skill.delay;

    // physical_chain_haste効果: 前のカードが物理ならヘイスト減少
    if (skill.effect?.type === 'physical_chain_haste' && wasLastCardPhysical()) {
      const hasteBonus = skill.effect.params.value || 10;
      baseDelay = Math.max(0, baseDelay - hasteBonus);
    }

    const actualDelay = Math.round(hasPhysicalHasteReduction && isPhysicalOnly ? baseDelay / 2 : baseDelay);

    setTimeout(() => {
        setIsMonsterShaking(true);
        setTimeout(() => setIsMonsterShaking(false), 300);
        setProjectile(null);

        // マナ消費/回復（上限をmaxManaに制限）
        setMana(prev => Math.min(maxMana, prev - skill.manaCost));

        // ヘイスト消費
        const newHaste = Math.round(currentHaste - actualDelay);
        setCurrentHaste(newHaste);

        let newStack = [...stack, skill, ...removedSlashes];

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

        const newTotalPower = calculateComboPower(newStack);
        let damageDealt = (newTotalPower - currentComboPower) * repeatCount;
        const poisonDmg = isEnemyPoisoned ? 30 : 0;
        let finalDamage = damageDealt + poisonDmg;

        // ARMORトレイト: 閾値以下のダメージを無効化
        if (battleEvent.armorThreshold && finalDamage > 0 && finalDamage <= battleEvent.armorThreshold) {
            finalDamage = 0;
        }

        setEnemyHealth(prev => Math.max(0, prev - finalDamage));
        setCurrentComboPower(newTotalPower);
        setStack(newStack);

        const damageId = generateId();
        setFloatingDamages(prev => [...prev, { id: damageId, value: finalDamage }]);
        if (poisonDmg > 0) {
          const pId = generateId();
          setFloatingDamages(prev => [...prev, { id: pId, value: poisonDmg, isPoison: true }]);
          setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== pId)), 1000);
        }
        setTimeout(() => setFloatingDamages(prev => prev.filter(d => d.id !== damageId)), 1000);

        if (skill.effect && !isEffectDisabled(skill)) {
           if (skill.effect.type === 'lifesteal') {
              setMana(prev => Math.min(maxMana, prev + finalDamage));
              const mhId = generateId();
              setFloatingDamages(prev => [...prev, { id: mhId, value: finalDamage, isMana: true }]);
              setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
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
           if (skill.effect.type === 'permanent_power_up') {
             // ベースダメージを増加
             const damageBonus = skill.effect.params.value || 0;
             const updateSkillBaseDamage = (s: Skill) => {
               if (s.id !== skill.id) return s;
               return { ...s, baseDamage: s.baseDamage + damageBonus };
             };
             // permanentDeck、deck、newStackすべてを更新
             setPermanentDeck(prev => prev.map(updateSkillBaseDamage));
             setDeck(prev => prev.map(updateSkillBaseDamage));
             // newStackも更新（現在の戦闘で反映させるため）
             newStack = newStack.map(updateSkillBaseDamage);
           }
        }

        // MANA_DRAINトレイト: カード使用後にマナを減少
        if (battleEvent.manaDrainAmount) {
            setMana(prev => Math.max(0, prev - battleEvent.manaDrainAmount!));
        }

        if (enemyHealth - finalDamage <= 0) {
            setGold(prev => prev + 40);
            setTimeout(() => {
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
            }, 600);
            return;
        }

        // ヘイストが0以下になったら敵の攻撃
        if (newHaste <= 0) {
             handleEnemyAttack(newStack, newDeck);
        } else {
            drawHand(newDeck, newHaste, newStack);
        }
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
      `}</style>

      {isPlayerTakingDamage && <div className="fixed inset-0 z-[100] bg-red-600 pointer-events-none damage-flash mix-blend-multiply"></div>}

      {/* DECK OVERLAY */}
      {isDeckOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur p-4 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Layers className="text-indigo-400" size={24} />
                <h2 className="font-fantasy text-2xl tracking-[0.2em] uppercase text-slate-100">Current Deck</h2>
                <span className="text-slate-500 text-sm font-bold bg-slate-900 px-3 py-1 rounded-full">{permanentDeck.length} CARDS</span>
              </div>
              <button onClick={() => setIsDeckOverlayOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              <div className="deck-grid">
                {permanentDeck.map((skill, idx) => {
                  const isAvailable = deck.some(d => d.id === skill.id) || hand.some(h => h.id === skill.id);
                  return (
                    <div key={`${skill.id}-${idx}`} className={`relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px] ${!isAvailable ? 'opacity-40 grayscale' : ''}`}>
                      <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                        <Card skill={skill} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                      </div>
                      {!isAvailable && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-900/90 rounded text-[8px] font-black text-white uppercase tracking-wider shadow-lg">
                          Used
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setIsDeckOverlayOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm">Close Viewer</button>
          </div>
        </div>
      )}

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
              {/* ライフ回復 */}
              <div className="mb-4 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Recovery</h3>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${
                    hasBoughtLife ? 'opacity-50 border-slate-700' : 'border-red-500/50 bg-red-950/30'
                  }`}>
                    <Heart className={`w-8 h-8 text-red-500 shrink-0 ${hasBoughtLife ? 'grayscale' : 'animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide">Life +1</h4>
                      <p className="text-xs text-slate-400">ライフを1回復</p>
                    </div>
                  </div>
                  {hasBoughtLife ? (
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
              onClick={() => { handleBattleWinFinish(permanentDeck); setIsCardRewardOverlayOpen(false); }}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-slate-400 hover:text-white transition-all"
            >
              スキップして進む
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
              onClick={() => { setIsAbilityRewardOverlayOpen(false); handleBattleWinFinish(permanentDeck); }}
              className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-slate-400 hover:text-white transition-all"
            >
              スキップして進む
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
        const allCards = [...gameData.initialSkills, ...gameData.skillPool];
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
                {/* 初期カード */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <Swords size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">初期カード</h3>
                    <span className="text-[10px] text-slate-600 font-bold">{gameData.initialSkills.length}枚</span>
                  </div>
                  <div className="deck-grid">
                    {gameData.initialSkills.map((skill, idx) => (
                      <div key={`initial-${skill.name}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px]">
                        <div className="transform scale-[0.65] md:scale-[0.8] lg:scale-[0.95] origin-top">
                          <Card skill={skill} onClick={() => {}} disabled={false} mana={999} currentHaste={999} heroStats={heroStats} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 報酬カード */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-700/50">
                    <Sparkles size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">報酬カード</h3>
                    <span className="text-[10px] text-indigo-600 font-bold">{gameData.skillPool.length}枚</span>
                  </div>
                  <div className="deck-grid">
                    {gameData.skillPool.map((skill, idx) => (
                      <div key={`pool-${skill.name}-${idx}`} className="relative transition-all duration-300 h-[145px] md:h-[180px] lg:h-[210px]">
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
                    <Heart size={16} /> ヘイスト・マナ全回復
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
                  {gameData && [...gameData.initialSkills, ...gameData.skillPool].map((skill, idx) => (
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
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex items-center gap-1">
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{deck.length}</span>
                          </button>
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                        </div>

                        {/* 使用済みカードビューワーボタン（右下） */}
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 z-40">
                          <button onClick={() => setIsDiscardOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-red-500/40 rounded-lg text-[9px] font-black text-red-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <ScrollText size={12} />
                            <span>USED</span>
                            <span className="px-1.5 py-0.5 bg-red-600 rounded text-white text-[8px]">{stack.length}</span>
                          </button>
                        </div>

                        <div className={`w-32 h-32 md:w-52 md:h-52 select-none pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center ${isMonsterShaking ? 'monster-shake brightness-150 scale-110' : ''} ${isMonsterAttacking ? 'monster-attack z-50' : 'monster-idle'}`}>
                            <SafeImage src={currentEnemy.icon} alt={currentEnemy.name} className="w-full h-full object-contain" />
                        </div>

                        {/* HPゲージ（敵アイコンの下） */}
                        <div className="w-40 md:w-64 h-4 md:h-5 bg-slate-950 rounded border border-slate-800 shadow-2xl overflow-hidden relative mt-1">
                            <div className={`h-full transition-all duration-500 ${enemyHealth / currentEnemy.baseHP > 0.5 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`} style={{ width: `${(enemyHealth / currentEnemy.baseHP) * 100}%` }}></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[0.75rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] uppercase tracking-widest">HP {Math.ceil(enemyHealth)} / {currentEnemy.baseHP}</span>
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
                    </div>
                )}

                {gameState === 'CARD_REWARD' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex items-center gap-1">
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                        </div>

                        {/* 勝利アイコン */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 bg-gradient-to-b from-green-900/50 to-emerald-950/50 rounded-full flex items-center justify-center border-4 border-green-600/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                                <Award className="text-green-400" size={64} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Victory!</span>
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
                                <ArrowRight size={18} /> スキップして進む
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'ABILITY_REWARD' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex items-center gap-1">
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                        </div>

                        {/* 勝利アイコン（ザコ用） */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 bg-gradient-to-b from-green-900/50 to-emerald-950/50 rounded-full flex items-center justify-center border-4 border-green-600/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                                <Award className="text-green-400" size={64} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Victory!</span>
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
                                <ArrowRight size={18} /> スキップして進む
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'BOSS_VICTORY' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex items-center gap-1">
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                        </div>

                        {/* エリート勝利アイコン */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 bg-gradient-to-b from-indigo-900/50 to-purple-950/50 rounded-full flex items-center justify-center border-4 border-indigo-600/50 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                                <Star className="text-indigo-400" size={64} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Elite Down!</span>
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
                        </div>
                    </div>
                )}

                {gameState === 'SHOP' && (
                    <div className="relative flex flex-col items-center justify-center w-full h-full animate-in zoom-in duration-500">
                        {/* デッキビュワーボタン・アビリティボタン（左下）- バトル中と同じ */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 flex items-center gap-1">
                          <button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Layers size={12} />
                            <span>DECK</span>
                            <span className="px-1.5 py-0.5 bg-indigo-600 rounded text-white text-[8px]">{permanentDeck.length}</span>
                          </button>
                          <button onClick={() => setIsAbilityListOverlayOpen(true)} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-lg text-[9px] font-black text-purple-300 uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                            <Award size={12} />
                            <span>ABILITY</span>
                            <span className="px-1.5 py-0.5 bg-purple-600 rounded text-white text-[8px]">{passives.length}</span>
                          </button>
                        </div>

                        {/* 商人アイコン */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 bg-gradient-to-b from-yellow-900/50 to-amber-950/50 rounded-full flex items-center justify-center border-4 border-yellow-600/50 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
                                <ShoppingCart className="text-yellow-400" size={64} />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-600 px-4 py-1 rounded-full">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Merchant</span>
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
                    {/* HASTEとMANAゲージ */}
                    <div className="flex flex-col gap-2 w-full">
                      {/* HASTEゲージ + ライフ表示 */}
                      <div className="flex flex-col gap-0">
                        {/* ライフ表示 */}
                        <div className="flex justify-end items-center mb-0.5">
                          <div className="flex items-center gap-1">
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
                        </div>

                        {/* ゲージ行 */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-14">
                            <Zap className="w-4 h-4 text-slate-300" />
                            <span className="text-[0.5rem] font-black text-slate-300">HASTE</span>
                          </div>
                          <div className="flex-1 h-6 bg-slate-950 rounded-l border border-slate-700 relative overflow-hidden">
                            {/* 10区切りグリッド */}
                            <div className="absolute inset-0 flex z-10">
                              {[...Array(Math.ceil(maxHaste / 10))].map((_, i) => (
                                <div key={i} className="flex-1 border-r border-slate-600 last:border-r-0" />
                              ))}
                            </div>
                            {/* ゲージ本体（消費量を表示：0から始まりMAXに向かって増加） */}
                            <div
                              className={`h-full transition-all duration-300 relative ${
                                (maxHaste - currentHaste) / maxHaste > 0.8
                                  ? 'bg-gradient-to-r from-red-500 to-red-300'
                                  : 'bg-gradient-to-r from-slate-400 to-white'
                              }`}
                              style={{ width: `${((maxHaste - currentHaste) / maxHaste) * 100}%` }}
                            />
                            {/* 数値表示（消費量 / 最大値） */}
                            <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20">
                              {maxHaste - currentHaste} / {maxHaste}
                            </span>
                          </div>
                          {/* ゲージ右端 → ライフへの矢印 */}
                          <div className={`flex items-center justify-center h-6 px-1.5 rounded-r border border-l-0 border-red-800 ${
                            (maxHaste - currentHaste) / maxHaste > 0.8
                              ? 'bg-red-600 animate-pulse'
                              : 'bg-red-950'
                          }`}>
                            <HeartCrack className="w-4 h-4 text-red-300" />
                            <span className="text-[0.5rem] font-black text-red-300">-1</span>
                          </div>
                        </div>
                      </div>

                      {/* MANAゲージ */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 w-14">
                          <Hexagon className="w-4 h-4 text-blue-400" />
                          <span className="text-[0.5rem] font-black text-blue-400">MANA</span>
                        </div>
                        <div className="flex-1 h-6 bg-slate-950 rounded border border-slate-700 relative overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                            style={{ width: `${(mana / maxMana) * 100}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {mana} / {maxMana}
                          </span>
                        </div>
                        {/* 空のスペーサー（HASTEと揃えるため） */}
                        <div className="flex items-center justify-center h-6 px-1.5 opacity-0">
                          <HeartCrack className="w-4 h-4" />
                          <span className="text-[0.5rem] font-black">-1</span>
                        </div>
                      </div>

                      {/* 基礎パラメータとBUFFS */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {/* 基礎パラメータ AD/AP */}
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
                        {/* BUFFS */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[0.5rem] font-black text-slate-500 uppercase shrink-0">BUFFS:</span>
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {playerBuffs.map(buff => (
                              <Tooltip key={buff.id} content={buff.description}>
                                <div
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all animate-in fade-in zoom-in duration-300 shrink-0 cursor-pointer ${
                                    buff.type === 'charge'
                                      ? 'bg-yellow-900/50 border-yellow-600'
                                      : buff.type === 'stat_up'
                                      ? 'bg-green-900/50 border-green-600'
                                      : buff.type === 'base_damage_boost'
                                      ? 'bg-cyan-900/50 border-cyan-600'
                                      : 'bg-red-900/50 border-red-600'
                                  }`}
                                >
                                  <SafeImage src={buff.icon} alt={buff.name} className="w-4 h-4 object-contain" />
                                  <span className={`text-[0.5rem] font-black whitespace-nowrap ${
                                    buff.type === 'charge'
                                      ? 'text-yellow-400'
                                      : buff.type === 'stat_up'
                                      ? 'text-green-400'
                                      : buff.type === 'base_damage_boost'
                                      ? 'text-cyan-400'
                                      : 'text-red-400'
                                  }`}>
                                    {buff.name}
                                    {buff.stat && ` +${buff.value}`}
                                    {buff.type === 'base_damage_boost' && ` x${buff.value}`}
                                  </span>
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-0">
                        {hand.length > 0 ? (
                            <div className="flex gap-1.5 md:gap-3 animate-in slide-in-from-bottom-4 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                                {hand.map((item, idx) => <div key={`hand-${item.id}-${idx}`} className="flex-shrink-0"><Card skill={item} onClick={() => selectSkill(item)} disabled={isTargetMet || isMonsterAttacking || turnResetMessage} mana={mana} currentHaste={currentHaste} heroStats={heroStats} physicalMultiplier={battleEvent.physicalMultiplier} magicMultiplier={battleEvent.magicMultiplier} effectsDisabled={isEffectDisabled(item)} lastCardWasPhysical={wasLastCardPhysical()} deckSlashCount={deckSlashCount} enemyDamageTaken={enemyDamageTaken} /></div>)}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-4">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest block">手札がなくなりました</span>
                            </div>
                        )}
                    </div>
                    {/* アクションボタン */}
                    <p className="text-center text-[10px] text-white mt-0.5">マナやヘイストが足りなくなったとき用↓</p>
                    <div className="flex justify-center gap-2 mt-0.5">
                      {/* 精神統一ボタン */}
                      <button
                        onClick={handleRest}
                        disabled={currentHaste < 10 || isTargetMet || isMonsterAttacking || turnResetMessage}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                          currentHaste >= 10 && !isTargetMet && !isMonsterAttacking && !turnResetMessage
                            ? 'bg-slate-800 hover:bg-slate-700 border-indigo-500/50 active:scale-95'
                            : 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Coffee className="text-indigo-400" size={16} />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">精神統一</span>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white text-slate-900">
                          <Zap className="w-3 h-3" />
                          <span className="text-[8px] font-black">10</span>
                        </div>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500 text-white">
                          <Hexagon className="w-3 h-3" />
                          <span className="text-[8px] font-black">+30</span>
                        </div>
                      </button>
                      {/* ターン終了ボタン */}
                      <button
                        onClick={() => handleEnemyAttack(stack, deck)}
                        disabled={isTargetMet || isMonsterAttacking || turnResetMessage}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                          !isTargetMet && !isMonsterAttacking && !turnResetMessage
                            ? 'bg-red-950 hover:bg-red-900 border-red-500/50 active:scale-95'
                            : 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <HeartCrack className="text-red-400" size={16} />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">ターン終了</span>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500 text-white">
                          <HeartCrack className="w-3 h-3" />
                          <span className="text-[8px] font-black">-1</span>
                        </div>
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
