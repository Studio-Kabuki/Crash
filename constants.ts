
import { Skill, PassiveEffect, BattleEvent, Enemy } from './types';

import { HeroStats } from './types';

export const MAX_COMBO = 3;
export const INITIAL_MANA = 50;
export const INITIAL_LIFE = 2;

// 主人公の初期パラメータ
export const INITIAL_HERO_STATS: HeroStats = {
  ad: 10,  // 物理攻撃力
  ap: 10,  // 魔法攻撃力
  sp: 30,  // ヘイスト（行動力の最大値）
  mp: 50,  // マナ（INITIAL_MANAと同じ）
};

// 汎用的なTrait定義（敵に割り当てる用）
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

// 階層ごとの敵データ
export const FLOOR_ENEMIES: Enemy[] = [
  { name: 'スライム', icon: 'https://img.icons8.com/fluency/240/slime.png', baseHP: 100, minFloor: 1, maxFloor: 3, trait: TRAITS.NEUTRAL },
  { name: 'モンキーゴブリン', icon: 'https://img.icons8.com/fluency/240/monkey.png', baseHP: 90, minFloor: 1, maxFloor: 3, trait: TRAITS.ANTI_BUFF },
  { name: '凶暴な野犬', icon: 'https://img.icons8.com/fluency/240/wolf.png', baseHP: 80, minFloor: 1, maxFloor: 3, trait: TRAITS.PHYSICAL_BOOST },

  { name: 'キングスライム', icon: 'https://img.icons8.com/fluency/240/slime.png', baseHP: 144, minFloor: 4, maxFloor: 4, trait: TRAITS.NEUTRAL },

  { name: 'オーク・ソルジャー', icon: 'https://img.icons8.com/fluency/240/orc.png', baseHP: 250, minFloor: 5, maxFloor: 7, trait: TRAITS.NEUTRAL },
  { name: 'エレメント・ウィスプ', icon: 'https://img.icons8.com/fluency/240/jellyfish.png', baseHP: 180, minFloor: 5, maxFloor: 7, trait: TRAITS.MAGIC_BOOST },
  { name: 'アイアン・タートル', icon: 'https://img.icons8.com/fluency/240/turtle.png', baseHP: 300, minFloor: 5, maxFloor: 7, trait: TRAITS.PHYSICAL_RESIST },

  { name: 'アーマード・オーク', icon: 'https://img.icons8.com/fluency/240/orc.png', baseHP: 216, minFloor: 8, maxFloor: 8, trait: TRAITS.PHYSICAL_RESIST },

  { name: 'ポイズン・スネーク', icon: 'https://img.icons8.com/fluency/240/snake.png', baseHP: 350, minFloor: 9, maxFloor: 11, trait: TRAITS.ANTI_BUFF },
  { name: 'ハーピー', icon: 'https://img.icons8.com/fluency/240/parrot.png', baseHP: 320, minFloor: 9, maxFloor: 11, trait: TRAITS.PHYSICAL_BOOST },
  { name: 'ストーン・ゴーレム', icon: 'https://img.icons8.com/fluency/240/stone-golem.png', baseHP: 550, minFloor: 9, maxFloor: 11, trait: TRAITS.PHYSICAL_RESIST },

  { name: 'ヴォイド・ソーサラー', icon: 'https://img.icons8.com/fluency/240/wizard.png', baseHP: 252, minFloor: 12, maxFloor: 12, trait: TRAITS.MAGIC_RESIST },

  { name: 'ダーク・メイジ', icon: 'https://img.icons8.com/fluency/240/wizard.png', baseHP: 500, minFloor: 13, maxFloor: 15, trait: TRAITS.MAGIC_RESIST },
  { name: 'ブラッド・バット', icon: 'https://img.icons8.com/fluency/240/bat.png', baseHP: 450, minFloor: 13, maxFloor: 15, trait: TRAITS.PHYSICAL_BOOST },
  { name: 'カースド・アーマー', icon: 'https://img.icons8.com/fluency/240/knight-helmet.png', baseHP: 800, minFloor: 13, maxFloor: 15, trait: TRAITS.ANTI_BUFF },

  { name: 'カースド・ジェネラル', icon: 'https://img.icons8.com/fluency/240/death-knight.png', baseHP: 432, minFloor: 16, maxFloor: 16, trait: TRAITS.ANTI_BUFF },

  { name: 'ファイア・ドレイク', icon: 'https://img.icons8.com/fluency/240/dragon.png', baseHP: 1200, minFloor: 17, maxFloor: 19, trait: TRAITS.MAGIC_BOOST },
  { name: 'ミノタウロス', icon: 'https://img.icons8.com/fluency/240/bull.png', baseHP: 1500, minFloor: 17, maxFloor: 19, trait: TRAITS.PHYSICAL_BOOST },
  { name: 'エンシェント・ビースト', icon: 'https://img.icons8.com/fluency/240/monster-face.png', baseHP: 2000, minFloor: 17, maxFloor: 19, trait: TRAITS.NEUTRAL },

  { name: '冥王', icon: 'https://img.icons8.com/fluency/240/demon.png', baseHP: 1440, minFloor: 20, maxFloor: 20, trait: TRAITS.PHYSICAL_BOOST },

  { name: '混沌の影', icon: 'https://img.icons8.com/fluency/240/ghost.png', baseHP: 4000, minFloor: 21, maxFloor: 999, trait: TRAITS.NEUTRAL },
];

export const INITIAL_SKILLS: Omit<Skill, 'id'>[] = [
  {
    name: 'スラッシュ',
    icon: 'https://img.icons8.com/fluency/144/sword.png',
    power: 30,
    manaCost: 0,
    delay: 10,
    color: 'bg-slate-700',
    borderColor: 'border-slate-400',
    heightClass: 'h-8',
    widthClass: 'w-56',
    borderRadiusClass: 'rounded-sm transform -skew-x-12',
    category: 'physical',
    rarity: 'C'
  },
  {
    name: 'ハイスラッシュ',
    icon: 'https://img.icons8.com/fluency/144/long-sword.png',
    power: 50,
    manaCost: 10,
    delay: 10,
    color: 'bg-slate-600',
    borderColor: 'border-indigo-400',
    heightClass: 'h-10',
    widthClass: 'w-56',
    borderRadiusClass: 'rounded-sm transform -skew-x-12',
    category: 'physical',
    rarity: 'R'
  },
  {
    name: 'ためる',
    icon: 'https://img.icons8.com/fluency/144/lightning-bolt.png',
    power: 0,
    manaCost: 0,
    delay: 10,
    color: 'bg-orange-600',
    borderColor: 'border-orange-400',
    heightClass: 'h-8',
    widthClass: 'w-48',
    borderRadiusClass: 'rounded-full',
    category: 'buff',
    rarity: 'R',
    effect: {
      type: 'next_action_double',
      value: 0,
      description: "次に使う補助以外のカードを2回発動する",
    }
  }
];

export const SKILL_POOL: Omit<Skill, 'id'>[] = [
    {
        name: 'マジックミサイル',
        icon: 'https://img.icons8.com/fluency/144/magic-wand.png',
        power: 30,
        manaCost: 30,
        delay: 10,
        color: 'bg-indigo-600',
        borderColor: 'border-indigo-300',
        heightClass: 'h-9',
        widthClass: 'w-48',
        borderRadiusClass: 'rounded-full',
        category: 'magic',
        rarity: 'R',
        effect: {
          type: 'combo_skip',
          value: 0,
          description: "ディレイなし",
        }
    },
    {
        name: '爆裂魔法',
        icon: 'https://img.icons8.com/fluency/144/fire-element.png',
        power: 120,
        manaCost: 50,
        delay: 10,
        color: 'bg-orange-600',
        borderColor: 'border-orange-400',
        heightClass: 'h-10',
        widthClass: 'w-52',
        borderRadiusClass: 'rounded-full',
        category: 'magic',
        rarity: 'SSR'
    },
    {
        name: '精神統一',
        icon: 'https://img.icons8.com/fluency/144/cleric.png',
        power: 0,
        manaCost: -30,
        delay: 10,
        color: 'bg-teal-600',
        borderColor: 'border-teal-400',
        heightClass: 'h-8',
        widthClass: 'w-48',
        borderRadiusClass: 'rounded-full',
        category: 'buff',
        rarity: 'R',
        effect: {
          type: 'combo_skip',
          value: 0,
          description: "マナ30回復 / ディレイなし",
        }
    },
    {
        name: 'ファイナルスラッシュ',
        icon: 'https://img.icons8.com/fluency/144/swords.png',
        power: 0,
        manaCost: 20,
        delay: 10,
        color: 'bg-purple-700',
        borderColor: 'border-purple-400',
        heightClass: 'h-12',
        widthClass: 'w-56',
        borderRadiusClass: 'rounded-none transform skew-x-12',
        category: 'physical',
        rarity: 'SSR',
        effect: {
          type: 'deck_count_bonus',
          value: 30,
          description: "山札の「スラッシュ」と名の付く技を全て消し、その枚数×30ダメージ",
        }
    },
    {
        name: 'かぶりつき',
        icon: 'https://img.icons8.com/fluency/144/vampire.png',
        power: 40,
        manaCost: 0,
        delay: 10,
        color: 'bg-red-800',
        borderColor: 'border-red-400',
        heightClass: 'h-8',
        widthClass: 'w-48',
        borderRadiusClass: 'rounded-full',
        category: 'physical',
        rarity: 'R',
        effect: {
          type: 'lifesteal_mana',
          value: 1,
          description: "与えたダメージ分マナを回復",
        }
    },
    {
        name: 'アイスボルト',
        icon: 'https://img.icons8.com/fluency/144/snowflake.png',
        power: 40,
        manaCost: 20,
        delay: 10,
        color: 'bg-blue-600',
        borderColor: 'border-cyan-300',
        heightClass: 'h-9',
        widthClass: 'w-48',
        borderRadiusClass: 'rounded-full',
        category: 'magic',
        rarity: 'R',
        effect: {
          type: 'prev_turn_magic_bonus',
          value: 2,
          description: "直前に魔法を使っていたら威力2倍",
        }
    },
    {
        name: '祖国のために',
        icon: 'https://img.icons8.com/fluency/144/shield.png',
        power: 50,
        manaCost: 10,
        delay: 10,
        color: 'bg-indigo-700',
        borderColor: 'border-yellow-400',
        heightClass: 'h-10',
        widthClass: 'w-52',
        borderRadiusClass: 'rounded-md',
        category: 'physical',
        rarity: 'SSR',
        effect: {
          type: 'permanent_stack',
          value: 20,
          description: "使用するたび永続的に威力+20",
        }
    },
    {
        name: 'ウルスラッシュ',
        icon: 'https://img.icons8.com/fluency/144/long-sword.png',
        power: 30,
        manaCost: 0,
        delay: 10,
        color: 'bg-slate-500',
        borderColor: 'border-orange-500',
        heightClass: 'h-8',
        widthClass: 'w-56',
        borderRadiusClass: 'rounded-sm transform -skew-x-12',
        category: 'physical',
        rarity: 'R',
        effect: {
          type: 'adjacency_physical_skip',
          value: 0,
          description: "30ダメージ / 直前が物理ならディレイなし",
        }
    }
];

export const PASSIVE_POOL: PassiveEffect[] = [
    {
        id: 'mana_well',
        name: '魔力の泉',
        icon: 'https://img.icons8.com/fluency/144/fountain.png',
        description: '魔力の最大値が永続的に +50 されます。',
        type: 'score_flat', 
        value: 50,
        rarity: 'R'
    },
    {
        id: 'combo_master',
        name: 'コンボマスター',
        icon: 'https://img.icons8.com/fluency/144/fire-element.png',
        description: 'コンボの上限回数が +1 回増加します。',
        type: 'capacity_boost',
        value: 1,
        rarity: 'SSR'
    },
    {
        id: 'physical_mastery',
        name: '剛腕の極み',
        icon: 'https://img.icons8.com/fluency/144/arm-wrestling.png',
        description: '物理スキルの威力が永続的に +15 されます。',
        type: 'category_buff',
        targetCategory: 'physical',
        value: 15,
        rarity: 'R'
    },
    {
        id: 'magic_mastery',
        name: '叡智の輝き',
        icon: 'https://img.icons8.com/fluency/144/crystal-ball.png',
        description: '魔法スキルの威力が永続的に +20 されます。',
        type: 'category_buff',
        targetCategory: 'magic',
        value: 20,
        rarity: 'R'
    },
    {
        id: 'repetitive_sidestep',
        name: '反復横跳び',
        icon: 'https://img.icons8.com/fluency/144/staircase.png',
        description: '物理攻撃は3回に1回、コンボ枠を消費しません。',
        type: 'combo_skip_physical',
        value: 1,
        rarity: 'SSR'
    },
    {
        id: 'mana_goddess',
        name: 'マナの女神',
        icon: 'https://img.icons8.com/fluency/144/angel.png',
        description: 'マナの上限を +30 します。',
        type: 'score_flat',
        value: 30,
        rarity: 'R'
    },
    {
        id: 'attorney_badge',
        name: '弁護士バッジ',
        icon: 'https://img.icons8.com/fluency/144/law.png',
        description: 'ライフの最大値が1つ増えます。',
        type: 'max_life_boost',
        value: 1,
        rarity: 'SSR'
    },
    {
        id: 'enhancer',
        name: '増強剤',
        icon: 'https://img.icons8.com/fluency/144/biotech.png',
        description: '与えるダメージが常に +40 されます。',
        type: 'flat_damage_bonus',
        value: 40,
        rarity: 'C'
    }
];
