import { loadCSV } from './csvParser';
import { Skill, Enemy, BattleEvent, SkillEffect, EffectType, EffectTrigger, EffectParams, CardType, Rarity, PassiveEffect, HeroStats } from '../types';

// CSVから読み込む生データの型
interface RawSkill {
  disabled: number;         // 1で無効化
  excludeFromPool: number;  // 1で抽選対象外
  name: string;
  rarity: string;
  effectDescription: string;
  flavorText: string;    // 目立たない補足テキスト
  cardType: string;
  baseDamage: number;
  employeeRatio: number;  // 社員数比率（%）
  manaCost: number;
  delay: number;
  workStyleChange: number;  // ホワイト/ブラック度変化
  effectType: string;
  effectTrigger: string;
  effectParams: string;  // key=value;key=value 形式
  color: string;
  borderColor: string;
  heightClass: string;
  widthClass: string;
  borderRadiusClass: string;
  icon: string;
}

interface RawStarterDeck {
  deckId: string;
  deckName: string;
  skillName: string;
  count: number;
}

interface RawEnemy {
  disabled: number;
  name: string;
  icon: string;
  baseHP: number;
  minFloor: number;
  maxFloor: number;
  traitId: string;
  dropsAbility: string;
}

interface RawHero {
  employees: number;  // 社員数
  sp: number;         // ヘイスト
  mp: number;         // 士気
  mana: number;       // 初期士気
  life: number;       // ライフ
}

interface RawPassive {
  disabled: number;
  id: string;
  name: string;
  icon: string;
  description: string;
  type: string;
  value: number;
  value2: number;
  rarity: string;
}

interface RawTrait {
  disabled: number;
  key: string;
  id: string;
  title: string;
  description: string;
  physicalMultiplier: number;
  magicMultiplier: number;
  disableSupportEffects: number;
  disableBuffEffects: number;
  armorThreshold: number;
  manaDrainAmount: number;
  type: string;
}

interface RawBuff {
  disabled: number;
  key: string;
  id: string;
  type: string;
  name: string;
  description: string;
  defaultValue: number;
  stat: string;
  icon: string;
}

// ヒーロー初期データ
export interface HeroInitialData {
  stats: HeroStats;
  mana: number;
  life: number;
}

// バフ定義（プレイヤーに付与されるバフ/デバフ）
export interface BuffDefinition {
  id: string;
  type: 'charge' | 'stat_up' | 'stat_down' | 'base_damage_boost' | 'strength' | 'parry' | 'invincible';
  name: string;
  icon: string;
  description: string;
  defaultValue: number;
  stat?: 'employees' | 'sp' | 'mp';
}

// ID生成
const generateId = () => Math.random().toString(36).substr(2, 9);

// effectParams パーサー: "key=value;key=value" 形式をパース
// 例: "buffId=CHARGE;value=2" → { buffId: "CHARGE", value: 2 }
function parseEffectParams(str: string): EffectParams {
  if (!str || str.length === 0) return {};

  const params: EffectParams = {};
  const pairs = str.split(';');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (!key || value === undefined) continue;

    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    // 数値判定
    const numValue = parseFloat(trimmedValue);
    if (!isNaN(numValue) && trimmedValue === String(numValue)) {
      (params as Record<string, unknown>)[trimmedKey] = numValue;
    } else {
      (params as Record<string, unknown>)[trimmedKey] = trimmedValue;
    }
  }

  return params;
}

// RawSkill → Skill 変換
function convertToSkill(raw: RawSkill): Omit<Skill, 'id'> {
  let effect: SkillEffect | undefined;

  // effectType があるか、effectDescription があれば effect オブジェクトを作成
  if ((raw.effectType && raw.effectType.length > 0) || (raw.effectDescription && raw.effectDescription.length > 0)) {
    // effectParamsをパース（key=value;key=value 形式）
    const params = parseEffectParams(raw.effectParams);

    effect = {
      type: (raw.effectType || 'none') as EffectType,
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
    employeeRatio: raw.employeeRatio || 0,
    manaCost: raw.manaCost,
    delay: raw.delay,
    workStyleChange: raw.workStyleChange || 0,
    color: raw.color,
    borderColor: raw.borderColor,
    heightClass: raw.heightClass,
    widthClass: raw.widthClass,
    borderRadiusClass: raw.borderRadiusClass,
    rarity: raw.rarity as Rarity,
    effect,
    ...(raw.flavorText ? { flavorText: raw.flavorText } : {})
  };
}

// RawEnemy → Enemy 変換（traitsを引数で受け取る）
function convertToEnemy(raw: RawEnemy, traits: Record<string, BattleEvent>): Enemy {
  return {
    name: raw.name,
    icon: raw.icon,
    baseHP: raw.baseHP,
    minFloor: raw.minFloor,
    maxFloor: raw.maxFloor,
    trait: traits[raw.traitId] || traits['NEUTRAL'],
    dropsAbility: (raw.dropsAbility === 'Y' || raw.dropsAbility === 'C') ? raw.dropsAbility : 'N'
  };
}

// RawHero → HeroInitialData 変換
function convertToHeroData(raw: RawHero): HeroInitialData {
  return {
    stats: {
      employees: raw.employees,
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
    ...(raw.value2 ? { value2: raw.value2 } : {})
  };
}

// スキルをIDつきで生成
export function createSkillWithId(skill: Omit<Skill, 'id'>): Skill {
  return { ...skill, id: generateId() };
}

// スターターデッキ定義
export interface StarterDeck {
  id: string;
  name: string;
  cards: { skill: Omit<Skill, 'id'>; count: number }[];
}

// データローダー
export interface GameData {
  starterDecks: StarterDeck[];
  allSkills: Omit<Skill, 'id'>[];  // 全スキル（図鑑用）
  skillPool: Omit<Skill, 'id'>[];  // 抽選対象スキル
  enemies: Enemy[];
  heroData: HeroInitialData;
  passivePool: PassiveEffect[];
  traits: Record<string, BattleEvent>;
  buffs: Record<string, BuffDefinition>;
}

export async function loadGameData(): Promise<GameData> {
  const [rawSkills, rawEnemies, rawHeroes, rawPassives, rawTraits, rawBuffs, rawStarterDecks] = await Promise.all([
    loadCSV<RawSkill>('/data/skills.csv'),
    loadCSV<RawEnemy>('/data/enemies.csv'),
    loadCSV<RawHero>('/data/hero.csv'),
    loadCSV<RawPassive>('/data/passives.csv'),
    loadCSV<RawTrait>('/data/traits.csv'),
    loadCSV<RawBuff>('/data/buffs.csv'),
    loadCSV<RawStarterDeck>('/data/starter_decks.csv')
  ]);

  // disabled=1のデータを除外
  const enabledSkills = rawSkills.filter(raw => !raw.disabled || raw.disabled === 0);
  const enabledEnemies = rawEnemies.filter(raw => !raw.disabled || raw.disabled === 0);
  const enabledPassives = rawPassives.filter(raw => !raw.disabled || raw.disabled === 0);

  const allSkills = enabledSkills.map(convertToSkill);
  const heroData = rawHeroes.length > 0 ? convertToHeroData(rawHeroes[0]) : {
    stats: { employees: 10, sp: 30, mp: 50 },
    mana: 50,
    life: 3
  };
  const passivePool = enabledPassives.map(convertToPassive);

  // Traitsを変換（keyでRecord化）
  const enabledTraits = rawTraits.filter(raw => !raw.disabled || raw.disabled === 0);
  const traits: Record<string, BattleEvent> = {};
  enabledTraits.forEach(raw => {
    traits[raw.key] = {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      physicalMultiplier: raw.physicalMultiplier,
      magicMultiplier: raw.magicMultiplier,
      disableSupportEffects: raw.disableSupportEffects === 1,
      disableBuffEffects: raw.disableBuffEffects === 1,
      armorThreshold: raw.armorThreshold || undefined,
      manaDrainAmount: raw.manaDrainAmount || undefined,
      type: raw.type as 'positive' | 'negative' | 'neutral'
    };
  });

  // Enemiesを変換（traitsが必要なのでここで）
  const enemies = enabledEnemies.map(raw => convertToEnemy(raw, traits));

  // Buffsを変換（keyでRecord化）
  const enabledBuffs = rawBuffs.filter(raw => !raw.disabled || raw.disabled === 0);
  const buffs: Record<string, BuffDefinition> = {};
  enabledBuffs.forEach(raw => {
    buffs[raw.key] = {
      id: raw.id,
      type: raw.type as BuffDefinition['type'],
      name: raw.name,
      icon: raw.icon,
      description: raw.description,
      defaultValue: raw.defaultValue,
      stat: raw.stat as 'employees' | 'sp' | 'mp' | undefined
    };
  });

  // スキルプール: excludeFromPool=1のカードを除外
  const skillPool = enabledSkills
    .filter(raw => !raw.excludeFromPool || raw.excludeFromPool === 0)
    .map(convertToSkill);

  // スターターデッキを構築
  // スキル名からスキルを検索するためのマップ
  const skillByName = new Map<string, Omit<Skill, 'id'>>();
  allSkills.forEach(skill => skillByName.set(skill.name, skill));

  // デッキIDごとにグループ化
  const deckGroups = new Map<string, { name: string; cards: { skill: Omit<Skill, 'id'>; count: number }[] }>();
  rawStarterDecks.forEach(raw => {
    const skill = skillByName.get(raw.skillName);
    if (!skill) {
      console.warn(`Starter deck references unknown skill: ${raw.skillName}`);
      return;
    }
    if (!deckGroups.has(raw.deckId)) {
      deckGroups.set(raw.deckId, { name: raw.deckName, cards: [] });
    }
    deckGroups.get(raw.deckId)!.cards.push({ skill, count: raw.count });
  });

  const starterDecks: StarterDeck[] = [];
  deckGroups.forEach((value, key) => {
    starterDecks.push({ id: key, name: value.name, cards: value.cards });
  });

  return {
    starterDecks,
    allSkills,
    skillPool,
    enemies,
    heroData,
    passivePool,
    traits,
    buffs
  };
}
