import { state, items, currentOrder, setItems, setCurrentOrder } from './state.js';
import { getItemName } from './items.js';

export function findDeliverItem() {
    return items.find(it => it.type === currentOrder.type && it.lv === currentOrder.lv);
}

export function deliverOrder(item) {
    setItems(items.filter(it => it !== item));
    state.stars += 1;
    state.coins += currentOrder.lv * 50;

    setCurrentOrder({
        type: ['BREAD', 'RICE', 'WATER', 'EGG'][Math.floor(Math.random() * 4)],
        lv: Math.floor(Math.random() * 3) + 1
    });
}

export function getOrderText() {
    return getItemName(currentOrder) + ' Lv.' + currentOrder.lv;
}


