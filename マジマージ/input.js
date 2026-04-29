import { CELL_SIZE, PADDING, COLS, ROWS } from './config.js';
import { state, items, setItems, setSelectedItem } from './state.js';
import { spawnItem, getItemName, getItemSeries } from './items.js';
import { addMergePopEffect } from './effects.js';

let dragTarget = null;
let offset = { x: 0, y: 0 };
let startPoint = { x: 0, y: 0 };
let startCell = { x: 0, y: 0 };
let didMove = false;

function getCanvasPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}


function updateItemInfo(item) {
    setSelectedItem(item);

    const name = document.getElementById('itemInfoName');
    const detail = document.getElementById('itemInfoDetail');
    if (!name || !detail) return;

    name.innerText = getItemName(item);
    detail.innerText = getItemSeries(item) + ' / Lv.' + item.lv;
}

function getMaxLevel(item) {
    if (!item) return 99;
    if (item.type === 'BAG') return 10;
    if (item.type === 'WATER') return 8;
    if (item.type === 'EGG') return 9;
    return 99;
}

function getProductionType(item) {
    if (item.type === 'BAG' && item.lv >= 7) {
        return Math.random() < 0.5 ? 'RICE' : 'BREAD';
    }

    if (item.type === 'BAG' && item.lv >= 4) {
        return 'BREAD';
    }


    return null;
}

export function setupInput(canvas) {
    canvas.onpointerdown = (e) => {
        const point = getCanvasPoint(canvas, e);
        const mx = point.x;
        const my = point.y;

        const found = items.find(it => {
            const ix = it.x * (CELL_SIZE + PADDING) + PADDING;
            const iy = it.y * (CELL_SIZE + PADDING) + PADDING;
            return mx > ix && mx < ix + CELL_SIZE && my > iy && my < iy + CELL_SIZE;
        });

        if (!found) return;

        updateItemInfo(found);

        dragTarget = found;
        startCell.x = found.x;
        startCell.y = found.y;

        const itemX = found.x * (CELL_SIZE + PADDING) + PADDING;
        const itemY = found.y * (CELL_SIZE + PADDING) + PADDING;

        found.isDragging = true;
        found.x = itemX;
        found.y = itemY;
        startPoint.x = mx;
        startPoint.y = my;
        didMove = false;
        offset.x = mx - itemX;
        offset.y = my - itemY;
    };

    window.onpointermove = (e) => {
        if (!dragTarget) return;
        const point = getCanvasPoint(canvas, e);
        if (Math.abs(point.x - startPoint.x) > 6 || Math.abs(point.y - startPoint.y) > 6) {
            didMove = true;
        }
        dragTarget.x = point.x - offset.x;
        dragTarget.y = point.y - offset.y;
    };

    window.onpointerup = () => {
        if (!dragTarget) return;

        const tCol = Math.round((dragTarget.x - PADDING) / (CELL_SIZE + PADDING));
        const tRow = Math.round((dragTarget.y - PADDING) / (CELL_SIZE + PADDING));

        if (!didMove && state.energy > 0) {
            const spawnType = getProductionType(dragTarget);
            if (spawnType && spawnItem(spawnType)) {
                state.energy--;
            }
        }

        if (tCol >= 0 && tCol < COLS && tRow >= 0 && tRow < ROWS) {
            const partner = items.find(it => it !== dragTarget && !it.isDragging && it.x === tCol && it.y === tRow);

            if (partner && partner.type === dragTarget.type && partner.lv === dragTarget.lv && partner.lv < getMaxLevel(partner)) {
                partner.lv++;
                addMergePopEffect(partner);
                setItems(items.filter(it => it !== dragTarget));
            } else if (!partner) {
                dragTarget.x = tCol;
                dragTarget.y = tRow;
            } else {
                dragTarget.x = startCell.x;
                dragTarget.y = startCell.y;
            }
        } else {
            dragTarget.x = startCell.x;
            dragTarget.y = startCell.y;
        }

        dragTarget.isDragging = false;
        dragTarget = null;
    };
}

export function getDragTarget() {
    return dragTarget;
}


