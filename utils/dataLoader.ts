import { loadCSV } from './csvParser';
import { Skill, Enemy, BattleEvent, SkillEffect, EffectType, EffectTrigger, EffectParams, CardType, Rarity, PassiveEffect, HeroStats } from '../types';

// CSVから読み込む生データの型
interface RawSkill {
  name: string;
  icon: string;
  cardType: string;
  baseDamage: number;
  adRatio: number;
  apRatio: number;
  manaCost: number;
  delay: number;
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  rarity: string;
  effectType: string;
  effectTrigger: string;
  effectParams: string;  // JSON文字列
  effectDescription: string;
}

interface RawEnemy {
  name: string;
  icon: string;
  baseHP: number;
  minFloor: number;
  maxFloor: number;
  traitId: string;
}

interface RawHero {
  ad: number;
  ap: number;
  sp: number;
  mp: number;
  mana: number;
  life: number;
}

interface RawPassive {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: string;
  value: number;
  rarity: string;
  targetCategory: string;
}

// ヒーロー初期データ
export interface HeroInitialData {
  stats: HeroStats;
  mana: number;
  life: number;
}

// Trait定義（敵の特性）- 物理/魔法ダメージ倍率
const TRAITS: Record<string, BattleEvent> = {
  NEUTRAL: {
    id: 'calm',
    title: '静寂',
    description: '特に異常はありません。',
    physicalMultiplier: 1.0,
    magicMultiplier: 1.0,
    type: 'neutral'
  },
  PHYSICAL_BOOST: {
    id: 'blood_moon',
    title: 'ブラッドムーン',
    description: '物理ダメージが1.5倍になります。',
    physicalMultiplier: 1.5,
    magicMultiplier: 1.0,
    type: 'positive'
  },
  MAGIC_BOOST: {
    id: 'mana_overflow',
    title: 'マナの奔流',
    description: '魔法ダメージが1.5倍になります。',
    physicalMultiplier: 1.0,
    magicMultiplier: 1.5,
    type: 'positive'
  },
  PHYSICAL_RESIST: {
    id: 'iron_skin',
    title: '鋼の皮膚',
    description: '物理ダメージが半減します。',
    physicalMultiplier: 0.5,
    magicMultiplier: 1.0,
    type: 'negative'
  },
  MAGIC_RESIST: {
    id: 'magic_barrier',
    title: '対魔結界',
    description: '魔法ダメージが半減します。',
    physicalMultiplier: 1.0,
    magicMultiplier: 0.5,
    type: 'negative'
  },
  ANTI_SUPPORT: {
    id: 'anti_support_field',
    title: 'アンチサポート',
    description: 'サポートカードの効果が無効化されます。',
    physicalMultiplier: 1.0,
    magicMultiplier: 1.0,
    disableSupportEffects: true,
    type: 'negative'
  }
};

export const DEFAULT_EVENT = TRAITS.NEUTRAL;

// バフ定義（プレイヤーに付与されるバフ/デバフ）
export interface BuffDefinition {
  id: string;
  type: 'charge' | 'stat_up' | 'stat_down';
  name: string;
  icon: string;
  description: string;
  defaultValue: number;
  stat?: 'ad' | 'ap' | 'sp' | 'mp';
}

export const BUFFS: Record<string, BuffDefinition> = {
  CHARGE: {
    id: 'charge',
    type: 'charge',
    name: 'ためる',
    icon: 'https://img.icons8.com/fluency/144/lightning-bolt.png',
    description: '次のアタックカードを複数回発動',
    defaultValue: 2
  },
  AD_UP: {
    id: 'ad_up',
    type: 'stat_up',
    name: '攻撃力UP',
    icon: 'https://img.icons8.com/fluency/144/sword.png',
    description: '物理攻撃力が上昇',
    defaultValue: 50,
    stat: 'ad'
  },
  AP_UP: {
    id: 'ap_up',
    type: 'stat_up',
    name: '魔力UP',
    icon: 'https://img.icons8.com/fluency/144/magic-wand.png',
    description: '魔法攻撃力が上昇',
    defaultValue: 50,
    stat: 'ap'
  },
  SP_UP: {
    id: 'sp_up',
    type: 'stat_up',
    name: 'ヘイストUP',
    icon: 'https://img.icons8.com/fluency/144/running.png',
    description: 'ヘイストが上昇',
    defaultValue: 20,
    stat: 'sp'
  },
  AD_DOWN: {
    id: 'ad_down',
    type: 'stat_down',
    name: '攻撃力DOWN',
    icon: 'https://img.icons8.com/fluency/144/sword.png',
    description: '物理攻撃力が低下',
    defaultValue: -30,
    stat: 'ad'
  },
  AP_DOWN: {
    id: 'ap_down',
    type: 'stat_down',
    name: '魔力DOWN',
    icon: 'https://img.icons8.com/fluency/144/magic-wand.png',
    description: '魔法攻撃力が低下',
    defaultValue: -30,
    stat: 'ap'
  }
};

// ID生成
const generateId = () => Math.random().toString(36).substr(2, 9);

// RawSkill → Skill 変換
function convertToSkill(raw: RawSkill): Omit<Skill, 'id'> {
  let effect: SkillEffect | undefined;

  if (raw.effectType && raw.effectType.length > 0) {
    // effectParamsをJSONパース（空文字列やundefinedの場合は空オブジェクト）
    let params: EffectParams = {};
    if (raw.effectParams && raw.effectParams.length > 0) {
      try {
        params = JSON.parse(raw.effectParams);
      } catch (e) {
        console.warn(`Failed to parse effectParams for ${raw.name}:`, raw.effectParams);
      }
    }

    effect = {
      type: raw.effectType as EffectType,
      trigger: (raw.effectTrigger || 'on_use') as EffectTrigger,
      description: raw.effectDescription || '',
      params
    };
  }

  return {
    name: raw.name,
    icon: raw.icon,
    cardType: (raw.cardType || 'attack') as CardType,
    baseDamage: raw.baseDamage || 0,
    adRatio: raw.adRatio,
    apRatio: raw.apRatio,
    manaCost: raw.manaCost,
    delay: raw.delay,
    color: raw.color,
    borderColor: raw.borderColor,
    heightClass: raw.heightClass,
    widthClass: raw.widthClass,
    borderRadiusClass: raw.borderRadiusClass,
    rarity: raw.rarity as Rarity,
    effect
  };
}

// RawEnemy → Enemy 変換
function convertToEnemy(raw: RawEnemy): Enemy {
  return {
    name: raw.name,
    icon: raw.icon,
    baseHP: raw.baseHP,
    minFloor: raw.minFloor,
    maxFloor: raw.maxFloor,
    trait: TRAITS[raw.traitId] || TRAITS.NEUTRAL
  };
}

// RawHero → HeroInitialData 変換
function convertToHeroData(raw: RawHero): HeroInitialData {
  return {
    stats: {
      ad: raw.ad,
      ap: raw.ap,
      sp: raw.sp,
      mp: raw.mp
    },
    mana: raw.mana,
    life: raw.life
  };
}

// RawPassive → PassiveEffect 変換
function convertToPassive(raw: RawPassive): PassiveEffect {
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    description: raw.description,
    type: raw.type as PassiveEffect['type'],
    value: raw.value,
    rarity: raw.rarity as Rarity,
    ...(raw.targetCategory ? { targetCategory: raw.targetCategory } : {})
  };
}

// スキルをIDつきで生成
export function createSkillWithId(skill: Omit<Skill, 'id'>): Skill {
  return { ...skill, id: generateId() };
}

// データローダー
export interface GameData {
  initialSkills: Omit<Skill, 'id'>[];
  skillPool: Omit<Skill, 'id'>[];
  enemies: Enemy[];
  heroData: HeroInitialData;
  passivePool: PassiveEffect[];
}

export async function loadGameData(): Promise<GameData> {
  const [rawSkills, rawEnemies, rawHeroes, rawPassives] = await Promise.all([
    loadCSV<RawSkill>('/data/skills.csv'),
    loadCSV<RawEnemy>('/data/enemies.csv'),
    loadCSV<RawHero>('/data/hero.csv'),
    loadCSV<RawPassive>('/data/passives.csv')
  ]);

  const allSkills = rawSkills.map(convertToSkill);
  const enemies = rawEnemies.map(convertToEnemy);
  const heroData = rawHeroes.length > 0 ? convertToHeroData(rawHeroes[0]) : {
    stats: { ad: 30, ap: 10, sp: 30, mp: 50 },
    mana: 50,
    life: 2
  };
  const passivePool = rawPassives.map(convertToPassive);

  // 初期スキル: スラッシュ、ハイスラッシュ、ためる
  const initialSkillNames = ['スラッシュ', 'ハイスラッシュ', 'ためる'];
  const initialSkills = allSkills.filter(s => initialSkillNames.includes(s.name));

  // スキルプール: 初期スキル以外
  const skillPool = allSkills.filter(s => !initialSkillNames.includes(s.name));

  return {
    initialSkills,
    skillPool,
    enemies,
    heroData,
    passivePool
  };
}
