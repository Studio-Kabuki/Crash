
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Skill, PassiveEffect, BattleEvent, Enemy, Rarity, HeroStats } from './types';
import { INITIAL_SKILLS, PASSIVE_POOL, DEFAULT_EVENT, MAX_COMBO, INITIAL_MANA, INITIAL_LIFE, FLOOR_ENEMIES, SKILL_POOL, INITIAL_HERO_STATS } from './constants';
import { Card } from './components/Card';
import { 
  RotateCcw, Swords, Skull, Zap, ArrowRight, ScrollText, 
  ShieldAlert, Sparkles, Ghost, Hexagon, 
  CheckCircle2, Info, Award, Undo2, Layers, PlusCircle,
  X, Search, Biohazard, Heart, Coffee, Coins, ShoppingCart, Check,
  ZapOff, Star
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
  const [gameState, setGameState] = useState<GameState>('START');
  const [level, setLevel] = useState<number>(1);
  const [stack, setStack] = useState<Skill[]>([]);
  const [hand, setHand] = useState<Skill[]>([]);
  
  const [permanentDeck, setPermanentDeck] = useState<Skill[]>([]);
  const [deck, setDeck] = useState<Skill[]>([]); 
  
  const [cardRewards, setCardRewards] = useState<Skill[]>([]);
  
  const [currentComboPower, setCurrentComboPower] = useState<number>(0);
  const [battleEvent, setBattleEvent] = useState<BattleEvent>(DEFAULT_EVENT);
  
  const [mana, setMana] = useState<number>(INITIAL_MANA); 
  const [life, setLife] = useState<number>(INITIAL_LIFE);
  const [gold, setGold] = useState<number>(0);

  const [passives, setPassives] = useState<PassiveEffect[]>([]);
  const [shopOptions, setShopOptions] = useState<PassiveEffect[]>([]);

  // 主人公パラメータ
  const [heroStats, setHeroStats] = useState<HeroStats>(INITIAL_HERO_STATS);

  // Shop specific states
  const [shopCards, setShopCards] = useState<Skill[]>([]);
  const [shopPassive, setShopPassive] = useState<PassiveEffect | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasBoughtLife, setHasBoughtLife] = useState<boolean>(false);
  const [hasBoughtPassive, setHasBoughtPassive] = useState<boolean>(false);

  // Status Effects & Passive Trackers
  const [isEnemyPoisoned, setIsEnemyPoisoned] = useState<boolean>(false);
  const [physicalAttackCounter, setPhysicalAttackCounter] = useState<number>(0);
  const [bonusSlotsThisTurn, setBonusSlotsThisTurn] = useState<number>(0);

  // Deck Overlay State
  const [isDeckOverlayOpen, setIsDeckOverlayOpen] = useState<boolean>(false);

  // Monster & Animation States
  const [isMonsterShaking, setIsMonsterShaking] = useState<boolean>(false);
  const [isMonsterAttacking, setIsMonsterAttacking] = useState<boolean>(false);
  const [isPlayerTakingDamage, setIsPlayerTakingDamage] = useState<boolean>(false);
  const [turnResetMessage, setTurnResetMessage] = useState<boolean>(false);

  const [projectile, setProjectile] = useState<{ icon: string; id: string } | null>(null);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy>(FLOOR_ENEMIES[0]);
  const [enemyHealth, setEnemyHealth] = useState<number>(0);
  const [floatingDamages, setFloatingDamages] = useState<{ id: string; value: number; isMana?: boolean; isPoison?: boolean }[]>([]);

  const capacityBoost = passives.reduce((acc, p) => p.type === 'capacity_boost' ? acc + p.value : acc, 0);
  const currentMaxCombo = MAX_COMBO + capacityBoost + bonusSlotsThisTurn;
  
  // 有効なコンボ消費数（スキップ効果持ち、またはウルスラッシュの特殊条件を満たす場合を除外）
  const consumedSlotsCount = useMemo(() => {
    let count = 0;
    stack.forEach((s, idx) => {
      let isSkipped = false;
      if (s.effect?.type === 'combo_skip') isSkipped = true;
      if (s.effect?.type === 'adjacency_physical_skip') {
        const prev = idx > 0 ? stack[idx - 1] : null;
        if (prev && prev.category === 'physical') isSkipped = true;
      }
      if (!isSkipped) count++;
    });
    return count;
  }, [stack]);

  const maxMana = useMemo(() => {
    return INITIAL_MANA + passives.reduce((acc, p) => p.type === 'score_flat' ? acc + p.value : acc, 0);
  }, [passives]);

  const maxLife = useMemo(() => {
    return INITIAL_LIFE + passives.reduce((acc, p) => p.type === 'max_life_boost' ? acc + p.value : acc, 0);
  }, [passives]);

  const totalFlatDamageBonus = useMemo(() => {
    return passives.reduce((acc, p) => p.type === 'flat_damage_bonus' ? acc + p.value : acc, 0);
  }, [passives]);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  
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

  // デッキをシャッフルするユーティリティ
  const shuffle = (array: Skill[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // 手札を引く
  const drawHand = useCallback((currentDeck: Skill[], currentConsumedSlots: number) => {
    if (currentConsumedSlots >= currentMaxCombo) {
      setHand([]);
      return;
    }
    
    if (currentDeck.length === 0) {
      const usedIds = [...stack.map(s => s.id), ...hand.map(h => h.id)];
      const recycledDeck = shuffle(permanentDeck.filter(p => !usedIds.includes(p.id)));
      if (recycledDeck.length === 0) {
         setHand([]); 
         return;
      }
      setDeck(recycledDeck);
      setHand(recycledDeck.slice(0, 3));
      return;
    }

    const newHand = currentDeck.slice(0, 3);
    setHand(newHand);
  }, [currentMaxCombo, permanentDeck, stack, hand]);

  const getEnemyForLevel = (lvl: number) => {
      const candidates = FLOOR_ENEMIES.filter(e => lvl >= e.minFloor && lvl <= e.maxFloor);
      const pool = candidates.length > 0 ? candidates : [FLOOR_ENEMIES[FLOOR_ENEMIES.length - 1]];
      return pool[Math.floor(Math.random() * pool.length)];
  };

  const startGame = () => {
    const startDeck: Skill[] = [];
    for(let i=0; i<3; i++) startDeck.push({...INITIAL_SKILLS[0], id: generateId()});
    startDeck.push({...INITIAL_SKILLS[1], id: generateId()});
    startDeck.push({...INITIAL_SKILLS[2], id: generateId()});
    
    setPermanentDeck(startDeck);
    const battleDeck = shuffle(startDeck);
    
    setDeck(battleDeck);
    setStack([]);
    setCurrentComboPower(0);
    setPassives([]);
    setMana(INITIAL_MANA);
    setLife(INITIAL_LIFE);
    setGold(0);
    setLevel(1);
    setHeroStats(INITIAL_HERO_STATS);
    setGameState('PLAYING');
    setIsDeckOverlayOpen(false);
    setIsEnemyPoisoned(false);
    setPhysicalAttackCounter(0);
    setBonusSlotsThisTurn(0);
    
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
        setPhysicalAttackCounter(0);
        setBonusSlotsThisTurn(0);
        
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
    // Generate 5 random cards
    const shuffledCards = [...SKILL_POOL].sort(() => 0.5 - Math.random());
    setShopCards(shuffledCards.slice(0, 5).map(s => ({ ...s, id: generateId() })));
    
    // Generate 1 random passive
    const shuffledPassives = [...PASSIVE_POOL].sort(() => 0.5 - Math.random());
    setShopPassive(shuffledPassives[0]);

    setPurchasedIds(new Set());
    setHasBoughtLife(false);
    setHasBoughtPassive(false);
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

  const handleBuyPassive = () => {
    if (!shopPassive || hasBoughtPassive) return;
    const price = getPassivePrice(shopPassive.rarity);
    if (gold < price) return;

    setGold(prev => prev - price);
    setPassives(prev => [...prev, shopPassive]);
    
    // Immediate stat effects
    if (shopPassive.type === 'score_flat') {
        setMana(prev => Math.min(prev + shopPassive.value, maxMana + shopPassive.value));
    }
    if (shopPassive.type === 'max_life_boost') {
        setLife(prev => Math.min(prev + shopPassive.value, maxLife + shopPassive.value));
    }
    
    setHasBoughtPassive(true);
  };

  const handleBuyLife = () => {
    if (gold < LIFE_RECOVERY_PRICE || life >= maxLife || hasBoughtLife) return;

    setGold(prev => prev - LIFE_RECOVERY_PRICE);
    setLife(prev => Math.min(maxLife, prev + 1));
    setHasBoughtLife(true);
  };

  const generateShopOptions = () => {
    const shuffled = [...PASSIVE_POOL].sort(() => 0.5 - Math.random());
    setShopOptions(shuffled.slice(0, 3));
  };

  const generateCardRewards = () => {
    const shuffled = [...SKILL_POOL].sort(() => 0.5 - Math.random());
    setCardRewards(shuffled.slice(0, 3).map(s => ({ ...s, id: generateId() })));
  };

  const selectPassive = (passive: PassiveEffect) => {
    setPassives(prev => [...prev, passive]);
    if (passive.type === 'score_flat') {
        setMana(prev => Math.min(prev + passive.value, maxMana + passive.value));
    }
    if (passive.type === 'max_life_boost') {
        setLife(prev => Math.min(prev + passive.value, maxLife + passive.value));
    }
    generateCardRewards();
    setGameState('CARD_REWARD');
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

  const isEffectDisabled = (skill: Skill) => {
    if (!battleEvent.disableEffects) return false;
    if (battleEvent.targetCategory && skill.category === battleEvent.targetCategory) return true;
    if (battleEvent.targetSkill && skill.name === battleEvent.targetSkill) return true;
    return false;
  };

  const getSkillMarketModifier = (skill: Skill) => {
    if (battleEvent.targetCategory && skill.category === battleEvent.targetCategory) return battleEvent.multiplier;
    if (battleEvent.targetSkill && skill.name === battleEvent.targetSkill) return battleEvent.multiplier;
    return 1;
  };

  const calculateComboPower = (skills: Skill[]) => {
    let basePower = 0;
    let nextActionMult = 1.0;
    let isDoubleActive = false;
    let totalMultiplier = 1.0;

    skills.forEach((s, i) => {
        let p = s.power;
        if (!isEffectDisabled(s)) {
          if (s.effect?.type === 'deck_count_bonus') {
            // ここを完全一致から部分一致（includes）に変更
            const slashCount = deck.filter(d => d.name.includes('スラッシュ')).length;
            p += (slashCount * s.effect.value);
          }
          if (s.effect?.type === 'prev_turn_magic_bonus') {
            const prevSkill = i > 0 ? skills[i - 1] : null;
            if (prevSkill && prevSkill.category === 'magic') {
              p *= s.effect.value;
            }
          }
        }
        p *= nextActionMult;
        p *= getSkillMarketModifier(s);
        passives.forEach(pass => {
            if (pass.type === 'category_buff' && pass.targetCategory === s.category) p += pass.value;
        });
        if (isDoubleActive && s.category !== 'buff') p *= 2;
        basePower += p;
        if (s.effect && !isEffectDisabled(s)) {
            if (s.effect.type === 'next_action_mult') nextActionMult = s.effect.value;
            else nextActionMult = 1.0;
            if (s.effect.type === 'next_action_double') isDoubleActive = true;
            else if (s.category !== 'buff') isDoubleActive = false;
        } else if (s.category !== 'buff') {
            nextActionMult = 1.0;
            isDoubleActive = false;
        }
    });

    passives.forEach(p => { if (p.type === 'score_mult') totalMultiplier += p.value; });
    let finalPower = Math.floor(basePower * totalMultiplier);
    if (skills.length > 0) finalPower += totalFlatDamageBonus;
    return finalPower;
  };

  const handleEnemyAttack = (currentStack: Skill[], currentDeck: Skill[]) => {
    setTimeout(() => {
      setIsMonsterAttacking(true);
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
            setBonusSlotsThisTurn(0);
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
    if (consumedSlotsCount >= currentMaxCombo || turnResetMessage || isMonsterAttacking) return;
    
    const mId = generateId();
    // マナ回復を最大値（maxMana）までに制限
    setMana(prev => Math.min(maxMana, prev + 30));
    setFloatingDamages(prev => [...prev, { id: mId, value: 30, isMana: true }]);
    setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mId)), 1000);
    
    // UIボタンからの精神統一は引き続きコンボ枠を1つ消費
    const dummySkill: Skill = { id: 'rest', name: '精神統一', icon: '', power: 0, manaCost: 0, category: 'buff', rarity: 'C', color: '', borderColor: '', borderRadiusClass: '', heightClass: '', widthClass: '' };
    const newStack = [...stack, dummySkill];
    setStack(newStack);
    
    const newConsumedSlots = consumedSlotsCount + 1;
    if (newConsumedSlots >= currentMaxCombo) {
        handleEnemyAttack(newStack.filter(s => s.id !== 'rest'), deck);
    }
  };

  const selectSkill = (skill: Skill) => {
    if (consumedSlotsCount >= currentMaxCombo || mana < skill.manaCost || isTargetMet || isMonsterAttacking || turnResetMessage) return;

    setProjectile({ icon: skill.icon, id: generateId() });
    
    // 山札からカードを抜く
    let newDeck = deck.filter(d => d.id !== skill.id);
    
    // ファイナルスラッシュ発動時の特殊処理：山札から全ての「スラッシュ」を消す
    // ここを完全一致から部分一致（includes）に変更
    if (skill.name === 'ファイナルスラッシュ') {
        newDeck = newDeck.filter(d => !d.name.includes('スラッシュ'));
    }
    
    setDeck(newDeck);

    const hasSkipPassive = passives.some(p => p.type === 'combo_skip_physical');
    let shouldAddBonusSlot = false;
    if (hasSkipPassive && skill.category === 'physical') {
      const nextCount = physicalAttackCounter + 1;
      setPhysicalAttackCounter(nextCount);
      if (nextCount % 3 === 0) shouldAddBonusSlot = true;
    }

    setTimeout(() => {
        setIsMonsterShaking(true);
        setTimeout(() => setIsMonsterShaking(false), 300);
        setProjectile(null);
        
        // マナ消費/回復（上限をmaxManaに制限）
        setMana(prev => Math.min(maxMana, prev - skill.manaCost));
        
        const newStack = [...stack, skill];
        if (shouldAddBonusSlot) setBonusSlotsThisTurn(prev => prev + 1);

        const newTotalPower = calculateComboPower(newStack);
        let damageDealt = newTotalPower - currentComboPower;
        const poisonDmg = isEnemyPoisoned ? 30 : 0;
        const finalDamage = damageDealt + poisonDmg;

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
           let doubleActive = false;
           let checkNextDouble = false;
           stack.forEach(s => {
               if (s.effect?.type === 'next_action_double' && !isEffectDisabled(s)) checkNextDouble = true;
               else if (s.category !== 'buff') checkNextDouble = false;
           });
           doubleActive = checkNextDouble && skill.category !== 'buff';
           const executionCount = doubleActive ? 2 : 1;

           for(let i=0; i<executionCount; i++) {
              if (skill.effect.type === 'lifesteal_mana') {
                 const healAmount = executionCount === 2 ? Math.floor(finalDamage / 2) : finalDamage;
                 setMana(prev => Math.min(maxMana, prev + healAmount));
                 const mhId = generateId();
                 setFloatingDamages(prev => [...prev, { id: mhId, value: healAmount, isMana: true }]);
                 setTimeout(() => setFloatingDamages(p => p.filter(d => d.id !== mhId)), 1000);
              }
              if (skill.effect.type === 'poison') setIsEnemyPoisoned(true);
              if (skill.effect.type === 'permanent_stack') {
                setPermanentDeck(prev => prev.map(p => p.id === skill.id ? { ...p, power: p.power + (skill.effect?.value || 0) } : p));
              }
           }
        }

        if (enemyHealth - finalDamage <= 0) {
            setGold(prev => prev + 40);
            setTimeout(() => {
                if (level % 4 === 0) { setGameState('BOSS_VICTORY'); generateShopOptions(); }
                else { generateCardRewards(); setGameState('CARD_REWARD'); }
            }, 600);
            return;
        }

        const isSkipCard = skill.effect?.type === 'combo_skip' || (skill.effect?.type === 'adjacency_physical_skip' && stack.length > 0 && stack[stack.length - 1].category === 'physical');
        const updatedMaxComboNow = currentMaxCombo + (shouldAddBonusSlot ? 1 : 0);
        const nextConsumedCount = consumedSlotsCount + (isSkipCard ? 0 : 1);

        if (nextConsumedCount >= updatedMaxComboNow) {
             handleEnemyAttack(newStack, newDeck);
        } else {
            drawHand(newDeck, nextConsumedCount);
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
        .deck-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; }
        @keyframes redFlash { 0% { opacity: 0; } 20% { opacity: 0.6; } 100% { opacity: 0; } }
        .damage-flash { animation: redFlash 0.5s ease-out forwards; }
      `}</style>

      {isPlayerTakingDamage && <div className="fixed inset-0 z-[100] bg-red-600 pointer-events-none damage-flash mix-blend-multiply"></div>}

      {/* DECK OVERLAY */}
      {isDeckOverlayOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-300">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
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
                    <div key={`${skill.id}-${idx}`} className={`bg-slate-900 border rounded-lg p-2 flex flex-col items-center group transition-all duration-300 relative ${isAvailable ? 'border-slate-800 hover:border-indigo-500' : 'border-slate-900 opacity-30 grayscale'}`}>
                      <SafeImage src={skill.icon} alt={skill.name} className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold text-slate-300 text-center uppercase tracking-tighter leading-tight line-clamp-1">{skill.name}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[7px] font-black text-indigo-400">ATK:{skill.power}</span>
                        <span className="text-[7px] font-black text-blue-400">-{skill.manaCost}M</span>
                      </div>
                      {!isAvailable && <div className="absolute bottom-1 right-1 px-1 bg-red-900/80 rounded text-[6px] font-black text-white uppercase tracking-tighter">Used</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setIsDeckOverlayOpen(false)} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-sm">Close Viewer</button>
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
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <div className="flex flex-col items-end">
                    <span className="text-[0.4375rem] text-red-400 font-bold uppercase tracking-widest">LIFE</span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(maxLife)].map((_, i) => <Heart key={i} size={14} className={`transition-all duration-300 ${i < life ? 'text-red-500 fill-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-slate-800 fill-slate-900'}`} />)}
                    </div>
                </div>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <div className="flex flex-col items-end">
                    <span className="text-[0.4375rem] text-blue-400 font-bold uppercase tracking-widest">魔力</span>
                    <div className="flex items-center gap-1 font-black text-blue-400 text-[0.625rem]">{mana} <span className="text-[0.5rem] text-slate-600">/ {maxMana}</span></div>
                </div>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                {gameState !== 'START' && <button onClick={() => setGameState('START')} className="p-1 hover:bg-slate-800 rounded-full text-slate-600"><RotateCcw size={14} /></button>}
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
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 z-40 animate-in fade-in slide-in-from-right-4 text-center">
                          <div className={`bg-slate-900/90 backdrop-blur-md shadow-xl rounded border px-2.5 py-1.5 flex flex-col items-center ${isTargetMet ? 'border-green-500' : 'border-slate-800'}`}>
                            <span className="text-[0.375rem] font-black uppercase tracking-widest text-indigo-400 leading-none mb-1">TOTAL DMG</span>
                            <span className={`text-[1.25rem] font-black font-fantasy leading-none ${isTargetMet ? 'text-green-400' : 'text-white'}`}>{currentComboPower}</span>
                            <div className="w-full h-px bg-slate-800 my-1"></div>
                            <span className="text-[0.375rem] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">COMBO</span>
                            <div className={`text-[0.625rem] font-black leading-none ${isTargetMet ? 'text-green-400' : 'text-slate-400'}`}>{isTargetMet ? "KILLED" : `${consumedSlotsCount}/${currentMaxCombo}`}</div>
                          </div>
                        </div>

                        <div className="absolute top-1 left-1 flex flex-col gap-1 z-40">
                            <div className="px-2 py-0.5 bg-slate-900/80 border border-slate-700 rounded text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-400 shadow-lg">{currentEnemy.name}</div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/50 rounded text-[0.5rem] font-black uppercase tracking-[0.1em] text-indigo-300 shadow-lg"><Layers className="w-[0.625rem] h-[0.625rem]" /><span>山札: {deck.length}</span></div>
                        </div>

                        <div className="absolute top-11 md:top-14 w-40 md:w-64 h-3 md:h-4 bg-slate-950 rounded border border-slate-800 shadow-2xl overflow-hidden z-20">
                            <div className={`h-full transition-all duration-500 ${enemyHealth / currentEnemy.baseHP > 0.5 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`} style={{ width: `${(enemyHealth / currentEnemy.baseHP) * 100}%` }}></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[1rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] uppercase tracking-widest">HP {Math.ceil(enemyHealth)} / {currentEnemy.baseHP}</span>
                        </div>

                        {/* 主人公パラメータ表示 */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-40 animate-in fade-in slide-in-from-left-4">
                          <div className="bg-slate-900/90 backdrop-blur-md shadow-xl rounded border border-slate-800 px-2 py-1.5">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                              <div className="flex items-center gap-1">
                                <Swords className="w-[0.625rem] h-[0.625rem] text-red-400" />
                                <span className="text-[0.5rem] font-black text-slate-400">AD</span>
                                <span className="text-[0.625rem] font-black text-red-400">{heroStats.ad}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Sparkles className="w-[0.625rem] h-[0.625rem] text-purple-400" />
                                <span className="text-[0.5rem] font-black text-slate-400">AP</span>
                                <span className="text-[0.625rem] font-black text-purple-400">{heroStats.ap}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="w-[0.625rem] h-[0.625rem] text-yellow-400" />
                                <span className="text-[0.5rem] font-black text-slate-400">SP</span>
                                <span className="text-[0.625rem] font-black text-yellow-400">{heroStats.sp}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Hexagon className="w-[0.625rem] h-[0.625rem] text-blue-400" />
                                <span className="text-[0.5rem] font-black text-slate-400">MP</span>
                                <span className="text-[0.625rem] font-black text-blue-400">{heroStats.mp}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`w-32 h-32 md:w-52 md:h-52 select-none pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center ${isMonsterShaking ? 'monster-shake brightness-150 scale-110' : ''} ${isMonsterAttacking ? 'monster-attack z-50' : 'monster-idle'}`}>
                            <SafeImage src={currentEnemy.icon} alt={currentEnemy.name} className="w-full h-full object-contain" />
                        </div>

                        {floatingDamages.map(dmg => (
                          <div key={dmg.id} className={`absolute z-50 pointer-events-none damage-pop font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] font-fantasy ${dmg.isMana ? 'text-blue-400 text-xl' : dmg.isPoison ? 'text-green-500 text-lg' : 'text-red-500 text-2xl'}`} style={{ top: '45%' }}>{dmg.isMana ? `+${dmg.value}` : `-${dmg.value}`}</div>
                        ))}
                        {projectile && <div className="absolute flex items-center justify-center pointer-events-none z-50"><SafeImage src={projectile.icon} alt="attack" className="w-12 h-12 md:w-20 md:h-20 object-contain projectile" /></div>}
                    </div>
                )}

                {gameState === 'SHOP' && (
                    <div className="flex flex-col items-center justify-center w-full animate-in zoom-in duration-500 pt-4">
                        <ShoppingCart className="text-yellow-500 mb-2 opacity-30" size={60} />
                        <h2 className="text-2xl font-fantasy font-black text-yellow-400 tracking-[0.2em] uppercase mb-4 text-shadow-lg">Mysterious Shop</h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 w-full px-4 overflow-y-auto no-scrollbar max-h-[450px] pb-10">
                            {/* Recover Life Option */}
                            <div className="bg-slate-900/60 border-2 border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between group hover:border-red-500/50 transition-all relative h-[180px]">
                                <Heart className={`text-red-500 ${hasBoughtLife ? 'grayscale opacity-30' : 'animate-pulse'}`} size={40} />
                                <div className="text-center mt-2 flex-1 flex flex-col justify-end">
                                    <span className="block text-[10px] font-black text-white uppercase">Life Heal (+1)</span>
                                    {hasBoughtLife ? (
                                        <span className="block text-[10px] text-green-500 font-bold mt-1">SOLD OUT</span>
                                    ) : (
                                        <button 
                                            onClick={handleBuyLife}
                                            disabled={gold < LIFE_RECOVERY_PRICE || life >= maxLife}
                                            className={`mt-2 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black transition-all ${gold >= LIFE_RECOVERY_PRICE && life < maxLife ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            <Coins size={10} /> {LIFE_RECOVERY_PRICE}G
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Ability Option */}
                            {shopPassive && (
                                <div className={`bg-slate-900/60 border-2 rounded-xl p-3 flex flex-col items-center justify-between group hover:brightness-125 transition-all relative h-[180px] ${getRarityColor(shopPassive.rarity)}`}>
                                    <div className="flex flex-col items-center flex-1">
                                        <SafeImage src={shopPassive.icon} alt={shopPassive.name} className={`w-10 h-10 object-contain mb-2 ${hasBoughtPassive ? 'grayscale opacity-30' : ''}`} />
                                        <span className="text-[9px] font-black text-white uppercase text-center leading-tight line-clamp-2">{shopPassive.name}</span>
                                        <p className="text-[7px] text-slate-400 leading-tight mt-1 text-center">{shopPassive.description}</p>
                                    </div>
                                    <div className="text-center mt-2 w-full flex flex-col items-center">
                                        {hasBoughtPassive ? (
                                            <span className="block text-[10px] text-green-500 font-bold">SOLD OUT</span>
                                        ) : (
                                            <button 
                                                onClick={handleBuyPassive}
                                                disabled={gold < getPassivePrice(shopPassive.rarity)}
                                                className={`mt-1 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black transition-all ${gold >= getPassivePrice(shopPassive.rarity) ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                <Coins size={10} /> {getPassivePrice(shopPassive.rarity)}G
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Cards for Sale */}
                            {shopCards.map((card) => {
                                const isPurchased = purchasedIds.has(card.id);
                                const price = getCardPrice(card.rarity);
                                const canAfford = gold >= price;

                                return (
                                    <div key={card.id} className="relative flex flex-col items-center">
                                        <div className={`transform scale-90 ${isPurchased ? 'grayscale opacity-40' : ''}`}>
                                            <Card skill={card} onClick={() => {}} disabled={true} mana={999} />
                                        </div>
                                        {isPurchased ? (
                                            <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                                <div className="bg-green-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg border-2 border-white/20 flex items-center gap-1">
                                                    <Check size={12} /> SOLD
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleBuyCard(card)}
                                                disabled={!canAfford}
                                                className={`absolute -bottom-2 flex items-center gap-1 px-4 py-1.5 rounded-full text-[11px] font-black shadow-2xl transition-all ${canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                <Coins size={12} /> {price}G
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button 
                            onClick={() => nextLevel()}
                            className="mt-6 mb-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-10 py-2.5 rounded-full text-xs font-black tracking-[0.2em] uppercase border border-slate-700 transition-all flex items-center gap-2"
                        >
                            Continue Journey <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="w-full bg-slate-900 border-t border-slate-800 p-3 md:p-5 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 mb-safe min-h-[280px] md:min-h-[320px] flex flex-col">
            {gameState === 'START' && (
                <div className="flex flex-col items-center justify-center flex-1 gap-5 py-4">
                    <h2 className="text-xl md:text-2xl font-fantasy font-bold text-slate-100 tracking-widest uppercase">Combo Chronicle</h2>
                    <button onClick={startGame} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-10 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-widest"><Swords size={18} /> 戦闘開始</button>
                </div>
            )}
            {gameState === 'PLAYING' && (
                <div className="flex flex-col gap-4 flex-1">
                    <div className={`flex items-start gap-2 p-2 rounded-lg border-l-4 bg-slate-800/50 ${battleEvent.type === 'positive' ? 'border-green-500' : 'border-red-500'}`}>
                        <Zap size={14} className={`mt-0.5 shrink-0 ${battleEvent.type === 'positive' ? 'text-green-400' : 'text-red-400'}`} />
                        <div className="flex flex-col">
                            <p className="text-[10px] md:text-xs font-bold text-slate-100 leading-tight">{battleEvent.title}</p>
                            <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{battleEvent.description}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 md:gap-4 flex-1">
                        {isStuckDueToMana ? (
                           <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in">
                              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-3">魔力不足！カードを使えません</p>
                              <button onClick={handleRest} className="flex flex-col items-center gap-2 p-6 bg-slate-800 hover:bg-slate-700 border-2 border-indigo-500/50 rounded-2xl transition-all group active:scale-95 shadow-2xl">
                                 <Coffee className="text-indigo-400 group-hover:scale-110 transition-transform" size={32} />
                                 <div className="text-center">
                                    <span className="block text-xs font-bold text-white uppercase tracking-widest">精神統一</span>
                                    <span className="block text-[8px] text-indigo-300 mt-1">コンボ1回消費 / 魔力+30</span>
                                 </div>
                              </button>
                           </div>
                        ) : hand.length > 0 ? (
                            <div className="flex justify-center gap-1.5 md:gap-3 animate-in slide-in-from-bottom-4 overflow-x-auto pb-1.5 no-scrollbar">
                                {hand.map((item) => <div key={item.id} className="flex-1 max-w-[30%]"><Card skill={item} onClick={() => selectSkill(item)} disabled={consumedSlotsCount >= currentMaxCombo || isTargetMet || isMonsterAttacking || turnResetMessage} mana={mana} marketModifier={getSkillMarketModifier(item)} effectsDisabled={isEffectDisabled(item)} /></div>)}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-4">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest block">手札がなくなりました</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center"><button onClick={() => setIsDeckOverlayOpen(true)} className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-indigo-500/40 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest"><Search size={10} /><span>DECK VIEWER</span></button></div>
                </div>
            )}
            {gameState === 'BOSS_VICTORY' && (
                <div className="w-full flex flex-col items-center flex-1 justify-center py-2 animate-in slide-in-from-bottom-10">
                    <Award size={20} className="text-indigo-400 mb-1" />
                    <h2 className="text-base font-fantasy font-black text-white tracking-[0.1em] mb-3 uppercase">Ability Upgrade</h2>
                    <div className="flex flex-col gap-1.5 w-full max-h-[160px] overflow-y-auto no-scrollbar">
                        {shopOptions.map(option => (
                            <button key={option.id} onClick={() => selectPassive(option)} className={`w-full bg-slate-900/80 p-2 rounded border-2 hover:brightness-125 transition-all text-left flex items-center gap-2 group ${getRarityColor(option.rarity)}`}>
                                <SafeImage src={option.icon} alt={option.name} className="w-8 h-8 object-contain shrink-0" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                       <h3 className="font-bold text-slate-100 text-[9px] leading-tight uppercase tracking-widest">{option.name}</h3>
                                       <span className={`text-[7px] font-black px-1 rounded ${option.rarity === 'SSR' ? 'text-yellow-500' : option.rarity === 'R' ? 'text-slate-300' : 'text-orange-500'}`}>{option.rarity}</span>
                                    </div>
                                    <p className="text-[7px] text-slate-400 leading-snug mt-0.5">{option.description}</p>
                                </div>
                                <ArrowRight className="text-slate-700 group-hover:text-indigo-500" size={12} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {gameState === 'CARD_REWARD' && (
                <div className="w-full flex flex-col items-center flex-1 justify-center py-2 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center gap-2 mb-3"><PlusCircle size={20} className="text-green-400" /><h2 className="text-base font-fantasy font-black text-white tracking-[0.1em] uppercase">Choose a Reward</h2></div>
                    <div className="flex justify-center gap-1.5 md:gap-3 w-full mb-4">
                        {cardRewards.map((reward, i) => <div key={reward.id} className="min-w-[85px] md:min-w-[100px] flex-1 card-entry" style={{ animationDelay: `${i * 0.1}s` }}><Card skill={reward} onClick={() => selectRewardCard(reward)} disabled={false} mana={999} /></div>)}
                    </div>
                    <button onClick={() => handleBattleWinFinish(permanentDeck)} className="text-[10px] text-slate-500 hover:text-white transition-colors underline uppercase tracking-widest">Skip and Continue</button>
                </div>
            )}
            {gameState === 'SHOP' && (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 bg-yellow-950/10 rounded-xl border border-yellow-800/20">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="text-yellow-500" size={24} />
                        <h2 className="text-xl font-fantasy font-bold text-yellow-400 tracking-widest">SHOPPING</h2>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">ゴールドを使い、さらなる力を手に入れよ</p>
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
                let isSkipped = false;
                if (item.effect?.type === 'combo_skip') isSkipped = true;
                if (item.effect?.type === 'adjacency_physical_skip') {
                  const prev = idx > 0 ? stack[idx - 1] : null;
                  if (prev && prev.category === 'physical') isSkipped = true;
                }
                return (
                    <div key={idx} className={`flex justify-between items-start text-[11px] group border-b border-slate-900 pb-2 animate-in slide-in-from-right-2 duration-300 ${isSkipped ? 'bg-indigo-900/10 border-indigo-900/30' : ''}`}>
                        <div className="flex gap-3">
                            {item.id === 'rest' ? <Coffee className="text-indigo-400" size={16} /> : <SafeImage src={item.icon} className="w-6 h-6 object-contain" alt={item.name} />}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300 uppercase tracking-widest">{item.name}</span>
                                    {isSkipped && <span className="text-[7px] bg-indigo-600 text-white px-1 rounded font-black">SLOT SKIP</span>}
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
