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
        id: 'overtime_master',
        name: '残業マスター',
        icon: 'https://img.icons8.com/fluency/240/overtime.png',
        description: '社員数×0.5倍',
        type: 'employee_mult',
        value: 50,
        rarity: 'BLACK',
        maxStack: 0
    },
    {
        id: 'welfare_program',
        name: '福利厚生プログラム',
        icon: 'https://img.icons8.com/fluency/240/like.png',
        description: '社員数+50',
        type: 'employee_add',
        value: 50,
        rarity: 'WHITE',
        maxStack: 0
    },
    {
        id: 'training_program',
        name: '研修制度',
        icon: 'https://img.icons8.com/fluency/240/training.png',
        description: '社員数+20',
        type: 'employee_add',
        value: 20,
        rarity: 'NEUTRAL',
        maxStack: 0
    }
];
