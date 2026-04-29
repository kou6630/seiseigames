import { state } from './state.js';
import { findDeliverItem, deliverOrder, getOrderText } from './orders.js';

export function updateUI() {
    document.getElementById('energy').innerText = state.energy;
    document.getElementById('stars').innerText = state.stars;

    document.getElementById('orderDetail').innerText = getOrderText() + ' を1つ';

    const hasItem = findDeliverItem();
    const btn = document.getElementById('deliverBtn');
    btn.disabled = !hasItem;
    btn.onclick = () => {
        if (hasItem) deliverOrder(hasItem);
    };
}

