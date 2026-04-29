import { ROWS, COLS, CELL_SIZE, PADDING } from './config.js';

export function setupCanvas(canvas) {
    canvas.width = COLS * (CELL_SIZE + PADDING) + PADDING;
    canvas.height = ROWS * (CELL_SIZE + PADDING) + PADDING;
}

export function drawBoard(ctx) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.fillStyle = '#dfe6e9';
            ctx.beginPath();
            ctx.roundRect(
                c * (CELL_SIZE + PADDING) + PADDING,
                r * (CELL_SIZE + PADDING) + PADDING,
                CELL_SIZE,
                CELL_SIZE,
                8
            );
            ctx.fill();
        }
    }
}
