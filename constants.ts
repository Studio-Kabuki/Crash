import { PassiveEffect, HeroStats } from './types';

export const INITIAL_MANA = 50;
export const INITIAL_LIFE = 2;

// 主人公の初期パラメータ
export const INITIAL_HERO_STATS: HeroStats = {
  ad: 30,  // 物理攻撃力
  ap: 10,  // 魔法攻撃力
  sp: 30,  // ヘイスト（行動力の最大値）
  mp: 50,  // マナ（INITIAL_MANAと同じ）
};

// パッシブ効果プール（TODO: これもCSV化する）
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
        name: 'ヘイストマスター',
        icon: 'https://img.icons8.com/fluency/144/fire-element.png',
        description: 'ヘイストの上限が +10 増加します。',
        type: 'capacity_boost',
        value: 10,
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
