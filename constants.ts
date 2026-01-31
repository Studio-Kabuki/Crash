import { PassiveEffect, HeroStats } from './types';

export const INITIAL_MANA = 50;
export const INITIAL_LIFE = 3;

// 主人公の初期パラメータ
export const INITIAL_HERO_STATS: HeroStats = {
  employees: 10,  // 社員数
  sp: 30,         // ヘイスト（行動力の最大値）
  mp: 50,         // 士気
};

// パッシブ効果プール（CSV化済み - フォールバック用）
export const PASSIVE_POOL: PassiveEffect[] = [
    {
        id: 'mana_well',
        name: '福利厚生費',
        icon: 'https://img.icons8.com/fluency/144/fountain.png',
        description: '士気の上限が +30 されます。',
        type: 'score_flat',
        value: 30,
        rarity: 'R'
    },
    {
        id: 'combo_master',
        name: '残業マスター',
        icon: 'https://img.icons8.com/fluency/144/fire-element.png',
        description: 'ヘイストの上限が +10 増加します。',
        type: 'capacity_boost',
        value: 10,
        rarity: 'SSR'
    },
    {
        id: 'hiring_bonus',
        name: '採用ボーナス',
        icon: 'https://img.icons8.com/fluency/144/arm-wrestling.png',
        description: '社員数が +10 されます。',
        type: 'ad_boost',
        value: 10,
        rarity: 'R'
    },
    {
        id: 'attorney_badge',
        name: '顧問弁護士',
        icon: 'https://img.icons8.com/fluency/144/law.png',
        description: 'ライフの最大値が1つ増えます。',
        type: 'max_life_boost',
        value: 1,
        rarity: 'SSR'
    },
    {
        id: 'enhancer',
        name: '生産性向上',
        icon: 'https://img.icons8.com/fluency/144/biotech.png',
        description: '進捗を与えるたび +20 の確定進捗。',
        type: 'flat_damage_bonus',
        value: 20,
        rarity: 'R'
    }
];
