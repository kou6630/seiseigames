import { ROWS, COLS } from './config.js';
import { items } from './state.js';

const ITEM_NAMES = {
    BAG: {
        1: '布',
        2: '綺麗な布',
        3: '重ねた布',
        4: '買い物カバン',
        5: '豪華な買い物カバン',
        6: '買い物カゴ',
        7: '小さな買い物ワゴン',
        8: '買い物ワゴン',
        9: '買い物トラック',
        10: '金色お買い物トラック'
    },
    BREAD: {
        1: '小麦',
        2: '小麦粉',
        3: 'パン生地',
        4: '食パン',
        5: 'バゲット',
        6: 'クロワッサン',
        7: '高級パン',
        8: '黄金パン'
    },
    RICE: {
        1: '米',
        2: '炊いたご飯',
        3: 'おにぎり',
        4: 'のり弁',
        5: 'チャーハン',
        6: 'オムライス',
        7: 'うな重',
        8: '豪華海鮮丼'
    },
    FRIDGE: {
        1: '氷',
        2: '氷袋',
        3: '氷嚢',
        4: '保冷バック',
        5: 'ミニクーラーボックス',
        6: '巨大クーラーボックス',
        7: 'ミニ冷蔵庫',
        8: '冷凍庫',
        9: '業務用冷蔵庫',
        10: '冷蔵ショーケース',
        11: '金色の冷蔵庫'
    },
    WATER: {
        1: '水滴',
        2: 'コップの水',
        3: 'ペットボトル水',
        4: '10本入りペットボトル水',
        5: '瓶の水',
        6: '水タンク',
        7: 'ウォーターサーバー',
        8: '黄金の水'
    },
    EGG: {
        1: '卵',
        2: '卵パック',
        3: 'カゴ入り卵',
        4: 'ゆで卵スライス',
        5: '目玉焼き',
        6: '卵焼き',
        7: 'オムレツ',
        8: '銀の卵',
        9: '金の卵'
    },
    MEAT: {
        1: '肉',
        2: '味付き肉',
        3: '焼き肉',
        4: 'ハンバーグ',
        5: 'ステーキ',
        6: '高級ステーキ',
        7: '極上ステーキ',
        8: '黄金ステーキ'
    }
};

export function getItemName(item) {
    const names = ITEM_NAMES[item.type];
    if (!names) return 'アイテム';
    return names[item.lv] || names[Object.keys(names).length] || 'アイテム';
}

export function getItemSeries(item) {
    if (item.type === 'BAG') return '買い物系';
    if (item.type === 'BREAD') return 'パン系';
    if (item.type === 'RICE') return 'ご飯系';
    if (item.type === 'FRIDGE') return '冷蔵庫系';
    if (item.type === 'WATER') return '水系';
    if (item.type === 'EGG') return '卵系';
    if (item.type === 'MEAT') return '肉系';
    return '不明系';
}

export function spawnItem(type = 'BREAD') {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!items.find(it => it.x === c && it.y === r)) {
                items.push({ x: c, y: r, type, lv: 1, isDragging: false });
                return true;
            }
        }
    }
    return false;
}

export function getItemLabel(item) {
    return getItemName(item) + ' Lv.' + item.lv;
}


