import { loadCSV } from './csvParser';
import { Skill, Enemy, BattleEvent, SkillEffect, EffectType, Rarity } from '../types';

// CSVから読み込む生データの型
interface RawSkill {
  name: string;
  icon: string;
  power: number;
  manaCost: number;
  delay: number;
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  category: string;
  rarity: string;
  effectType: string;
  effectValue: number;
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

// Trait定義（敵の特性）
const TRAITS: Record<string, BattleEvent> = {
  NEUTRAL: {
    id: 'calm',
    title: '静寂',
    description: '特に異常はありません。',
    multiplier: 1.0,
    type: 'neutral'
  },
  PHYSICAL_BOOST: {
    id: 'blood_moon',
    title: 'ブラッドムーン',
    description: '物理技の威力が1.5倍になります。',
    targetCategory: 'physical',
    multiplier: 1.5,
    type: 'positive'
  },
  MAGIC_BOOST: {
    id: 'mana_overflow',
    title: 'マナの奔流',
    description: '魔法技の威力が1.5倍になります。',
    targetCategory: 'magic',
    multiplier: 1.5,
    type: 'positive'
  },
  ANTI_BUFF: {
    id: 'anti_magic_field',
    title: 'アンチマジック',
    description: '補助スキルの追加効果が無効化されます。',
    targetCategory: 'buff',
    multiplier: 1.0,
    disableEffects: true,
    type: 'negative'
  },
  PHYSICAL_RESIST: {
    id: 'iron_skin',
    title: '鋼の皮膚',
    description: '物理技の威力が半減します。',
    targetCategory: 'physical',
    multiplier: 0.5,
    type: 'negative'
  },
  MAGIC_RESIST: {
    id: 'magic_barrier',
    title: '対魔結界',
    description: '魔法技の威力が半減します。',
    targetCategory: 'magic',
    multiplier: 0.5,
    type: 'negative'
  }
};

export const DEFAULT_EVENT = TRAITS.NEUTRAL;

// ID生成
const generateId = () => Math.random().toString(36).substr(2, 9);

// RawSkill → Skill 変換
function convertToSkill(raw: RawSkill): Omit<Skill, 'id'> {
  let effect: SkillEffect | undefined;

  if (raw.effectType && raw.effectType.length > 0) {
    effect = {
      type: raw.effectType as EffectType,
      value: raw.effectValue,
      description: raw.effectDescription
    };
  }

  return {
    name: raw.name,
    icon: raw.icon,
    power: raw.power,
    manaCost: raw.manaCost,
    delay: raw.delay,
    color: raw.color,
    borderColor: raw.borderColor,
    heightClass: raw.heightClass,
    widthClass: raw.widthClass,
    borderRadiusClass: raw.borderRadiusClass,
    category: raw.category as 'physical' | 'magic' | 'buff',
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

// スキルをIDつきで生成
export function createSkillWithId(skill: Omit<Skill, 'id'>): Skill {
  return { ...skill, id: generateId() };
}

// データローダー
export interface GameData {
  initialSkills: Omit<Skill, 'id'>[];  // 初期デッキ用（スラッシュ、ハイスラッシュ、ためる）
  skillPool: Omit<Skill, 'id'>[];       // 報酬・ショップ用
  enemies: Enemy[];
}

export async function loadGameData(): Promise<GameData> {
  const [rawSkills, rawEnemies] = await Promise.all([
    loadCSV<RawSkill>('/data/skills.csv'),
    loadCSV<RawEnemy>('/data/enemies.csv')
  ]);

  const allSkills = rawSkills.map(convertToSkill);
  const enemies = rawEnemies.map(convertToEnemy);

  // 初期スキル: スラッシュ、ハイスラッシュ、ためる
  const initialSkillNames = ['スラッシュ', 'ハイスラッシュ', 'ためる'];
  const initialSkills = allSkills.filter(s => initialSkillNames.includes(s.name));

  // スキルプール: 初期スキル以外
  const skillPool = allSkills.filter(s => !initialSkillNames.includes(s.name));

  return {
    initialSkills,
    skillPool,
    enemies
  };
}
