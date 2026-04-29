import { CELL_SIZE, PADDING } from './config.js';
import { items } from './state.js';
import { drawBoard } from './board.js';
import { getItemLabel } from './items.js';
import { updateUI } from './ui.js';
import { getDragTarget } from './input.js';
import { getItemEffectScale } from './effects.js';

const itemImageCache = new Map();
const itemImagePaths = {
    BAG_1: 'img/item/買い物-布Lv1.png',
    BAG_2: 'img/item/買い物-綺麗な布Lv2.png',
    BAG_3: 'img/item/買い物-重ねた布Lv3.png',
    BAG_4: 'img/item/買い物-買い物カバンLv4.png',
    BAG_5: 'img/item/買い物-豪華な買い物カバンLv5.png',
    BAG_6: 'img/item/買い物-買い物カゴLv6.png',
    BAG_7: 'img/item/買い物-小さな買い物ワゴンLv7.png',
    BAG_8: 'img/item/買い物-買い物ワゴンLv8.png',
    BAG_9: 'img/item/買い物-買い物トラックLv9.png',
    BAG_10: 'img/item/買い物-金色お買い物トラックLv10.png',
    WATER_1: 'img/item/水系-水滴Lv1.png',
    WATER_2: 'img/item/水系-コップの水Lv2.png',
    WATER_3: 'img/item/水系-ペットボトル水Lv3.png',
    WATER_4: 'img/item/水系-10本入りペットボトル水Lv4.png',
    WATER_5: 'img/item/水系-瓶の水Lv5.png',
    WATER_6: 'img/item/水系-水タンクLv6.png',
    WATER_7: 'img/item/水系-ウォーターサーバーLv7.png',
    WATER_8: 'img/item/水系-黄金の水Lv8.png',
    EGG_1: 'img/item/卵系-卵Lv1.png',
    EGG_2: 'img/item/卵系-卵パックLv2.png',
    EGG_3: 'img/item/卵系-カゴ入り卵Lv3.png',
    EGG_4: 'img/item/卵系-ゆで卵スライスLv4.png',
    EGG_5: 'img/item/卵系-目玉焼きLv5.png',
    EGG_6: 'img/item/卵系-卵焼きLv6.png',
    EGG_7: 'img/item/卵系-オムレツLv7.png',
    EGG_8: 'img/item/卵系-銀の卵Lv8.png',
    EGG_9: 'img/item/卵系-金の卵Lv9.png'
};

function getItemImage(item) {
    const path = itemImagePaths[item.type + '_' + item.lv];
    if (!path) return null;

    if (!itemImageCache.has(path)) {
        const image = new Image();
        image.dataset.failed = 'false';
        image.onerror = function() {
            image.dataset.failed = 'true';
        };
        image.src = path;
        itemImageCache.set(path, image);
    }

    const image = itemImageCache.get(path);
    if (image.dataset.failed === 'true') return null;
    return image;
}

function drawContainedImage(ctx, image, x, y, size) {
    const padding = 6;
    const boxSize = size - padding * 2;
    const width = image.naturalWidth || image.width || boxSize;
    const height = image.naturalHeight || image.height || boxSize;
    const scale = Math.min(boxSize / width, boxSize / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const drawX = x + (size - drawWidth) / 2;
    const drawY = y + (size - drawHeight) / 2;

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawScaledBox(ctx, x, y, size, scale, drawContent) {
    const scaledSize = size * scale;
    const scaledX = x + (size - scaledSize) / 2;
    const scaledY = y + (size - scaledSize) / 2;

    ctx.save();
    ctx.translate(scaledX, scaledY);
    ctx.scale(scale, scale);
    drawContent(0, 0);
    ctx.restore();
}

export function draw(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard(ctx);

    items.forEach(item => {
        if (!item.isDragging) drawItem(ctx, item);
    });

    const dragTarget = getDragTarget();
    if (dragTarget) drawItem(ctx, dragTarget);

    updateUI();
    requestAnimationFrame(() => draw(ctx, canvas));
}

function drawItem(ctx, item) {
    const x = item.isDragging ? item.x : item.x * (CELL_SIZE + PADDING) + PADDING;
    const y = item.isDragging ? item.y : item.y * (CELL_SIZE + PADDING) + PADDING;

    const effectScale = getItemEffectScale(item);

    drawScaledBox(ctx, x, y, CELL_SIZE, effectScale, function(localX, localY) {
        if (item.type === 'BAG') ctx.fillStyle = '#f6c177';
        else if (item.type === 'BREAD') ctx.fillStyle = `hsl(30, 70%, ${80 - item.lv * 10}%)`;
        else ctx.fillStyle = `hsl(200, 70%, ${80 - item.lv * 10}%)`;

        ctx.beginPath();
        ctx.roundRect(localX, localY, CELL_SIZE, CELL_SIZE, 12);
        ctx.fill();

        const image = getItemImage(item);
        if (image && image.complete && image.naturalWidth > 0) {
            drawContainedImage(ctx, image, localX, localY, CELL_SIZE);
            return;
        }

        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(getItemLabel(item), localX + CELL_SIZE / 2, localY + CELL_SIZE / 2 + 6);
    });
}


