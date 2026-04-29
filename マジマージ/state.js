export const state = {
    energy: 100,
    coins: 0,
    stars: 0
};

export let items = [
    { x: 0, y: 0, type: 'BAG', lv: 1, isDragging: false },
    { x: 1, y: 0, type: 'BAG', lv: 1, isDragging: false }
];

export let currentOrder = {
    type: 'BREAD',
    lv: 1
};

export let selectedItem = null;

export function setItems(nextItems) {
    items = nextItems;
}

export function setCurrentOrder(nextOrder) {
    currentOrder = nextOrder;
}

export function setSelectedItem(item) {
    selectedItem = item;
}


